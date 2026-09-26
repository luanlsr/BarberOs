'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  LockKeyhole,
  MinusCircle,
  PlusCircle,
  ReceiptText,
  WalletCards,
  X,
} from 'lucide-react';
import { Button, IconButton, StatusBadge } from '@barberos/ui';
import type {
  CashRegisterMovementModel,
  CashRegisterSessionModel,
  CashRegisterViewModel,
} from '../lib/cash-register-data';

type CashModalState = 'open' | 'withdraw' | 'cash-in' | 'close' | null;
type CashFeedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; requestId: string }
  | null;

export function CashRegisterView({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  const [modal, setModal] = React.useState<CashModalState>(null);
  const [feedback, setFeedback] = React.useState<CashFeedback>(null);
  const [busy, setBusy] = React.useState(false);

  async function submitCashAction(action: CashAction) {
    setBusy(true);
    setFeedback(null);
    try {
      await persistCashAction(action);
      setFeedback({ type: 'success', message: successMessageFor(action.type) });
      setModal(null);
      window.location.reload();
    } catch (error) {
      setFeedback(normalizeCashError(error));
    } finally {
      setBusy(false);
    }
  }

  if (model.state === 'permission-denied') return <CashRegisterPermissionDenied model={model} />;
  if (model.state === 'error') return <CashRegisterErrorState model={model} />;

  return (
    <div className="cash-register-page">
      <header className="cash-register-heading">
        <div>
          <p className="eyebrow">Caixa</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <div className="cash-register-heading-actions" aria-label="Ações do caixa">
          {model.session ? (
            <StatusBadge variant={model.session.statusTone === 'success' ? 'success' : 'neutral'}>
              {model.session.statusLabel}
            </StatusBadge>
          ) : null}
          {model.state === 'no-open-session' ? (
            <button
              className="button button-primary"
              disabled={!model.canOpen}
              type="button"
              onClick={() => setModal('open')}
            >
              <Banknote size={16} aria-hidden="true" />
              Abrir caixa
            </button>
          ) : null}
          {model.state === 'open' && model.session ? (
            <button
              className="button button-primary"
              disabled={!model.canClose}
              type="button"
              onClick={() => setModal('close')}
            >
              <ClipboardList size={16} aria-hidden="true" />
              Fechar caixa
            </button>
          ) : null}
        </div>
      </header>

      <div className="cash-register-workspace" aria-label="Operação de caixa responsiva">
        <main className="cash-register-primary" aria-label="Ações principais do caixa">
          {model.state === 'no-open-session' ? <OpenCashRegisterPanel model={model} /> : null}
          {model.session ? <CashRegisterSessionSummary session={model.session} /> : null}
          {model.state === 'open' ? (
            <CashMovementPanels
              model={model}
              onCashIn={() => setModal('cash-in')}
              onWithdraw={() => setModal('withdraw')}
            />
          ) : null}
          {model.state === 'closed' && model.session ? (
            <ClosedCashRegisterPanel session={model.session} />
          ) : null}
        </main>

        <aside className="cash-register-side" aria-label="Resumo e movimentos do caixa">
          <PaymentMethodTotals model={model} />
          <CashMovementList movements={model.movements} />
        </aside>
      </div>

      {feedback ? (
        <CashFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
      ) : null}

      <CashRegisterModal
        busy={busy}
        modal={modal}
        model={model}
        onClose={() => setModal(null)}
        onSubmit={submitCashAction}
      />
    </div>
  );
}

function OpenCashRegisterPanel({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-open-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Inicio do dia</p>
          <h2 id="cash-open-title">Abertura do caixa</h2>
        </div>
        <PlusCircle size={20} aria-hidden="true" />
      </div>
      <p className="cash-register-muted">
        Use o botão Abrir caixa no topo para informar troco inicial e observacao em um modal seguro.
      </p>
      {!model.canOpen ? (
        <p className="cash-register-muted">Seu perfil não tem permissão para abrir este caixa.</p>
      ) : null}
    </section>
  );
}

function CashRegisterSessionSummary({ session }: Readonly<{ session: CashRegisterSessionModel }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-session-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Sessao</p>
          <h2 id="cash-session-title">Resumo do caixa</h2>
        </div>
        <WalletCards size={20} aria-hidden="true" />
      </div>
      <dl className="cash-register-kpis">
        <div>
          <dt>Abertura</dt>
          <dd>{session.openingBalanceLabel}</dd>
        </div>
        <div>
          <dt>Esperado</dt>
          <dd>{session.expectedBalanceLabel}</dd>
        </div>
        <div>
          <dt>Diferenca</dt>
          <dd>{session.differenceLabel}</dd>
        </div>
        {session.actualBalanceLabel ? (
          <div>
            <dt>Conferido</dt>
            <dd>{session.actualBalanceLabel}</dd>
          </div>
        ) : null}
      </dl>
      <p className="cash-register-muted">
        Aberto {session.openedAtLabel}
        {session.closedAtLabel ? ' · Fechado ' + session.closedAtLabel : ''}
      </p>
    </section>
  );
}

