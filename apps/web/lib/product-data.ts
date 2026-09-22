import type {
  LowStockAlert,
  Permission,
  Product,
  ProductCategory,
  ProductStatus,
  SessionContext,
  StockBalance,
} from '@barberos/contracts';

export type ProductsViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type ProductTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ProductActionId =
  | 'products.refresh'
  | 'products.create'
  | 'products.edit-selected'
  | 'products.archive-selected'
  | 'products.adjust-stock';

export type ProductActionModel = {
  id: ProductActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type ProductCategoryFilterModel = {
  id: string;
  name: string;
  status: ProductCategory['status'];
  productCount: number;
  activeCount: number;
  lowStockCount: number;
};

export type ProductStatusFilterModel = {
  status: ProductStatus | 'ALL';
  label: string;
  count: number;
  tone: ProductTone;
};

export type ProductItemModel = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  categoryName: string;
  status: ProductStatus;
  statusLabel: string;
  statusTone: ProductTone;
  salePriceAmountCents: number;
  salePriceLabel: string;
  costAmountCents?: number;
  costLabel: string;
  grossMarginAmountCents?: number;
  grossMarginLabel: string;
  supplierName: string;
  stockTrackingPolicy: Product['stockTrackingPolicy'];
  stockTrackingLabel: string;
  allowNegativeStock: boolean;
  minimumStockQuantity: number;
  currentStockQuantity?: number;
  stockLabel: string;
  stockTone: ProductTone;
  lowStock: boolean;
  branchIds: readonly string[];
  availableInBranch: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canAdjustStock: boolean;
  unavailableReason?: string;
};

export type ProductsViewModel = {
  state: ProductsViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  selectedStatus: ProductStatus | 'ALL';
  selectedCategoryId?: string;
  search: string;
  canRead: boolean;
  canWrite: boolean;
  products: readonly ProductItemModel[];
  categories: readonly ProductCategoryFilterModel[];
  statusFilters: readonly ProductStatusFilterModel[];
  allowedActions: readonly ProductActionModel[];
  error?: { code: string; message: string; requestId: string };
};

type DevelopmentProductsOptions = {
  branchId?: string;
  status?: ProductStatus | 'ALL';
  categoryId?: string;
  search?: string;
  state?: 'loading' | 'populated' | 'empty' | 'error' | 'offline';
};

type ProductsViewOptions = {
  branchId?: string;
  status?: string;
  categoryId?: string;
  search?: string;
  state?: string;
};

type ProductsBaseModel = ReturnType<typeof baseModel>;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const statusLabels: Record<ProductStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
};

const statusTones: Record<ProductStatus, ProductTone> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  ARCHIVED: 'neutral',
};

