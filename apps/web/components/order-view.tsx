'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Clock3,
  ClipboardList,
  LockKeyhole,
  Plus,
  ReceiptText,
  Scissors,
  Search,
  WalletCards,
  X,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type { ComandaDetailModel, ComandaItemModel, ComandaViewModel } from '../lib/order-data';
import { OrderActionPanel, OrderItemControls } from './order-action-panel';
import { ReceivePaymentPanel } from './receive-payment-panel';

export function OrderView({
  autoOpenWalkIn = false,
  model,
}: Readonly<{ autoOpenWalkIn?: boolean; model: ComandaViewModel }>) {
  const [activeDetail, setActiveDetail] = React.useState<OrderDetailModal>(null);

  if (model.state === 'permission-denied') return <OrderPermissionDenied model={model} />;
  if (model.state === 'error') return <OrderErrorState model={model} />;
  if (model.state === 'empty')
    return <OrderEmptyWorkspace autoOpenWalkIn={autoOpenWalkIn} model={model} />;
  if (!model.order) return <OrderIndexWorkspace autoOpenWalkIn={autoOpenWalkIn} model={model} />;

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
            productPicker={model.productPicker}
            orderId={order.id}
          />
          <OrderDetailActions order={order} onOpenDetail={setActiveDetail} />
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
      </div>

      <OrderDetailDialog
        activeDetail={activeDetail}
        order={order}
        onClose={() => setActiveDetail(null)}
      />
    </div>
  );
}

type OrderDetailModal = 'summary' | 'notes' | 'history' | null;

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

function OrderDetailActions({
  order,
  onOpenDetail,
}: Readonly<{
  order: ComandaDetailModel;
  onOpenDetail: (detail: Exclude<OrderDetailModal, null>) => void;
}>) {
  const paymentStatus =
    order.paymentSummary.stateLabel +
    ' · ' +
    (order.paymentSummary.amountDueCents > 0
      ? order.paymentSummary.amountDueLabel + ' em aberto'
      : 'Comanda quitada');

  return (
    <section className="order-detail-action-bar" aria-label="Detalhes da Comanda">
      <button className="order-detail-button" type="button" onClick={() => onOpenDetail('summary')}>
        <ReceiptText size={18} aria-hidden="true" />
        <span>
          <strong>Resumo e pagamento</strong>
          <small>{paymentStatus}</small>
        </span>
      </button>
      <button className="order-detail-button" type="button" onClick={() => onOpenDetail('notes')}>
        <BadgePercent size={18} aria-hidden="true" />
        <span>
          <strong>Observacoes</strong>
          <small>{order.notes ? 'Ver recados da Comanda' : 'Sem observacoes registradas'}</small>
        </span>
      </button>
      <button className="order-detail-button" type="button" onClick={() => onOpenDetail('history')}>
        <Clock3 size={18} aria-hidden="true" />
        <span>
          <strong>Historico</strong>
          <small>{order.history.length} eventos registrados</small>
        </span>
      </button>
    </section>
  );
}

