import { expect, test } from '@playwright/test';

const viewports = [320, 390, 768, 1024, 1440, 1920];

for (const width of viewports) {
  test(`fits the ${width}px P0 viewport in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('barberos-theme')) {
        window.localStorage.setItem('barberos-theme', 'light');
      }
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );

    await page.evaluate(() => window.localStorage.setItem('barberos-theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
