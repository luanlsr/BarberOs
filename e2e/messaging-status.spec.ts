import { expect, test } from '@playwright/test';

test('renders messaging empty state without development conversations', async ({ page }) => {
  await page.goto('/mensagens?state=empty');

  await expect(page.getByRole('heading', { name: 'Mensagens', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conexão da unidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhuma conexão ativa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Configurar WhatsApp' })).toHaveCount(2);
  await expect(page.getByText('WhatsApp Centro')).toHaveCount(0);
  await expect(page.getByText('Ana P.')).toHaveCount(0);
  await expect(page.getByText('Carlos M.')).toHaveCount(0);
});
