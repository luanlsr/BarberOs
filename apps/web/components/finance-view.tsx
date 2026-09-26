import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  BarChart3,
  Building2,
  LockKeyhole,
  Plus,
  ReceiptText,
  RefreshCcw,
  Scissors,
  Users,
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
      <FinanceScopeSwitcher model={model} />

      <section
        className="finance-period-panel"
        aria-label="Controles de período financeiro"
        data-testid="finance-period-controls"
      >
        <button className="icon-button" type="button" aria-label="Periodo anterior">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">Periodo</p>
          <strong>{model.periodLabel}</strong>
        </div>
        <button className="icon-button" type="button" aria-label="Proximo período">
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
        <FinanceInlineState tone="neutral" text="Nenhum lançamento financeiro neste período." />
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
          <PlanVsWalkInAnalysis model={model} />
          <FinanceCategoryBreakdown model={model} />
          <FinanceOriginBreakdown model={model} />
          <RecentExpenses expenses={model.expenses} />
        </main>

        <aside className="finance-side" aria-label="Comissões e repasses">
          <FinanceBranchHealth model={model} />
          <CommissionSummary model={model} />
          <PayoutSummary model={model} />
        </aside>
      </div>
    </div>
  );
}

function FinanceScopeSwitcher({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section className="finance-scope-panel" aria-label="Filtro de unidade financeira">
      <div>
        <p className="eyebrow">Visão</p>
        <strong>{model.branchScopeLabel}</strong>
      </div>
      <div className="finance-scope-options">
        {model.branchOptions.map((option) => (
          <Link
            aria-current={option.active ? 'page' : undefined}
            className="finance-scope-option"
            href={option.href}
            key={option.id}
          >
            {option.id === 'all' ? (
              <BarChart3 size={15} aria-hidden="true" />
            ) : (
              <Building2 size={15} aria-hidden="true" />
            )}
            {option.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
function FinanceActions({ actions }: Readonly<{ actions: readonly FinanceActionModel[] }>) {
  return (
    <div className="finance-heading-actions" aria-label="Ações financeiras">
      {actions.map((action) => {
        const className =
          action.id === 'finance.create-expense'
            ? 'button button-primary'
            : 'button button-secondary';
        if (action.enabled && action.id === 'finance.create-expense') {
          return (
            <Link className={className} href="/financeiro/despesas?modal=create" key={action.id}>
              {iconForAction(action.id)}
              {action.label}
            </Link>
          );
        }
        if (action.enabled && action.id === 'finance.refresh') {
          return (
            <Link className={className} href="/financeiro" key={action.id}>
              {iconForAction(action.id)}
              {action.label}
            </Link>
          );
        }
        return (
          <button
            className={className}
            disabled
            key={action.id}
            title={action.reason}
            type="button"
          >
            {iconForAction(action.id)}
            {action.label}
          </button>
        );
      })}
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
        {model.summary.entriesCount} lancamentos conciliados no período.
      </p>
    </section>
  );
}

function PlanVsWalkInAnalysis({ model }: Readonly<{ model: FinanceViewModel }>) {
  const channels = [model.planAnalysis.plan, model.planAnalysis.walkIn];
  return (
    <section className="finance-panel finance-plan-panel" aria-labelledby="finance-plan-title">
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Planos vs Avulso</p>
          <h2 id="finance-plan-title">Cortes, clientes e receita</h2>
        </div>
        <Scissors size={20} aria-hidden="true" />
      </div>
      <div className="finance-plan-grid">
        {channels.map((channel) => (
          <article className={'finance-plan-card finance-tone-' + channel.tone} key={channel.id}>
            <div>
              <span>{channel.label}</span>
              <strong>{channel.revenueAmountLabel}</strong>
              <small>{channel.sharePercent}% da receita analisada</small>
            </div>
            <dl>
              <div>
                <dt>Cortes</dt>
                <dd>{channel.haircutCount}</dd>
              </div>
              <div>
                <dt>Clientes</dt>
                <dd>{channel.customerCount}</dd>
              </div>
              <div>
                <dt>Receita/cliente</dt>
                <dd>{channel.revenuePerCustomerAmountLabel}</dd>
              </div>
              <div>
                <dt>Receita/corte</dt>
                <dd>{channel.revenuePerHaircutAmountLabel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <aside className="finance-plan-advice" aria-label="Análise profissional de planos">
        <div>
          <Users size={18} aria-hidden="true" />
          <strong>{model.planAnalysis.recommendationTitle}</strong>
        </div>
        <p>{model.planAnalysis.recommendationText}</p>
        <span>{model.planAnalysis.revenueDeltaLabel}</span>
        <small>{model.planAnalysis.planUtilizationLabel}</small>
      </aside>
    </section>
  );
}

function FinanceCategoryBreakdown({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section className="finance-panel" aria-labelledby="finance-category-title">
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Categorias</p>
          <h2 id="finance-category-title">Entradas e saídas</h2>
        </div>
        <BarChart3 size={20} aria-hidden="true" />
      </div>
      {model.categoryBreakdown.length ? (
        <div className="finance-breakdown-list">
          {model.categoryBreakdown.map((item) => (
            <article className="finance-breakdown-row" key={item.id}>
              <div>
                <span
                  className="finance-color-dot"
                  style={{ '--finance-color': item.color } as React.CSSProperties}
                />
                <strong>{item.name}</strong>
                <small>
                  {item.direction === 'IN' ? 'Entrada' : 'Saída'} · {item.percent}%
                </small>
              </div>
              <div className="finance-breakdown-meter" aria-hidden="true">
                <span style={{ width: Math.max(item.percent, 3) + '%', background: item.color }} />
              </div>
              <b>{item.amountLabel}</b>
            </article>
          ))}
        </div>
      ) : (
        <p className="finance-muted">Sem categorias financeiras no período.</p>
      )}
    </section>
  );
}

function FinanceOriginBreakdown({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section className="finance-panel" aria-labelledby="finance-origin-title">
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Origem</p>
          <h2 id="finance-origin-title">De onde vem e para onde vai</h2>
        </div>
        <Banknote size={20} aria-hidden="true" />
      </div>
      {model.originBreakdown.length ? (
        <div className="finance-origin-grid">
          {model.originBreakdown.map((item) => (
            <article className={'finance-origin-card finance-tone-' + item.tone} key={item.id}>
              <span>{item.label}</span>
              <strong>{item.amountLabel}</strong>
              <small>
                {item.direction === 'IN' ? 'Entrada' : 'Saída'} · {item.percent}% do movimento
              </small>
            </article>
          ))}
        </div>
      ) : (
        <p className="finance-muted">Sem origem de movimentação no período.</p>
      )}
    </section>
  );
}

function FinanceBranchHealth({ model }: Readonly<{ model: FinanceViewModel }>) {
  return (
    <section className="finance-panel" aria-labelledby="finance-branches-title">
      <div className="finance-panel-heading">
        <div>
          <p className="eyebrow">Unidades</p>
          <h2 id="finance-branches-title">Saúde por unidade</h2>
        </div>
        <Building2 size={20} aria-hidden="true" />
      </div>
      {model.branchBreakdown.length ? (
        <div className="finance-branch-list">
          {model.branchBreakdown.map((branch) => (
            <article
              className={'finance-branch-card finance-tone-' + branch.tone}
              key={branch.branchId}
            >
              <div>
                <strong>{branch.branchName}</strong>
                <span>{branch.sharePercent}% das entradas</span>
              </div>
              <dl>
                <div>
                  <dt>Entradas</dt>
                  <dd>{branch.revenueAmountLabel}</dd>
                </div>
                <div>
                  <dt>Saídas</dt>
                  <dd>{branch.expenseAmountLabel}</dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd>{branch.resultAmountLabel}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="finance-muted">Sem unidades com movimento no período.</p>
      )}
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
          <p className="eyebrow">Comissões</p>
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
          <dt>Pago no período</dt>
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
        <p className="finance-muted">Sem despesas registradas para este período.</p>
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
        <h1 id="finance-boundary-title">{denied ? 'Financeiro indisponível' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}
