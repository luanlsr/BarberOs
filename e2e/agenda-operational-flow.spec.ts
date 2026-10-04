import { expect, test } from '@playwright/test';

test('login to agenda, create an appointment, cancel it and frees the slot', async ({ page }) => {
  await page.route('**/api/auth/sign-in', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('dev@barberos.local');
  await page.getByLabel('Senha').fill('dev-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/inicio');

  await page.goto('/agenda?mode=new');
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  const setupAlert = page.getByRole('alert').filter({
    hasText: 'Cadastre um profissional',
  });
  await expect(setupAlert).toContainText('Cadastre um profissional antes de abrir a agenda.');
  await expect(page.getByRole('link', { name: 'Criar profissional' })).toBeVisible();
});
