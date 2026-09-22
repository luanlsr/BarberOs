'use client';

import * as React from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  ClipboardList,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  X,
} from 'lucide-react';
import { IconButton, StatusBadge } from '@barberos/ui';
import type {
  InventoryActionModel,
  InventoryViewModel,
  StockBalanceItemModel,
  StockMovementModel,
} from '../lib/inventory-data';
import { InventoryInlineState, SummaryTile } from './product-view';

type InventoryModal =
  | { type: 'entry' }
  | { type: 'loss'; balance?: StockBalanceItemModel }
  | { type: 'adjust'; balance?: StockBalanceItemModel }
  | { type: 'transfer'; balance?: StockBalanceItemModel }
  | { type: 'movement'; movement: StockMovementModel }
  | null;

export function InventoryView({ model }: Readonly<{ model: InventoryViewModel }>) {
  const [modal, setModal] = React.useState<InventoryModal>(null);

  if (model.state === 'permission-denied') return <InventoryBoundaryState model={model} />;
  if (model.state === 'error') return <InventoryBoundaryState model={model} />;

  const firstBalance = model.balances[0];

  function handleAction(action: InventoryActionModel) {
    if (!action.enabled) return;
    if (action.id === 'inventory.refresh') window.location.reload();
    if (action.id === 'inventory.record-entry') setModal({ type: 'entry' });
    if (action.id === 'inventory.record-loss') setModal({ type: 'loss', balance: firstBalance });
    if (action.id === 'inventory.adjust-stock') setModal({ type: 'adjust', balance: firstBalance });
    if (action.id === 'inventory.transfer-stock')
      setModal({ type: 'transfer', balance: firstBalance });
  }

  return (
    <div className="inventory-page">
      <header className="inventory-heading">
        <div>
          <p className="eyebrow">Gestão</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <InventoryActions actions={model.allowedActions} onAction={handleAction} />
      </header>

      <InventoryState model={model} />

      <section className="inventory-summary-grid" aria-label="Resumo de estoque">
        <SummaryTile
          label="Produtos controlados"
          value={String(model.summary.trackedProductCount)}
          tone="neutral"
        />
        <SummaryTile
          label="Estoque baixo"
          value={String(model.summary.lowStockCount)}
          tone="warning"
        />
        <SummaryTile
          label="Sem estoque"
          value={String(model.summary.zeroStockCount)}
          tone="danger"
        />
      </section>

      <div className="inventory-workspace" aria-label="Estoque responsivo">
        <main className="inventory-primary" aria-label="Saldos e movimentos">
          <LowStockAlerts model={model} />
          <StockBalances
            balances={model.balances}
            onAdjust={(balance) => setModal({ type: 'adjust', balance })}
          />
        </main>
        <aside className="inventory-side" aria-label="Histórico de estoque">
          <MovementHistory
            movements={model.movements}
            onMovement={(movement) => setModal({ type: 'movement', movement })}
          />
        </aside>
      </div>

      <InventoryModalView modal={modal} model={model} onClose={() => setModal(null)} />
    </div>
  );
}

