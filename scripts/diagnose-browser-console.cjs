const { chromium } = require("@playwright/test");

async function main() {
  const url = process.argv[2] || "http://localhost:3001/login";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const events = [];

  page.on("console", (message) => {
    events.push({
      type: "console",
      level: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    events.push({
      type: "pageerror",
      text: error.stack || error.message,
    });
  });

  let status = null;
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    status = response && response.status();
  } catch (error) {
    events.push({
      type: "goto-error",
      text: error.stack || error.message,
    });
  }

  await page.waitForTimeout(3000);

  const snapshot = await page
    .evaluate(() => {
      const scripts = Array.from(document.scripts).map((script) => ({
        src: script.src,
        inlineStart: script.src ? "" : (script.textContent || "").slice(0, 220),
      }));

      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("_next") || entry.name.endsWith(".js"))
        .map((entry) => ({
          name: entry.name,
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
        }));

      return {
        title: document.title,
        path: location.pathname,
        navigation:
          navigation && {
            type: navigation.type,
            duration: Math.round(navigation.duration),
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
            load: Math.round(navigation.loadEventEnd),
          },
        scripts,
        resources,
      };
    })
    .catch((error) => ({ evaluateError: error.message }));

  console.log(JSON.stringify({ url, finalUrl: page.url(), status, events, snapshot }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
