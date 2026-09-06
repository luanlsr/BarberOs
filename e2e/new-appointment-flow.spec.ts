import { expect, test } from '@playwright/test';

test('creates an appointment from the agenda quick flow', async ({ page }) => {
  await page.goto('/agenda?mode=new');

  const flow = page.getByRole('region', { name: 'Novo agendamento' });
  await expect(flow).toBeVisible();
  const form = flow.locator('.new-appointment-form');

  await form.getByLabel('Novo cliente').check();
  await form.getByLabel('Nome do cliente').fill('Ana Teste');
  await form.getByLabel('Telefone').fill('(11) 99999-1010');
  await form.getByLabel('Servico').selectOption('dev-service-cut');
  await form.getByLabel('Profissional').selectOption('dev-professional-carlos');
  await form.getByLabel('Horario').selectOption('12:00');
  await page.getByRole('button', { name: 'Criar agendamento' }).click();

  await expect(flow.getByRole('status')).toContainText('Agendamento criado para Ana Teste');
});

test('shows conflict feedback for an occupied appointment slot', async ({ page }) => {
  await page.goto('/agenda?mode=new');

  const flow = page.getByRole('region', { name: 'Novo agendamento' });
  const form = flow.locator('.new-appointment-form');

  await form.getByLabel('Profissional').selectOption('dev-professional-carlos');
  await form.getByLabel('Horario').selectOption('09:00');
  await expect(flow.getByRole('alert')).toContainText('Horario ocupado por Marcos Vinicius');

  await page.getByRole('button', { name: 'Criar agendamento' }).click();

  await expect(flow.getByText('Codigo APPOINTMENT_CONFLICT')).toBeVisible();
});
