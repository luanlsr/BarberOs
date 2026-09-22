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

export function CashRegisterView({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  const [modal, setModal] = React.useState<CashModalState>(null);

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
        {model.session ? (
          <StatusBadge variant={model.session.statusTone === 'success' ? 'success' : 'neutral'}>
            {model.session.statusLabel}
          </StatusBadge>
        ) : null}
      </header>

      <div className="cash-register-workspace" aria-label="Operação de caixa responsiva">
        <main className="cash-register-primary" aria-label="Ações principais do caixa">
          {model.state === 'no-open-session' ? (
            <OpenCashRegisterPanel model={model} onOpen={() => setModal('open')} />
          ) : null}
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
          {model.state === 'open' && model.session ? (
            <CloseCashRegisterPanel model={model} onCloseCash={() => setModal('close')} />
          ) : null}
        </aside>
      </div>

      <CashRegisterModal modal={modal} model={model} onClose={() => setModal(null)} />
    </div>
  );
}

function OpenCashRegisterPanel({
  model,
  onOpen,
}: Readonly<{ model: CashRegisterViewModel; onOpen: () => void }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-open-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Inicio do dia</p>
          <h2 id="cash-open-title">Abertura do caixa</h2>
        </div>
        <PlusCircle size={20} aria-hidden="true" />
      </div>
      <p className="cash-register-muted">Informe troco inicial e observacao em um modal seguro.</p>
      <button
        className="button button-primary"
        disabled={!model.canOpen}
        type="button"
        onClick={onOpen}
      >
        <Banknote size={16} aria-hidden="true" />
        Abrir caixa
      </button>
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
  modal,
  model,
  onClose,
}: Readonly<{ modal: CashModalState; model: CashRegisterViewModel; onClose: () => void }>) {
  if (!modal) return null;
  if (modal === 'open') {
    return (
      <AppModal
        description="A abertura cria uma sessao auditável para recebimentos e movimentos manuais."
        eyebrow="Inicio do dia"
        title="Abrir caixa"
        onClose={onClose}
      >
        <CashOpenForm disabled={!model.canOpen} />
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
        <CashCloseForm disabled={!model.canClose} session={model.session} />
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
        disabled={modal === 'withdraw' ? !model.canWithdraw : !model.canCashIn}
        type={modal}
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

function CashOpenForm({ disabled }: Readonly<{ disabled: boolean }>) {
  return (
    <form className="cash-register-form">
      <fieldset disabled={disabled}>
        <label>
          Troco inicial
          <input inputMode="decimal" placeholder="0,00" aria-label="Troco inicial do caixa" />
        </label>
        <label>
          Observacao
          <textarea rows={3} placeholder="Opcional" aria-label="Observacao da abertura" />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={disabled} type="button">
          <Banknote size={16} aria-hidden="true" />
          Confirmar abertura
        </Button>
      </div>
    </form>
  );
}

function CashMovementForm({
  disabled,
  type,
}: Readonly<{ disabled: boolean; type: 'withdraw' | 'cash-in' }>) {
  const label = type === 'withdraw' ? 'Sangria' : 'Reforco';
  return (
    <form className="cash-register-form">
      <fieldset disabled={disabled}>
        <label>
          Valor
          <input inputMode="decimal" placeholder="0,00" aria-label={'Valor de ' + label} />
        </label>
        <label>
          Motivo
          <input
            maxLength={500}
            placeholder="Motivo obrigatorio"
            aria-label={'Motivo de ' + label}
          />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <Button
          disabled={disabled}
          type="button"
          variant={type === 'withdraw' ? 'secondary' : 'primary'}
        >
          {type === 'withdraw' ? (
            <MinusCircle size={16} aria-hidden="true" />
          ) : (
            <PlusCircle size={16} aria-hidden="true" />
          )}
          Confirmar {label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function CashCloseForm({
  disabled,
  session,
}: Readonly<{ disabled: boolean; session?: CashRegisterSessionModel }>) {
  return (
    <form className="cash-register-form">
      {session ? (
        <dl className="cash-register-kpis">
          <div>
            <dt>Esperado</dt>
            <dd>{session.expectedBalanceLabel}</dd>
          </div>
          <div>
            <dt>Abertura</dt>
            <dd>{session.openingBalanceLabel}</dd>
          </div>
        </dl>
      ) : null}
      <fieldset disabled={disabled}>
        <label>
          Valor conferido
          <input
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor conferido no fechamento"
          />
        </label>
        <label>
          Observacao de divergencia
          <textarea
            rows={3}
            placeholder="Obrigatoria se houver diferenca"
            aria-label="Motivo da divergencia"
          />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <Button disabled={disabled} type="button">
          <ClipboardList size={16} aria-hidden="true" />
          Confirmar fechamento
        </Button>
      </div>
    </form>
  );
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
