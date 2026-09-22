import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentExpensesViewModel } from '../lib/expense-data';
import { ExpenseView } from './expense-view';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('ExpenseView', () => {
  test('renders expense list with filters, categories, dates and recurrence summaries', () => {
    const html = renderToStaticMarkup(
      <ExpenseView model={getDevelopmentExpensesViewModel(developmentSession)} />,
    );

    expect(html).toContain('expenses-workspace');
    expect(html).toContain('Lista de despesas');
    expect(html).toContain('Status');
    expect(html).toContain('Todas');
    expect(html).toContain('Abertas');
    expect(html).toContain('Vencidas');
    expect(html).toContain('Pagas');
    expect(html).toContain('Energia da Unidade Centro');
    expect(html).toContain('Aluguel de outubro da Unidade Centro');
    expect(html).toContain('Honorarios contabeis de agosto');
    expect(html).toContain('Vence 10/09/2026');
    expect(html).toContain('Mensal até 01/12/2026');
  });

  test('keeps expense forms and details in modals instead of inline drawers', () => {
    const html = renderToStaticMarkup(
      <ExpenseView model={getDevelopmentExpensesViewModel(developmentSession)} />,
    );

    expect(html).toContain('aria-label="Ações de despesas"');
    expect(html).toContain('Nova despesa');
    expect(html).toContain('Detalhes');
    expect(html).toContain('aria-label="Resumo da despesa"');
    expect(html).not.toContain('expenses-form-drawer');
    expect(html).not.toContain('aria-label="Categoria da despesa"');
    expect(html).not.toContain('Cadastrar despesa');
  });

  test('renders loading state with disabled actions', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(developmentSession, { state: 'loading' })}
      />,
    );

    expect(html).toContain('Carregando despesas...');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Sem despesas para o filtro atual.');
  });

  test('renders empty state with creation available through modal action', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(developmentSession, { state: 'empty' })}
      />,
    );

    expect(html).toContain('Nenhuma despesa encontrada para este período.');
    expect(html).toContain('Nova despesa');
    expect(html).not.toContain('Cadastrar despesa');
    expect(html).not.toContain('Energia da Unidade Centro');
  });

  test('renders offline state without money-changing actions', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(developmentSession, { state: 'offline' })}
      />,
    );

    expect(html).toContain('Modo offline: pagamentos e cancelamentos pausados.');
    expect(html).toContain('Nova despesa');
    expect(html).toContain('Pagar selecionada');
    expect(html).toContain('disabled=""');
  });

  test('renders error state without exposing expense details', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(developmentSession, { state: 'error' })}
      />,
    );

    expect(html).toContain('Falha ao carregar');
    expect(html).toContain('Despesas locais indisponíveis.');
    expect(html).not.toContain('Energia da Unidade Centro');
  });

  test('renders permission denied without amounts, categories or expenses', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(
          sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
        )}
      />,
    );

    expect(html).toContain('Acesso restrito');
    expect(html).toContain('Despesas indisponíveis');
    expect(html).not.toContain('R$');
    expect(html).not.toContain('Aluguel');
  });

  test('renders disabled row mutations for read-only finance users', () => {
    const html = renderToStaticMarkup(
      <ExpenseView
        model={getDevelopmentExpensesViewModel(
          sessionWith({ permissions: ['finance.read'], role: 'FINANCE' }),
        )}
      />,
    );

    expect(html).toContain('Nova despesa');
    expect(html).toContain('Pagar');
    expect(html).toContain('Cancelar');
    expect(html).toContain('disabled=""');
  });
});