const developmentCategories: readonly ProductCategory[] = [
  {
    id: 'dev-product-category-finishers',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch', 'dev-branch-north'],
    name: 'Finalizadores',
    description: 'Pomadas, ceras e finalizadores.',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-category-beverages',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    name: 'Bebidas',
    description: 'Produtos de consumo vendidos no balcao.',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
];

const developmentProducts: readonly Product[] = [
  {
    id: 'dev-product-pomade',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch', 'dev-branch-north'],
    categoryId: 'dev-product-category-finishers',
    sku: 'POM-MATTE-80G',
    barcode: '7890000000001',
    name: 'Pomada Matte 80g',
    status: 'ACTIVE',
    salePriceAmountCents: 4500,
    costAmountCents: 1800,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 5,
    supplierMetadata: { supplierName: 'Barber Supply', contactPhone: '+55 11 99999-0001' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-soda',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    categoryId: 'dev-product-category-beverages',
    sku: 'COCA-350',
    name: 'Coca-Cola lata',
    status: 'ACTIVE',
    salePriceAmountCents: 800,
    costAmountCents: 450,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 12,
    supplierMetadata: { supplierName: 'Distribuidora Centro' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-service-kit',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    categoryId: 'dev-product-category-finishers',
    name: 'Kit presente barba',
    status: 'INACTIVE',
    salePriceAmountCents: 9900,
    costAmountCents: 5200,
    stockTrackingPolicy: 'NOT_TRACKED',
    allowNegativeStock: true,
    minimumStockQuantity: 0,
    supplierMetadata: { supplierName: 'Linha Propria' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
];

const developmentBalances: readonly StockBalance[] = [
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-pomade',
    currentQuantity: 18,
    minimumStockQuantity: 5,
    lowStock: false,
    lastMovementAt: '2026-09-07T12:00:00.000Z',
    updatedAt: '2026-09-07T12:00:00.000Z',
  },
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    currentQuantity: 4,
    minimumStockQuantity: 12,
    lowStock: true,
    lastMovementAt: '2026-09-07T12:30:00.000Z',
    updatedAt: '2026-09-07T12:30:00.000Z',
  },
];

const developmentAlerts: readonly LowStockAlert[] = [
  {
    id: 'dev-low-stock-soda',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    state: 'ACTIVE',
    currentQuantity: 4,
    minimumStockQuantity: 12,
    triggeredAt: '2026-09-07T12:30:00.000Z',
  },
];

export async function getProductsViewModel(
  session: SessionContext,
  options: ProductsViewOptions = {},
): Promise<ProductsViewModel> {
  return getDevelopmentProductsViewModel(session, {
    branchId: options.branchId,
    status: productStatusFrom(options.status),
    categoryId: options.categoryId,
    search: options.search,
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentProductsViewModel(
  session: SessionContext,
  options: DevelopmentProductsOptions = {},
): ProductsViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const selectedStatus = options.status ?? 'ALL';
  const search = options.search?.trim() ?? '';
  const base = baseModel(session, branchId, selectedStatus, options.categoryId, search);

  if (!base.canRead) {
    return buildProductsModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar produtos desta unidade.',
      [],
      [],
    );
  }

  if (options.state === 'loading') {
    return buildProductsModel(base, 'loading', 'Carregando catálogo de produtos.', [], []);
  }

  if (options.state === 'error') {
    return buildProductsModel(base, 'error', 'Não foi possível carregar produtos agora.', [], [], {
      code: 'CATALOG_VALIDATION_ERROR',
      message: 'Produtos locais indisponíveis.',
      requestId: 'local-products-error',
    });
  }

  if (options.state === 'offline') {
    return buildProductsModel(
      base,
      'offline',
      'Você está offline. Cadastro e ajustes de produtos ficam pausados.',
      [],
      [],
    );
  }

  if (options.state === 'empty') {
    return buildProductsModel(base, 'empty', 'Nenhum produto cadastrado nesta unidade.', [], []);
  }

  const branchProducts = developmentProducts.filter((product) =>
    product.branchIds.includes(branchId),
  );
  const visibleProducts = filterProducts(branchProducts, {
    status: selectedStatus,
    categoryId: options.categoryId,
    search,
  });

  return buildProductsModel(
    base,
    visibleProducts.length ? 'ready' : 'empty',
    visibleProducts.length
      ? 'Produtos, categorias, precos, custos e política de estoque da unidade.'
      : 'Nenhum produto encontrado para este filtro.',
    visibleProducts,
    branchProducts,
  );
}

function baseModel(
  session: SessionContext,
  branchId: string,
  selectedStatus: ProductStatus | 'ALL',
  selectedCategoryId: string | undefined,
  search: string,
) {
  const hasInventoryEntitlement = (session.entitlements ?? []).includes('inventory');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Produtos',
    description: 'Catálogo operacional de produtos para venda e estoque.',
    branchId,
    branchName: branchNameFor(session, branchId),
    selectedStatus,
    selectedCategoryId,
    search,
    canRead: hasPermission(session, 'inventory.read') && hasInventoryEntitlement && hasBranch,
    canWrite: hasPermission(session, 'inventory.write') && hasInventoryEntitlement && hasBranch,
  };
}

function buildProductsModel(
  base: ProductsBaseModel,
  state: ProductsViewState,
  description: string,
  visibleProducts: readonly Product[],
  branchProducts: readonly Product[],
  error?: ProductsViewModel['error'],
): ProductsViewModel {
  const items = visibleProducts.map((product) => toProductItemModel(product, base, state));
  return {
    ...base,
    state,
    description,
    products: items,
    categories:
      base.canRead && branchProducts.length > 0 ? categoriesFor(base.branchId, branchProducts) : [],
    statusFilters: statusFiltersFor(branchProducts),
    allowedActions: actionsFor(base, state, items),
    error,
  };
}

function filterProducts(
  products: readonly Product[],
  filters: { status: ProductStatus | 'ALL'; categoryId?: string; search: string },
) {
  const query = normalize(filters.search);
  return products.filter((product) => {
    if (filters.status !== 'ALL' && product.status !== filters.status) return false;
    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
    if (!query) return true;
    return [product.name, product.sku, product.barcode]
      .filter(Boolean)
      .some((value) => normalize(value).includes(query));
  });
}

function toProductItemModel(
  product: Product,
  base: ProductsBaseModel,
  state: ProductsViewState,
): ProductItemModel {
  const category = developmentCategories.find((item) => item.id === product.categoryId);
  const balance = developmentBalances.find(
    (item) => item.branchId === base.branchId && item.productId === product.id,
  );
  const alert = developmentAlerts.find(
    (item) =>
      item.branchId === base.branchId && item.productId === product.id && item.state === 'ACTIVE',
  );
  const availableInBranch = product.branchIds.includes(base.branchId);
  const canMutate = base.canWrite && state === 'ready' && availableInBranch;
  const grossMarginAmountCents =
    product.costAmountCents === undefined
      ? undefined
      : product.salePriceAmountCents - product.costAmountCents;
  const lowStock = Boolean(balance?.lowStock || alert);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    categoryName: category?.name ?? 'Sem categoria',
    status: product.status,
    statusLabel: statusLabels[product.status],
    statusTone: statusTones[product.status],
    salePriceAmountCents: product.salePriceAmountCents,
    salePriceLabel: formatCurrency(product.salePriceAmountCents),
    costAmountCents: product.costAmountCents,
    costLabel:
      product.costAmountCents === undefined
        ? 'Custo não informado'
        : formatCurrency(product.costAmountCents),
    grossMarginAmountCents,
    grossMarginLabel:
      grossMarginAmountCents === undefined
        ? 'Margem não calculada'
        : formatCurrency(grossMarginAmountCents),
    supplierName: product.supplierMetadata?.supplierName ?? 'Fornecedor não informado',
    stockTrackingPolicy: product.stockTrackingPolicy,
    stockTrackingLabel:
      product.stockTrackingPolicy === 'TRACKED' ? 'Controla estoque' : 'Sem controle de estoque',
    allowNegativeStock: product.allowNegativeStock,
    minimumStockQuantity: product.minimumStockQuantity,
    currentStockQuantity: balance?.currentQuantity,
    stockLabel: stockLabelFor(product, balance),
    stockTone: stockToneFor(product, lowStock),
    lowStock,
    branchIds: product.branchIds,
    availableInBranch,
    canEdit: canMutate && product.status !== 'ARCHIVED',
    canArchive: canMutate && product.status !== 'ARCHIVED',
    canAdjustStock: canMutate && product.stockTrackingPolicy === 'TRACKED',
    unavailableReason: unavailableReasonForProduct(base, state, product, availableInBranch),
  };
}

function unavailableReasonForProduct(
  base: ProductsBaseModel,
  state: ProductsViewState,
  product: Product,
  availableInBranch: boolean,
) {
  if (!base.canWrite) return 'Sem permissão para alterar produtos.';
  if (state === 'offline') return 'Disponivel quando a conexão voltar.';
  if (state === 'error') return 'Recarregue produtos antes de executar esta ação.';
  if (!availableInBranch) return 'Produto fora do escopo desta unidade.';
  if (product.status === 'ARCHIVED') return 'Produto arquivado preserva histórico.';
  return undefined;
}

function actionsFor(
  base: ProductsBaseModel,
  state: ProductsViewState,
  products: readonly ProductItemModel[],
): readonly ProductActionModel[] {
  const stateReason = unavailableReasonForState(state);
  const hasEditable = products.some((product) => product.canEdit);
  const hasArchivable = products.some((product) => product.canArchive);
  const hasAdjustable = products.some((product) => product.canAdjustStock);

  return [
    {
      id: 'products.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissão para visualizar produtos.',
    },
    {
      id: 'products.create',
      label: 'Novo produto',
      enabled: base.canWrite && (state === 'ready' || state === 'empty'),
      reason: actionReason(base.canWrite, stateReason, 'Sem permissão para criar produtos.'),
    },
    {
      id: 'products.edit-selected',
      label: 'Editar selecionado',
      enabled: base.canWrite && state === 'ready' && hasEditable,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasEditable,
        'Nenhum produto editavel selecionado.',
      ),
    },
    {
      id: 'products.archive-selected',
      label: 'Arquivar selecionado',
      enabled: base.canWrite && state === 'ready' && hasArchivable,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasArchivable,
        'Nenhum produto ativo para arquivar.',
      ),
    },
    {
      id: 'products.adjust-stock',
      label: 'Ajustar estoque',
      enabled: base.canWrite && state === 'ready' && hasAdjustable,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasAdjustable,
        'Nenhum produto com estoque controlado selecionado.',
      ),
    },
  ];
}

