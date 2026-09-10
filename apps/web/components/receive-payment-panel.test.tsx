import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentComandaViewModel } from '../lib/order-data';
import { ReceivePaymentPanel } from './receive-payment-panel';

type RenderResult = {
  container: HTMLDivElement;
  root: Root;
};

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  return { container, root };
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('ReceivePaymentPanel', () => {
  beforeEach(() => {
    setOnline(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    setOnline(true);
  });

  test('posts payment payload and shows success feedback', async () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'PAID' }, requestId: 'request-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onPaymentSuccess = vi.fn();

    const { container } = render(
      <ReceivePaymentPanel
        orderId={model.order?.id ?? 'missing-order'}
        paymentSummary={model.order!.paymentSummary}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );
    container
      .querySelector('form.order-payment-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/payments',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({
      orderId: 'dev-order-1001',
      payments: [{ method: 'CASH', amountCents: 12_700, cashReceivedAmountCents: 12_700 }],
    });

    await vi.waitFor(() =>
      expect(container.textContent).toContain('Pagamento registrado. Atualizando Comanda...'),
    );
    await vi.waitFor(() => expect(onPaymentSuccess).toHaveBeenCalledWith('dev-order-1001'));
  });

  test('shows recoverable API failure feedback', async () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'PAYMENT_AMOUNT_DUE_MISMATCH',
              message: 'Valor restante mudou.',
              requestId: 'request-2',
            },
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const { container } = render(
      <ReceivePaymentPanel
        orderId={model.order?.id ?? 'missing-order'}
        paymentSummary={model.order!.paymentSummary}
      />,
    );
    container
      .querySelector('form.order-payment-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(container.textContent).toContain('Valor restante mudou.'));
    expect(container.textContent).toContain('PAYMENT_AMOUNT_DUE_MISMATCH');
    expect(container.textContent).toContain('request-2');
  });

  test('disables payment while offline or permission denied', () => {
    setOnline(false);
    const offline = getDevelopmentComandaViewModel(developmentSession, { state: 'offline' });
    const offlineResult = render(
      <ReceivePaymentPanel
        orderId={offline.order?.id ?? 'missing-order'}
        paymentSummary={offline.order!.paymentSummary}
      />,
    );

    expect(offlineResult.container.textContent).toContain(
      'Voce esta offline. Pagamento precisa de conexao.',
    );
    expect(offlineResult.container.querySelector('button.order-payment-button')).toHaveProperty(
      'disabled',
      true,
    );

    const permissionDenied = getDevelopmentComandaViewModel({
      ...developmentSession,
      permissions: ['orders.read'],
      entitlements: ['core.operations'],
    });
    const deniedResult = render(
      <ReceivePaymentPanel
        orderId={permissionDenied.order?.id ?? 'missing-order'}
        paymentSummary={permissionDenied.order!.paymentSummary}
      />,
    );

    expect(deniedResult.container.textContent).toContain('Seu perfil nao pode receber pagamentos.');
    expect(deniedResult.container.querySelector('button.order-payment-button')).toHaveProperty(
      'disabled',
      true,
    );
  });
});
