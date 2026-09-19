import { expect, test } from '@playwright/test';

const openOrderResponse = {
  data: { id: 'dev-order-1001' },
  requestId: 'e2e-order-request',
};

test('runs agenda check-in through Comanda payment, finance, commission payout and cash register', async ({
  page,
}) => {
  let receivedPayment = false;

  await page.route('**/api/v1/check-in', async (route) => {
    const payload = route.request().postDataJSON() as { appointmentId?: string };
    expect(payload.appointmentId).toBeTruthy();
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(openOrderResponse),
    });
  });

  await page.route('**/api/v1/payments', async (route) => {
    const payload = route.request().postDataJSON() as {
      orderId?: string;
      payments?: Array<{ method?: string; amountCents?: number; cashReceivedAmountCents?: number }>;
    };
    expect(payload.orderId).toBe('dev-order-1001');
    expect(payload.payments).toEqual([
      { method: 'CASH', amountCents: 12_700, cashReceivedAmountCents: 12_700 },
    ]);
    receivedPayment = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        data: {
          orderId: 'dev-order-1001',
          paymentIds: ['payment-e2e-1'],
          paidAmountCents: 12_700,
          amountDueCents: 0,
          status: 'PAID',
        },
        requestId: 'e2e-payment-request',
      }),
    });
  });

  await page.goto('/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Check-in' }).first().click();
  await page.waitForURL('**/comandas?orderId=dev-order-1001');

  await expect(page.getByRole('heading', { name: 'Comanda #1001' })).toBeVisible();
  await expect(page.getByText('Joao Silva', { exact: true })).toBeVisible();
  await expect(page.getByText('Corte Masculino')).toBeVisible();
  await expect(page.getByText('Total aberto')).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.getByText('Pagamento registrado. Atualizando Comanda...')).toBeVisible();
  expect(receivedPayment).toBe(true);
  await page.waitForTimeout(1200);

  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fluxo de caixa' })).toBeVisible();
  await expect(page.getByText('Comissoes abertas')).toBeVisible();

  await page.goto('/financeiro/comissoes?scenario=closed-payout');
  await expect(page.getByRole('heading', { name: 'Comissoes/Repasses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fechamento e pagamento' })).toBeVisible();
  await expect(page.getByText('Repasse fechado aguardando pagamento.')).toBeVisible();
  await expect(
    page.getByText('Pagamento em dinheiro exige caixa aberto da mesma unidade.'),
  ).toBeVisible();
  const payoutPanel = page.getByRole('complementary', {
    name: 'Fechamento e pagamento de repasses',
  });
  await expect(payoutPanel.getByRole('button', { name: 'Pagar repasse' })).toBeEnabled();
  await payoutPanel.getByRole('button', { name: 'Pagar repasse' }).click();

  await page.goto('/caixa');
  await expect(page.getByRole('heading', { name: 'Resumo do caixa' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumo por metodo' })).toBeVisible();
  await expect(page.getByText('Dinheiro', { exact: true })).toBeVisible();
});

test('runs walk-in through manual item, split payment and cash register', async ({ page }) => {
  let createdWalkIn = false;
  let addedManualItem = false;
  let receivedSplitPayment = false;

  await page.route('**/api/v1/orders', async (route) => {
    const payload = route.request().postDataJSON() as { branchId?: string; customerId?: string };
    expect(payload.branchId).toBe('dev-branch');
    expect(payload.customerId).toBeUndefined();
    createdWalkIn = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify(openOrderResponse),
    });
  });

  await page.route('**/api/v1/orders/*/items', async (route) => {
    const payload = route.request().postDataJSON() as {
      sourceType?: string;
      name?: string;
      quantity?: number;
      unitPriceAmountCents?: number;
    };
    expect(payload.sourceType).toBe('MANUAL');
    expect(payload.name).toBe('Agua mineral');
    expect(payload.quantity).toBe(2);
    expect(payload.unitPriceAmountCents).toBe(500);
    addedManualItem = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify(openOrderResponse),
    });
  });

  await page.route('**/api/v1/payments', async (route) => {
    const payload = route.request().postDataJSON() as {
      orderId?: string;
      payments?: Array<{ method?: string; amountCents?: number; cashReceivedAmountCents?: number }>;
    };
    expect(payload.orderId).toBe('dev-order-1001');
    expect(payload.payments).toEqual([
      { method: 'CASH', amountCents: 7_000, cashReceivedAmountCents: 7_000 },
      { method: 'PIX', amountCents: 5_700 },
    ]);
    receivedSplitPayment = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        data: {
          orderId: 'dev-order-1001',
          paymentIds: ['payment-e2e-cash', 'payment-e2e-pix'],
          paidAmountCents: 12_700,
          amountDueCents: 0,
          status: 'PAID',
        },
        requestId: 'e2e-split-payment-request',
      }),
    });
  });

  await page.goto('/comandas?state=empty#nova-comanda');
  const walkIn = page.getByRole('region', { name: 'Nova Comanda' });
  await expect(walkIn).toBeVisible();
  await walkIn.getByLabel('Consumidor avulso').check();
  await walkIn.getByRole('button', { name: 'Abrir walk-in' }).click();
  await page.waitForURL('**/comandas?orderId=dev-order-1001');
  expect(createdWalkIn).toBe(true);

  const addItem = page.getByRole('region', { name: 'Adicionar item' });
  await page.waitForTimeout(1200);
  const itemName = addItem.getByPlaceholder('Ex.: Agua, pomada, ajuste');
  await itemName.click();
  await page.keyboard.type('Agua mineral');
  await expect(itemName).toHaveValue('Agua mineral');
  await addItem.getByLabel('Valor unitario').fill('5,00');
  await addItem.getByLabel('Qtd.').fill('2');
  await addItem.getByRole('button', { name: 'Adicionar' }).click();
  await expect.poll(() => addedManualItem).toBe(true);
  await page.waitForURL('**/comandas?orderId=dev-order-1001');

  await page.getByLabel('Valor da forma 1').fill('70,00');
  await expect(page.getByRole('button', { name: 'Adicionar forma' })).toBeEnabled();
  await page.getByRole('button', { name: 'Adicionar forma' }).click();
  await page.getByLabel('Metodo').nth(1).selectOption('PIX');
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.getByText('Pagamento registrado. Atualizando Comanda...')).toBeVisible();
  expect(receivedSplitPayment).toBe(true);
  await page.waitForTimeout(1200);

  await page.goto('/caixa');
  await expect(page.getByRole('heading', { name: 'Resumo do caixa' })).toBeVisible();
  await expect(page.getByText('PIX')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Movimentos' })).toBeVisible();
});
