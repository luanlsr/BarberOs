import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Clock3,
  ClipboardList,
  LockKeyhole,
  Plus,
  ReceiptText,
  Scissors,
  WalletCards,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type { ComandaDetailModel, ComandaItemModel, ComandaViewModel } from '../lib/order-data';
import { OrderActionPanel, OrderItemControls } from './order-action-panel';
import { ReceivePaymentPanel } from './receive-payment-panel';

export function OrderView({ model }: Readonly<{ model: ComandaViewModel }>) {
  if (model.state === 'permission-denied') return <OrderPermissionDenied model={model} />;
  if (model.state === 'error') return <OrderErrorState model={model} />;
  if (model.state === 'empty' || !model.order) return <OrderEmptyWorkspace model={model} />;

  const order = model.order;

  return (
    <div className="orders-page">
      <header className="orders-heading">
        <div className="orders-heading-main">
          <Link className="icon-button" href="/agenda" aria-label="Voltar para agenda">
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow">Comanda</p>
            <h1>{order.title}</h1>
            <p className="subheading">
              {order.customerName} · {order.professionalName}
            </p>
          </div>
        </div>
        <div className="orders-heading-actions">
          <Link className="button button-secondary" href="#nova-comanda">
            <Plus size={16} aria-hidden="true" />
            Nova Comanda
          </Link>
          <StatusBadge variant={statusBadgeVariant(order.statusTone)}>
            {order.statusLabel}
          </StatusBadge>
        </div>
      </header>

      <OrderStateStrip model={model} order={order} />

      <div className="order-workspace">
        <section className="order-main-pane" aria-labelledby="order-items-title">
          <OrderHeaderSummary order={order} />
          <OrderActionPanel
            branchId={model.branchId}
            branchName={model.branchName}
            canCreateWalkIn={model.canCreateWalkIn}
            canManageItems={model.canManageItems}
            canQuickCreateCustomer={model.canQuickCreateCustomer}
            itemSuggestions={model.itemSuggestions}
            orderId={order.id}
          />
          <div className="order-section-title">
            <div>
              <h2 id="order-items-title">Itens da Comanda</h2>
              <span>{order.itemCountLabel}</span>
            </div>
          </div>
          {order.items.length ? (
            <div className="order-item-list">
              {order.items.map((item) => (
                <OrderItemRow
                  canManageItems={model.canManageItems}
                  item={item}
                  key={item.id}
                  orderId={order.id}
                />
              ))}
            </div>
          ) : (
            <div className="order-empty-inline">
              <ClipboardList size={22} aria-hidden="true" />
              <p>Esta Comanda ainda nao possui itens registrados.</p>
            </div>
          )}
        </section>

        <aside className="order-summary-pane" aria-labelledby="order-total-title">
          <OrderTotals order={order} />
          <OrderNotes order={order} />
          <OrderHistory order={order} />
        </aside>
      </div>
    </div>
  );
}

function statusBadgeVariant(tone: ComandaDetailModel['statusTone']) {
  return tone === 'danger' ? 'warning' : tone;
}

function OrderStateStrip({
  model,
  order,
}: Readonly<{ model: ComandaViewModel; order: ComandaDetailModel }>) {
  return (
    <div className="order-state-strip" aria-label="Resumo operacional da Comanda">
      <span>
        <ReceiptText size={15} aria-hidden="true" />
        {order.originLabel}
      </span>
      <span>
        <Clock3 size={15} aria-hidden="true" />
        Aberta {order.openedAtLabel}
      </span>
      <span>
        <Scissors size={15} aria-hidden="true" />
        {order.itemCountLabel}
      </span>
      {!model.canManageItems ? (
        <span className="warning">
          <LockKeyhole size={15} aria-hidden="true" />
          Itens somente leitura
        </span>
      ) : null}
    </div>
  );
}

function OrderHeaderSummary({ order }: Readonly<{ order: ComandaDetailModel }>) {
  return (
    <section className="order-identity-grid" aria-label="Dados principais da Comanda">
      <div>
        <span>Cliente</span>
        <strong>{order.customerName}</strong>
        {order.customerPhone ? <small>{order.customerPhone}</small> : null}
      </div>
      <div>
        <span>Profissional</span>
        <strong>{order.professionalName}</strong>
        <small>{order.branchName}</small>
      </div>
      <div>
        <span>Origem</span>
        <strong>{order.originLabel}</strong>
        <small>Status {order.statusLabel.toLowerCase()}</small>
      </div>
    </section>
  );
}

function OrderItemRow({
  canManageItems,
  item,
  orderId,
}: Readonly<{ canManageItems: boolean; item: ComandaItemModel; orderId: string }>) {
  return (
    <article className="order-item-row">
      <div className="order-item-icon" aria-hidden="true">
        {item.typeLabel === 'Produto' ? <WalletCards size={18} /> : <Scissors size={18} />}
      </div>
      <div className="order-item-main">
        <div className="order-item-title">
          <div>
            <h3>{item.name}</h3>
            <p>{item.professionalName}</p>
          </div>
          <span>{item.typeLabel}</span>
        </div>
        <dl className="order-item-values">
          <div>
            <dt>Qtd.</dt>
            <dd>{item.quantityLabel}</dd>
          </div>
          <div>
            <dt>Desconto</dt>
            <dd>{item.discountLabel}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{item.finalLabel}</dd>
          </div>
        </dl>
        {item.notes ? <p className="order-item-note">{item.notes}</p> : null}
        <OrderItemControls canManageItems={canManageItems} item={item} orderId={orderId} />
      </div>
    </article>
  );
}

