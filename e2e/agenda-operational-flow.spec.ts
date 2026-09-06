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
  await page.waitForURL('**/');

  await page.goto('/agenda?mode=new');
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  const flow = page.getByRole('region', { name: 'Novo agendamento' });
  const form = flow.locator('.new-appointment-form');
  await expect(flow).toBeVisible();

  await form.getByLabel('Novo cliente').check();
  await form.getByLabel('Nome do cliente').fill('Camila Operacional');
  await form.getByLabel('Telefone').fill('(11) 98888-3030');
  await form.getByLabel('Servico').selectOption('dev-service-cut');
  await form.getByLabel('Profissional').selectOption('dev-professional-carlos');
  await form.getByLabel('Horario').selectOption('12:00');
  await page.getByRole('button', { name: 'Criar agendamento' }).click();

  await expect(flow.getByRole('status')).toContainText('Agendamento criado para Camila Operacional');
  await expect(form.getByLabel('Horario')).toContainText('12:00 - ocupado por Camila Operacional');

  await flow.getByRole('button', { name: 'Cancelar agendamento' }).click();
  await expect(flow.getByRole('status')).toContainText('Agendamento cancelado. Horario 12:00 liberado.');
  await expect(form.getByLabel('Horario')).not.toContainText('12:00 - ocupado por Camila Operacional');

  await page.getByRole('button', { name: 'Criar agendamento' }).click();
  await expect(flow.getByRole('status')).toContainText('Agendamento criado para Camila Operacional');
});