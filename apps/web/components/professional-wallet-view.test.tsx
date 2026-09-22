import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentProfessionalWalletViewModel } from '../lib/professional-wallet-data';
import { ProfessionalWalletView } from './professional-wallet-view';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function professionalSession(overrides: Partial<SessionContext> = {}): SessionContext {
  return sessionWith({
    userId: 'dev-professional-lucas',
    role: 'PROFESSIONAL',
    permissions: ['commission.read'],
    entitlements: ['finance'],
    branchScope: ['dev-branch'],
    activeBranchId: 'dev-branch',
    userName: 'Lucas Pereira',
    ...overrides,
  });
}

describe('ProfessionalWalletView', () => {
  test('renders professional-only own wallet values', () => {
    const html = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession())}
      />,
    );

    expect(html).toContain('Minha carteira');
    expect(html).toContain('aria-label="Ações da carteira"');
    expect(html).toContain('aria-label="Resumo da carteira"');
    expect(html).toContain('aria-label="Carteira profissional responsiva"');
    expect(html).toContain('Lucas Pereira');
    expect(html).toContain('Producao');
    expect(html).toContain('R$ 145,00');
    expect(html).toContain('Comissões abertas');
    expect(html).toContain('R$ 42,50');
    expect(html).toContain('Repasses pagos');
    expect(html).toContain('R$ 30,00');
    expect(html).toContain('Saldo esperado');
    expect(html).toContain('Comanda #1002');
    expect(html).toContain('Comanda #1005');
  });

  test('renders elevated viewer state without exposing tenant-wide finance', () => {
    const html = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(developmentSession, {
          professionalId: 'dev-professional-lucas',
        })}
      />,
    );

    expect(html).toContain('Carteira profissional');
    expect(html).toContain('Visão elevada para gestão, restrita ao profissional selecionado.');
    expect(html).toContain('Lucas Pereira');
    expect(html).not.toContain('Carlos Andrade');
    expect(html).not.toContain('Resultado');
  });

  test('renders payout details for the selected professional', () => {
    const html = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession())}
      />,
    );

    expect(html).toContain('Pagamentos recebidos');
    expect(html).toContain('01/09/2026 - 06/09/2026');
    expect(html).toContain('PIX');
    expect(html).toContain('Pago');
  });

  test('renders permission denied for cross-professional wallet requests', () => {
    const html = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession(), {
          professionalId: 'dev-professional-carlos',
        })}
      />,
    );

    expect(html).toContain('Acesso restrito');
    expect(html).toContain('Carteira indisponível');
    expect(html).not.toContain('R$');
    expect(html).not.toContain('Carlos Andrade');
  });

  test('renders empty and offline states without wallet leakage', () => {
    const empty = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession(), {
          state: 'empty',
        })}
      />,
    );
    const offline = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession(), {
          state: 'offline',
        })}
      />,
    );

    expect(empty).toContain('Nenhuma produção comissionada encontrada neste período.');
    expect(empty).toContain('Sem comissões para este período.');
    expect(offline).toContain('Modo offline: valores serão atualizados quando a conexão voltar.');
    expect(offline).toContain('disabled=""');
  });

  test('renders error boundary without production details', () => {
    const html = renderToStaticMarkup(
      <ProfessionalWalletView
        model={getDevelopmentProfessionalWalletViewModel(professionalSession(), {
          state: 'error',
        })}
      />,
    );

    expect(html).toContain('Falha ao carregar');
    expect(html).toContain('Carteira profissional local indisponível.');
    expect(html).not.toContain('Comanda #1002');
  });
});
