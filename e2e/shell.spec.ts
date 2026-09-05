import { expect, test } from '@playwright/test';

test.describe('application shell', () => {
  test('adapts navigation to mobile and keeps the page within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar novo agendamento' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  });

  test('uses the desktop navigation at wide widths', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeHidden();
  });

  test('persists an explicit theme selection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Alternar tema' }).click();
    const selectedTheme = await page.locator('html').getAttribute('data-theme');
    expect(['light', 'dark']).toContain(selectedTheme);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', selectedTheme ?? 'light');
  });

  test('shows the permission denied state without exposing protected content', async ({ page }) => {
    await page.goto('/forbidden');

    await expect(page.getByRole('heading', { name: 'Acesso restrito.' })).toBeVisible();
    await expect(
      page.getByText('Seu perfil não tem permissão para visualizar esta área.'),
    ).toBeVisible();
  });
});
