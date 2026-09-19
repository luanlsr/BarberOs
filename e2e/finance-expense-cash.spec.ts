import { expect, test } from '@playwright/test';

test('runs cash-paid expense through cash register and finance summary', async ({ page }) => {
  await page.goto('/financeiro/despesas?status=OVERDUE');

  await expect(page.getByRole('heading', { name: 'Despesas', exact: true })).toBeVisible();
  const expensesList = page.getByRole('main', { name: 'Lista de despesas' });
  await expect(expensesList.getByRole('heading', { name: 'Lista de despesas' })).toBeVisible();
  await expect(expensesList.getByText('Honorarios contabeis de agosto')).toBeVisible();
  await expect(expensesList.getByText('R$ 650,00')).toBeVisible();

  const paymentMethod = page.getByLabel('Metodo de pagamento');
  await paymentMethod.selectOption('CASH');
  await expect(paymentMethod).toHaveValue('CASH');
  await expect(expensesList.getByRole('button', { name: 'Pagar' }).first()).toBeEnabled();
  await expensesList.getByRole('button', { name: 'Pagar' }).first().click();

  await page.goto('/caixa');
  await expect(page.getByRole('heading', { name: 'Resumo do caixa' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Movimentos' })).toBeVisible();
  await expect(page.getByText('Despesa paga em dinheiro')).toBeVisible();
  await expect(page.getByText('Honorarios contabeis de agosto')).toBeVisible();
  await expect(page.getByText('-R$ 650,00')).toBeVisible();

  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fluxo de caixa' })).toBeVisible();
  await expect(page.getByText('Saidas')).toBeVisible();
  const financeExpenses = page.getByTestId('finance-expenses');
  await expect(financeExpenses.getByText('Despesas')).toBeVisible();
  await expect(financeExpenses.getByText('Honorarios contabeis de agosto')).toBeVisible();
});
