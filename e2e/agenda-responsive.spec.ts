import { expect, test } from '@playwright/test';

const agendaViewports = [320, 390, 768, 1024, 1440, 1920];

for (const width of agendaViewports) {
  test(`agenda fits the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/agenda');

    await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
    await expect(page.getByRole('form', { name: 'Filtros da agenda' })).toBeVisible();

    let visibleAgenda = page.locator('.agenda-mobile-timeline');
    if (width < 700) {
      await expect(visibleAgenda).toBeVisible();
    } else if (width < 1100) {
      visibleAgenda = page.locator('.agenda-tablet-columns');
      await expect(visibleAgenda).toBeVisible();
    } else {
      visibleAgenda = page.locator('.agenda-desktop-grid');
      await expect(visibleAgenda).toBeVisible();
    }
    await expect(visibleAgenda.getByText('Marcos Vinicius').first()).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => ({
      html: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(horizontalOverflow.html).toBeLessThanOrEqual(width);
    expect(horizontalOverflow.body).toBeLessThanOrEqual(width);

    const overflowingElements = await page.locator('body *').evaluateAll(
      (elements, viewportWidth) =>
        elements
          .map((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              className: element.getAttribute('class') ?? '',
              left: rect.left,
              right: rect.right,
              width: rect.width,
              display: style.display,
              visibility: style.visibility,
            };
          })
          .filter(
            (item) =>
              item.display !== 'none' &&
              item.visibility !== 'hidden' &&
              item.width > 0 &&
              (item.left < -1 || item.right > Number(viewportWidth) + 1),
          ),
      width,
    );
    expect(overflowingElements).toEqual([]);

    await page.screenshot({ path: `test-results/agenda-${width}.png`, fullPage: true });
  });
}