function categoriesFor(
  branchId: string,
  products: readonly Product[],
): readonly ProductCategoryFilterModel[] {
  return developmentCategories
    .filter((category) => category.branchIds.includes(branchId))
    .map((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        status: category.status,
        productCount: categoryProducts.length,
        activeCount: categoryProducts.filter((product) => product.status === 'ACTIVE').length,
        lowStockCount: categoryProducts.filter((product) => {
          const balance = developmentBalances.find(
            (item) => item.branchId === branchId && item.productId === product.id,
          );
          return Boolean(balance?.lowStock);
        }).length,
      };
    });
}

function statusFiltersFor(products: readonly Product[]): readonly ProductStatusFilterModel[] {
  const statuses: readonly (ProductStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
  return statuses.map((status) => {
    const matching =
      status === 'ALL' ? products : products.filter((product) => product.status === status);
    return {
      status,
      label: status === 'ALL' ? 'Todos' : statusLabels[status],
      count: matching.length,
      tone: status === 'ALL' ? 'neutral' : statusTones[status],
    };
  });
}

function stockLabelFor(product: Product, balance: StockBalance | undefined) {
  if (product.stockTrackingPolicy === 'NOT_TRACKED') return 'Estoque não controlado';
  if (!balance) return 'Sem movimentos de estoque';
  return `${balance.currentQuantity} un. (min. ${balance.minimumStockQuantity})`;
}

function stockToneFor(product: Product, lowStock: boolean): ProductTone {
  if (product.stockTrackingPolicy === 'NOT_TRACKED') return 'neutral';
  return lowStock ? 'danger' : 'success';
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function selectedActionReason(
  hasAccess: boolean,
  stateReason: string | undefined,
  hasSelectable: boolean,
  emptyReason: string,
) {
  if (!hasAccess) return 'Sem permissão para alterar produtos.';
  if (stateReason) return stateReason;
  if (!hasSelectable) return emptyReason;
  return undefined;
}

function unavailableReasonForState(state: ProductsViewState) {
  if (state === 'offline') return 'Disponivel quando a conexão voltar.';
  if (state === 'error') return 'Recarregue produtos antes de executar esta ação.';
  if (state === 'permission-denied') return 'Sem permissão para visualizar produtos.';
  if (state === 'loading') return 'Aguarde o carregamento.';
  return undefined;
}

function productStatusFrom(status: string | undefined): ProductStatus | 'ALL' | undefined {
  if (status === 'ALL' || status === 'ACTIVE' || status === 'INACTIVE' || status === 'ARCHIVED') {
    return status;
  }
  return undefined;
}

function developmentStateFrom(state: string | undefined): DevelopmentProductsOptions['state'] {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'offline') {
    return state;
  }
  return undefined;
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function normalize(value: string | undefined) {
  return (value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
