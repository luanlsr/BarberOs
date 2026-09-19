'use client';

import * as React from 'react';
import { LoaderCircle, Plus, RefreshCcw, Trash2, WalletCards, WifiOff, X } from 'lucide-react';
import type { PaymentMethod } from '@barberos/contracts';
import type { ComandaPaymentSummaryModel } from '../lib/order-data';

type PaymentTerminalOption = {
  id: string;
  name: string;
  provider: string;
};

type PaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: string;
  cashReceived: string;
};

type Feedback =
  | { type: 'idle' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; code: string; requestId: string };

type ReceivePaymentPanelProps = Readonly<{
  orderId: string;
  paymentSummary: ComandaPaymentSummaryModel;
  onPaymentSuccess?: (orderId: string) => void;
}>;

const paymentMethods: readonly { method: PaymentMethod; label: string }[] = [
  { method: 'CASH', label: 'Dinheiro' },
  { method: 'PIX', label: 'PIX' },
  { method: 'DEBIT_CARD', label: 'Debito' },
  { method: 'CREDIT_CARD', label: 'Credito' },
  { method: 'OTHER', label: 'Outro' },
];

export function ReceivePaymentPanel({
  orderId,
  paymentSummary,
  onPaymentSuccess = refreshOrder,
}: ReceivePaymentPanelProps) {
  const [lines, setLines] = React.useState<PaymentLine[]>(() => [
    newPaymentLine(paymentSummary.amountDueCents),
  ]);
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const online = useOnlineStatus();
  const feedbackId = React.useId();
  const dialogTitleId = React.useId();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [terminals, setTerminals] = React.useState<PaymentTerminalOption[]>([]);
  const [terminalId, setTerminalId] = React.useState('');
  const [terminalsLoading, setTerminalsLoading] = React.useState(false);
  const appliedAmountCents = lines.reduce((total, line) => total + moneyToCents(line.amount), 0);
  const remainingAmountCents = Math.max(paymentSummary.amountDueCents - appliedAmountCents, 0);
  const overpaidAmountCents = Math.max(appliedAmountCents - paymentSummary.amountDueCents, 0);
  const cashChangeAmountCents = lines.reduce((total, line) => {
    if (line.method !== 'CASH') return total;
    return total + Math.max(moneyToCents(line.cashReceived) - moneyToCents(line.amount), 0);
  }, 0);
  const disabled = !paymentSummary.canReceivePayment || !online || feedback.type === 'loading';
  const canSubmit = !disabled && remainingAmountCents === 0 && overpaidAmountCents === 0;
  const terminalPayments = lines.filter((line) => isTerminalPaymentMethod(line.method));
  const hasTerminalPayments = terminalPayments.length > 0;

  function updateLine(id: string, updates: Partial<PaymentLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...updates } : line)));
  }

  function addLine() {
    setLines((current) => [...current, newPaymentLine(remainingAmountCents)]);
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (hasTerminalPayments && !terminalId) {
      setFeedback({
        type: 'error',
        code: 'PAYMENT_TERMINAL_REQUIRED',
        message: 'Selecione uma maquininha para receber Pix ou cartao.',
        requestId: randomToken(),
      });
      return;
    }

    const requestId = randomToken();
    setFeedback({
      type: 'loading',
      message: hasTerminalPayments
        ? 'Enviando cobranca para a maquininha...'
        : 'Registrando pagamento...',
    });

    try {
      const payments = lines
        .map((line) => ({
          method: line.method,
          amountCents: moneyToCents(line.amount),
          cashReceivedAmountCents:
            line.method === 'CASH' ? moneyToCents(line.cashReceived) : undefined,
          installments: line.method === 'CREDIT_CARD' ? 1 : undefined,
        }))
        .filter((line) => line.amountCents > 0);

      const manualPayments = payments.filter((line) => !isTerminalPaymentMethod(line.method));
      const terminalPayment = payments.find((line) => isTerminalPaymentMethod(line.method));

      if (manualPayments.length) {
        const manualResponse = await fetch('/api/v1/payments', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          body: JSON.stringify({
            orderId,
            idempotencyKey: 'receive-payment:' + requestId + ':manual',
            payments: manualPayments,
          }),
        });
        const manualPayload = (await manualResponse
          .json()
          .catch(() => null)) as PaymentApiResponse | null;
        if (!manualResponse.ok) {
          setFeedback(
            errorFeedback(
              manualPayload,
              manualResponse.status,
              requestId,
              'Nao foi possivel registrar a baixa manual.',
            ),
          );
          return;
        }
      }

      const response = terminalPayment
        ? await fetch('/api/v1/payment-terminals', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-request-id': requestId },
            body: JSON.stringify({
              orderId,
              terminalId,
              method: terminalPayment.method,
              amountCents: terminalPayment.amountCents,
              installments: terminalPayment.installments,
              idempotencyKey: 'terminal-payment:' + requestId,
            }),
          })
        : new Response(JSON.stringify({ data: { status: 'PAID' }, requestId }), { status: 201 });
      const payload = (await response.json().catch(() => null)) as PaymentApiResponse | null;

      if (!response.ok) {
        setFeedback(
          errorFeedback(payload, response.status, requestId, 'Nao foi possivel receber pagamento.'),
        );
        return;
      }

      setFeedback({
        type: 'success',
        message: hasTerminalPayments
          ? 'Pagamento aprovado na maquininha. Atualizando Comanda...'
          : 'Pagamento registrado. Atualizando Comanda...',
      });
      window.setTimeout(() => onPaymentSuccess(orderId), 250);
    } catch {
      setFeedback({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Sem conexao com o servidor. Tente novamente.',
        requestId,
      });
    }
  }

  return (
    <section className="order-payment-panel" aria-labelledby="receive-payment-title">
      <div className="order-payment-heading">
        <div>
          <p className="eyebrow">Pagamento</p>
          <h3 id="receive-payment-title">Receber pagamento</h3>
        </div>
        <span className="order-payment-state">{paymentSummary.stateLabel}</span>
      </div>

      <dl className="order-payment-kpis">
        <div>
          <dt>Total</dt>
          <dd>{paymentSummary.totalLabel}</dd>
        </div>
        <div>
          <dt>Ja recebido</dt>
          <dd>{paymentSummary.paidLabel}</dd>
        </div>
        <div>
          <dt>Falta receber</dt>
          <dd>{paymentSummary.amountDueLabel}</dd>
        </div>
      </dl>

      {paymentSummary.methodTotals.length ? (
        <div className="order-payment-methods" aria-label="Recebido por metodo">
          {paymentSummary.methodTotals.map((method) => (
            <span key={method.method}>
              {method.methodLabel} {method.amountLabel}
            </span>
          ))}
        </div>
      ) : null}

      {paymentSummary.unavailableReason ? (
        <p className="order-feedback warning" role="status">
          {paymentSummary.unavailableReason}
        </p>
      ) : null}
      {!online ? (
        <p className="order-feedback warning" role="status">
          <WifiOff size={15} aria-hidden="true" /> Voce esta offline. Pagamento precisa de conexao.
        </p>
      ) : null}
      <button
        className="button button-primary order-payment-open-button"
        type="button"
        disabled={disabled}
        onClick={() => setPaymentDialogOpen(true)}
      >
        <WalletCards size={16} aria-hidden="true" />
        Receber pagamento
      </button>

      {paymentDialogOpen ? (
        <div
          className="app-dialog-backdrop"
          role="presentation"
          onClick={() => setPaymentDialogOpen(false)}
        >
          <section
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="app-dialog order-payment-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-dialog-header">
              <div>
                <p className="eyebrow">Pagamento</p>
                <h2 id={dialogTitleId}>Receber pagamento</h2>
                <p>Registre uma ou mais formas de pagamento para quitar a Comanda.</p>
              </div>
              <button
                aria-label="Fechar recebimento"
                className="icon-button"
                type="button"
                onClick={() => setPaymentDialogOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="order-payment-dialog-body">
              <form
                className="order-payment-form"
                onSubmit={handleSubmit}
                aria-describedby={feedbackId}
                aria-label={'Receber pagamento da ' + orderId}
              >
                <fieldset disabled={disabled}>
                  {hasTerminalPayments ? (
                    <label>
                      Maquininha
                      <select
                        disabled={disabled || terminalsLoading || !terminals.length}
                        value={terminalId}
                        onChange={(event) => setTerminalId(event.target.value)}
                      >
                        <option value="">
                          {terminalsLoading
                            ? 'Carregando maquininhas...'
                            : terminals.length
                              ? 'Selecione a maquininha'
                              : 'Nenhuma maquininha ativa'}
                        </option>
                        {terminals.map((terminal) => (
                          <option key={terminal.id} value={terminal.id}>
                            {terminal.name} - {terminal.provider}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="order-payment-lines">
                    {lines.map((line, index) => (
                      <div className="order-payment-line" key={line.id}>
                        <label>
                          Metodo
                          <select
                            value={line.method}
                            onChange={(event) =>
                              updateLine(line.id, {
                                method: event.target.value as PaymentMethod,
                                cashReceived:
                                  event.target.value === 'CASH'
                                    ? line.cashReceived || line.amount
                                    : '',
                              })
                            }
                          >
                            {paymentMethods.map((method) => (
                              <option key={method.method} value={method.method}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Valor
                          <input
                            aria-label={'Valor da forma ' + (index + 1)}
                            inputMode="decimal"
                            value={line.amount}
                            onChange={(event) =>
                              updateLine(line.id, {
                                amount: event.target.value,
                                cashReceived:
                                  line.method === 'CASH' && line.cashReceived === line.amount
                                    ? event.target.value
                                    : line.cashReceived,
                              })
                            }
                          />
                        </label>
                        {line.method === 'CASH' ? (
                          <label>
                            Recebido
                            <input
                              aria-label={'Dinheiro recebido na forma ' + (index + 1)}
                              inputMode="decimal"
                              value={line.cashReceived}
                              onChange={(event) =>
                                updateLine(line.id, { cashReceived: event.target.value })
                              }
                            />
                          </label>
                        ) : null}
                        <button
                          className="icon-button order-payment-remove"
                          type="button"
                          aria-label={'Remover forma ' + (index + 1)}
                          disabled={disabled || lines.length === 1}
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="order-payment-footer">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={disabled || remainingAmountCents === 0}
                    onClick={addLine}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Adicionar forma
                  </button>
                  <div className="order-payment-balance" aria-live="polite">
                    <span>Restante {formatCurrency(remainingAmountCents)}</span>
                    <span>Troco {formatCurrency(cashChangeAmountCents)}</span>
                    {overpaidAmountCents > 0 ? (
                      <span>Excesso {formatCurrency(overpaidAmountCents)}</span>
                    ) : null}
                  </div>
                </div>

                <button
                  className="button button-primary order-payment-button"
                  disabled={!canSubmit}
                  type="submit"
                >
                  {feedback.type === 'loading' ? (
                    <LoaderCircle
                      className="check-in-action-spinner"
                      size={16}
                      aria-hidden="true"
                    />
                  ) : (
                    <WalletCards size={16} aria-hidden="true" />
                  )}
                  {feedback.type === 'loading'
                    ? hasTerminalPayments
                      ? 'Aguardando maquininha...'
                      : 'Registrando...'
                    : hasTerminalPayments
                      ? 'Enviar para maquininha'
                      : 'Confirmar recebimento'}
                </button>
              </form>
              <FeedbackMessage feedback={feedback} id={feedbackId} />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function FeedbackMessage({ feedback, id }: Readonly<{ feedback: Feedback; id: string }>) {
  if (feedback.type === 'idle') return <span className="sr-only" id={id} />;
  const className = ['order-feedback', feedback.type === 'error' ? 'danger' : feedback.type]
    .filter(Boolean)
    .join(' ');
  return (
    <p className={className} id={id} role={feedback.type === 'error' ? 'alert' : 'status'}>
      {feedback.type === 'loading' ? (
        <LoaderCircle className="check-in-action-spinner" size={15} aria-hidden="true" />
      ) : feedback.type === 'success' ? (
        <RefreshCcw size={15} aria-hidden="true" />
      ) : null}
      {feedback.message}
    </p>
  );
}

function isTerminalPaymentMethod(method: PaymentMethod) {
  return method === 'PIX' || method === 'DEBIT_CARD' || method === 'CREDIT_CARD';
}

function newPaymentLine(amountCents: number): PaymentLine {
  const amount = centsToInput(amountCents);
  return {
    id: randomToken(),
    method: 'CASH',
    amount,
    cashReceived: amount,
  };
}

function useOnlineStatus() {
  const [online, setOnline] = React.useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

function moneyToCents(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized || '0');
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function refreshOrder(orderId: string) {
  window.location.assign('/comandas?orderId=' + encodeURIComponent(orderId));
}

function randomToken() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function errorFeedback(
  payload: { error?: { code?: string; message?: string; requestId?: string } } | null,
  status: number,
  requestId: string,
  fallback: string,
): Extract<Feedback, { type: 'error' }> {
  return {
    type: 'error',
    code: payload?.error?.code ?? 'HTTP_' + status,
    message: payload?.error?.message ?? fallback,
    requestId: payload?.error?.requestId ?? requestId,
  };
}

type PaymentApiResponse = {
  data?: { id?: string };
  error?: { code?: string; message?: string; requestId?: string };
};
