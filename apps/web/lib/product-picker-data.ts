import type {
  Permission,
  Product,
  ProductCategory,
  ProductStatus,
  RequestContext,
  SessionContext,
  StockBalance,
} from '@barberos/contracts';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from './auth/server';
import { SupabaseCatalogRepository } from '../src/modules/catalog/infrastructure';

export type ProductPickerState = 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type ProductPickerTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ProductPickerCategoryModel = {
  id: string;
  name: string;
  productCount: number;
};

export type ProductPickerItemModel = {
  id: string;
  productId: string;
  name: string;
  categoryId?: string;
  categoryName: string;
  status: ProductStatus;
  unitPriceAmountCents: number;
  unitPriceLabel: string;
  costAmountCents?: number;
  common: boolean;
  favorite: boolean;
  available: boolean;
  disabledReason?: string;
  stockLabel: string;
  stockTone: ProductPickerTone;
};

export type ProductPickerViewModel = {
  state: ProductPickerState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  search: string;
  selectedCategoryId?: string;
  canSelectProducts: boolean;
  categories: readonly ProductPickerCategoryModel[];
  products: readonly ProductPickerItemModel[];
  commonProducts: readonly ProductPickerItemModel[];
  error?: { code: string; message: string; requestId: string };
};

type ProductPickerOptions = {
  branchId?: string;
  search?: string;
  categoryId?: string;
  state?: string;
};

type DevelopmentProductPickerOptions = {
  branchId?: string;
  search?: string;
  categoryId?: string;
  state?: ProductPickerState;
};

type ProductPickerCatalogData = {
  products: readonly Product[];
  categories: readonly ProductCategory[];
  balances: readonly StockBalance[];
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const developmentCategories: readonly ProductCategory[] = [
  {
    id: 'dev-product-category-finishers',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch', 'dev-branch-north'],
    name: 'Finalizadores',
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
    name: 'Pomada Matte 80g',
    status: 'ACTIVE',
    salePriceAmountCents: 4500,
    costAmountCents: 1800,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 5,
    supplierMetadata: { supplierName: 'Barber Supply' },
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
    id: 'dev-product-inactive',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    categoryId: 'dev-product-category-finishers',
    name: 'Shampoo indisponível',
    status: 'INACTIVE',
    salePriceAmountCents: 2800,
    costAmountCents: 1100,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 3,
    supplierMetadata: { supplierName: 'Barber Supply' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-branch-unavailable',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch-north'],
    categoryId: 'dev-product-category-finishers',
    name: 'Cera unidade norte',
    status: 'ACTIVE',
    salePriceAmountCents: 3900,
    costAmountCents: 1700,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 4,
    supplierMetadata: { supplierName: 'Barber Supply' },
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
    updatedAt: '2026-09-07T12:00:00.000Z',
  },
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    currentQuantity: 4,
    minimumStockQuantity: 12,
    lowStock: true,
    updatedAt: '2026-09-07T12:30:00.000Z',
  },
];

const favoriteProductIds = new Set(['dev-product-pomade']);
const commonProductIds = new Set(['dev-product-pomade', 'dev-product-soda']);

