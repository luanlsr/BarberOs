import { expect, test } from '@playwright/test';

test('renders cash register without opening a dev cash session by default', async ({ page }) => {
  await page.goto('/caixa');

  await expect(page.getByRole('heading', { name: 'Caixa', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Abertura do caixa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir caixa' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumo do caixa' })).toHaveCount(0);
  await expect(page.getByText('R$ 800,00')).toHaveCount(0);
});
