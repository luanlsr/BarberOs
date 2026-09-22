import * as React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentCashRegisterViewModel } from '../lib/cash-register-data';
import { getDevelopmentComandaViewModel } from '../lib/order-data';
import { CashRegisterView } from './cash-register-view';
import { ReceivePaymentPanel } from './receive-payment-panel';

describe('payment and cash accessibility affordances', () => {
  test('renders explicit payment labels and disabled controls', () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const html = renderToStaticMarkup(
      <ReceivePaymentPanel
        orderId={model.order!.id}
        paymentSummary={model.order!.paymentSummary}
      />,
    );

    expect(html).toContain('order-payment-open-button');
    expect(html).not.toContain('aria-label="Valor da forma 1"');
    expect(html).not.toContain('aria-label="Dinheiro recebido na forma 1"');
    expect(html).not.toContain('order-payment-form');

    const denied = getDevelopmentComandaViewModel({
      ...developmentSession,
      permissions: ['orders.read'],
      entitlements: ['core.operations'],
    });
    const deniedHtml = renderToStaticMarkup(
      <ReceivePaymentPanel
        orderId={denied.order!.id}
        paymentSummary={denied.order!.paymentSummary}
      />,
    );

    expect(deniedHtml).toContain('Seu perfil não pode receber pagamentos.');
    expect(deniedHtml).toContain('disabled=""');
  });

  test('renders explicit cash register labels and disabled controls', () => {
    const openHtml = renderToStaticMarkup(
      <CashRegisterView
        model={getDevelopmentCashRegisterViewModel(developmentSession, {
          state: 'no-open-session',
        })}
      />,
    );

    expect(openHtml).toContain('Informe troco inicial e observacao em um modal seguro.');
    expect(openHtml).not.toContain('aria-label="Troco inicial do caixa"');
    expect(openHtml).not.toContain('aria-label="Observacao da abertura"');
    expect(openHtml).toContain('Abrir caixa');

    const readOnlyHtml = renderToStaticMarkup(
      <CashRegisterView
        model={getDevelopmentCashRegisterViewModel({
          ...developmentSession,
          permissions: ['finance.read'],
          entitlements: ['finance'],
        })}
      />,
    );

    expect(readOnlyHtml).toContain('Sangria e reforco');
    expect(readOnlyHtml).not.toContain('aria-label="Valor de Sangria"');
    expect(readOnlyHtml).not.toContain('aria-label="Motivo de Reforco"');
  });

  test('keeps payment and cash controls touch-sized with visible focus states', () => {
    const css = readFileSync('apps/web/app/globals.css', 'utf8');

    expect(css).toMatch(/\.order-payment-line input,[\s\S]*?min-height: 44px;/);
    expect(css).toMatch(/\.cash-register-form input,[\s\S]*?min-height: 44px;/);
    expect(css).toContain('.order-payment-line input:focus');
    expect(css).toContain('.cash-register-form input:focus');
    expect(css).toContain('border-color: var(--accent);');
  });
});
