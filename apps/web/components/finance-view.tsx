import * as React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  LockKeyhole,
  Plus,
  ReceiptText,
  RefreshCcw,
  WalletCards,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  FinanceActionModel,
  FinanceExpenseModel,
  FinanceMetricModel,
  FinanceViewModel,
} from '../lib/finance-data';
import { FinanceSectionTabs } from './finance-section-tabs';

export function FinanceView({ model }: Readonly<{ model: FinanceViewModel }>) {
  if (model.state === 'permission-denied') return <FinanceBoundaryState model={model} />;
  if (model.state === 'error') return <FinanceBoundaryState model={model} />;

  return (
    <div className="finance-page">
      <header className="finance-heading">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <FinanceActions actions={model.allowedActions} />
      </header>

      <FinanceSectionTabs active="summary" />

      <section
        className="finance-period-panel"
        aria-label="Controles de periodo financeiro"
        data-testid="finance-period-controls"
      >
        <button className="icon-button" type="button" aria-label="Periodo anterior">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">Periodo</p>
          <strong>{model.periodLabel}</strong>
        </div>
        <button className="icon-button" type="button" aria-label="Proximo periodo">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>

      {model.state === 'loading' ? (
        <FinanceInlineState tone="neutral" text="Carregando financeiro..." />
      ) : null}
      {model.state === 'offline' ? (
        <FinanceInlineState tone="warning" text="Modo offline: dados financeiros pausados." />
      ) : null}
      {model.state === 'empty' ? (
        <FinanceInlineState tone="neutral" text="Nenhum lancamento financeiro neste periodo." />
      ) : null}

      <section
        className="finance-kpi-grid"
        aria-label="Indicadores financeiros"
        data-testid="finance-kpi-grid"
      >
        {model.metrics.map((metric) => (
          <FinanceMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className="finance-workspace" aria-label="Resumo financeiro responsivo">
        <main className="finance-primary" aria-label="Fluxo de caixa e despesas">
          <CashFlowSummary model={model} />
          <RecentExpenses expenses={model.expenses} />
        </main>

        <aside className="finance-side" aria-label="Comissoes e repasses">
          <CommissionSummary model={model} />
          <PayoutSummary model={model} />
        </aside>
      </div>
    </div>
  );
}

function FinanceActions({ actions }: Readonly<{ actions: readonly FinanceActionModel[] }>) {
  return (
    <div className="finance-heading-actions" aria-label="Acoes financeiras">
      {actions.map((action) => (
        <button
          className={
            action.id === 'finance.create-expense'
              ? 'button button-primary'
              : 'button button-secondary'
          }
          disabled={!action.enabled}
          key={action.id}
          title={action.reason}
          type="button"
        >
          {iconForAction(action.id)}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function iconForAction(id: FinanceActionModel['id']) {
  if (id === 'finance.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'finance.create-expense') return <Plus size={16} aria-hidden="true" />;
  if (id === 'finance.close-payout') return <WalletCards size={16} aria-hidden="true" />;
  return <BadgePercent size={16} aria-hidden="true" />;
}

function FinanceMetricCard({ metric }: Readonly<{ metric: FinanceMetricModel }>) {
  return (
    <article className={'finance-kpi finance-tone-' + metric.tone} data-finance-kpi>
      <span>{metric.label}</span>
      <strong>{metric.amountLabel}</strong>
    </article>
  );
}

function CashFlowSummary({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section
      className="finance-panel"
      aria-labelledby="finance-cash-flow-title"
      data-testid="finance-cash-flow"
    >
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Caixa</p>
          <h2 id="finance-cash-flow-title">Fluxo de caixa</h2>
        </div>
        <Banknote size={20} aria-hidden="true" />
      </div>
      <dl className="finance-cash-flow-list">
        <div>
          <dt>Entradas</dt>
          <dd>{model.cashFlow.cashInAmountLabel}</dd>
        </div>
        <div>
          <dt>Saidas</dt>
          <dd>{model.cashFlow.cashOutAmountLabel}</dd>
        </div>
        <div className={'finance-total finance-tone-' + model.cashFlow.tone}>
          <dt>Saldo de caixa</dt>
          <dd>{model.cashFlow.netCashFlowAmountLabel}</dd>
        </div>
      </dl>
      <p className="finance-muted">
        {model.summary.entriesCount} lancamentos conciliados no periodo.
      </p>
    </section>
  );
}

function CommissionSummary({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section
      className="finance-panel"
      aria-labelledby="finance-commission-title"
      data-testid="finance-commission-summary"
    >
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Comissoes</p>
          <h2 id="finance-commission-title">Obrigacoes abertas</h2>
        </div>
        <BadgePercent size={20} aria-hidden="true" />
      </div>
      <dl className="finance-summary-list">
        <div>
          <dt>Valor em aberto</dt>
          <dd>{model.commission.openAccrualAmountLabel}</dd>
        </div>
        <div>
          <dt>Itens pendentes</dt>
          <dd>{model.commission.openAccrualCount}</dd>
        </div>
      </dl>
      <button className="button button-secondary" disabled={!model.canClosePayout} type="button">
        <WalletCards size={16} aria-hidden="true" />
        Fechar repasse
      </button>
    </section>
  );
}

function PayoutSummary({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section
      className="finance-panel"
      aria-labelledby="finance-payout-title"
      data-testid="finance-payout-summary"
    >
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Repasses</p>
          <h2 id="finance-payout-title">Pagamentos realizados</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      <dl className="finance-summary-list">
        <div>
          <dt>Pago no periodo</dt>
          <dd>{model.commission.paidPayoutAmountLabel}</dd>
        </div>
        <div>
          <dt>Repasses</dt>
          <dd>{model.commission.payoutCount}</dd>
        </div>
      </dl>
    </section>
  );
}

function RecentExpenses({ expenses }: Readonly<{ expenses: readonly FinanceExpenseModel[] }>) {
  return (
    <section
      className="finance-panel"
      aria-labelledby="finance-expenses-title"
      data-testid="finance-expenses"
    >
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Despesas</p>
          <h2 id="finance-expenses-title">Ultimos compromissos</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {expenses.length ? (
        <div className="finance-expense-list">
          {expenses.map((expense) => (
            <article className="finance-expense-row" key={expense.id}>
              <div>
                <strong>{expense.description}</strong>
                <span>
                  {expense.categoryName}
                  {expense.dueDateLabel ? ' · Vence ' + expense.dueDateLabel : ''}
                </span>
              </div>
              <div>
                <StatusBadge variant={expense.status === 'PAID' ? 'success' : 'warning'}>
                  {expense.statusLabel}
                </StatusBadge>
                <b>{expense.amountLabel}</b>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="finance-muted">Sem despesas registradas para este periodo.</p>
      )}
    </section>
  );
}

function FinanceInlineState({
  text,
  tone,
}: Readonly<{ text: string; tone: FinanceMetricModel['tone'] }>) {
  return (
    <div className={'finance-inline-state finance-tone-' + tone} role="status">
      {tone === 'warning' ? (
        <AlertTriangle size={17} aria-hidden="true" />
      ) : (
        <ReceiptText size={17} aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function FinanceBoundaryState({ model }: Readonly<{ model: FinanceViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="finance-boundary-state" aria-labelledby="finance-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="finance-boundary-title">{denied ? 'Financeiro indisponivel' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}