export async function getProductPickerViewModel(
  session: SessionContext,
  options: ProductPickerOptions = {},
): Promise<ProductPickerViewModel> {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const search = options.search?.trim() ?? '';
  const selectedCategoryId = options.categoryId;
  const forcedState = pickerStateFrom(options.state);
  const base = baseModel(session, branchId, search, selectedCategoryId);

  if (!base.canSelectProducts) {
    return {
      ...base,
      state: 'permission-denied',
      categories: [],
      products: [],
      commonProducts: [],
    };
  }

  if (forcedState === 'error') {
    return {
      ...base,
      state: 'error',
      categories: [],
      products: [],
      commonProducts: [],
      error: {
        code: 'CATALOG_VALIDATION_ERROR',
        message: 'Catálogo de produtos indisponível.',
        requestId: 'local-product-picker-error',
      },
    };
  }

  if (forcedState === 'offline') {
    return {
      ...base,
      state: 'offline',
      categories: [],
      products: [],
      commonProducts: [],
      description: 'Você está offline. Produtos não podem ser adicionados à Comanda.',
    };
  }

  if (forcedState === 'empty') {
    return { ...base, state: 'empty', categories: [], products: [], commonProducts: [] };
  }

  const client = await createSupabaseServerClient();
  const context = client
    ? await getRequestContext(crypto.randomUUID(), session.tenantId, branchId)
    : null;

  if (!client || !context) {
    if (!isDevelopmentAuthEnabled()) {
      return {
        ...base,
        state: 'empty',
        categories: [],
        products: [],
        commonProducts: [],
        description: 'Nenhum produto encontrado para este filtro.',
      };
    }

    return getDevelopmentProductPickerViewModel(session, {
      branchId,
      search,
      categoryId: selectedCategoryId,
    });
  }

  try {
    const catalog = await new SupabaseCatalogRepository(client).listProducts(context, {
      branchId,
      categoryId: selectedCategoryId,
      query: search || undefined,
      includeArchived: false,
      limit: 100,
    });
    return buildProductPickerModel(base, catalog);
  } catch (error) {
    return {
      ...base,
      state: 'error',
      categories: [],
      products: [],
      commonProducts: [],
      error: {
        code:
          error instanceof Error && 'code' in error ? String(error.code) : 'CATALOG_LOAD_FAILED',
        message: 'Catálogo de produtos indisponível.',
        requestId: context.requestId,
      },
    };
  }
}

export function getDevelopmentProductPickerViewModel(
  session: SessionContext,
  options: DevelopmentProductPickerOptions = {},
): ProductPickerViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const search = options.search?.trim() ?? '';
  const base = baseModel(session, branchId, search, options.categoryId);

  if (!base.canSelectProducts) {
    return {
      ...base,
      state: 'permission-denied',
      categories: [],
      products: [],
      commonProducts: [],
    };
  }

  if (options.state === 'error') {
    return {
      ...base,
      state: 'error',
      categories: [],
      products: [],
      commonProducts: [],
      error: {
        code: 'CATALOG_VALIDATION_ERROR',
        message: 'Catálogo de produtos indisponível.',
        requestId: 'local-product-picker-error',
      },
    };
  }

  if (options.state === 'offline') {
    return {
      ...base,
      state: 'offline',
      categories: [],
      products: [],
      commonProducts: [],
      description: 'Você está offline. Produtos não podem ser adicionados à Comanda.',
    };
  }

  if (options.state === 'empty') {
    return { ...base, state: 'empty', categories: [], products: [], commonProducts: [] };
  }

  const products = developmentProducts.filter((product) => {
    if (options.categoryId && product.categoryId !== options.categoryId) return false;
    if (!search) return true;
    return normalize(product.name).includes(normalize(search));
  });
  return buildProductPickerModel(base, {
    products,
    categories: developmentCategories,
    balances: developmentBalances,
  });
}

function buildProductPickerModel(
  base: ReturnType<typeof baseModel>,
  catalog: ProductPickerCatalogData,
): ProductPickerViewModel {
  const products = catalog.products.filter((product) => {
    if (base.selectedCategoryId && product.categoryId !== base.selectedCategoryId) return false;
    if (!base.search) return true;
    return normalize(product.name).includes(normalize(base.search));
  });
  const commonProductIds = new Set(
    products
      .filter((product) => product.status === 'ACTIVE' && product.branchIds.includes(base.branchId))
      .slice(0, 6)
      .map((product) => product.id),
  );
  const items = products.map((product) =>
    toPickerItem(product, base.branchId, catalog.categories, catalog.balances, commonProductIds),
  );

  return {
    ...base,
    state: items.length ? 'ready' : 'empty',
    description: items.length
      ? 'Produtos ativos e disponibilidade real para adicionar à Comanda.'
      : 'Nenhum produto encontrado para este filtro.',
    categories: categoriesFor(base.branchId, catalog.categories, catalog.products),
    products: items,
    commonProducts: items.filter((item) => item.common),
  };
}

