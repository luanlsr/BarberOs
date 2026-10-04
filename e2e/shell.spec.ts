import { expect, test } from '@playwright/test';

test.describe('public shell', () => {
  test('keeps the public landing within the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'BarberOS' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Transforme a rotina/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  });

  test('renders public desktop navigation without protected app entries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const landingNav = page.getByRole('navigation', { name: 'Navegação da landing page' });
    await expect(landingNav.getByRole('link', { name: 'Recursos' })).toBeVisible();
    await expect(landingNav.getByRole('link', { name: 'Planos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
  });

  test('applies explicit stored theme preference on the public shell', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('barberos-theme', 'dark');
    });
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('does not expose protected tenant data on the public landing', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('SUPABASE_SERVICE_ROLE_KEY')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agenda', exact: true })).toHaveCount(0);
  });
});
