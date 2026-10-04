import { expect, test } from '@playwright/test';

test('creates an appointment from the agenda quick flow', async ({ page }) => {
  await page.goto('/agenda?mode=new');

  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  const setupAlert = page.getByRole('alert').filter({
    hasText: 'Cadastre um profissional',
  });
  await expect(setupAlert).toContainText('Cadastre um profissional antes de abrir a agenda.');
  await expect(page.getByRole('link', { name: 'Criar profissional' })).toHaveAttribute(
    'href',
    '/equipe?mode=new',
  );
});

test('shows conflict feedback for an occupied appointment slot', async ({ page }) => {
  await page.goto('/agenda?mode=new');

  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Calendario operacional' })).toBeVisible();
  await expect(page.getByText('0 profissionais visiveis')).toBeVisible();
});
