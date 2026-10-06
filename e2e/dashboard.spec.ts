import { expect, test } from '@playwright/test';

test('renders the real dashboard shell without legacy hardcoded appointments', async ({ page }) => {
  await page.goto('/inicio');

  await expect(page.getByRole('heading', { name: 'Bom dia, Luan.' })).toBeVisible();
  await expect(page.getByText('Atendimentos hoje')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agenda de hoje' })).toBeVisible();
  await expect(page.getByText('Nenhum atendimento agendado para hoje.')).toBeVisible();
  await expect(page.getByText('Marcos Vinicius')).toHaveCount(0);
  await expect(page.getByText('R$ 1.240')).toHaveCount(0);
});
