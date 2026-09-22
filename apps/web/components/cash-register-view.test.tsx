import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentCashRegisterViewModel } from '../lib/cash-register-data';
import { CashRegisterView } from './cash-register-view';

describe('CashRegisterView', () => {
  test('renders the open cash register workspace with tablet and desktop structural regions', () => {
    const html = renderToStaticMarkup(
      <CashRegisterView model={getDevelopmentCashRegisterViewModel(developmentSession)} />,
    );

    expect(html).toContain('cash-register-workspace');
    expect(html).toContain('cash-register-primary');
    expect(html).toContain('cash-register-side');
    expect(html).toContain('Resumo do caixa');
    expect(html).toContain('Esperado');
    expect(html).toContain('Resumo por método');
    expect(html).toContain('Sangria e reforco');
    expect(html).toContain('Fechar caixa');
    expect(html).toContain('Movimentos');
    expect(html).toContain('Dinheiro');
  });

  test('renders mobile-first opening flow when no session is open', () => {
    const html = renderToStaticMarkup(
      <CashRegisterView
        model={getDevelopmentCashRegisterViewModel(developmentSession, {
          state: 'no-open-session',
        })}
      />,
    );

    expect(html).toContain('Abertura do caixa');
    expect(html).toContain('Informe troco inicial e observacao em um modal seguro.');
    expect(html).toContain('Abrir caixa');
    expect(html).toContain('Sem recebimentos registrados nesta sessao.');
    expect(html).toContain('Nenhum movimento registrado.');
  });

  test('renders closed cash register conference state', () => {
    const html = renderToStaticMarkup(
      <CashRegisterView
        model={getDevelopmentCashRegisterViewModel(developmentSession, { state: 'closed' })}
      />,
    );

    expect(html).toContain('Caixa fechado');
    expect(html).toContain('Conferido');
    expect(html).toContain('Diferenca');
    expect(html).toContain('-R$ 5,00');
    expect(html).toContain('Diferenca conferida no fechamento.');
  });

  test('renders permission denied without session details', () => {
    const html = renderToStaticMarkup(
      <CashRegisterView
        model={getDevelopmentCashRegisterViewModel({
          ...developmentSession,
          permissions: ['dashboard.read'],
          entitlements: ['core.operations'],
        })}
      />,
    );

    expect(html).toContain('Acesso restrito');
    expect(html).not.toContain('Resumo do caixa');
    expect(html).not.toContain('dev-cash-session');
  });
});
