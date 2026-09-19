import { expect, test } from '@playwright/test';

const openOrderResponse = {
  data: { id: 'dev-order-1001' },
  requestId: 'e2e-inventory-order-request',
};

test('runs walk-in through catalog product payment, stock movement and finance summary', async ({
  page,
}) => {
  let createdWalkIn = false;
  let addedProductItem = false;
  let receivedPayment = false;

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
      sourceId?: string;
      name?: string;
      quantity?: number;
      unitPriceAmountCents?: number;
    };
    expect(payload).toMatchObject({
      sourceType: 'PRODUCT',
      sourceId: 'dev-product-pomade',
      name: 'Pomada Matte 80g',
      quantity: 1,
      unitPriceAmountCents: 4500,
    });
    addedProductItem = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify(openOrderResponse),
    });
  });

  await page.route('**/api/v1/payments', async (route) => {
    const payload = route.request().postDataJSON() as {
      orderId?: string;
      payments?: Array<{ method?: string; amountCents?: number }>;
    };
    expect(payload.orderId).toBe('dev-order-1001');
    expect(payload.payments?.[0]?.amountCents).toBeGreaterThan(0);
    receivedPayment = true;
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        data: {
          orderId: 'dev-order-1001',
          paymentIds: ['payment-e2e-product'],
          paidAmountCents: payload.payments?.reduce(
            (total, payment) => total + (payment.amountCents ?? 0),
            0,
          ),
          amountDueCents: 0,
          status: 'PAID',
        },
        requestId: 'e2e-product-payment-request',
      }),
    });
  });

  await page.goto('/comandas?state=empty');
  await page.getByRole('button', { name: 'Abrir walk-in' }).click();
  const walkIn = page.getByRole('dialog', { name: 'Nova Comanda' });
  await walkIn.getByLabel('Consumidor avulso').check();
  await walkIn.getByRole('button', { name: 'Abrir walk-in' }).click();
  await page.waitForURL('**/comandas?orderId=dev-order-1001');
  expect(createdWalkIn).toBe(true);

  await page.getByRole('button', { name: 'Adicionar item' }).click();
  const addItem = page.getByRole('dialog', { name: 'Adicionar item' });
  await addItem.getByLabel('Buscar produto').fill('pomada');
  await addItem.getByRole('button', { name: /Pomada Matte 80g/ }).click();
  await expect(addItem.getByLabel('Tipo')).toHaveValue('PRODUCT');
  await expect(addItem.getByPlaceholder('Ex.: Agua, pomada, ajuste')).toHaveValue(
    'Pomada Matte 80g',
  );
  await addItem.getByRole('button', { name: 'Adicionar' }).click();
  await expect.poll(() => addedProductItem).toBe(true);
  await page.waitForURL('**/comandas?orderId=dev-order-1001');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Resumo e pagamento/ }).dispatchEvent('click');
  const paymentDialog = page.getByRole('dialog', { name: 'Resumo e pagamento' });
  await expect(paymentDialog).toBeVisible();
  await paymentDialog.getByRole('button', { name: 'Receber pagamento' }).click();

  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.getByText('Pagamento registrado. Atualizando Comanda...')).toBeVisible();
  expect(receivedPayment).toBe(true);
  await page.waitForTimeout(1200);

  await page.goto('/estoque', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
  await expect(
    page.getByTestId('movement-history').getByText('Venda · -1 · Comanda'),
  ).toBeVisible();

  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(page.getByTestId('finance-cash-flow').getByText('Entradas')).toBeVisible();
  await expect(page.getByText(/lancamentos conciliados no periodo/)).toBeVisible();
});

test('runs low stock product through stock entry and resolved alert state', async ({ page }) => {
  await page.goto('/estoque');
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
  await expect(page.getByTestId('low-stock-alerts').getByText('Coca-Cola lata')).toBeVisible();
  await expect(page.getByTestId('low-stock-alerts').getByText('Lamina Derby')).toBeVisible();

  await page.getByRole('button', { name: 'Entrada' }).click();
  const entry = page.getByRole('dialog', { name: 'Entrada de estoque' });
  await entry.getByLabel('Produto').selectOption('dev-product-soda');
  await entry.getByLabel('Quantidade').fill('16');
  await entry.getByLabel('Motivo').fill('Reposicao de bebidas');
  await entry.getByRole('button', { name: 'Registrar' }).click();
  await page.waitForURL('**/estoque?state=restocked');

  await expect(page.getByTestId('low-stock-alerts')).toContainText(
    'Nenhum alerta ativo nesta unidade.',
  );
  await expect(page.getByText('20 un. (min. 12)')).toBeVisible();
  await expect(page.getByTestId('movement-history').getByText('Coca-Cola lata')).toBeVisible();
  await expect(
    page.getByTestId('movement-history').getByText('Entrada · +16 · Manual'),
  ).toBeVisible();
});
