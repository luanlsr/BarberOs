import * as React from 'react';
import {
  AlertTriangle,
  LockKeyhole,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  ProfessionalWalletAccrualModel,
  ProfessionalWalletActionModel,
  ProfessionalWalletMetricModel,
  ProfessionalWalletPayoutModel,
  ProfessionalWalletViewModel,
} from '../lib/professional-wallet-data';

export function ProfessionalWalletView({
  model,
}: Readonly<{ model: ProfessionalWalletViewModel }>) {
  if (model.state === 'permission-denied') return <WalletBoundaryState model={model} />;
  if (model.state === 'error') return <WalletBoundaryState model={model} />;

  return (
    <div className="wallet-page">
      <header className="wallet-heading">
        <div>
          <p className="eyebrow">
            {model.canViewElevated ? 'Carteira profissional' : 'Minha carteira'}
          </p>
          <h1>{model.professionalName}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <WalletActions actions={model.allowedActions} />
      </header>

      {model.canViewElevated ? (
        <div className="wallet-elevated-banner">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Visao elevada para gestao, restrita ao profissional selecionado.</span>
        </div>
      ) : null}
      {model.state === 'offline' ? (
        <WalletInlineState text="Modo offline: valores serao atualizados quando a conexao voltar." />
      ) : null}
      {model.state === 'empty' ? (
        <WalletInlineState text="Nenhuma producao comissionada encontrada neste periodo." />
      ) : null}

      <section className="wallet-metric-grid" aria-label="Resumo da carteira">
        {model.metrics.map((metric) => (
          <WalletMetric key={metric.label} metric={metric} />
        ))}
      </section>

      <div className="wallet-workspace" aria-label="Carteira profissional responsiva">
        <main className="wallet-primary" aria-label="Comissoes da carteira">
          <WalletAccruals accruals={model.accruals} />
        </main>
        <aside className="wallet-side" aria-label="Repasses da carteira">
          <WalletBalance model={model} />
          <WalletPayouts payouts={model.payouts} />
        </aside>
      </div>
    </div>
  );
}

function WalletActions({
  actions,
}: Readonly<{ actions: readonly ProfessionalWalletActionModel[] }>) {
  return (
    <div className="wallet-heading-actions" aria-label="Acoes da carteira">
      {actions.map((action) => (
        <button
          className="button button-secondary"
          disabled={!action.enabled}
          key={action.id}
          title={action.reason}
          type="button"
        >
          {action.id === 'wallet.refresh' ? (
            <RefreshCcw size={16} aria-hidden="true" />
          ) : (
            <WalletCards size={16} aria-hidden="true" />
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function WalletMetric({ metric }: Readonly<{ metric: ProfessionalWalletMetricModel }>) {
  return (
    <article className={'wallet-metric wallet-tone-' + metric.tone}>
      <span>{metric.label}</span>
      <strong>{metric.amountLabel}</strong>
    </article>
  );
}

function WalletAccruals({
  accruals,
}: Readonly<{ accruals: readonly ProfessionalWalletAccrualModel[] }>) {
  return (
    <section className="wallet-panel" aria-labelledby="wallet-accruals-title">
      <div className="wallet-panel-heading">
        <div>
          <p className="eyebrow">Producao</p>
          <h2 id="wallet-accruals-title">Comissoes do periodo</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {accruals.length ? (
        <div className="wallet-accrual-list">
          {accruals.map((accrual) => (
            <article className="wallet-accrual-row" key={accrual.id}>
              <div>
                <strong>{accrual.orderLabel}</strong>
                <span>
                  Base {accrual.baseAmountLabel} · Gerada {accrual.accruedAtLabel}
                </span>
              </div>
              <div>
                <StatusBadge variant={statusBadgeVariant(accrual.statusTone)}>
                  {accrual.statusLabel}
                </StatusBadge>
                <b>{accrual.commissionAmountLabel}</b>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="wallet-muted">Sem comissoes para este periodo.</p>
      )}
    </section>
  );
}

function WalletBalance({ model }: Readonly<{ model: ProfessionalWalletViewModel }>) {
  return (
    <section className="wallet-panel" aria-labelledby="wallet-balance-title">
      <div className="wallet-panel-heading">
        <div>
          <p className="eyebrow">Saldo</p>
          <h2 id="wallet-balance-title">A receber</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      <dl className="wallet-balance-list">
        <div>
          <dt>Producao</dt>
          <dd>{model.productionAmountLabel}</dd>
        </div>
        <div>
          <dt>Em aberto</dt>
          <dd>{model.openCommissionAmountLabel}</dd>
        </div>
        <div>
          <dt>Pago</dt>
          <dd>{model.paidPayoutAmountLabel}</dd>
        </div>
        <div className="wallet-balance-total">
          <dt>Saldo esperado</dt>
          <dd>{model.expectedBalanceAmountLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

function WalletPayouts({
  payouts,
}: Readonly<{ payouts: readonly ProfessionalWalletPayoutModel[] }>) {
  return (
    <section className="wallet-panel" aria-labelledby="wallet-payouts-title">
      <div className="wallet-panel-heading">
        <div>
          <p className="eyebrow">Repasses</p>
          <h2 id="wallet-payouts-title">Pagamentos recebidos</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      {payouts.length ? (
        <div className="wallet-payout-list">
          {payouts.map((payout) => (
            <article className="wallet-payout-row" key={payout.id}>
              <div>
                <strong>{payout.periodLabel}</strong>
                <span>
                  {payout.paymentMethodLabel ?? 'Metodo nao informado'}
                  {payout.paidAtLabel ? ' · Pago ' + payout.paidAtLabel : ''}
                </span>
              </div>
              <div>
                <StatusBadge variant={statusBadgeVariant(payout.statusTone)}>
                  {payout.statusLabel}
                </StatusBadge>
                <b>{payout.totalAmountLabel}</b>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="wallet-muted">Nenhum repasse pago neste periodo.</p>
      )}
    </section>
  );
}

function WalletInlineState({ text }: Readonly<{ text: string }>) {
  return (
    <div className="wallet-inline-state" role="status">
      <AlertTriangle size={17} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function WalletBoundaryState({ model }: Readonly<{ model: ProfessionalWalletViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="wallet-boundary-state" aria-labelledby="wallet-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="wallet-boundary-title">{denied ? 'Carteira indisponivel' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

function statusBadgeVariant(tone: 'neutral' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return 'warning';
  return tone;
}
