import { expect, test } from '@playwright/test';

test('renders branch settings without development schedule blocks', async ({ page }) => {
  await page.goto('/configuracoes/barbearia-filiais');

  await expect(page.locator('h1').filter({ hasText: 'Barbearia e filiais' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Horário de funcionamento' })).toBeVisible();
  await expect(page.getByText('Configuração atual aplicada na Agenda.')).toBeVisible();
  await expect(page.getByText('Almoço da equipe')).toHaveCount(0);
  await expect(page.getByText('Bloqueio administrativo', { exact: true })).toHaveCount(0);
});

test('keeps preferences honest when persistence is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('barberos-brand-preferences');
  });

  await page.goto('/configuracoes/preferencias');

  await expect(page.locator('h1').filter({ hasText: 'Preferências' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar preferências' })).toBeVisible();
  await page.getByLabel('Cor de destaque').fill('#123456');
  await page.getByRole('button', { name: 'Salvar preferências' }).click();
  await expect(page.getByText('Não foi possível salvar no servidor.')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('barberos-brand-preferences')))
    .toBeNull();
});

test('renders billing settings without hardcoded SaaS plan data', async ({ page }) => {
  await page.goto('/configuracoes/plano-cobranca');

  await expect(page.locator('h1').filter({ hasText: 'Plano e cobrança' })).toBeVisible();
  await expect(page.locator('input[value="Sem plano ativo"]')).toBeVisible();
  await expect(page.locator('input[value="Não configurado"]')).toBeVisible();
  await expect(page.locator('input[value="Sem cobrança em aberto"]')).toBeVisible();
  await expect(page.getByText('Nenhum plano SaaS está associado a este tenant.')).toBeVisible();
  await expect(page.getByText('Pro AI')).toHaveCount(0);
  await expect(page.locator('input[value="Via Asaas"]')).toHaveCount(0);
});
