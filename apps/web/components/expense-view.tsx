'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  Filter,
  LockKeyhole,
  Plus,
  ReceiptText,
  RefreshCcw,
  Repeat,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import { Button, IconButton, StatusBadge } from '@barberos/ui';
import type { ExpenseStatus } from '@barberos/contracts';
import type {
  ExpenseActionModel,
  ExpenseCategoryModel,
  ExpenseItemModel,
  ExpenseStatusFilterModel,
  ExpensesViewModel,
} from '../lib/expense-data';

type ExpenseModalState =
  | { type: 'create' }
  | { type: 'details'; expense: ExpenseItemModel }
  | { type: 'pay'; expense: ExpenseItemModel }
  | { type: 'cancel'; expense: ExpenseItemModel }
  | null;

export function ExpenseView({ model }: Readonly<{ model: ExpensesViewModel }>) {
  const [selectedStatus, setSelectedStatus] = React.useState(model.selectedStatus);
  const [modal, setModal] = React.useState<ExpenseModalState>(null);

  React.useEffect(() => setSelectedStatus(model.selectedStatus), [model.selectedStatus]);

  if (model.state === 'permission-denied') return <ExpenseBoundaryState model={model} />;
  if (model.state === 'error') return <ExpenseBoundaryState model={model} />;

  const visibleExpenses = filterExpenses(model.expenses, selectedStatus);

  function firstExpenseFor(actionId: ExpenseActionModel['id']) {
    if (actionId === 'expenses.pay-selected')
      return visibleExpenses.find((expense) => expense.canPay);
    if (actionId === 'expenses.cancel-selected') {
      return visibleExpenses.find((expense) => expense.canCancel);
    }
    return undefined;
  }

  function handleAction(action: ExpenseActionModel) {
    if (!action.enabled) return;
    if (action.id === 'expenses.refresh') {
      window.location.reload();
      return;
    }
    if (action.id === 'expenses.create') {
      setModal({ type: 'create' });
      return;
    }
    const expense = firstExpenseFor(action.id);
    if (expense && action.id === 'expenses.pay-selected') setModal({ type: 'pay', expense });
    if (expense && action.id === 'expenses.cancel-selected') setModal({ type: 'cancel', expense });
  }

  return (
    <div className="expenses-page">
      <header className="expenses-heading">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <ExpenseActions actions={model.allowedActions} onAction={handleAction} />
      </header>

      {model.state === 'loading' ? (
        <ExpenseInlineState tone="neutral" text="Carregando despesas..." />
      ) : null}
      {model.state === 'offline' ? (
        <ExpenseInlineState
          tone="warning"
          text="Modo offline: pagamentos e cancelamentos pausados."
        />
      ) : null}
      {model.state === 'empty' ? (
        <ExpenseInlineState tone="neutral" text="Nenhuma despesa encontrada para este periodo." />
      ) : null}

      <section className="expenses-totals-grid" aria-label="Resumo de despesas">
        <ExpenseTotal label="Abertas" value={model.totals.openAmountLabel} tone="warning" />
        <ExpenseTotal label="Vencidas" value={model.totals.overdueAmountLabel} tone="danger" />
        <ExpenseTotal label="Pagas" value={model.totals.paidAmountLabel} tone="success" />
        <ExpenseTotal label="Total" value={model.totals.totalAmountLabel} tone="neutral" />
      </section>

      <div className="expenses-workspace" aria-label="Despesas e categorias responsivas">
        <main className="expenses-primary" aria-label="Lista de despesas">
          <ExpenseFilters
            filters={model.statusFilters}
            selectedStatus={selectedStatus}
            onSelect={setSelectedStatus}
          />
          <ExpenseList
            expenses={visibleExpenses}
            onCancel={(expense) => setModal({ type: 'cancel', expense })}
            onDetails={(expense) => setModal({ type: 'details', expense })}
            onPay={(expense) => setModal({ type: 'pay', expense })}
          />
        </main>

        <aside className="expenses-side" aria-label="Categorias de despesas">
          <CategorySummary categories={model.categories} />
        </aside>
      </div>

      <ExpenseModal modal={modal} model={model} onClose={() => setModal(null)} />
    </div>
  );
}

