'use client';

import * as React from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Banknote,
  ClipboardCheck,
  Filter,
  LockKeyhole,
  Plus,
  ReceiptText,
  RefreshCcw,
  WalletCards,
  X,
} from 'lucide-react';
import { Button, IconButton, StatusBadge } from '@barberos/ui';
import type {
  CommissionAccrualModel,
  CommissionActionModel,
  CommissionNoRuleItemModel,
  CommissionRuleModel,
  CommissionsViewModel,
  PayoutModel,
} from '../lib/commission-data';
import { FinanceSectionTabs } from './finance-section-tabs';

type CommissionModalState =
  | { type: 'rule'; rule?: CommissionRuleModel }
  | { type: 'close-payout' }
  | { type: 'pay-payout'; payout?: PayoutModel }
  | { type: 'correct-payout'; payout?: PayoutModel }
  | { type: 'accrual-details'; accrual: CommissionAccrualModel }
  | { type: 'payout-details'; payout: PayoutModel }
  | { type: 'diagnostic-details'; item: CommissionNoRuleItemModel }
  | null;

type CommissionSectionFilter = 'all' | 'rules' | 'accruals' | 'payouts' | 'diagnostics';

export function CommissionView({ model }: Readonly<{ model: CommissionsViewModel }>) {
  const [section, setSection] = React.useState<CommissionSectionFilter>('all');
  const [modal, setModal] = React.useState<CommissionModalState>(null);

  if (model.state === 'permission-denied') return <CommissionBoundaryState model={model} />;
  if (model.state === 'error') return <CommissionBoundaryState model={model} />;

  function handleAction(action: CommissionActionModel) {
    if (!action.enabled) return;
    if (action.id === 'commissions.refresh') {
      window.location.reload();
      return;
    }
    if (action.id === 'commissions.create-rule') setModal({ type: 'rule' });
    if (action.id === 'commissions.close-payout') setModal({ type: 'close-payout' });
    if (action.id === 'commissions.pay-payout') {
      setModal({ type: 'pay-payout', payout: model.payouts.find((payout) => payout.canPay) });
    }
    if (action.id === 'commissions.correct-payout') {
      setModal({
        type: 'correct-payout',
        payout: model.payouts.find((payout) => payout.canCorrect),
      });
    }
  }

  return (
    <div className="commissions-page">
      <header className="commissions-heading">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <CommissionActions actions={model.allowedActions} onAction={handleAction} />
      </header>

      <FinanceSectionTabs active="commissions" />

      {model.state === 'offline' ? (
        <CommissionInlineState text="Modo offline: fechamento e pagamento de repasses pausados." />
      ) : null}

      {model.state === 'empty' ? (
        <CommissionInlineState text="Nenhuma comissao ou regra encontrada neste periodo." />
      ) : null}

      <section className="commissions-totals-grid" aria-label="Resumo de comissoes">
        <CommissionTotal
          label="Comissoes abertas"
          tone="warning"
          value={model.totals.openAccrualAmountLabel}
        />
        <CommissionTotal
          label="Repasses pendentes"
          tone="warning"
          value={model.totals.payoutPendingAmountLabel}
        />
        <CommissionTotal
          label="Repasses pagos"
          tone="success"
          value={model.totals.paidPayoutAmountLabel}
        />
        <CommissionTotal
          label="Profissionais"
          tone="neutral"
          value={String(model.totals.professionalCount)}
        />
      </section>

      <CommissionFilters model={model} selected={section} onSelect={setSection} />

      <div className="commissions-workspace" aria-label="Comissoes e repasses responsivos">
        <main className="commissions-primary" aria-label="Regras e comissoes abertas">
          {sectionVisible(section, 'rules') ? <RulePrecedence /> : null}
          {sectionVisible(section, 'rules') ? (
            <CommissionRules
              rules={model.rules}
              onDetails={(rule) => setModal({ type: 'rule', rule })}
            />
          ) : null}
          {sectionVisible(section, 'accruals') ? (
            <OpenAccruals
              accruals={model.openAccruals}
              onDetails={(accrual) => setModal({ type: 'accrual-details', accrual })}
            />
          ) : null}
          {sectionVisible(section, 'diagnostics') ? (
            <NoRuleDiagnostics
              items={model.noRuleItems}
              onDetails={(item) => setModal({ type: 'diagnostic-details', item })}
            />
          ) : null}
        </main>

        <aside className="commissions-side" aria-label="Repasses">
          <PayoutActions model={model} onAction={handleAction} />
          {sectionVisible(section, 'payouts') ? (
            <PayoutList
              payouts={model.payouts}
              onCorrect={(payout) => setModal({ type: 'correct-payout', payout })}
              onDetails={(payout) => setModal({ type: 'payout-details', payout })}
              onPay={(payout) => setModal({ type: 'pay-payout', payout })}
            />
          ) : null}
        </aside>
      </div>

      <CommissionModal modal={modal} model={model} onClose={() => setModal(null)} />
    </div>
  );
}

