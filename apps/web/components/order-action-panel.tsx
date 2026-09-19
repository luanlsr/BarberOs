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
  X,
} from 'lucide-react';
import { IconButton } from '@barberos/ui';
import type { ComandaItemModel, ComandaItemSuggestionModel } from '../lib/order-data';
import type { ProductPickerItemModel, ProductPickerViewModel } from '../lib/product-picker-data';
import {
  PhoneInput,
  RelatedSelect,
  isValidBrazilMobilePhone,
  type RelatedOption,
} from './form-controls';

type Feedback =
  | { type: 'idle' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; code: string; requestId: string };

type OrderActionPanelProps = Readonly<{
  autoOpenWalkIn?: boolean;
  branchId: string;
  branchName: string;
  canCreateWalkIn: boolean;
  canManageItems: boolean;
  canQuickCreateCustomer: boolean;
  itemSuggestions: readonly ComandaItemSuggestionModel[];
  openWalkInRequest?: number;
  productPicker: ProductPickerViewModel;
  orderId?: string;
}>;

export function OrderActionPanel({
  autoOpenWalkIn = false,
  branchId,
  branchName,
  canCreateWalkIn,
  canManageItems,
  canQuickCreateCustomer,
  itemSuggestions,
  openWalkInRequest = 0,
  orderId,
  productPicker,
}: OrderActionPanelProps) {
  const [modal, setModal] = React.useState<'manual-item' | 'walk-in' | null>(null);
  const autoOpenedRef = React.useRef(false);

  React.useEffect(() => {
    if (!autoOpenWalkIn || autoOpenedRef.current || orderId || !canCreateWalkIn) return;
    autoOpenedRef.current = true;
    setModal('walk-in');
  }, [autoOpenWalkIn, canCreateWalkIn, orderId]);

  React.useEffect(() => {
    if (!openWalkInRequest || orderId || !canCreateWalkIn) return;
    setModal('walk-in');
  }, [canCreateWalkIn, openWalkInRequest, orderId]);

  return (
    <div className="order-action-panel" aria-label="Acoes da Comanda">
      {orderId ? (
        <section className="order-action-section" aria-labelledby="order-add-item-cta-title">
          <div className="order-action-header">
            <div>
              <p className="eyebrow">Atendimento</p>
              <h2 id="order-add-item-cta-title">Adicionar item</h2>
            </div>
            <Plus size={18} aria-hidden="true" />
          </div>
          <p className="order-action-copy">
            Servicos, produtos e ajustes manuais abrem em modal para manter a Comanda limpa.
          </p>
          <button
            className="button button-primary"
            disabled={!canManageItems}
            type="button"
            onClick={() => setModal('manual-item')}
          >
            <Plus size={16} aria-hidden="true" />
            Adicionar item
          </button>
        </section>
      ) : null}
      <section className="order-action-section" aria-labelledby="order-walk-in-cta-title">
        <div className="order-action-header">
          <div>
            <p className="eyebrow">Walk-in</p>
            <h2 id="order-walk-in-cta-title">Nova Comanda</h2>
          </div>
          <ReceiptText size={18} aria-hidden="true" />
        </div>
        <p className="order-action-copy">
          Abra uma Comanda sem agendamento usando consumidor avulso, cliente existente ou cadastro
          rapido.
        </p>
        <button
          className="button button-secondary"
          disabled={!canCreateWalkIn}
          type="button"
          onClick={() => setModal('walk-in')}
        >
          <UserPlus size={16} aria-hidden="true" />
          Abrir walk-in
        </button>
      </section>

      {modal === 'manual-item' && orderId ? (
        <AppModal
          description="Escolha um item frequente ou preencha os dados do consumo em um modal operacional."
          eyebrow="Atendimento"
          title="Adicionar item"
          onClose={() => setModal(null)}
        >
          <ManualItemForm
            canManageItems={canManageItems}
            itemSuggestions={itemSuggestions}
            orderId={orderId}
            productPicker={productPicker}
          />
        </AppModal>
      ) : null}

      {modal === 'walk-in' ? (
        <AppModal
          description="Crie uma Comanda avulsa sem poluir a tela principal."
          eyebrow="Walk-in"
          title="Nova Comanda"
          onClose={() => setModal(null)}
        >
          <WalkInOrderForm
            branchId={branchId}
            branchName={branchName}
            canCreateWalkIn={canCreateWalkIn}
            canQuickCreateCustomer={canQuickCreateCustomer}
          />
        </AppModal>
      ) : null}
    </div>
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

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
function ManualItemForm({
  canManageItems,
  itemSuggestions,
  orderId,
  productPicker,
}: Readonly<{
  canManageItems: boolean;
  itemSuggestions: readonly ComandaItemSuggestionModel[];
  orderId: string;
  productPicker: ProductPickerViewModel;
}>) {
  const online = useOnlineStatus();
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const [sourceType, setSourceType] = React.useState('MANUAL');
  const [sourceId, setSourceId] = React.useState<string | undefined>();
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [discount, setDiscount] = React.useState('0');
  const [notes, setNotes] = React.useState('');
  const [productQuery, setProductQuery] = React.useState(productPicker.search);
  const [productCategoryId, setProductCategoryId] = React.useState(
    productPicker.selectedCategoryId,
  );
  const feedbackId = React.useId();
  const disabled = !canManageItems || !online || feedback.type === 'loading';
  const selectedSuggestion = itemSuggestions.find((suggestion) => suggestion.sourceId === sourceId);
  const productCatalogRequired = sourceType === 'PRODUCT' && !sourceId;
  const catalogLocked = sourceType === 'PRODUCT' && Boolean(sourceId);
  const submitDisabled = disabled || productCatalogRequired;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (productCatalogRequired) {
      setFeedback({
        type: 'error',
        code: 'PRODUCT_REQUIRED',
        message: 'Selecione um produto ativo do catalogo para adicionar na Comanda.',
        requestId: randomRequestToken(),
      });
      return;
    }

    const requestId = randomRequestToken();
    setFeedback({ type: 'loading', message: 'Salvando item na Comanda...' });

    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({
          sourceType,
          sourceId,
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
    if (suggestion.disabledReason) return;
    setSourceType(suggestion.sourceType);
    setSourceId(suggestion.sourceId);
    setName(suggestion.name);
    setUnitPrice(centsToInput(suggestion.unitPriceAmountCents));
    setDiscount('0');
    setQuantity('1');
    setNotes('');
  }

  function applyProduct(product: ProductPickerItemModel) {
    if (!product.available) return;
    setSourceType('PRODUCT');
    setSourceId(product.productId);
    setName(product.name);
    setUnitPrice(centsToInput(product.unitPriceAmountCents));
    setDiscount('0');
    setQuantity('1');
    setNotes('');
  }

  const visiblePickerProducts = filterPickerProducts(productPicker.products, {
    categoryId: productCategoryId,
    query: productQuery,
  });

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
              aria-disabled={Boolean(suggestion.disabledReason)}
              className="order-suggestion-button"
              disabled={disabled || Boolean(suggestion.disabledReason)}
              key={suggestion.id}
              onClick={() => applySuggestion(suggestion)}
              type="button"
            >
              <span>{suggestion.name}</span>
              <small>{suggestion.sourceLabel}</small>
              <strong>{suggestion.unitPriceLabel}</strong>
              <em>{suggestion.disabledReason ?? suggestion.helperLabel}</em>
            </button>
          ))}
        </div>
      ) : null}
      {productPicker.state === 'ready' ? (
        <ProductPickerPanel
          categories={productPicker.categories}
          products={visiblePickerProducts}
          query={productQuery}
          selectedCategoryId={productCategoryId}
          onApply={applyProduct}
          onCategory={setProductCategoryId}
          onQuery={setProductQuery}
        />
      ) : null}{' '}
      <form className="order-form" onSubmit={handleSubmit} aria-describedby={feedbackId}>
        <fieldset disabled={disabled}>
          <label>
            Item
            <input
              autoComplete="off"
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Agua, pomada, ajuste"
              readOnly={catalogLocked}
              required
              value={name}
            />
          </label>
          <div className="order-inline-fields">
            <label>
              Tipo
              <select
                onChange={(event) => {
                  setSourceType(event.target.value);
                  setSourceId(undefined);
                }}
                value={sourceType}
              >
                <option value="MANUAL">Manual</option>
                <option value="SERVICE">Servico</option>
                <option value="PRODUCT">Produto de catalogo</option>
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
                readOnly={catalogLocked}
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
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
              rows={2}
              value={notes}
            />
          </label>
        </fieldset>
        <div className="order-form-footer">
          <span>
            {productCatalogRequired
              ? 'Selecione um produto ativo do catalogo para continuar.'
              : (selectedSuggestion?.helperLabel ?? 'Totais recalculados no servidor.')}
          </span>
          <button className="button button-primary" disabled={submitDisabled} type="submit">
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
function ProductPickerPanel({
  categories,
  onApply,
  onCategory,
  onQuery,
  products,
  query,
  selectedCategoryId,
}: Readonly<{
  categories: ProductPickerViewModel['categories'];
  onApply: (product: ProductPickerItemModel) => void;
  onCategory: (categoryId: string | undefined) => void;
  onQuery: (query: string) => void;
  products: readonly ProductPickerItemModel[];
  query: string;
  selectedCategoryId?: string;
}>) {
  return (
    <section className="order-product-picker" aria-labelledby="order-product-picker-title">
      <div className="order-action-header">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h3 id="order-product-picker-title">Produtos</h3>
        </div>
        <ReceiptText size={18} aria-hidden="true" />
      </div>
      <label className="order-product-search">
        <span className="sr-only">Buscar produto</span>
        <input
          aria-label="Buscar produto"
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar produto"
          value={query}
        />
      </label>
      <div className="order-product-categories" aria-label="Categorias de produtos">
        <button
          aria-pressed={!selectedCategoryId}
          className="order-product-category-button"
          type="button"
          onClick={() => onCategory(undefined)}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={selectedCategoryId === category.id}
            className="order-product-category-button"
            key={category.id}
            type="button"
            onClick={() => onCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="order-suggestion-grid" aria-label="Produtos do catalogo">
        {products.map((product) => (
          <button
            aria-disabled={!product.available}
            className="order-suggestion-button"
            disabled={!product.available}
            key={product.id}
            onClick={() => onApply(product)}
            type="button"
          >
            <span>{product.name}</span>
            <small>{product.categoryName}</small>
            <strong>{product.unitPriceLabel}</strong>
            <em>{product.disabledReason ?? product.stockLabel}</em>
          </button>
        ))}
      </div>
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
  const [customers, setCustomers] = React.useState<RelatedOption[]>([]);
  const [professionals, setProfessionals] = React.useState<RelatedOption[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = React.useState(true);
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [professionalId, setProfessionalId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [feedback, setFeedback] = React.useState<Feedback>({ type: 'idle' });
  const feedbackId = React.useId();
  const disabled = !canCreateWalkIn || !online || feedback.type === 'loading';

  React.useEffect(() => {
    let cancelled = false;
    setRelationshipsLoading(true);
    Promise.all([fetchCustomers(branchId), fetchProfessionals(branchId)])
      .then(([customerOptions, professionalOptions]) => {
        if (cancelled) return;
        setCustomers(customerOptions);
        setProfessionals(professionalOptions);
        setCustomerId((current) => current || customerOptions[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) {
          setCustomers([]);
          setProfessionals([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRelationshipsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = randomRequestToken();
    setFeedback({ type: 'loading', message: 'Abrindo nova Comanda...' });

    try {
      if (mode === 'existing' && !customerId) {
        setFeedback({
          type: 'error',
          code: 'CUSTOMER_REQUIRED',
          message: 'Selecione um cliente cadastrado para abrir a Comanda.',
          requestId,
        });
        return;
      }

      if (mode === 'quick' && !isValidBrazilMobilePhone(customerPhone)) {
        setFeedback({
          type: 'error',
          code: 'INVALID_PHONE',
          message: 'Informe um celular valido com DDD, no formato (11) 99999-9999.',
          requestId,
        });
        return;
      }

      let resolvedCustomerId = mode === 'existing' ? customerId : undefined;
      if (mode === 'quick') {
        const customerResponse = await fetch('/api/v1/customers', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          body: JSON.stringify({
            branchId,
            name: customerName.trim(),
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
          professionalId: professionalId || undefined,
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
              Cliente existente
              <RelatedSelect
                emptyLabel="Cadastre um cliente antes de selecionar"
                loading={relationshipsLoading}
                onChange={setCustomerId}
                options={customers}
                placeholder="Selecione um cliente"
                required
                value={customerId}
              />
            </label>
          ) : null}{' '}
          {mode === 'quick' ? (
            <div className="order-inline-fields">
              <label>
                Nome
                <input
                  autoComplete="name"
                  maxLength={120}
                  minLength={3}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                  value={customerName}
                />
              </label>
              <label>
                Telefone
                <PhoneInput
                  onValueChange={setCustomerPhone}
                  placeholder="(11) 99999-9999"
                  required
                  value={customerPhone}
                />
              </label>
            </div>
          ) : null}
          <label>
            Profissional (opcional)
            <RelatedSelect
              emptyLabel="Nenhum profissional disponivel"
              loading={relationshipsLoading}
              onChange={setProfessionalId}
              options={professionals}
              placeholder="Sem profissional definido"
              value={professionalId}
            />
          </label>
          <label>
            Observacoes
            <textarea
              maxLength={500}
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
  const [modal, setModal] = React.useState<'edit' | 'delete' | null>(null);
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

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate('PATCH');
  }

  if (!canManageItems) return null;

  return (
    <div className="order-item-controls" aria-describedby={feedbackId}>
      {!online ? (
        <p className="order-feedback warning" role="status">
          <WifiOff size={15} aria-hidden="true" /> Item indisponivel offline.
        </p>
      ) : null}
      <div className="order-item-action-row">
        <button
          className="button button-secondary"
          disabled={disabled}
          onClick={() => setModal('edit')}
          type="button"
        >
          <Save size={15} aria-hidden="true" />
          Editar item
        </button>
        <button
          className="button button-ghost"
          disabled={disabled}
          onClick={() => setModal('delete')}
          type="button"
        >
          <Trash2 size={15} aria-hidden="true" />
          Remover
        </button>
      </div>
      <FeedbackMessage feedback={feedback} id={feedbackId} compact />

      {modal === 'edit' ? (
        <AppModal
          description="Atualize quantidade e desconto sem ocupar a linha da Comanda."
          eyebrow="Item"
          title={'Editar ' + item.name}
          onClose={() => setModal(null)}
        >
          <form className="order-form order-item-modal-form" onSubmit={handleEditSubmit}>
            <fieldset disabled={disabled}>
              <div className="order-item-control-row">
                <label>
                  Qtd.
                  <input
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
                    inputMode="decimal"
                    onChange={(event) => setDiscount(event.target.value)}
                    value={discount}
                  />
                </label>
              </div>
            </fieldset>
            <div className="order-form-footer">
              <span>Os totais da Comanda serao recalculados apos salvar.</span>
              <button className="button button-primary" disabled={disabled} type="submit">
                {feedback.type === 'loading' ? (
                  <LoaderCircle className="check-in-action-spinner" size={15} aria-hidden="true" />
                ) : (
                  <Save size={15} aria-hidden="true" />
                )}
                {feedback.type === 'loading' ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            <FeedbackMessage feedback={feedback} id={feedbackId + '-modal'} compact />
          </form>
        </AppModal>
      ) : null}

      {modal === 'delete' ? (
        <AppModal
          description="Esta acao remove o item e recalcula os totais da Comanda."
          eyebrow="Confirmacao"
          title="Remover item"
          onClose={() => setModal(null)}
        >
          <div className="order-item-delete-confirm">
            <p>
              Remover <strong>{item.name}</strong> da Comanda?
            </p>
            <div className="app-dialog-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                disabled={disabled}
                type="button"
                onClick={() => mutate('DELETE')}
              >
                <Trash2 size={15} aria-hidden="true" />
                Confirmar remocao
              </button>
            </div>
            <FeedbackMessage feedback={feedback} id={feedbackId + '-delete'} compact />
          </div>
        </AppModal>
      ) : null}
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

function filterPickerProducts(
  products: readonly ProductPickerItemModel[],
  filters: { categoryId?: string; query: string },
) {
  const query = normalizeText(filters.query);
  return products.filter((product) => {
    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
    if (!query) return true;
    return normalizeText(product.name).includes(query);
  });
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
function moneyToCents(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized || '0');
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

type CustomerOptionRecord = {
  id: string;
  name: string;
  phone?: string | null;
};

type ProfessionalOptionRecord = {
  id: string;
  displayName?: string;
  name?: string;
  roleLabel?: string;
};

async function fetchCustomers(branchId: string): Promise<RelatedOption[]> {
  const response = await fetch('/api/v1/customers?branchId=' + encodeURIComponent(branchId), {
    headers: { 'x-request-id': randomRequestToken() },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: CustomerOptionRecord[] };
  return (payload.data ?? []).map((customer) => ({
    id: customer.id,
    label: customer.name,
    description: customer.phone ?? undefined,
  }));
}

async function fetchProfessionals(branchId: string): Promise<RelatedOption[]> {
  const response = await fetch(
    '/api/v1/professionals?branchId=' + encodeURIComponent(branchId) + '&status=ACTIVE',
    { headers: { 'x-request-id': randomRequestToken() } },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: ProfessionalOptionRecord[] };
  return (payload.data ?? []).map((professional) => ({
    id: professional.id,
    label: professional.displayName ?? professional.name ?? 'Profissional',
    description: professional.roleLabel,
  }));
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
