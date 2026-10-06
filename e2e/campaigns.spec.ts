import { expect, test } from '@playwright/test';

test('renders campaigns empty state without development campaign rows', async ({ page }) => {
  await page.goto('/campanhas?state=empty');

  await expect(page.getByRole('heading', { name: 'Campanhas', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lista operacional' })).toBeVisible();
  await expect(page.getByText('Nenhuma campanha nesta unidade.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova campanha' })).toBeVisible();
  await expect(page.getByText('Reativação de clientes 45 dias')).toHaveCount(0);
  await expect(page.getByText('Oferta plano mensal')).toHaveCount(0);
  await expect(page.getByText('Horários livres de sábado')).toHaveCount(0);
});
