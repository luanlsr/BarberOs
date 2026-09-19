'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Archive,
  Box,
  Boxes,
  Filter,
  LockKeyhole,
  Package,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { IconButton, StatusBadge } from '@barberos/ui';
import type {
  ProductActionModel,
  ProductCategoryFilterModel,
  ProductItemModel,
  ProductsViewModel,
} from '../lib/product-data';

type ProductModal =
  | { type: 'create' }
  | { type: 'detail'; product: ProductItemModel }
  | { type: 'adjust'; product: ProductItemModel }
  | null;

export function ProductView({ model }: Readonly<{ model: ProductsViewModel }>) {
  const [modal, setModal] = React.useState<ProductModal>(null);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState(model.selectedCategoryId);
  const [query, setQuery] = React.useState(model.search);

  if (model.state === 'permission-denied') return <ProductBoundaryState model={model} />;
  if (model.state === 'error') return <ProductBoundaryState model={model} />;

  const visibleProducts = filterProducts(model.products, {
    categoryId: selectedCategoryId,
    query,
  });
  const selectedProduct = visibleProducts[0];

  function handleAction(action: ProductActionModel) {
    if (!action.enabled) return;
    if (action.id === 'products.refresh') window.location.reload();
    if (action.id === 'products.create') setModal({ type: 'create' });
    if (action.id === 'products.edit-selected' && selectedProduct) {
      setModal({ type: 'detail', product: selectedProduct });
    }
    if (action.id === 'products.archive-selected' && selectedProduct) {
      setModal({ type: 'detail', product: selectedProduct });
    }
    if (action.id === 'products.adjust-stock' && selectedProduct) {
      setModal({ type: 'adjust', product: selectedProduct });
    }
  }

  return (
    <div className="products-page">
      <header className="products-heading">
        <div>
          <p className="eyebrow">Gestao</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <ProductActions actions={model.allowedActions} onAction={handleAction} />
      </header>

      <ProductInlineStates model={model} />

      <section className="inventory-summary-grid" aria-label="Resumo do catalogo">
        <SummaryTile label="Produtos" value={String(model.products.length)} tone="neutral" />
        <SummaryTile
          label="Ativos"
          value={String(model.statusFilters.find((item) => item.status === 'ACTIVE')?.count ?? 0)}
          tone="success"
        />
        <SummaryTile
          label="Estoque baixo"
          value={String(
            model.categories.reduce((total, category) => total + category.lowStockCount, 0),
          )}
          tone="warning"
        />
      </section>

      <div className="inventory-workspace" aria-label="Catalogo de produtos responsivo">
        <main className="inventory-primary" aria-label="Lista de produtos">
          <ProductToolbar
            categories={model.categories}
            query={query}
            selectedCategoryId={selectedCategoryId}
            onCategory={setSelectedCategoryId}
            onQuery={setQuery}
          />
          <ProductList
            products={visibleProducts}
            onDetail={(product) => setModal({ type: 'detail', product })}
          />
        </main>

        <aside className="inventory-side" aria-label="Detalhe do produto">
          <ProductDetailSurface
            product={selectedProduct}
            onAdjust={(product) => setModal({ type: 'adjust', product })}
          />
        </aside>
      </div>

      <ProductModalView modal={modal} model={model} onClose={() => setModal(null)} />
    </div>
  );
}