function CommissionActions({
  actions,
  onAction,
}: Readonly<{
  actions: readonly CommissionActionModel[];
  onAction: (action: CommissionActionModel) => void;
}>) {
  return (
    <div className="commissions-heading-actions" aria-label="Acoes de comissoes">
      {actions.map((action) => (
        <button
          className={
            action.id === 'commissions.create-rule'
              ? 'button button-primary'
              : 'button button-secondary'
          }
          disabled={!action.enabled}
          key={action.id}
          title={action.reason}
          type="button"
          onClick={() => onAction(action)}
        >
          {iconForAction(action.id)}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function iconForAction(id: CommissionActionModel['id']) {
  if (id === 'commissions.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'commissions.close-payout') return <ClipboardCheck size={16} aria-hidden="true" />;
  if (id === 'commissions.pay-payout') return <WalletCards size={16} aria-hidden="true" />;
  if (id === 'commissions.correct-payout') return <ReceiptText size={16} aria-hidden="true" />;
  return <Plus size={16} aria-hidden="true" />;
}

function CommissionTotal({
  label,
  tone,
  value,
}: Readonly<{ label: string; tone: 'neutral' | 'success' | 'warning'; value: string }>) {
  return (
    <article className={'commissions-total commissions-tone-' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function CommissionFilters({
  model,
  onSelect,
  selected,
}: Readonly<{
  model: CommissionsViewModel;
  onSelect: (filter: CommissionSectionFilter) => void;
  selected: CommissionSectionFilter;
}>) {
  const filters: readonly { id: CommissionSectionFilter; label: string; count: number }[] = [
    {
      id: 'all',
      label: 'Tudo',
      count:
        model.rules.length +
        model.openAccruals.length +
        model.payouts.length +
        model.noRuleItems.length,
    },
    { id: 'rules', label: 'Regras', count: model.rules.length },
    { id: 'accruals', label: 'Comissoes', count: model.openAccruals.length },
    { id: 'payouts', label: 'Repasses', count: model.payouts.length },
    { id: 'diagnostics', label: 'Diagnosticos', count: model.noRuleItems.length },
  ];

  return (
    <section className="commissions-panel" aria-labelledby="commission-filters-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2 id="commission-filters-title">Secoes</h2>
        </div>
        <Filter size={20} aria-hidden="true" />
      </div>
      <div className="commissions-filter-list">
        {filters.map((filter) => (
          <button
            aria-pressed={selected === filter.id}
            className="commissions-filter-button"
            key={filter.id}
            type="button"
            onClick={() => onSelect(filter.id)}
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function RulePrecedence() {
  const levels = ['Item especifico', 'Servico ou produto', 'Profissional', 'Padrao'];
  return (
    <section className="commissions-panel" aria-labelledby="commission-precedence-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Precedencia</p>
          <h2 id="commission-precedence-title">Ordem das regras</h2>
        </div>
        <BadgePercent size={20} aria-hidden="true" />
      </div>
      <ol className="commissions-precedence-list">
        {levels.map((level) => (
          <li key={level}>{level}</li>
        ))}
      </ol>
    </section>
  );
}

function CommissionRules({
  onDetails,
  rules,
}: Readonly<{
  rules: readonly CommissionRuleModel[];
  onDetails: (rule: CommissionRuleModel) => void;
}>) {
  return (
    <section className="commissions-panel" aria-labelledby="commission-rules-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Regras</p>
          <h2 id="commission-rules-title">Regras ativas</h2>
        </div>
        <BadgePercent size={20} aria-hidden="true" />
      </div>
      {rules.length ? (
        <div className="commissions-rule-list">
          {rules.map((rule) => (
            <article className="commissions-rule-row" key={rule.id}>
              <div>
                <strong>{rule.label}</strong>
                <span>
                  {rule.scopeLabel} · {rule.typeLabel} · {rule.effectivePeriodLabel}
                </span>
              </div>
              <div>
                <StatusBadge variant={statusBadgeVariant(rule.statusTone)}>
                  {rule.statusLabel}
                </StatusBadge>
                <b>{rule.valueLabel}</b>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onDetails(rule)}
                >
                  Detalhes
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="commissions-muted">Sem regras configuradas para esta unidade.</p>
      )}
    </section>
  );
}

function OpenAccruals({
  accruals,
  onDetails,
}: Readonly<{
  accruals: readonly CommissionAccrualModel[];
  onDetails: (accrual: CommissionAccrualModel) => void;
}>) {
  return (
    <section className="commissions-panel" aria-labelledby="commission-accruals-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Producao</p>
          <h2 id="commission-accruals-title">Comissoes abertas</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {accruals.length ? (
        <div className="commissions-accrual-list">
          {accruals.map((accrual) => (
            <article className="commissions-accrual-row" key={accrual.id}>
              <div>
                <strong>{accrual.professionalName}</strong>
                <span>
                  {accrual.orderLabel} · Base {accrual.baseAmountLabel} ·{' '}
                  {accrual.ruleSnapshotLabel}
                </span>
              </div>
              <div>
                <StatusBadge variant={statusBadgeVariant(accrual.statusTone)}>
                  {accrual.statusLabel}
                </StatusBadge>
                <b>{accrual.commissionAmountLabel}</b>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onDetails(accrual)}
                >
                  Detalhes
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="commissions-muted">Sem comissoes abertas neste periodo.</p>
      )}
    </section>
  );
}

function NoRuleDiagnostics({
  items,
  onDetails,
}: Readonly<{
  items: readonly CommissionNoRuleItemModel[];
  onDetails: (item: CommissionNoRuleItemModel) => void;
}>) {
  if (!items.length) return null;

  return (
    <section
      className="commissions-panel commissions-diagnostic"
      aria-labelledby="commission-diagnostic-title"
    >
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Diagnostico</p>
          <h2 id="commission-diagnostic-title">Itens sem regra</h2>
        </div>
        <AlertTriangle size={20} aria-hidden="true" />
      </div>
      <div className="commissions-diagnostic-list">
        {items.map((item) => (
          <article key={item.orderItemId}>
            <strong>{item.itemLabel}</strong>
            <span>
              {item.orderLabel} · {item.professionalName} · {item.sourceTypeLabel} · Base{' '}
              {item.baseAmountLabel}
            </span>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onDetails(item)}
            >
              Ver diagnostico
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PayoutActions({
  model,
  onAction,
}: Readonly<{
  model: CommissionsViewModel;
  onAction: (action: CommissionActionModel) => void;
}>) {
  const closeAction = model.allowedActions.find(
    (action) => action.id === 'commissions.close-payout',
  );
  const payAction = model.allowedActions.find((action) => action.id === 'commissions.pay-payout');
  return (
    <section className="commissions-panel" aria-labelledby="commission-payout-actions-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Repasse</p>
          <h2 id="commission-payout-actions-title">Acoes por modal</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      <div className="commissions-action-stack">
        {closeAction ? (
          <button
            className="button button-primary"
            disabled={!closeAction.enabled}
            title={closeAction.reason}
            type="button"
            onClick={() => onAction(closeAction)}
          >
            <ClipboardCheck size={16} aria-hidden="true" />
            Fechar repasse
          </button>
        ) : null}
        {payAction ? (
          <button
            className="button button-secondary"
            disabled={!payAction.enabled}
            title={payAction.reason}
            type="button"
            onClick={() => onAction(payAction)}
          >
            <WalletCards size={16} aria-hidden="true" />
            Pagar repasse
          </button>
        ) : null}
      </div>
      <div className="commissions-cash-warning">
        <Banknote size={17} aria-hidden="true" />
        <span>Pagamento em dinheiro exige caixa aberto da mesma unidade.</span>
      </div>
    </section>
  );
}

function PayoutList({
  onCorrect,
  onDetails,
  onPay,
  payouts,
}: Readonly<{
  onCorrect: (payout: PayoutModel) => void;
  onDetails: (payout: PayoutModel) => void;
  onPay: (payout: PayoutModel) => void;
  payouts: readonly PayoutModel[];
}>) {
  return (
    <section className="commissions-panel" aria-labelledby="commission-payouts-title">
      <div className="commissions-panel-heading">
        <div>
          <p className="eyebrow">Historico</p>
          <h2 id="commission-payouts-title">Repasses</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      {payouts.length ? (
        <div className="commissions-payout-list">
          {payouts.map((payout) => (
            <article className="commissions-payout-row" key={payout.id}>
              <div>
                <strong>{payout.professionalName}</strong>
                <span>
                  {payout.periodLabel} · {payout.sourceCount} itens
                  {payout.paymentMethodLabel ? ' · ' + payout.paymentMethodLabel : ''}
                </span>
                {payout.status === 'PAID' ? (
                  <small>Repasse pago preserva historico; use correcao auditavel.</small>
                ) : null}
              </div>
              <div>
                <StatusBadge variant={statusBadgeVariant(payout.statusTone)}>
                  {payout.statusLabel}
                </StatusBadge>
                <b>{payout.totalAmountLabel}</b>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onDetails(payout)}
                >
                  Detalhes
                </button>
                <button
                  className="button button-secondary"
                  disabled={!payout.canPay}
                  title={payout.unavailableReason}
                  type="button"
                  onClick={() => onPay(payout)}
                >
                  Pagar
                </button>
                <button
                  className="button button-secondary"
                  disabled={!payout.canCorrect}
                  title={payout.unavailableReason}
                  type="button"
                  onClick={() => onCorrect(payout)}
                >
                  Corrigir
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="commissions-muted">Nenhum repasse fechado neste periodo.</p>
      )}
    </section>
  );
}

function CommissionModal({
  modal,
  model,
  onClose,
}: Readonly<{ modal: CommissionModalState; model: CommissionsViewModel; onClose: () => void }>) {
  if (!modal) return null;
  if (modal.type === 'rule') {
    return (
      <AppModal
        description="Configure a regra sem tirar a lista de producao da tela principal."
        eyebrow={modal.rule ? 'Detalhes da regra' : 'Nova regra'}
        title={modal.rule?.label ?? 'Nova regra de comissao'}
        onClose={onClose}
      >
        <RuleForm model={model} rule={modal.rule} />
      </AppModal>
    );
  }
  if (modal.type === 'close-payout') {
    return (
      <AppModal
        description="Selecione profissional e periodo para fechar um repasse auditavel."
        eyebrow="Fechamento"
        title="Fechar repasse"
        onClose={onClose}
      >
        <ClosePayoutForm model={model} />
      </AppModal>
    );
  }
  if (modal.type === 'pay-payout') {
    return (
      <AppModal
        description="Pagamento em dinheiro exige caixa aberto da mesma unidade."
        eyebrow="Pagamento"
        title="Pagar repasse"
        onClose={onClose}
      >
        <PayPayoutForm payout={modal.payout} />
      </AppModal>
    );
  }
  if (modal.type === 'correct-payout') {
    return (
      <AppModal
        description="Repasses pagos nao sao sobrescritos; correcao gera movimento auditavel."
        eyebrow="Correcao"
        title="Corrigir repasse pago"
        onClose={onClose}
      >
        <CorrectPayoutForm payout={modal.payout} />
      </AppModal>
    );
  }
  if (modal.type === 'accrual-details') {
    return (
      <AppModal
        description="Detalhes da comissao aberta selecionada."
        eyebrow="Comissao"
        title={modal.accrual.professionalName}
        onClose={onClose}
      >
        <CommissionDetailList items={accrualDetails(modal.accrual)} />
      </AppModal>
    );
  }
  if (modal.type === 'payout-details') {
    return (
      <AppModal
        description="Historico e status do repasse selecionado."
        eyebrow="Repasse"
        title={modal.payout.professionalName}
        onClose={onClose}
      >
        <CommissionDetailList items={payoutDetails(modal.payout)} />
      </AppModal>
    );
  }
  return (
    <AppModal
      description="Item pago sem regra ativa correspondente."
      eyebrow="Diagnostico"
      title={modal.item.itemLabel}
      onClose={onClose}
    >
      <CommissionDetailList items={diagnosticDetails(modal.item)} />
    </AppModal>
  );
}

function AppModal({
  children,
  description,
  eyebrow,
  onClose,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  onClose: () => void;
  title: string;
}>) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  return (
    <div className="app-dialog-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog"
        role="dialog"
      >
        <header className="app-dialog-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

function RuleForm({
  model,
  rule,
}: Readonly<{ model: CommissionsViewModel; rule?: CommissionRuleModel }>) {
  return (
    <form className="commissions-form">
      <fieldset disabled={!model.canManage}>
        <label>
          Escopo
          <select defaultValue={rule?.scope ?? 'TENANT_DEFAULT'}>
            <option value="TENANT_DEFAULT">Padrao</option>
            <option value="PROFESSIONAL">Profissional</option>
            <option value="SERVICE">Servico</option>
            <option value="PRODUCT">Produto</option>
            <option value="ORDER_ITEM">Item manual</option>
          </select>
        </label>
        <div className="commissions-form-grid">
          <label>
            Tipo
            <select defaultValue="PERCENTAGE">
              <option value="PERCENTAGE">Percentual</option>
              <option value="FIXED_AMOUNT">Valor fixo</option>
            </select>
          </label>
          <label>
            Valor
            <input inputMode="decimal" placeholder="50" defaultValue={rule?.valueLabel} />
          </label>
        </div>
        <div className="commissions-form-grid">
          <label>
            Inicio
            <input type="date" defaultValue={model.periodStart} />
          </label>
          <label>
            Fim
            <input type="date" />
          </label>
        </div>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={!model.canManage} type="button">
          <BadgePercent size={16} aria-hidden="true" />
          Salvar regra
        </Button>
      </div>
    </form>
  );
}

function ClosePayoutForm({ model }: Readonly<{ model: CommissionsViewModel }>) {
  return (
    <form className="commissions-form">
      <fieldset disabled={!model.canManage}>
        <label>
          Profissional
          <select defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            <option value="dev-professional-lucas">Lucas Pereira</option>
            <option value="dev-professional-carlos">Carlos Andrade</option>
          </select>
        </label>
        <div className="commissions-form-grid">
          <label>
            Inicio
            <input type="date" defaultValue={model.periodStart} />
          </label>
          <label>
            Fim
            <input type="date" defaultValue={model.periodEnd} />
          </label>
        </div>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={!model.canManage} type="button">
          <ClipboardCheck size={16} aria-hidden="true" />
          Fechar repasse
        </Button>
      </div>
    </form>
  );
}

function PayPayoutForm({ payout }: Readonly<{ payout?: PayoutModel }>) {
  return (
    <form className="commissions-form">
      {payout ? <CommissionDetailList items={payoutDetails(payout)} /> : null}
      <fieldset disabled={!payout?.canPay}>
        <label>
          Metodo de pagamento
          <select defaultValue="PIX">
            <option value="PIX">PIX</option>
            <option value="CASH">Dinheiro</option>
            <option value="DEBIT_CARD">Debito</option>
            <option value="CREDIT_CARD">Credito</option>
            <option value="OTHER">Outro</option>
          </select>
        </label>
        <label>
          Sessao de caixa
          <input placeholder="Obrigatoria para dinheiro" />
        </label>
      </fieldset>
      <div className="commissions-cash-warning">
        <Banknote size={17} aria-hidden="true" />
        <span>Pagamento em dinheiro exige caixa aberto da mesma unidade.</span>
      </div>
      <div className="app-dialog-actions">
        <Button disabled={!payout?.canPay} type="button">
          <WalletCards size={16} aria-hidden="true" />
          Confirmar pagamento
        </Button>
      </div>
    </form>
  );
}

function CorrectPayoutForm({ payout }: Readonly<{ payout?: PayoutModel }>) {
  return (
    <form className="commissions-form">
      {payout ? <CommissionDetailList items={payoutDetails(payout)} /> : null}
      <fieldset disabled={!payout?.canCorrect}>
        <label>
          Motivo da correcao
          <input maxLength={500} placeholder="Explique o ajuste auditavel" />
        </label>
        <label>
          Valor do ajuste
          <input inputMode="decimal" placeholder="0,00" />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={!payout?.canCorrect} type="button">
          <ReceiptText size={16} aria-hidden="true" />
          Registrar correcao
        </Button>
      </div>
    </form>
  );
}

function CommissionDetailList({
  items,
}: Readonly<{ items: readonly { label: string; value: string }[] }>) {
  return (
    <dl className="commissions-detail-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function accrualDetails(accrual: CommissionAccrualModel) {
  return [
    { label: 'Comanda', value: accrual.orderLabel },
    { label: 'Base', value: accrual.baseAmountLabel },
    { label: 'Regra aplicada', value: accrual.ruleSnapshotLabel },
    { label: 'Status', value: accrual.statusLabel },
    { label: 'Comissao', value: accrual.commissionAmountLabel },
  ];
}

function payoutDetails(payout: PayoutModel) {
  return [
    { label: 'Profissional', value: payout.professionalName },
    { label: 'Periodo', value: payout.periodLabel },
    { label: 'Itens', value: String(payout.sourceCount) },
    { label: 'Metodo', value: payout.paymentMethodLabel ?? '-' },
    { label: 'Status', value: payout.statusLabel },
    { label: 'Total', value: payout.totalAmountLabel },
  ];
}

function diagnosticDetails(item: CommissionNoRuleItemModel) {
  return [
    { label: 'Comanda', value: item.orderLabel },
    { label: 'Item', value: item.itemLabel },
    { label: 'Profissional', value: item.professionalName },
    { label: 'Origem', value: item.sourceTypeLabel },
    { label: 'Base', value: item.baseAmountLabel },
    { label: 'Motivo', value: item.reason },
  ];
}

function sectionVisible(
  selected: CommissionSectionFilter,
  section: Exclude<CommissionSectionFilter, 'all'>,
) {
  return selected === 'all' || selected === section;
}

function CommissionInlineState({ text }: Readonly<{ text: string }>) {
  return (
    <div className="commissions-inline-state commissions-tone-warning" role="status">
      <AlertTriangle size={17} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function CommissionBoundaryState({ model }: Readonly<{ model: CommissionsViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="commissions-boundary-state" aria-labelledby="commissions-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="commissions-boundary-title">{denied ? 'Comissoes indisponiveis' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

function statusBadgeVariant(tone: 'neutral' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return 'warning';
  return tone;
}
