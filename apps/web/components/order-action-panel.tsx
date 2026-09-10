'use client';

import * as React from 'react';
import {
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCcw,
  Save,
  Trash2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import type { ComandaItemModel, ComandaItemSuggestionModel } from '../lib/order-data';

type Feedback =
  | { type: 'idle' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; code: string; requestId: string };

type OrderActionPanelProps = Readonly<{
  branchId: string;
  branchName: string;
  canCreateWalkIn: boolean;
  canManageItems: boolean;
  canQuickCreateCustomer: boolean;
  itemSuggestions: readonly ComandaItemSuggestionModel[];
  orderId?: string;
}>;

export function OrderActionPanel({
  branchId,
  branchName,
  canCreateWalkIn,
  canManageItems,
  canQuickCreateCustomer,
  itemSuggestions,
  orderId,
}: OrderActionPanelProps) {
  return (
    <div className="order-action-panel" aria-label="Acoes da Comanda">
      {orderId ? (
        <ManualItemForm
          canManageItems={canManageItems}
          itemSuggestions={itemSuggestions}
          orderId={orderId}
        />
      ) : null}
      <WalkInOrderForm
        branchId={branchId}
        branchName={branchName}
        canCreateWalkIn={canCreateWalkIn}
        canQuickCreateCustomer={canQuickCreateCustomer}
      />
    </div>
  );
}

function ManualItemForm({
  canManageItems,
  itemSuggestions,
  orderId,
}: Readonly<{
  canManageItems: boolean;
  itemSuggestions: readonly ComandaItemSuggestionModel[];
  orderId: string;
}>) {
  const online = useOnlineStatus();
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const [sourceType, setSourceType] = React.useState('MANUAL');
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [discount, setDiscount] = React.useState('0');
  const [notes, setNotes] = React.useState('');
  const feedbackId = React.useId();
  const disabled = !canManageItems || !online || feedback.type === 'loading';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = randomRequestToken();
    setFeedback({ type: 'loading', message: 'Salvando item na Comanda...' });

    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({
          sourceType,
          name,
          quantity: Number(quantity),
          unitPriceAmountCents: moneyToCents(unitPrice),
          discountAmountCents: moneyToCents(discount),
          notes: notes.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as OrderApiResponse | null;
      if (!response.ok) {
        setFeedback(
          errorFeedback(payload, response.status, requestId, 'Nao foi possivel adicionar o item.'),
        );
        return;
      }
      setFeedback({ type: 'success', message: 'Item adicionado. Atualizando a Comanda...' });
      refreshOrder(orderId);
    } catch {
      setFeedback({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Sem conexao com o servidor. Tente novamente.',
        requestId,
      });
    }
  }

  function applySuggestion(suggestion: ComandaItemSuggestionModel) {
    setSourceType(suggestion.sourceType);
    setName(suggestion.name);
    setUnitPrice(centsToInput(suggestion.unitPriceAmountCents));
    setDiscount('0');
    setQuantity('1');
  }

  return (
    <section className="order-action-section" aria-labelledby="order-add-item-title">
      <div className="order-action-header">
        <div>
          <p className="eyebrow">Atendimento</p>
          <h2 id="order-add-item-title">Adicionar item</h2>
        </div>
        <Plus size={18} aria-hidden="true" />
      </div>
      {!canManageItems ? (
        <p className="order-feedback warning" role="status">
          Voce pode visualizar esta Comanda, mas nao tem permissao para editar itens.
        </p>
      ) : null}
      {!online ? (
        <p className="order-feedback warning" role="status">
          <WifiOff size={15} aria-hidden="true" /> Voce esta offline. Edicoes ficam indisponiveis.
        </p>
      ) : null}
      {itemSuggestions.length ? (
        <div className="order-suggestion-grid" aria-label="Itens frequentes">
          {itemSuggestions.map((suggestion) => (
            <button
              className="order-suggestion-button"
              disabled={disabled}
              key={suggestion.id}
              onClick={() => applySuggestion(suggestion)}
              type="button"
            >
              <span>{suggestion.name}</span>
              <strong>{suggestion.unitPriceLabel}</strong>
            </button>
          ))}
        </div>
      ) : null}
      <form className="order-form" onSubmit={handleSubmit} aria-describedby={feedbackId}>
        <fieldset disabled={disabled}>
          <label>
            Item
            <input
              autoComplete="off"
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Agua, pomada, ajuste"
              required
              value={name}
            />
          </label>
          <div className="order-inline-fields">
            <label>
              Tipo
              <select onChange={(event) => setSourceType(event.target.value)} value={sourceType}>
                <option value="MANUAL">Manual</option>
                <option value="SERVICE">Servico</option>
                <option value="PRODUCT">Produto</option>
              </select>
            </label>
            <label>
              Qtd.
              <input
                inputMode="numeric"
                min="1"
                max="999"
                onChange={(event) => setQuantity(event.target.value)}
                required
                type="number"
                value={quantity}
              />
            </label>
          </div>
          <div className="order-inline-fields">
            <label>
              Valor unitario
              <input
                inputMode="decimal"
                onChange={(event) => setUnitPrice(event.target.value)}
                placeholder="0,00"
                required
                value={unitPrice}
              />
            </label>
            <label>
              Desconto
              <input
                inputMode="decimal"
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="0,00"
                value={discount}
              />
            </label>
          </div>
          <label>
            Observacoes
            <textarea
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
              rows={2}
              value={notes}
            />
          </label>
        </fieldset>
        <div className="order-form-footer">
          <span>Totais recalculados no servidor.</span>
          <button className="button button-primary" disabled={disabled} type="submit">
            {feedback.type === 'loading' ? (
              <LoaderCircle className="check-in-action-spinner" size={16} aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            {feedback.type === 'loading' ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>
      <FeedbackMessage feedback={feedback} id={feedbackId} />
    </section>
  );
}

function WalkInOrderForm({
  branchId,
  branchName,
  canCreateWalkIn,
  canQuickCreateCustomer,
}: Readonly<{
  branchId: string;
  branchName: string;
  canCreateWalkIn: boolean;
  canQuickCreateCustomer: boolean;
}>) {
  const online = useOnlineStatus();
  const [mode, setMode] = React.useState<'casual' | 'existing' | 'quick'>('casual');
  const [customerId, setCustomerId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [professionalId, setProfessionalId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const feedbackId = React.useId();
  const disabled = !canCreateWalkIn || !online || feedback.type === 'loading';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = randomRequestToken();
    setFeedback({ type: 'loading', message: 'Abrindo nova Comanda...' });

    try {
      let resolvedCustomerId = mode === 'existing' ? customerId.trim() : undefined;
      if (mode === 'quick') {
        const customerResponse = await fetch('/api/v1/customers', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          body: JSON.stringify({
            branchId,
            name: customerName,
            phone: customerPhone,
            source: 'Walk-in',
            consents: { whatsapp: false, marketing: false },
          }),
        });
        const customerPayload = (await customerResponse
          .json()
          .catch(() => null)) as CustomerApiResponse | null;
        if (!customerResponse.ok || !customerPayload?.data?.id) {
          setFeedback(
            errorFeedback(
              customerPayload,
              customerResponse.status,
              requestId,
              'Nao foi possivel cadastrar o cliente rapido.',
            ),
          );
          return;
        }
        resolvedCustomerId = customerPayload.data.id;
      }

      const orderResponse = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({
          branchId,
          customerId: resolvedCustomerId || undefined,
          professionalId: professionalId.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const orderPayload = (await orderResponse
        .json()
        .catch(() => null)) as OrderApiResponse | null;
      if (!orderResponse.ok || !orderPayload?.data?.id) {
        setFeedback(
          errorFeedback(
            orderPayload,
            orderResponse.status,
            requestId,
            'Nao foi possivel abrir a Comanda.',
          ),
        );
        return;
      }
      setFeedback({ type: 'success', message: 'Comanda walk-in aberta. Redirecionando...' });
      refreshOrder(orderPayload.data.id);
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
    <section
      className="order-action-section"
      aria-labelledby="order-walk-in-title"
      id="nova-comanda"
    >
      <div className="order-action-header">
        <div>
          <p className="eyebrow">Walk-in</p>
          <h2 id="order-walk-in-title">Nova Comanda</h2>
        </div>
        <ReceiptText size={18} aria-hidden="true" />
      </div>
      {!canCreateWalkIn ? (
        <p className="order-feedback warning" role="status">
          Seu perfil nao possui permissao para abrir Comanda sem agendamento.
        </p>
      ) : null}
      {!online ? (
        <p className="order-feedback warning" role="status">
          <WifiOff size={15} aria-hidden="true" /> Voce esta offline. Nova Comanda precisa de
          conexao.
        </p>
      ) : null}
      <form className="order-form" onSubmit={handleSubmit} aria-describedby={feedbackId}>
        <fieldset disabled={disabled}>
          <div className="order-branch-pill">Unidade: {branchName}</div>
          <fieldset className="order-client-mode">
            <legend>Cliente</legend>
            <label>
              <input
                checked={mode === 'casual'}
                onChange={() => setMode('casual')}
                type="radio"
                name="walk-in-client-mode"
              />
              Consumidor avulso
            </label>
            <label>
              <input
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
                type="radio"
                name="walk-in-client-mode"
              />
              Cliente existente
            </label>
            <label aria-disabled={!canQuickCreateCustomer}>
              <input
                checked={mode === 'quick'}
                disabled={!canQuickCreateCustomer}
                onChange={() => setMode('quick')}
                type="radio"
                name="walk-in-client-mode"
              />
              Cadastro rapido
            </label>
          </fieldset>
          {mode === 'existing' ? (
            <label>
              Cliente existente (ID)
              <input
                autoComplete="off"
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder="Cole o ID do cliente"
                required
                value={customerId}
              />
            </label>
          ) : null}
          {mode === 'quick' ? (
            <div className="order-inline-fields">
              <label>
                Nome
                <input
                  autoComplete="name"
                  maxLength={160}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                  value={customerName}
                />
              </label>
              <label>
                Telefone
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={32}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  required
                  value={customerPhone}
                />
              </label>
            </div>
          ) : null}
          <label>
            Profissional (opcional)
            <input
              autoComplete="off"
              onChange={(event) => setProfessionalId(event.target.value)}
              placeholder="ID do profissional"
              value={professionalId}
            />
          </label>
          <label>
            Observacoes
            <textarea
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: cliente entrou sem horario marcado"
              rows={2}
              value={notes}
            />
          </label>
        </fieldset>
        <div className="order-form-footer">
          <span>Abre sem agendamento e sem pagamento neste recorte.</span>
          <button className="button button-secondary" disabled={disabled} type="submit">
            {feedback.type === 'loading' ? (
              <LoaderCircle className="check-in-action-spinner" size={16} aria-hidden="true" />
            ) : (
              <UserPlus size={16} aria-hidden="true" />
            )}
            {feedback.type === 'loading' ? 'Abrindo...' : 'Abrir walk-in'}
          </button>
        </div>
      </form>
      <FeedbackMessage feedback={feedback} id={feedbackId} />
    </section>
  );
}

export function OrderItemControls({
  canManageItems,
  item,
  orderId,
}: Readonly<{ canManageItems: boolean; item: ComandaItemModel; orderId: string }>) {
  const online = useOnlineStatus();
  const [quantity, setQuantity] = React.useState(String(item.quantity));
  const [discount, setDiscount] = React.useState(centsToInput(item.discountAmountCents));
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const feedbackId = React.useId();
  const disabled = !canManageItems || !online || feedback.type === 'loading';

  async function mutate(method: 'PATCH' | 'DELETE') {
    const requestId = randomRequestToken();
    setFeedback({
      type: 'loading',
      message: method === 'PATCH' ? 'Atualizando item...' : 'Removendo item...',
    });
    try {
      const response = await fetch(
        `/api/v1/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(item.id)}`,
        {
          method,
          headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          body:
            method === 'PATCH'
              ? JSON.stringify({
                  quantity: Number(quantity),
                  discountAmountCents: moneyToCents(discount),
                })
              : JSON.stringify({ reason: 'Removido pela tela de Comanda.' }),
        },
      );
      const payload = (await response.json().catch(() => null)) as OrderApiResponse | null;
      if (!response.ok) {
        setFeedback(
          errorFeedback(payload, response.status, requestId, 'Nao foi possivel alterar o item.'),
        );
        return;
      }
      setFeedback({ type: 'success', message: 'Item atualizado. Recarregando totais...' });
      refreshOrder(orderId);
    } catch {
      setFeedback({
        type: 'error',
        code: 'NETWORK_ERROR',
        message: 'Sem conexao com o servidor. Tente novamente.',
        requestId,
      });
    }
  }

  if (!canManageItems) return null;

  return (
    <div className="order-item-controls" aria-describedby={feedbackId}>
      {!online ? (
        <p className="order-feedback warning" role="status">
          <WifiOff size={15} aria-hidden="true" /> Item indisponivel offline.
        </p>
      ) : null}
      <div className="order-item-control-row">
        <label>
          Qtd.
          <input
            disabled={disabled}
            inputMode="numeric"
            min="1"
            max="999"
            onChange={(event) => setQuantity(event.target.value)}
            type="number"
            value={quantity}
          />
        </label>
        <label>
          Desconto
          <input
            disabled={disabled}
            inputMode="decimal"
            onChange={(event) => setDiscount(event.target.value)}
            value={discount}
          />
        </label>
      </div>
      <div className="order-item-remove-row">
        <button
          className="button button-secondary"
          disabled={disabled}
          onClick={() => mutate('PATCH')}
          type="button"
        >
          <Save size={15} aria-hidden="true" />
          Atualizar
        </button>
        <button
          className="button button-ghost"
          disabled={disabled}
          onClick={() => mutate('DELETE')}
          type="button"
        >
          <Trash2 size={15} aria-hidden="true" />
          Remover
        </button>
      </div>
      <FeedbackMessage feedback={feedback} id={feedbackId} compact />
    </div>
  );
}

function FeedbackMessage({
  compact = false,
  feedback,
  id,
}: Readonly<{ compact?: boolean; feedback: Feedback; id: string }>) {
  if (feedback.type === 'idle') return <span className="sr-only" id={id} />;
  const className = [
    'order-feedback',
    feedback.type === 'error' ? 'danger' : feedback.type,
    compact ? 'compact' : '',
  ]
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
      {feedback.type === 'error' ? ` Codigo ${feedback.code}. Request ${feedback.requestId}.` : ''}
    </p>
  );
}

function useOnlineStatus() {
  const [online, setOnline] = React.useState(true);
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

function refreshOrder(orderId: string) {
  window.location.assign('/comandas?orderId=' + encodeURIComponent(orderId));
}

function randomRequestToken() {
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

type OrderApiResponse = {
  data?: { id?: string };
  error?: { code?: string; message?: string; requestId?: string };
};

type CustomerApiResponse = {
  data?: { id?: string };
  error?: { code?: string; message?: string; requestId?: string };
};
