import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { getDevelopmentCommissionsViewModel } from '../lib/commission-data';
import { developmentSession } from '../lib/dev-session';
import { CommissionView } from './commission-view';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('CommissionView', () => {
  test('renders rule management with precedence, filters and open accruals', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, {
          scenario: 'open-accrual',
        })}
      />,
    );

    expect(html).toContain('Secoes');
    expect(html).toContain('Tudo');
    expect(html).toContain('Regras');
    expect(html).toContain('Comissões');
    expect(html).toContain('Repasses');
    expect(html).toContain('Ordem das regras');
    expect(html).toContain('Item específico');
    expect(html).toContain('Serviço ou produto');
    expect(html).toContain('Profissional');
    expect(html).toContain('Padrao');
    expect(html).toContain('Regras ativas');
    expect(html).toContain('Padrao da unidade');
    expect(html).toContain('Serviço específico');
    expect(html).toContain('Lucas Pereira');
    expect(html).toContain('Comanda #1002');
    expect(html).toContain('Serviço - 50%');
  });

  test('renders payout actions as modal triggers with cash-payment warning', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, {
          scenario: 'open-accrual',
        })}
      />,
    );

    expect(html).toContain('aria-label="Ações de comissões"');
    expect(html).toContain('aria-label="Repasses"');
    expect(html).toContain('Ações por modal');
    expect(html).toContain('Fechar repasse');
    expect(html).toContain('Pagamento em dinheiro exige caixa aberto da mesma unidade.');
    expect(html).toContain('Pagar repasse');
    expect(html).not.toContain('commissions-payout-drawer');
    expect(html).not.toContain('Sessao de caixa');
  });

  test('renders no-rule diagnostics with rule creation and details modal trigger', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, {
          scenario: 'no-rule',
        })}
      />,
    );

    expect(html).toContain('Itens sem regra');
    expect(html).toContain('Pomada matte');
    expect(html).toContain('Ver diagnostico');
    expect(html).toContain('Criar regra para item');
    expect(html).toContain('disabled=""');
  });

  test('renders closed payout with payment action enabled', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, {
          scenario: 'closed-payout',
        })}
      />,
    );

    expect(html).toContain('Repasse fechado aguardando pagamento.');
    expect(html).toContain('Fechado');
    expect(html).toContain('Lucas Pereira');
    expect(html).toContain('R$ 42,50');
    expect(html).toContain('Pagar repasse');
  });

  test('renders paid payout immutability and correction path', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, {
          scenario: 'paid-payout',
        })}
      />,
    );

    expect(html).toContain('Repasse pago com histórico financeiro preservado.');
    expect(html).toContain('Pago');
    expect(html).toContain('Carlos Andrade');
    expect(html).toContain('PIX');
    expect(html).toContain('Repasse pago preserva histórico; use correcao auditável.');
    expect(html).toContain('Corrigir');
  });

  test('renders offline state with disabled payout mutations', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(developmentSession, { state: 'offline' })}
      />,
    );

    expect(html).toContain('Modo offline: fechamento e pagamento de repasses pausados.');
    expect(html).toContain('Nova regra');
    expect(html).toContain('Fechar repasse');
    expect(html).toContain('disabled=""');
  });

  test('renders permission denied without commission data', () => {
    const html = renderToStaticMarkup(
      <CommissionView
        model={getDevelopmentCommissionsViewModel(
          sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
        )}
      />,
    );

    expect(html).toContain('Acesso restrito');
    expect(html).toContain('Comissões indisponíveis');
    expect(html).not.toContain('R$');
    expect(html).not.toContain('Lucas Pereira');
  });
});
