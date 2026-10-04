import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('production readiness smoke', () => {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`has no automatically detectable accessibility violations on agenda ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/agenda');
      await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

      const accessibilityScan = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScan.violations).toEqual([]);
    });
  }
});