function OrderDetailDialog({
  activeDetail,
  order,
  onClose,
}: Readonly<{
  activeDetail: OrderDetailModal;
  order: ComandaDetailModel;
  onClose: () => void;
}>) {
  const titleId = React.useId();

  React.useEffect(() => {
    if (!activeDetail) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDetail, onClose]);

  if (!activeDetail) return null;

  const detail = {
    summary: {
      eyebrow: 'Resumo',
      title: 'Resumo e pagamento',
      description: 'Totais, recebimentos e acao para quitar a Comanda.',
      content: <OrderTotals order={order} />,
    },
    notes: {
      eyebrow: 'Observacoes',
      title: 'Observacoes da Comanda',
      description: 'Recados operacionais importantes para atendimento e fechamento.',
      content: <OrderNotes order={order} />,
    },
    history: {
      eyebrow: 'Historico',
      title: 'Historico da Comanda',
      description: 'Linha do tempo de eventos e alteracoes relevantes.',
      content: <OrderHistory order={order} />,
    },
  }[activeDetail];

  return (
    <div className="app-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog order-detail-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-dialog-header">
          <div>
            <p className="eyebrow">{detail.eyebrow}</p>
            <h2 id={titleId}>{detail.title}</h2>
            <p>{detail.description}</p>
          </div>
          <button
            aria-label="Fechar detalhe"
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="order-detail-dialog-body">{detail.content}</div>
      </section>
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
        {item.sourceType === 'PRODUCT' ? (
          <WalletCards size={18} />
        ) : item.sourceType === 'SERVICE' ? (
          <Scissors size={18} />
        ) : (
          <ClipboardList size={18} />
        )}
      </div>
      <div className="order-item-main">
        <div className="order-item-title">
          <div>
            <h3>{item.name}</h3>
            <p>{item.sourceDescription}</p>
            <small>{item.professionalName}</small>
          </div>
          <span>{item.sourceLabel}</span>
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
        {item.isCatalogProduct ? (
          <p className="order-item-note">
            Produto vinculado ao catalogo. Estoque sera baixado apenas no pagamento.
          </p>
        ) : null}
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
      <dl className="order-type-breakdown" aria-label="Totais por tipo de item">
        <div>
          <dt>Servicos</dt>
          <dd>
            {order.itemBreakdown.serviceCount} - {order.itemBreakdown.serviceTotalLabel}
          </dd>
        </div>
        <div>
          <dt>Produtos</dt>
          <dd>
            {order.itemBreakdown.productCount} - {order.itemBreakdown.productTotalLabel}
          </dd>
        </div>
        <div>
          <dt>Manuais</dt>
          <dd>
            {order.itemBreakdown.manualCount} - {order.itemBreakdown.manualTotalLabel}
          </dd>
        </div>
      </dl>
      {payment.settlementUpdates.length ? (
        <div className="order-settlement-feedback" aria-label="Atualizacoes do pagamento">
          {payment.settlementUpdates.map((update) => (
            <span className={'order-settlement-pill ' + update.tone} key={update.id}>
              <CheckCircle2 size={15} aria-hidden="true" />
              {update.label}
            </span>
          ))}
        </div>
      ) : null}
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

function OrderIndexWorkspace({
  autoOpenWalkIn = false,
  model,
}: Readonly<{ autoOpenWalkIn?: boolean; model: ComandaViewModel }>) {
  const [openWalkInRequest, setOpenWalkInRequest] = React.useState(0);

  return (
    <div className="orders-page">
      <header className="orders-heading">
        <div className="orders-heading-main">
          <div>
            <p className="eyebrow">Operacao</p>
            <h1>Comandas</h1>
            <p className="subheading">{model.description}</p>
          </div>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setOpenWalkInRequest((current) => current + 1)}
        >
          <Plus size={16} aria-hidden="true" />
          Nova Comanda
        </button>
      </header>

      <section className="order-index-section" aria-labelledby="order-index-title">
        <div className="order-section-title">
          <div>
            <h2 id="order-index-title">Atendimentos em andamento</h2>
            <span>{model.openOrders.length} comandas</span>
          </div>
        </div>
        <div className="order-mini-grid">
          {model.openOrders.map((summary) => (
            <Link className="order-mini-card" href={summary.href} key={summary.id}>
              <div className="order-mini-card-topline">
                <strong>{summary.title}</strong>
                <StatusBadge variant={statusBadgeVariant(summary.statusTone)}>
                  {summary.statusLabel}
                </StatusBadge>
              </div>
              <span>{summary.customerName}</span>
              <div className="order-mini-card-total">
                <small>Total da Comanda</small>
                <strong>{summary.totalLabel}</strong>
              </div>
              <span className="order-mini-card-action">Expandir Comanda</span>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="nova-comanda"
        className="order-create-section"
        aria-labelledby="order-create-title"
      >
        <div>
          <p className="eyebrow">Entrada rapida</p>
          <h2 id="order-create-title">Abrir uma nova Comanda</h2>
          <p className="subheading">Crie um atendimento walk-in ou inicie a venda de um produto.</p>
        </div>
        <OrderActionPanel
          autoOpenWalkIn={autoOpenWalkIn}
          branchId={model.branchId}
          branchName={model.branchName}
          canCreateWalkIn={model.canCreateWalkIn}
          canManageItems={model.canManageItems}
          canQuickCreateCustomer={model.canQuickCreateCustomer}
          itemSuggestions={model.itemSuggestions}
          openWalkInRequest={openWalkInRequest}
          productPicker={model.productPicker}
        />
      </section>
    </div>
  );
}

export function ProductSaleView({ model }: Readonly<{ model: ComandaViewModel }>) {
  const [openWalkInRequest, setOpenWalkInRequest] = React.useState(0);

  if (model.state === 'permission-denied') return <OrderPermissionDenied model={model} />;
  if (model.state === 'error') return <OrderErrorState model={model} />;

  const picker = model.productPicker;

  return (
    <div className="orders-page product-sale-page">
      <header className="orders-heading">
        <div className="orders-heading-main">
          <div>
            <p className="eyebrow">PDV</p>
            <h1>Venda de produto</h1>
            <p className="subheading">
              Venda avulsa de produtos com baixa de estoque e fechamento pela Comanda.
            </p>
          </div>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setOpenWalkInRequest((current) => current + 1)}
        >
          <Plus size={16} aria-hidden="true" />
          Nova venda
        </button>
      </header>

      <div className="product-sale-workspace">
        <section className="product-sale-catalog panel" aria-labelledby="product-sale-title">
          <div className="panel-header">
            <div>
              <h2 id="product-sale-title">Catalogo rapido</h2>
              <p className="section-caption">{picker.description}</p>
            </div>
            <Search size={18} aria-hidden="true" />
          </div>
          {picker.state === 'ready' && picker.products.length ? (
            <div className="product-sale-grid">
              {picker.products.map((product) => (
                <article className="product-sale-card" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.categoryName}</span>
                  </div>
                  <div>
                    <small>{product.stockLabel}</small>
                    <b>{product.unitPriceLabel}</b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="order-empty-inline">
              <ReceiptText size={22} aria-hidden="true" />
              <p>Nenhum produto disponivel para venda nesta unidade.</p>
            </div>
          )}
        </section>

        <aside className="product-sale-side">
          <section className="panel" aria-labelledby="product-sale-orders-title">
            <div className="panel-header">
              <div>
                <h2 id="product-sale-orders-title">Lancamento</h2>
                <p className="section-caption">
                  Selecione uma Comanda aberta ou crie uma venda avulsa.
                </p>
              </div>
            </div>
            {model.openOrders.length ? (
              <div className="order-mini-list">
                {model.openOrders.map((summary) => (
                  <Link className="order-mini-card compact" href={summary.href} key={summary.id}>
                    <strong>{summary.title}</strong>
                    <span>{summary.customerName}</span>
                    <small>{summary.totalLabel}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="order-empty-inline">
                <ClipboardList size={22} aria-hidden="true" />
                <p>Nenhuma Comanda aberta agora.</p>
              </div>
            )}
          </section>
          <OrderActionPanel
            branchId={model.branchId}
            branchName={model.branchName}
            canCreateWalkIn={model.canCreateWalkIn}
            canManageItems={model.canManageItems}
            canQuickCreateCustomer={model.canQuickCreateCustomer}
            itemSuggestions={model.itemSuggestions}
            openWalkInRequest={openWalkInRequest}
            productPicker={model.productPicker}
          />
        </aside>
      </div>
    </div>
  );
}
function OrderEmptyWorkspace({
  autoOpenWalkIn = false,
  model,
}: Readonly<{ autoOpenWalkIn?: boolean; model: ComandaViewModel }>) {
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
          autoOpenWalkIn={autoOpenWalkIn}
          branchId={model.branchId}
          branchName={model.branchName}
          canCreateWalkIn={model.canCreateWalkIn}
          canManageItems={model.canManageItems}
          canQuickCreateCustomer={model.canQuickCreateCustomer}
          itemSuggestions={model.itemSuggestions}
          productPicker={model.productPicker}
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
        <p>{model.error?.message ?? model.description} Tente novamente em instantes.</p>
        <Link className="button button-secondary" href="/comandas">
          Tentar novamente
        </Link>
      </div>
    </section>
  );
}