function ProductActions({
  actions,
  onAction,
}: Readonly<{
  actions: readonly ProductActionModel[];
  onAction: (action: ProductActionModel) => void;
}>) {
  return (
    <div className="inventory-heading-actions" aria-label="Acoes de produtos">
      {actions.map((action) => (
        <button
          className={
            action.id === 'products.create' ? 'button button-primary' : 'button button-secondary'
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

function iconForAction(id: ProductActionModel['id']) {
  if (id === 'products.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'products.archive-selected') return <Archive size={16} aria-hidden="true" />;
  if (id === 'products.adjust-stock') return <Boxes size={16} aria-hidden="true" />;
  if (id === 'products.edit-selected') return <SlidersHorizontal size={16} aria-hidden="true" />;
  return <Plus size={16} aria-hidden="true" />;
}

function ProductInlineStates({ model }: Readonly<{ model: ProductsViewModel }>) {
  if (model.state === 'loading') {
    return <InventoryInlineState tone="neutral" text="Carregando catalogo de produtos..." />;
  }
  if (model.state === 'offline') {
    return (
      <InventoryInlineState
        tone="warning"
        text="Modo offline: cadastro e ajuste de estoque pausados."
      />
    );
  }
  if (model.state === 'empty') {
    return <InventoryInlineState tone="neutral" text={model.description} />;
  }
  return null;
}

function ProductToolbar({
  categories,
  onCategory,
  onQuery,
  query,
  selectedCategoryId,
}: Readonly<{
  categories: readonly ProductCategoryFilterModel[];
  onCategory: (categoryId: string | undefined) => void;
  onQuery: (query: string) => void;
  query: string;
  selectedCategoryId?: string;
}>) {
  return (
    <section className="inventory-panel" aria-labelledby="product-filters-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2 id="product-filters-title">Catalogo</h2>
        </div>
        <Filter size={20} aria-hidden="true" />
      </div>
      <label className="inventory-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Buscar produto</span>
        <input
          aria-label="Buscar produto"
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar produto, SKU ou codigo"
          value={query}
        />
      </label>
      <div className="inventory-filter-row" aria-label="Categorias de produto">
        <button
          aria-pressed={!selectedCategoryId}
          className="inventory-filter-button"
          type="button"
          onClick={() => onCategory(undefined)}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={selectedCategoryId === category.id}
            className="inventory-filter-button"
            key={category.id}
            type="button"
            onClick={() => onCategory(category.id)}
          >
            {category.name}
            <strong>{category.productCount}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductList({
  onDetail,
  products,
}: Readonly<{
  onDetail: (product: ProductItemModel) => void;
  products: readonly ProductItemModel[];
}>) {
  return (
    <section
      className="inventory-panel"
      aria-labelledby="product-list-title"
      data-testid="product-list"
    >
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Produtos</p>
          <h2 id="product-list-title">Lista operacional</h2>
        </div>
        <Package size={20} aria-hidden="true" />
      </div>
      {products.length ? (
        <div className="inventory-list">
          {products.map((product) => (
            <article className="inventory-row" key={product.id}>
              <div className="inventory-row-main">
                <div className="inventory-row-title">
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.categoryName} · {product.supplierName}
                    </span>
                  </div>
                  <StatusBadge variant={badgeVariant(product.statusTone)}>
                    {product.statusLabel}
                  </StatusBadge>
                </div>
                <div className="inventory-row-meta" aria-label="Resumo do produto">
                  <span>{product.salePriceLabel}</span>
                  <span>{product.costLabel}</span>
                  <span>{product.stockLabel}</span>
                </div>
              </div>
              <div className="inventory-row-actions">
                <strong>{product.grossMarginLabel}</strong>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onDetail(product)}
                >
                  Detalhes
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="inventory-muted">Nenhum produto encontrado para este filtro.</p>
      )}
    </section>
  );
}

function ProductDetailSurface({
  onAdjust,
  product,
}: Readonly<{ onAdjust: (product: ProductItemModel) => void; product?: ProductItemModel }>) {
  if (!product) {
    return (
      <section className="inventory-panel" aria-labelledby="product-detail-empty-title">
        <div className="inventory-empty-panel">
          <Box size={24} aria-hidden="true" />
          <h2 id="product-detail-empty-title">Selecione um produto</h2>
          <p>Detalhes, estoque e historico aparecem aqui em telas maiores.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="inventory-panel"
      aria-labelledby="product-detail-title"
      data-testid="product-detail"
    >
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Detalhe</p>
          <h2 id="product-detail-title">{product.name}</h2>
        </div>
        <Package size={20} aria-hidden="true" />
      </div>
      <ProductDetailContent product={product} />
      <button
        className="button button-secondary"
        disabled={!product.canAdjustStock}
        title={product.unavailableReason}
        type="button"
        onClick={() => onAdjust(product)}
      >
        <Boxes size={16} aria-hidden="true" />
        Ajustar estoque
      </button>
    </section>
  );
}

function ProductDetailContent({ product }: Readonly<{ product: ProductItemModel }>) {
  return (
    <div className="inventory-detail-stack">
      <dl className="inventory-detail-list" aria-label="Dados do produto">
        <DetailTerm label="Venda" value={product.salePriceLabel} />
        <DetailTerm label="Custo" value={product.costLabel} />
        <DetailTerm label="Margem" value={product.grossMarginLabel} />
        <DetailTerm label="Fornecedor" value={product.supplierName} />
        <DetailTerm label="Estoque" value={product.stockLabel} />
        <DetailTerm label="Minimo" value={String(product.minimumStockQuantity)} />
        <DetailTerm label="Politica" value={product.stockTrackingLabel} />
      </dl>
      <ol className="inventory-timeline" aria-label="Historico do produto">
        <li>
          <time>07/09 09:00</time>
          <div>
            <strong>Produto cadastrado</strong>
            <span>{product.categoryName}</span>
          </div>
        </li>
        {product.stockTrackingPolicy === 'TRACKED' ? (
          <li>
            <time>07/09 12:00</time>
            <div>
              <strong>Estoque atualizado</strong>
              <span>{product.stockLabel}</span>
            </div>
          </li>
        ) : (
          <li>
            <time>Historico</time>
            <div>
              <strong>Produto sem controle de estoque</strong>
              <span>Vendas nao geram saldo fisico.</span>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}

function ProductModalView({
  modal,
  model,
  onClose,
}: Readonly<{ modal: ProductModal; model: ProductsViewModel; onClose: () => void }>) {
  if (!modal) return null;
  if (modal.type === 'create') {
    return (
      <AppModal
        description={model.description}
        eyebrow="Produto"
        title="Novo produto"
        onClose={onClose}
      >
        <ProductForm model={model} />
      </AppModal>
    );
  }
  if (modal.type === 'adjust') {
    return (
      <AppModal
        description="Ajustes de estoque geram movimentacao auditavel."
        eyebrow="Estoque"
        title={'Ajustar ' + modal.product.name}
        onClose={onClose}
      >
        <StockAdjustForm product={modal.product} />
      </AppModal>
    );
  }
  return (
    <AppModal
      description="Metadados comerciais, politica de estoque e historico resumido."
      eyebrow="Produto"
      title={modal.product.name}
      onClose={onClose}
    >
      <ProductDetailContent product={modal.product} />
    </AppModal>
  );
}

function ProductForm({ model }: Readonly<{ model: ProductsViewModel }>) {
  const createAction = model.allowedActions.find((action) => action.id === 'products.create');
  return (
    <form className="inventory-form">
      <fieldset disabled={!createAction?.enabled}>
        <label>
          Nome
          <input maxLength={160} placeholder="Ex.: Pomada matte 80g" />
        </label>
        <div className="inventory-form-grid">
          <label>
            Categoria
            <select defaultValue="">
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
            Status
            <select defaultValue="ACTIVE">
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </label>
        </div>
        <div className="inventory-form-grid">
          <label>
            Venda
            <input inputMode="decimal" placeholder="0,00" />
          </label>
          <label>
            Custo
            <input inputMode="decimal" placeholder="0,00" />
          </label>
        </div>
        <label>
          Fornecedor
          <input maxLength={160} placeholder="Opcional" />
        </label>
        <label>
          <input type="checkbox" defaultChecked />
          Controla estoque
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <button className="button button-primary" disabled={!createAction?.enabled} type="button">
          <Plus size={16} aria-hidden="true" />
          Salvar produto
        </button>
      </div>
    </form>
  );
}

function StockAdjustForm({ product }: Readonly<{ product: ProductItemModel }>) {
  return (
    <form className="inventory-form">
      <fieldset disabled={!product.canAdjustStock}>
        <label>
          Tipo de movimento
          <select defaultValue="ADJUSTMENT">
            <option value="ENTRY">Entrada</option>
            <option value="LOSS">Perda</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </label>
        <label>
          Quantidade
          <input inputMode="numeric" type="number" defaultValue="1" />
        </label>
        <label>
          Motivo
          <textarea rows={3} placeholder="Explique o ajuste" />
        </label>
      </fieldset>
      <div className="app-dialog-actions">
        <button className="button button-primary" disabled={!product.canAdjustStock} type="button">
          <Boxes size={16} aria-hidden="true" />
          Registrar movimento
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

function ProductBoundaryState({ model }: Readonly<{ model: ProductsViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="inventory-boundary-state" aria-labelledby="product-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="product-boundary-title">{denied ? 'Produtos indisponiveis' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

export function InventoryInlineState({
  text,
  tone,
}: Readonly<{ text: string; tone: 'neutral' | 'warning' }>) {
  return (
    <div className={'inventory-inline-state inventory-tone-' + tone} role="status">
      {tone === 'warning' ? (
        <AlertTriangle size={17} aria-hidden="true" />
      ) : (
        <Package size={17} aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

export function SummaryTile({
  label,
  tone,
  value,
}: Readonly<{ label: string; tone: 'neutral' | 'success' | 'warning' | 'danger'; value: string }>) {
  return (
    <article className={'inventory-summary inventory-tone-' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

function filterProducts(
  products: readonly ProductItemModel[],
  filters: { categoryId?: string; query: string },
) {
  const query = normalize(filters.query);
  return products.filter((product) => {
    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
    if (!query) return true;
    return normalize(
      [product.name, product.sku, product.barcode].filter(Boolean).join(' '),
    ).includes(query);
  });
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function badgeVariant(tone: ProductItemModel['statusTone']) {
  if (tone === 'danger') return 'warning';
  return tone;
}
