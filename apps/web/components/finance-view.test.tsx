import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentFinanceViewModel } from '../lib/finance-data';
import { FinanceView } from './finance-view';

describe('FinanceView', () => {
  test('renders mobile-first financial summary sections', () => {
    const html = renderToStaticMarkup(
      <FinanceView model={getDevelopmentFinanceViewModel(developmentSession)} />,
    );

    expect(html).toContain('finance-page');
    expect(html).toContain('finance-period-controls');
    expect(html).toContain('aria-label="Controles de período financeiro"');
    expect(html).toContain('aria-label="Periodo anterior"');
    expect(html).toContain('aria-label="Proximo período"');
    expect(html).toContain('aria-label="Ações financeiras"');
    expect(html).toContain('Indicadores financeiros');
    expect(html).toContain('Receitas');
    expect(html).toContain('Despesas');
    expect(html).toContain('Resultado');
    expect(html).toContain('Comissões abertas');
    expect(html).toContain('Planos vs Avulso');
    expect(html).toContain('Cortes, clientes e receita');
    expect(html).toContain('Clientes com plano');
    expect(html).toContain('Clientes avulsos');
    expect(html).toContain('Plano está mais vantajoso');
  });

  test('renders tablet structural regions for cash flow and payouts', () => {
    const html = renderToStaticMarkup(
      <FinanceView model={getDevelopmentFinanceViewModel(developmentSession)} />,
    );

    expect(html).toContain('finance-workspace');
    expect(html).toContain('finance-primary');
    expect(html).toContain('finance-side');
    expect(html).toContain('Fluxo de caixa');
    expect(html).toContain('Saldo de caixa');
    expect(html).toContain('Pagamentos realizados');
  });

  test('renders desktop operational detail with commissions and recent expenses', () => {
    const html = renderToStaticMarkup(
      <FinanceView model={getDevelopmentFinanceViewModel(developmentSession)} />,
    );

    expect(html).toContain('Obrigacoes abertas');
    expect(html).toContain('Valor em aberto');
    expect(html).toContain('Fechar repasse');
    expect(html).toContain('Ultimos compromissos');
    expect(html).toContain('Energia da Unidade Centro');
    expect(html).toContain('Aluguel de outubro da Unidade Centro');
  });

  test('renders empty period without expense details', () => {
    const html = renderToStaticMarkup(
      <FinanceView
        model={getDevelopmentFinanceViewModel(developmentSession, { state: 'empty' })}
      />,
    );

    expect(html).toContain('Nenhum lançamento financeiro neste período.');
    expect(html).toContain('Sem despesas registradas para este período.');
    expect(html).not.toContain('Energia da Unidade Centro');
  });

  test('renders offline state with disabled mutation actions', () => {
    const html = renderToStaticMarkup(
      <FinanceView
        model={getDevelopmentFinanceViewModel(developmentSession, { state: 'offline' })}
      />,
    );

    expect(html).toContain('Modo offline: dados financeiros pausados.');
    expect(html).toContain('Nova despesa');
    expect(html).toContain('disabled=""');
  });

  test('renders permission denied without financial amounts', () => {
    const html = renderToStaticMarkup(
      <FinanceView
        model={getDevelopmentFinanceViewModel({
          ...developmentSession,
          permissions: ['dashboard.read'],
          entitlements: ['core.operations'],
        })}
      />,
    );

    expect(html).toContain('Acesso restrito');
    expect(html).toContain('Financeiro indisponível');
    expect(html).not.toContain('R$');
    expect(html).not.toContain('Fluxo de caixa');
  });
  test('renders consolidated branch and category dashboards', () => {
    const html = renderToStaticMarkup(
      <FinanceView
        model={getDevelopmentFinanceViewModel(developmentSession, { branchId: 'all' })}
      />,
    );

    expect(html).toContain('Todas as unidades');
    expect(html).toContain('Saúde por unidade');
    expect(html).toContain('Unidade Centro');
    expect(html).toContain('Unidade Norte');
    expect(html).toContain('Entradas e saídas');
    expect(html).toContain('Marketing');
    expect(html).toContain('Origem');
  });
});