function baseModel(
  session: SessionContext,
  branchId: string,
  search: string,
  selectedCategoryId: string | undefined,
) {
  const entitlements = session.entitlements ?? [];
  const hasBranch = session.branchScope.includes(branchId);
  const canSelectProducts =
    hasPermission(session, 'orders.item.add') &&
    hasPermission(session, 'inventory.read') &&
    entitlements.includes('core.operations') &&
    entitlements.includes('inventory') &&
    hasBranch;
  return {
    title: 'Adicionar produto',
    description: 'Catálogo rápido para itens de produto na Comanda.',
    branchId,
    branchName: branchNameFor(session, branchId),
    search,
    selectedCategoryId,
    canSelectProducts,
  };
}

function toPickerItem(
  product: Product,
  branchId: string,
  categories: readonly ProductCategory[],
  balances: readonly StockBalance[],
  commonProductIds: ReadonlySet<string>,
): ProductPickerItemModel {
  const category = categories.find((item) => item.id === product.categoryId);
  const balance = balances.find(
    (item) => item.branchId === branchId && item.productId === product.id,
  );
  const branchAvailable = product.branchIds.includes(branchId);
  const active = product.status === 'ACTIVE';
  const hasStock =
    product.stockTrackingPolicy === 'NOT_TRACKED' ||
    product.allowNegativeStock ||
    (balance?.currentQuantity ?? 0) > 0;
  const available = active && branchAvailable && hasStock;
  return {
    id: `picker-${product.id}`,
    productId: product.id,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: category?.name ?? 'Sem categoria',
    status: product.status,
    unitPriceAmountCents: product.salePriceAmountCents,
    unitPriceLabel: currencyFormatter.format(product.salePriceAmountCents / 100),
    costAmountCents: product.costAmountCents,
    common: commonProductIds.has(product.id),
    favorite: favoriteProductIds.has(product.id),
    available,
    disabledReason: disabledReasonFor(product, branchAvailable, hasStock),
    stockLabel: stockLabelFor(product, balance),
    stockTone: stockToneFor(product, balance),
  };
}

function disabledReasonFor(product: Product, branchAvailable: boolean, hasStock: boolean) {
  if (product.status !== 'ACTIVE') return 'Produto inativo no catálogo.';
  if (!branchAvailable) return 'Produto indisponível nesta unidade.';
  if (!hasStock) return 'Produto sem estoque disponível.';
  return undefined;
}

function categoriesFor(
  branchId: string,
  categories: readonly ProductCategory[],
  products: readonly Product[],
) {
  return categories
    .filter((category) => category.branchIds.includes(branchId))
    .map((category) => ({
      id: category.id,
      name: category.name,
      productCount: products.filter((product) => product.categoryId === category.id).length,
    }));
}

function stockLabelFor(product: Product, balance: StockBalance | undefined) {
  if (product.stockTrackingPolicy === 'NOT_TRACKED') return 'Sem controle de estoque';
  if (!balance) return 'Sem saldo nesta unidade';
  return `${balance.currentQuantity} disponíveis`;
}

function stockToneFor(product: Product, balance: StockBalance | undefined): ProductPickerTone {
  if (product.stockTrackingPolicy === 'NOT_TRACKED') return 'neutral';
  if (!balance || balance.currentQuantity <= 0) return 'danger';
  return balance.lowStock ? 'warning' : 'success';
}

function pickerStateFrom(state: string | undefined): DevelopmentProductPickerOptions['state'] {
  if (state === 'empty' || state === 'error' || state === 'offline') return state;
  return undefined;
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