function InventoryActions({
  actions,
  onAction,
}: Readonly<{
  actions: readonly InventoryActionModel[];
  onAction: (action: InventoryActionModel) => void;
}>) {
  return (
    <div className="inventory-heading-actions" aria-label="Ações de estoque">
      {actions.map((action) => (
        <button
          className={
            action.id === 'inventory.record-entry'
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

function iconForAction(id: InventoryActionModel['id']) {
  if (id === 'inventory.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'inventory.transfer-stock') return <ArrowRightLeft size={16} aria-hidden="true" />;
  if (id === 'inventory.adjust-stock') return <RotateCcw size={16} aria-hidden="true" />;
  if (id === 'inventory.record-loss') return <AlertTriangle size={16} aria-hidden="true" />;
  return <Plus size={16} aria-hidden="true" />;
}

function InventoryState({ model }: Readonly<{ model: InventoryViewModel }>) {
  if (model.state === 'loading')
    return <InventoryInlineState tone="neutral" text="Carregando estoque..." />;
  if (model.state === 'offline') {
    return (
      <InventoryInlineState
        tone="warning"
        text="Modo offline: entradas, perdas e ajustes pausados."
      />
    );
  }
  if (model.state === 'empty')
    return <InventoryInlineState tone="neutral" text={model.description} />;
  return null;
}

function LowStockAlerts({ model }: Readonly<{ model: InventoryViewModel }>) {
  return (
    <section
      className="inventory-panel"
      aria-labelledby="low-stock-title"
      data-testid="low-stock-alerts"
    >
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Alertas</p>
          <h2 id="low-stock-title">Estoque baixo</h2>
        </div>
        <AlertTriangle size={20} aria-hidden="true" />
      </div>
      {model.lowStockAlerts.length ? (
        <div className="inventory-alert-list">
          {model.lowStockAlerts.map((alert) => (
            <article className={'inventory-alert inventory-tone-' + alert.tone} key={alert.id}>
              <strong>{alert.productName}</strong>
              <span>{alert.label}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="inventory-muted">Nenhum alerta ativo nesta unidade.</p>
      )}
    </section>
  );
}

function StockBalances({
  balances,
  onAdjust,
}: Readonly<{
  balances: readonly StockBalanceItemModel[];
  onAdjust: (balance: StockBalanceItemModel) => void;
}>) {
  return (
    <section className="inventory-panel" aria-labelledby="stock-balances-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Saldos</p>
          <h2 id="stock-balances-title">Produtos controlados</h2>
        </div>
        <Boxes size={20} aria-hidden="true" />
      </div>
      {balances.length ? (
        <div className="inventory-list">
          {balances.map((balance) => (
            <article className="inventory-row" key={balance.productId}>
              <div className="inventory-row-main">
                <div className="inventory-row-title">
                  <div>
                    <strong>{balance.productName}</strong>
                    <span>{balance.supplierName}</span>
                  </div>
                  <StatusBadge variant={balance.tone === 'danger' ? 'warning' : balance.tone}>
                    {balance.lowStock ? 'Baixo' : 'OK'}
                  </StatusBadge>
                </div>
                <div className="inventory-row-meta">
                  <span>{balance.quantityLabel}</span>
                  <span>Ultimo movimento {balance.lastMovementLabel}</span>
                </div>
              </div>
              <div className="inventory-row-actions">
                <strong>{balance.currentQuantity}</strong>
                <button
                  className="button button-secondary"
                  disabled={!balance.canAdjust}
                  type="button"
                  onClick={() => onAdjust(balance)}
                >
                  Ajustar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="inventory-muted">Sem saldos de estoque nesta unidade.</p>
      )}
    </section>
  );
}

function MovementHistory({
  movements,
  onMovement,
}: Readonly<{
  movements: readonly StockMovementModel[];
  onMovement: (movement: StockMovementModel) => void;
}>) {
  return (
    <section
      className="inventory-panel"
      aria-labelledby="movement-history-title"
      data-testid="movement-history"
    >
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Histórico</p>
          <h2 id="movement-history-title">Movimentacoes</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>
      {movements.length ? (
        <ol className="inventory-timeline">
          {movements.map((movement) => (
            <li key={movement.id}>
              <time>{movement.createdAtLabel}</time>
              <div>
                <strong>{movement.productName}</strong>
                <span>
                  {movement.typeLabel} · {movement.quantityLabel} · {movement.sourceLabel}
                </span>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => onMovement(movement)}
                >
                  Ver
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="inventory-muted">Nenhuma movimentacao recente.</p>
      )}
    </section>
  );
}

function InventoryModalView({
  modal,
  model,
  onClose,
}: Readonly<{ modal: InventoryModal; model: InventoryViewModel; onClose: () => void }>) {
  if (!modal) return null;
  if (modal.type === 'movement') {
    return (
      <AppModal
        description="Movimentacoes de estoque sao auditáveis e não devem ser sobrescritas."
        eyebrow="Movimento"
        title={modal.movement.productName}
        onClose={onClose}
      >
        <dl className="inventory-detail-list">
          <DetailTerm label="Tipo" value={modal.movement.typeLabel} />
          <DetailTerm label="Quantidade" value={modal.movement.quantityLabel} />
          <DetailTerm label="Origem" value={modal.movement.sourceLabel} />
          <DetailTerm label="Motivo" value={modal.movement.reason} />
        </dl>
      </AppModal>
    );
  }

  const productName =
    modal.type === 'entry' ? 'produto selecionado' : (modal.balance?.productName ?? 'produto');
  return (
    <AppModal
      description="Registre quantidade e motivo para preservar histórico operacional."
      eyebrow="Estoque"
      title={modalTitle(modal.type, productName)}
      onClose={onClose}
    >
      <InventoryMovementForm
        model={model}
        type={modal.type}
        balance={modal.type === 'entry' ? undefined : modal.balance}
        onRecorded={() => {
          window.location.assign('/estoque?state=restocked');
        }}
      />
    </AppModal>
  );
}

function InventoryMovementForm({
  balance,
  model,
  onRecorded,
  type,
}: Readonly<{
  balance?: StockBalanceItemModel;
  model: InventoryViewModel;
  onRecorded: () => void;
  type: Exclude<InventoryModal, null | { type: 'movement'; movement: StockMovementModel }>['type'];
}>) {
  const disabled = !model.canWrite || model.state === 'offline';
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && type === 'entry') onRecorded();
  }

  return (
    <form className="inventory-form" onSubmit={handleSubmit}>
      <fieldset disabled={disabled}>
        <label>
          Produto
          <select defaultValue={balance?.productId ?? ''}>
            <option value="" disabled>
              Selecione
            </option>
            {model.balances.map((item) => (
              <option key={item.productId} value={item.productId}>
                {item.productName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade
          <input inputMode="numeric" type="number" defaultValue="1" />
        </label>
        <label>
          Motivo
          <textarea rows={3} placeholder="Ex.: compra, quebra, contagem fisica" />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <button className="button button-primary" disabled={disabled} type="submit">
          {type === 'transfer' ? (
            <ArrowRightLeft size={16} aria-hidden="true" />
          ) : (
            <Boxes size={16} aria-hidden="true" />
          )}
          Registrar
        </button>
      </div>
    </form>
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

function InventoryBoundaryState({ model }: Readonly<{ model: InventoryViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="inventory-boundary-state" aria-labelledby="inventory-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="inventory-boundary-title">{denied ? 'Estoque indisponível' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
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

function modalTitle(
  type: Exclude<InventoryModal, null | { type: 'movement'; movement: StockMovementModel }>['type'],
  productName: string,
) {
  if (type === 'entry') return 'Entrada de estoque';
  if (type === 'loss') return 'Registrar perda de ' + productName;
  if (type === 'transfer') return 'Transferir ' + productName;
  return 'Ajustar ' + productName;
}