function CashMovementPanels({
  model,
  onCashIn,
  onWithdraw,
}: Readonly<{
  model: CashRegisterViewModel;
  onCashIn: () => void;
  onWithdraw: () => void;
}>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-movement-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Movimento manual</p>
          <h2 id="cash-movement-title">Sangria e reforco</h2>
        </div>
        <MinusCircle size={20} aria-hidden="true" />
      </div>
      <div className="cash-register-actions-grid">
        <CashMovementAction
          title="Sangria"
          description="Retirada auditável de dinheiro do caixa."
          disabled={!model.canWithdraw}
          buttonLabel="Registrar sangria"
          onClick={onWithdraw}
        />
        <CashMovementAction
          title="Reforco"
          description="Entrada manual para recompor troco."
          disabled={!model.canCashIn}
          buttonLabel="Registrar reforco"
          onClick={onCashIn}
        />
      </div>
    </section>
  );
}

function CashMovementAction({
  buttonLabel,
  description,
  disabled,
  onClick,
  title,
}: Readonly<{
  buttonLabel: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  title: string;
}>) {
  return (
    <article className="cash-register-action-card" aria-label={title}>
      <h3>{title}</h3>
      <p>{description}</p>
      <button
        className="button button-secondary"
        disabled={disabled}
        type="button"
        onClick={onClick}
      >
        {title === 'Sangria' ? (
          <MinusCircle size={16} aria-hidden="true" />
        ) : (
          <PlusCircle size={16} aria-hidden="true" />
        )}
        {buttonLabel}
      </button>
    </article>
  );
}

function CloseCashRegisterPanel({
  model,
  onCloseCash,
}: Readonly<{ model: CashRegisterViewModel; onCloseCash: () => void }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-close-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Fechamento</p>
          <h2 id="cash-close-title">Fechar caixa</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>
      <p className="cash-register-muted">Confira valores e registre divergencia em modal.</p>
      <button
        className="button button-primary"
        disabled={!model.canClose}
        type="button"
        onClick={onCloseCash}
      >
        <ClipboardList size={16} aria-hidden="true" />
        Fechar caixa
      </button>
    </section>
  );
}

function ClosedCashRegisterPanel({ session }: Readonly<{ session: CashRegisterSessionModel }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-closed-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Conferencia</p>
          <h2 id="cash-closed-title">Caixa fechado</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>
      <p className="cash-register-muted">
        Conferido {session.actualBalanceLabel ?? session.expectedBalanceLabel}. Diferenca{' '}
        {session.differenceLabel}.
      </p>
      {session.closingNotes ? <p>{session.closingNotes}</p> : null}
    </section>
  );
}

function PaymentMethodTotals({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-methods-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Recebimentos</p>
          <h2 id="cash-methods-title">Resumo por método</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {model.methodTotals.length ? (
        <dl className="cash-register-method-list">
          {model.methodTotals.map((method) => (
            <div key={method.method}>
              <dt>{method.methodLabel}</dt>
              <dd>{method.amountLabel}</dd>
              <span>{method.count} recebimento</span>
            </div>
          ))}
        </dl>
      ) : (
        <p className="cash-register-muted">Sem recebimentos registrados nesta sessao.</p>
      )}
    </section>
  );
}