function OrderTotals({ order }: Readonly<{ order: ComandaDetailModel }>) {
  const payment = order.paymentSummary;
  const title =
    payment.state === 'paid'
      ? 'Total pago'
      : payment.state === 'partially-paid'
        ? 'Pagamento parcial'
        : 'Total aberto';
  const dueLabel = payment.state === 'paid' ? 'Quitado' : 'Em aberto';

  return (
    <section className="order-total-panel" aria-labelledby="order-total-title">
      <div className="order-total-header">
        <div>
          <p className="eyebrow">Resumo</p>
          <h2 id="order-total-title">{title}</h2>
        </div>
        <ReceiptText size={20} aria-hidden="true" />
      </div>
      <dl className="order-total-list">
        <div>
          <dt>Subtotal</dt>
          <dd>{order.subtotalLabel}</dd>
        </div>
        <div>
          <dt>Descontos</dt>
          <dd>{order.discountLabel}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{payment.totalLabel}</dd>
        </div>
        <div>
          <dt>Recebido</dt>
          <dd>{payment.paidLabel}</dd>
        </div>
        <div className="strong">
          <dt>{dueLabel}</dt>
          <dd>{payment.amountDueLabel}</dd>
        </div>
      </dl>
      <ReceivePaymentPanel orderId={order.id} paymentSummary={payment} />
    </section>
  );
}

function OrderNotes({ order }: Readonly<{ order: ComandaDetailModel }>) {
  return (
    <section className="order-notes-panel" aria-labelledby="order-notes-title">
      <div className="order-section-title compact">
        <h2 id="order-notes-title">Observacoes</h2>
        <BadgePercent size={16} aria-hidden="true" />
      </div>
      <p>{order.notes ?? 'Sem observacoes registradas.'}</p>
    </section>
  );
}

function OrderHistory({ order }: Readonly<{ order: ComandaDetailModel }>) {
  return (
    <section className="order-history-panel" aria-labelledby="order-history-title">
      <div className="order-section-title compact">
        <h2 id="order-history-title">Historico</h2>
        <span>{order.history.length}</span>
      </div>
      {order.history.length ? (
        <ol className="order-history-list">
          {order.history.map((item) => (
            <li key={item.id}>
              <time>{item.atLabel}</time>
              <div>
                <strong>{item.label}</strong>
                <span>{item.actorLabel}</span>
                {item.reason ? <p>{item.reason}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="order-muted">Historico ainda nao registrado.</p>
      )}
    </section>
  );
}

function OrderEmptyWorkspace({ model }: Readonly<{ model: ComandaViewModel }>) {
  return (
    <div className="orders-page">
      <header className="orders-heading">
        <div className="orders-heading-main">
          <Link className="icon-button" href="/agenda" aria-label="Voltar para agenda">
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow">Comandas</p>
            <h1>Nenhuma Comanda aberta</h1>
            <p className="subheading">{model.description}</p>
          </div>
        </div>
      </header>
      <div className="order-empty-workspace">
        <section className="order-boundary-state" aria-labelledby="order-empty-title">
          <ClipboardList size={28} aria-hidden="true" />
          <div>
            <p className="eyebrow">Operacao</p>
            <h2 id="order-empty-title">Abra uma Comanda para continuar</h2>
            <p>
              Use a agenda para fazer check-in ou crie um walk-in para atendimento sem horario
              marcado.
            </p>
            <Link className="button button-secondary" href="/agenda">
              Ver agenda
            </Link>
          </div>
        </section>
        <OrderActionPanel
          branchId={model.branchId}
          branchName={model.branchName}
          canCreateWalkIn={model.canCreateWalkIn}
          canManageItems={model.canManageItems}
          canQuickCreateCustomer={model.canQuickCreateCustomer}
          itemSuggestions={model.itemSuggestions}
        />
      </div>
    </div>
  );
}
function OrderPermissionDenied({ model }: Readonly<{ model: ComandaViewModel }>) {
  return (
    <section className="order-boundary-state" aria-labelledby="order-denied-title">
      <LockKeyhole size={28} aria-hidden="true" />
      <div>
        <p className="eyebrow">Comandas</p>
        <h1 id="order-denied-title">Acesso restrito</h1>
        <p>{model.description}</p>
        <Link className="button button-secondary" href="/agenda">
          Voltar para agenda
        </Link>
      </div>
    </section>
  );
}

function OrderErrorState({ model }: Readonly<{ model: ComandaViewModel }>) {
  return (
    <section className="order-boundary-state" aria-labelledby="order-error-title">
      <AlertTriangle size={28} aria-hidden="true" />
      <div>
        <p className="eyebrow">Comandas</p>
        <h1 id="order-error-title">Nao foi possivel abrir a Comanda</h1>
        <p>
          {model.error?.message ?? model.description} Codigo{' '}
          {model.error?.code ?? 'ORDER_LOAD_FAILED'}. Request{' '}
          {model.error?.requestId ?? 'local-order-request'}.
        </p>
        <Link className="button button-secondary" href="/comandas">
          Tentar novamente
        </Link>
      </div>
    </section>
  );
}
