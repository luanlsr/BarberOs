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
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  CashRegisterMovementModel,
  CashRegisterSessionModel,
  CashRegisterViewModel,
} from '../lib/cash-register-data';

export function CashRegisterView({ model }: Readonly<{ model: CashRegisterViewModel }>) {
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

      <div className="cash-register-workspace" aria-label="Operacao de caixa responsiva">
        <main className="cash-register-primary" aria-label="Acoes principais do caixa">
          {model.state === 'no-open-session' ? <OpenCashRegisterPanel model={model} /> : null}
          {model.session ? <CashRegisterSessionSummary session={model.session} /> : null}
          {model.state === 'open' ? <CashMovementPanels model={model} /> : null}
          {model.state === 'closed' && model.session ? (
            <ClosedCashRegisterPanel session={model.session} />
          ) : null}
        </main>

        <aside className="cash-register-side" aria-label="Resumo e movimentos do caixa">
          <PaymentMethodTotals model={model} />
          <CashMovementList movements={model.movements} />
          {model.state === 'open' && model.session ? (
            <CloseCashRegisterPanel model={model} />
          ) : null}
        </aside>
      </div>
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
      <form className="cash-register-form">
        <fieldset disabled={!model.canOpen}>
          <label>
            Troco inicial
            <input inputMode="decimal" placeholder="0,00" aria-label="Troco inicial do caixa" />
          </label>
          <label>
            Observacao
            <textarea rows={3} placeholder="Opcional" aria-label="Observacao da abertura" />
          </label>
        </fieldset>
        <button className="button button-primary" disabled={!model.canOpen} type="button">
          <Banknote size={16} aria-hidden="true" />
          Abrir caixa
        </button>
      </form>
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

function CashMovementPanels({ model }: Readonly<{ model: CashRegisterViewModel }>) {
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
        <CashMovementForm
          title="Sangria"
          description="Retirada auditavel de dinheiro do caixa."
          disabled={!model.canWithdraw}
          buttonLabel="Registrar sangria"
        />
        <CashMovementForm
          title="Reforco"
          description="Entrada manual para recompor troco."
          disabled={!model.canCashIn}
          buttonLabel="Registrar reforco"
        />
      </div>
    </section>
  );
}

function CashMovementForm({
  buttonLabel,
  description,
  disabled,
  title,
}: Readonly<{ buttonLabel: string; description: string; disabled: boolean; title: string }>) {
  return (
    <form className="cash-register-form compact" aria-label={title}>
      <h3>{title}</h3>
      <p>{description}</p>
      <fieldset disabled={disabled}>
        <label>
          Valor
          <input inputMode="decimal" placeholder="0,00" aria-label={'Valor de ' + title} />
        </label>
        <label>
          Motivo
          <input
            maxLength={500}
            placeholder="Motivo obrigatorio"
            aria-label={'Motivo de ' + title}
          />
        </label>
      </fieldset>
      <button className="button button-secondary" disabled={disabled} type="button">
        {title === 'Sangria' ? (
          <MinusCircle size={16} aria-hidden="true" />
        ) : (
          <PlusCircle size={16} aria-hidden="true" />
        )}
        {buttonLabel}
      </button>
    </form>
  );
}

function CloseCashRegisterPanel({ model }: Readonly<{ model: CashRegisterViewModel }>) {
  return (
    <section className="cash-register-panel" aria-labelledby="cash-close-title">
      <div className="cash-register-panel-heading">
        <div>
          <p className="eyebrow">Fechamento</p>
          <h2 id="cash-close-title">Fechar caixa</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>
      <form className="cash-register-form">
        <fieldset disabled={!model.canClose}>
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
        <button className="button button-primary" disabled={!model.canClose} type="button">
          <ClipboardList size={16} aria-hidden="true" />
          Fechar caixa
        </button>
      </form>
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
          <h2 id="cash-methods-title">Resumo por metodo</h2>
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
        <h1 id="cash-error-title">Nao foi possivel carregar o caixa</h1>
        <p>
          {model.error?.message ?? model.description} Codigo{' '}
          {model.error?.code ?? 'CASH_REGISTER_LOAD_FAILED'}. Request{' '}
          {model.error?.requestId ?? 'local-cash-register-request'}.
        </p>
      </div>
    </section>
  );
}