function CashMovementList({
  movements,
}: Readonly<{ movements: readonly CashRegisterMovementModel[] }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-movements-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h2 id="cash-movements-title">Movimentos</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      {movements.length ? (
        <ol className="cash-register-movement-list">
          {movements.map((movement) => (
            <li className={'cash-register-movement ' + movement.tone} key={movement.id}>
              <time>{movement.createdAtLabel}</time>
              <div>
                <strong>{movement.typeLabel}</strong>
                <span>{movement.reason ?? 'Sem observacao'}</span>
              </div>
              <b>{movement.signedAmountLabel}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cash-register-muted">Nenhum movimento registrado.</p>
      )}
    </section>
  );
}

function CashRegisterModal({
  busy,
  modal,
  model,
  onClose,
  onSubmit,
}: Readonly<{
  busy: boolean;
  modal: CashModalState;
  model: CashRegisterViewModel;
  onClose: () => void;
  onSubmit: (action: CashAction) => void;
}>) {
  if (!modal) return null;
  if (modal === 'open') {
    return (
      <AppModal
        description="A abertura cria uma sessao auditável para recebimentos e movimentos manuais."
        eyebrow="Inicio do dia"
        title="Abrir caixa"
        onClose={onClose}
      >
        <CashOpenForm busy={busy} disabled={!model.canOpen} model={model} onSubmit={onSubmit} />
      </AppModal>
    );
  }
  if (modal === 'close') {
    return (
      <AppModal
        description="Confira o valor esperado antes de encerrar a sessao do caixa."
        eyebrow="Fechamento"
        title="Fechar caixa"
        onClose={onClose}
      >
        <CashCloseForm
          busy={busy}
          disabled={!model.canClose}
          session={model.session}
          onSubmit={onSubmit}
        />
      </AppModal>
    );
  }
  return (
    <AppModal
      description={
        modal === 'withdraw'
          ? 'Retirada manual com motivo obrigatorio.'
          : 'Entrada manual para recompor troco.'
      }
      eyebrow="Movimento manual"
      title={modal === 'withdraw' ? 'Registrar sangria' : 'Registrar reforco'}
      onClose={onClose}
    >
      <CashMovementForm
        busy={busy}
        disabled={modal === 'withdraw' ? !model.canWithdraw : !model.canCashIn}
        model={model}
        type={modal}
        onSubmit={onSubmit}
      />
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
    <div className="app-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
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

type CashAction =
  | { type: 'open'; branchId: string; openingBalanceAmountCents: number; notes?: string }
  | {
      type: 'movement';
      branchId: string;
      movementType: 'WITHDRAWAL' | 'CASH_IN';
      amountCents: number;
      reason: string;
    }
  | {
      type: 'close';
      sessionId: string;
      actualBalanceAmountCents: number;
      expectedBalanceAmountCents: number;
      differenceReason?: string;
    };

function CashOpenForm({
  busy,
  disabled,
  model,
  onSubmit,
}: Readonly<{
  busy: boolean;
  disabled: boolean;
  model: CashRegisterViewModel;
  onSubmit: (action: CashAction) => void;
}>) {
  const [openingBalance, setOpeningBalance] = React.useState('0,00');
  const [notes, setNotes] = React.useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      type: 'open',
      branchId: model.branchId,
      openingBalanceAmountCents: moneyToCents(openingBalance),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form className="cash-register-form" onSubmit={submit}>
      <fieldset disabled={disabled || busy}>
        <label>
          Troco inicial
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            aria-label="Troco inicial do caixa"
          />
        </label>
        <label>
          Observacao
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Opcional"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            aria-label="Observacao da abertura"
          />
        </label>
      </fieldset>
      <div className="cash-register-modal-summary">
        <span>Unidade</span>
        <strong>{model.branchName}</strong>
        <span>Saldo inicial</span>
        <strong>{formatCurrency(moneyToCents(openingBalance))}</strong>
      </div>
      <div className="app-dialog-actions">
        <Button disabled={disabled || busy} type="submit">
          <Banknote size={16} aria-hidden="true" />
          {busy ? 'Abrindo...' : 'Confirmar abertura'}
        </Button>
      </div>
    </form>
  );
}

function CashMovementForm({
  busy,
  disabled,
  model,
  onSubmit,
  type,
}: Readonly<{
  busy: boolean;
  disabled: boolean;
  model: CashRegisterViewModel;
  onSubmit: (action: CashAction) => void;
  type: 'withdraw' | 'cash-in';
}>) {
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const label = type === 'withdraw' ? 'Sangria' : 'Reforco';
  const amountCents = moneyToCents(amount);
  const canSubmit = !disabled && !busy && amountCents > 0 && reason.trim().length >= 3;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      type: 'movement',
      branchId: model.branchId,
      movementType: type === 'withdraw' ? 'WITHDRAWAL' : 'CASH_IN',
      amountCents,
      reason: reason.trim(),
    });
  }

  return (
    <form className="cash-register-form" onSubmit={submit}>
      <fieldset disabled={disabled || busy}>
        <label>
          Valor
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label={'Valor de ' + label}
          />
        </label>
        <label>
          Motivo
          <input
            maxLength={500}
            placeholder="Motivo obrigatorio"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label={'Motivo de ' + label}
          />
        </label>
      </fieldset>
      <div className="cash-register-modal-summary">
        <span>Caixa</span>
        <strong>{model.session?.expectedBalanceLabel ?? 'Sem caixa aberto'}</strong>
        <span>{label}</span>
        <strong>{formatCurrency(amountCents)}</strong>
      </div>
      <div className="app-dialog-actions">
        <Button
          disabled={!canSubmit}
          type="submit"
          variant={type === 'withdraw' ? 'secondary' : 'primary'}
        >
          {type === 'withdraw' ? (
            <MinusCircle size={16} aria-hidden="true" />
          ) : (
            <PlusCircle size={16} aria-hidden="true" />
          )}
          {busy ? 'Registrando...' : 'Confirmar ' + label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function CashCloseForm({
  busy,
  disabled,
  onSubmit,
  session,
}: Readonly<{
  busy: boolean;
  disabled: boolean;
  onSubmit: (action: CashAction) => void;
  session?: CashRegisterSessionModel;
}>) {
  const [actualBalance, setActualBalance] = React.useState(
    session ? centsToInput(session.expectedBalanceAmountCents) : '',
  );
  const [differenceReason, setDifferenceReason] = React.useState('');
  const actualBalanceAmountCents = moneyToCents(actualBalance);
  const expectedBalanceAmountCents = session?.expectedBalanceAmountCents ?? 0;
  const differenceAmountCents = actualBalanceAmountCents - expectedBalanceAmountCents;
  const hasDifference = differenceAmountCents !== 0;
  const canSubmit =
    Boolean(session) &&
    !disabled &&
    !busy &&
    actualBalanceAmountCents >= 0 &&
    (!hasDifference || differenceReason.trim().length >= 3);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !canSubmit) return;
    onSubmit({
      type: 'close',
      sessionId: session.id,
      actualBalanceAmountCents,
      expectedBalanceAmountCents,
      differenceReason: differenceReason.trim() || undefined,
    });
  }

  return (
    <form className="cash-register-form" onSubmit={submit}>
      {session ? (
        <dl className="cash-register-close-grid">
          <div>
            <dt>Esperado</dt>
            <dd>{session.expectedBalanceLabel}</dd>
          </div>
          <div>
            <dt>Abertura</dt>
            <dd>{session.openingBalanceLabel}</dd>
          </div>
          <div className={hasDifference ? 'warning' : 'success'}>
            <dt>Diferença</dt>
            <dd>{formatSignedCurrency(differenceAmountCents)}</dd>
          </div>
        </dl>
      ) : null}
      <fieldset disabled={disabled || busy || !session}>
        <label>
          Valor conferido
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={actualBalance}
            onChange={(event) => setActualBalance(event.target.value)}
            aria-label="Valor conferido no fechamento"
          />
        </label>
        <label>
          Observacao de divergencia
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Obrigatoria se houver diferenca"
            value={differenceReason}
            onChange={(event) => setDifferenceReason(event.target.value)}
            aria-label="Motivo da divergencia"
          />
        </label>
      </fieldset>
      {hasDifference && differenceReason.trim().length < 3 ? (
        <p className="cash-register-form-warning" role="alert">
          Informe o motivo da divergência para fechar o caixa.
        </p>
      ) : null}
      <div className="app-dialog-actions">
        <Button disabled={!canSubmit} type="submit">
          <ClipboardList size={16} aria-hidden="true" />
          {busy ? 'Fechando...' : 'Confirmar fechamento'}
        </Button>
      </div>
    </form>
  );
}

function CashFeedbackBanner({
  feedback,
  onDismiss,
}: Readonly<{ feedback: Exclude<CashFeedback, null>; onDismiss: () => void }>) {
  return (
    <div
      className={'cash-register-feedback ' + feedback.type}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{feedback.message}</span>
      {feedback.type === 'error' ? <small>{feedback.requestId}</small> : null}
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

async function persistCashAction(action: CashAction) {
  const idempotencyKey = randomToken();
  if (action.type === 'open') {
    await postCashJson('/api/v1/cash-register', {
      branchId: action.branchId,
      openingBalanceAmountCents: action.openingBalanceAmountCents,
      notes: action.notes,
      idempotencyKey,
    });
    return;
  }
  if (action.type === 'movement') {
    await postCashJson('/api/v1/cash-movements', {
      branchId: action.branchId,
      type: action.movementType,
      amountCents: action.amountCents,
      reason: action.reason,
      idempotencyKey,
    });
    return;
  }
  await postCashJson('/api/v1/cash-register/' + encodeURIComponent(action.sessionId) + '/close', {
    sessionId: action.sessionId,
    actualBalanceAmountCents: action.actualBalanceAmountCents,
    expectedBalanceAmountCents: action.expectedBalanceAmountCents,
    differenceReason: action.differenceReason,
    idempotencyKey,
  });
}

async function postCashJson(url: string, body: Record<string, unknown>) {
  const requestId = randomToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string; requestId?: string };
    requestId?: string;
  } | null;
  if (!response.ok) {
    throw {
      message: payload?.error?.message ?? 'Não foi possível concluir a operação de caixa.',
      requestId: payload?.error?.requestId ?? payload?.requestId ?? requestId,
    };
  }
}

function normalizeCashError(error: unknown): Exclude<CashFeedback, null> {
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; requestId?: unknown };
    return {
      type: 'error',
      message:
        typeof record.message === 'string'
          ? record.message
          : 'Não foi possível concluir a operação de caixa.',
      requestId: typeof record.requestId === 'string' ? record.requestId : 'request-unavailable',
    };
  }
  return {
    type: 'error',
    message: 'Não foi possível concluir a operação de caixa.',
    requestId: 'request-unavailable',
  };
}

function successMessageFor(type: CashAction['type']) {
  if (type === 'open') return 'Caixa aberto com sucesso.';
  if (type === 'movement') return 'Movimento registrado com sucesso.';
  return 'Caixa fechado com sucesso.';
}

function moneyToCents(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized || '0');
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatSignedCurrency(cents: number) {
  const prefix = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return prefix + formatCurrency(Math.abs(cents));
}

function randomToken() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function CashRegisterPermissionDenied({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  return (
    <section className="cash-register-boundary-state" aria-labelledby="cash-denied-title">
      <LockKeyhole size={28} aria-hidden="true" />
      <div>
        <p className="eyebrow">Caixa</p>
        <h1 id="cash-denied-title">Acesso restrito</h1>
        <p>{model.description}</p>
      </div>
    </section>
  );
}

function CashRegisterErrorState({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  return (
    <section className="cash-register-boundary-state" aria-labelledby="cash-error-title">
      <AlertTriangle size={28} aria-hidden="true" />
      <div>
        <p className="eyebrow">Caixa</p>
        <h1 id="cash-error-title">Não foi possível carregar o caixa</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}