function ExpenseActions({
  actions,
  onAction,
}: Readonly<{
  actions: readonly ExpenseActionModel[];
  onAction: (action: ExpenseActionModel) => void;
}>) {
  return (
    <div className="expenses-heading-actions" aria-label="Acoes de despesas">
      {actions.map((action) => (
        <button
          className={
            action.id === 'expenses.create' ? 'button button-primary' : 'button button-secondary'
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

function iconForAction(id: ExpenseActionModel['id']) {
  if (id === 'expenses.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'expenses.cancel-selected') return <XCircle size={16} aria-hidden="true" />;
  if (id === 'expenses.pay-selected') return <WalletCards size={16} aria-hidden="true" />;
  return <Plus size={16} aria-hidden="true" />;
}

function ExpenseTotal({
  label,
  tone,
  value,
}: Readonly<{ label: string; tone: 'neutral' | 'success' | 'warning' | 'danger'; value: string }>) {
  return (
    <article className={'expenses-total expenses-tone-' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ExpenseFilters({
  filters,
  onSelect,
  selectedStatus,
}: Readonly<{
  filters: readonly ExpenseStatusFilterModel[];
  onSelect: (status: ExpenseStatus | 'ALL') => void;
  selectedStatus: ExpensesViewModel['selectedStatus'];
}>) {
  return (
    <section className="expenses-panel" aria-labelledby="expenses-filters-title">
      <div className="expenses-panel-heading">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2 id="expenses-filters-title">Status</h2>
        </div>
        <Filter size={20} aria-hidden="true" />
      </div>
      <div className="expenses-filter-list">
        {filters.map((filter) => (
          <button
            aria-pressed={filter.status === selectedStatus}
            className="expenses-filter-button"
            key={filter.status}
            type="button"
            onClick={() => onSelect(filter.status)}
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function ExpenseList({
  expenses,
  onCancel,
  onDetails,
  onPay,
}: Readonly<{
  expenses: readonly ExpenseItemModel[];
  onCancel: (expense: ExpenseItemModel) => void;
  onDetails: (expense: ExpenseItemModel) => void;
  onPay: (expense: ExpenseItemModel) => void;
}>) {
  return (
    <section className="expenses-panel" aria-labelledby="expenses-list-title">
      <div className="expenses-panel-heading">
        <div>
          <p className="eyebrow">Compromissos</p>
          <h2 id="expenses-list-title">Lista de despesas</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {expenses.length ? (
        <div className="expenses-list">
          {expenses.map((expense) => (
            <ExpenseRow
              expense={expense}
              key={expense.id}
              onCancel={() => onCancel(expense)}
              onDetails={() => onDetails(expense)}
              onPay={() => onPay(expense)}
            />
          ))}
        </div>
      ) : (
        <p className="expenses-muted">Sem despesas para o filtro atual.</p>
      )}
    </section>
  );
}

function ExpenseRow({
  expense,
  onCancel,
  onDetails,
  onPay,
}: Readonly<{
  expense: ExpenseItemModel;
  onCancel: () => void;
  onDetails: () => void;
  onPay: () => void;
}>) {
  return (
    <article className="expenses-row">
      <div className="expenses-row-main">
        <div className="expenses-row-title">
          <div>
            <strong>{expense.description}</strong>
            <span>{expense.vendorName ?? 'Fornecedor nao informado'}</span>
          </div>
          <StatusBadge variant={statusBadgeVariant(expense.statusTone)}>
            {expense.statusLabel}
          </StatusBadge>
        </div>
        <div className="expenses-row-meta" aria-label="Resumo da despesa">
          <span>
            <ReceiptText size={15} aria-hidden="true" />
            {expense.categoryName}
          </span>
          {expense.dueDateLabel ? (
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              Vence {expense.dueDateLabel}
            </span>
          ) : null}
          <span>
            <Repeat size={15} aria-hidden="true" />
            {expense.recurrenceLabel}
          </span>
        </div>
      </div>
      <div className="expenses-row-actions">
        <strong>{expense.amountLabel}</strong>
        <button className="button button-secondary" type="button" onClick={onDetails}>
          <FileText size={16} aria-hidden="true" />
          Detalhes
        </button>
        <button
          className="button button-secondary"
          disabled={!expense.canPay}
          title={expense.unavailableReason}
          type="button"
          onClick={onPay}
        >
          <WalletCards size={16} aria-hidden="true" />
          Pagar
        </button>
        <button
          className="button button-danger"
          disabled={!expense.canCancel}
          title={expense.unavailableReason}
          type="button"
          onClick={onCancel}
        >
          <XCircle size={16} aria-hidden="true" />
          Cancelar
        </button>
      </div>
    </article>
  );
}

function ExpenseModal({
  modal,
  model,
  onClose,
}: Readonly<{ modal: ExpenseModalState; model: ExpensesViewModel; onClose: () => void }>) {
  if (!modal) return null;
  if (modal.type === 'create') {
    return (
      <AppModal
        description={model.description}
        eyebrow="Lancamento"
        title="Nova despesa"
        onClose={onClose}
      >
        <ExpenseFormContent model={model} />
      </AppModal>
    );
  }
  if (modal.type === 'details') {
    return (
      <AppModal
        description="Dados completos do compromisso financeiro selecionado."
        eyebrow="Detalhes"
        title={modal.expense.description}
        onClose={onClose}
      >
        <ExpenseDetails expense={modal.expense} />
      </AppModal>
    );
  }
  if (modal.type === 'pay') {
    return (
      <AppModal
        description="Confirme o metodo antes de gerar o movimento financeiro auditavel."
        eyebrow="Pagamento"
        title={'Pagar ' + modal.expense.description}
        onClose={onClose}
      >
        <ExpensePaymentConfirmation expense={modal.expense} onClose={onClose} />
      </AppModal>
    );
  }
  return (
    <AppModal
      description="O cancelamento preserva historico e bloqueia novas alteracoes diretas nesta despesa."
      eyebrow="Confirmacao"
      title={'Cancelar ' + modal.expense.description + '?'}
      onClose={onClose}
    >
      <ExpenseCancelConfirmation expense={modal.expense} onClose={onClose} />
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

function ExpenseFormContent({ model }: Readonly<{ model: ExpensesViewModel }>) {
  const createAction = model.allowedActions.find((action) => action.id === 'expenses.create');
  const formDisabled = !createAction?.enabled;

  return (
    <form className="expenses-form">
      <fieldset disabled={formDisabled}>
        <label>
          Categoria
          <select aria-label="Categoria da despesa" defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {model.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Descricao
          <input maxLength={160} placeholder="Ex.: Energia da unidade" />
        </label>
        <label>
          Fornecedor
          <input maxLength={120} placeholder="Opcional" />
        </label>
        <label>
          Valor
          <input inputMode="decimal" placeholder="0,00" />
        </label>
        <div className="expenses-form-grid">
          <label>
            Competencia
            <input type="date" defaultValue={model.periodStart} />
          </label>
          <label>
            Vencimento
            <input type="date" />
          </label>
        </div>
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
          Recorrencia
          <select defaultValue="NONE">
            <option value="NONE">Sem recorrencia</option>
            <option value="MONTHLY">Mensal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </label>
        <label>
          Anexo
          <input type="file" />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={formDisabled} type="button">
          <Plus size={16} aria-hidden="true" />
          Cadastrar despesa
        </Button>
      </div>
    </form>
  );
}

function ExpenseDetails({ expense }: Readonly<{ expense: ExpenseItemModel }>) {
  return (
    <dl className="expenses-detail-list" aria-label="Detalhes da despesa">
      <DetailTerm label="Fornecedor" value={expense.vendorName ?? 'Fornecedor nao informado'} />
      <DetailTerm label="Categoria" value={expense.categoryName} />
      <DetailTerm label="Competencia" value={expense.competenceDateLabel} />
      <DetailTerm label="Vencimento" value={expense.dueDateLabel ?? '-'} />
      <DetailTerm label="Pagamento" value={expense.cashDateLabel ?? '-'} />
      <DetailTerm label="Metodo" value={expense.paymentMethodLabel ?? '-'} />
      <DetailTerm label="Recorrencia" value={expense.recurrenceLabel} />
      <DetailTerm label="Anexo" value={expense.attachmentLabel ?? 'Sem anexo'} />
      <DetailTerm label="Valor" value={expense.amountLabel} />
    </dl>
  );
}

function DetailTerm({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ExpensePaymentConfirmation({
  expense,
  onClose,
}: Readonly<{ expense: ExpenseItemModel; onClose: () => void }>) {
  return (
    <div className="expenses-modal-stack">
      <ExpenseDetails expense={expense} />
      <form className="expenses-form">
        <fieldset>
          <label>
            Metodo de pagamento
            <select defaultValue={expense.paymentMethod ?? 'PIX'}>
              <option value="PIX">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="DEBIT_CARD">Debito</option>
              <option value="CREDIT_CARD">Credito</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>
          <label>
            Data do caixa
            <input
              type="date"
              defaultValue={expense.cashDate ?? expense.dueDate ?? expense.competenceDate}
            />
          </label>
        </fieldset>
        <div className="app-dialog-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button">
            <WalletCards size={16} aria-hidden="true" />
            Confirmar pagamento
          </Button>
        </div>
      </form>
    </div>
  );
}

function ExpenseCancelConfirmation({
  expense,
  onClose,
}: Readonly<{ expense: ExpenseItemModel; onClose: () => void }>) {
  return (
    <div className="expenses-modal-stack">
      <ExpenseDetails expense={expense} />
      <div className="app-dialog-actions">
        <Button variant="secondary" type="button" onClick={onClose}>
          Manter despesa
        </Button>
        <button className="button button-danger" type="button">
          <XCircle size={16} aria-hidden="true" />
          Confirmar cancelamento
        </button>
      </div>
    </div>
  );
}

function CategorySummary({
  categories,
}: Readonly<{ categories: readonly ExpenseCategoryModel[] }>) {
  return (
    <section className="expenses-panel" aria-labelledby="expenses-categories-title">
      <div className="expenses-panel-heading">
        <div>
          <p className="eyebrow">Categorias</p>
          <h2 id="expenses-categories-title">Por categoria</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {categories.length ? (
        <dl className="expenses-category-list">
          {categories.map((category) => (
            <div key={category.id}>
              <dt>
                {category.name}
                <span>{category.expenseCount} despesas</span>
              </dt>
              <dd>{category.openAmountLabel}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="expenses-muted">Sem categorias disponiveis.</p>
      )}
    </section>
  );
}

function ExpenseInlineState({
  text,
  tone,
}: Readonly<{ text: string; tone: 'neutral' | 'warning' }>) {
  return (
    <div className={'expenses-inline-state expenses-tone-' + tone} role="status">
      {tone === 'warning' ? (
        <AlertTriangle size={17} aria-hidden="true" />
      ) : (
        <ReceiptText size={17} aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function ExpenseBoundaryState({ model }: Readonly<{ model: ExpensesViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="expenses-boundary-state" aria-labelledby="expenses-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="expenses-boundary-title">{denied ? 'Despesas indisponiveis' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

function filterExpenses(
  expenses: readonly ExpenseItemModel[],
  selectedStatus: ExpenseStatus | 'ALL',
) {
  if (selectedStatus === 'ALL') return expenses;
  return expenses.filter((expense) => expense.status === selectedStatus);
}

function statusBadgeVariant(tone: ExpenseItemModel['statusTone']) {
  if (tone === 'danger') return 'warning';
  return tone;
}
