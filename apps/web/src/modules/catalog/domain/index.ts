import type {
  ArchiveProductCategoryCommand,
  ArchiveProductCommand,
  CreateProductCategoryCommand,
  CreateProductCommand,
  Product,
  ProductCategory,
  ProductDetailResponse,
  ProductListResponse,
  RequestContext,
  UpdateProductCategoryCommand,
  UpdateProductCommand,
} from '@barberos/contracts';

export type ProductListFilters = {
  branchId?: string;
  categoryId?: string;
  status?: Product['status'];
  query?: string;
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
};

export type ProductDetailFilters = {
  branchId?: string;
};

export interface CatalogRepository {
  listProducts(context: RequestContext, filters?: ProductListFilters): Promise<ProductListResponse>;
  findProductById(
    context: RequestContext,
    productId: string,
    filters?: ProductDetailFilters,
  ): Promise<ProductDetailResponse | null>;
  listCategories(context: RequestContext, branchId?: string): Promise<ProductCategory[]>;
  findCategoryById(context: RequestContext, categoryId: string): Promise<ProductCategory | null>;
  createCategory(
    context: RequestContext,
    command: CreateProductCategoryCommand,
  ): Promise<ProductCategory>;
  updateCategory(
    context: RequestContext,
    categoryId: string,
    command: UpdateProductCategoryCommand,
  ): Promise<ProductCategory>;
  archiveCategory(
    context: RequestContext,
    command: ArchiveProductCategoryCommand,
  ): Promise<ProductCategory>;
  createProduct(context: RequestContext, command: CreateProductCommand): Promise<Product>;
  updateProduct(
    context: RequestContext,
    productId: string,
    command: UpdateProductCommand,
  ): Promise<Product>;
  archiveProduct(context: RequestContext, command: ArchiveProductCommand): Promise<Product>;
}

export interface CatalogAuditSink {
  record(
    context: RequestContext,
    event: {
      action:
        | 'PRODUCT_CATEGORY_CREATED'
        | 'PRODUCT_CATEGORY_UPDATED'
        | 'PRODUCT_CATEGORY_ARCHIVED'
        | 'PRODUCT_CREATED'
        | 'PRODUCT_UPDATED'
        | 'PRODUCT_ARCHIVED';
      entityType: 'PRODUCT_CATEGORY' | 'PRODUCT';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      branchIds?: readonly string[];
      beforeState?: unknown;
      afterState?: unknown;
      reason?: string;
    },
  ): Promise<void>;
}

export type ProductSaleSnapshot = {
  sourceType: 'PRODUCT';
  sourceId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  costAmountCents?: number;
};

export type ProductSearchFilters = {
  tenantId: string;
  branchId?: string;
  categoryId?: string;
  query?: string;
  status?: Product['status'];
  includeArchived?: boolean;
};

export function isArchivedProduct(product: Pick<Product, 'status' | 'archivedAt'>) {
  return product.status === 'ARCHIVED' || Boolean(product.archivedAt);
}

export function isProductVisibleForSale(product: Pick<Product, 'status' | 'archivedAt'>) {
  return product.status === 'ACTIVE' && !isArchivedProduct(product);
}

export function productAppliesToBranch(product: Pick<Product, 'branchIds'>, branchId: string) {
  return product.branchIds.includes(branchId);
}

export function categoryAppliesToBranch(
  category: Pick<ProductCategory, 'branchIds'>,
  branchId: string,
) {
  return category.branchIds.includes(branchId);
}

export function assertCategoryAllowsActiveProduct(
  category: Pick<ProductCategory, 'status' | 'archivedAt'> | null | undefined,
) {
  if (!category) return;
  if (category.status === 'ARCHIVED' || category.archivedAt) {
    throw new Error('Archived product categories cannot receive active products.');
  }
}

export function createProductSaleSnapshot(
  product: Pick<
    Product,
    'id' | 'name' | 'salePriceAmountCents' | 'costAmountCents' | 'status' | 'archivedAt'
  >,
  input: { quantity?: number; discountAmountCents?: number } = {},
): ProductSaleSnapshot {
  if (!isProductVisibleForSale(product)) {
    throw new Error('Only active products can be converted into sale snapshots.');
  }

  const quantity = input.quantity ?? 1;
  const discountAmountCents = input.discountAmountCents ?? 0;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Product sale quantity must be a positive integer.');
  }
  if (!Number.isInteger(discountAmountCents) || discountAmountCents < 0) {
    throw new Error('Product sale discount must be a non-negative integer number of cents.');
  }

  const subtotalAmountCents = quantity * product.salePriceAmountCents;
  if (discountAmountCents > subtotalAmountCents) {
    throw new Error('Product sale discount cannot exceed the item subtotal.');
  }

  const snapshot: ProductSaleSnapshot = {
    sourceType: 'PRODUCT',
    sourceId: product.id,
    nameSnapshot: product.name,
    quantity,
    unitPriceAmountCents: product.salePriceAmountCents,
    discountAmountCents,
    finalAmountCents: subtotalAmountCents - discountAmountCents,
  };

  if (product.costAmountCents !== undefined) snapshot.costAmountCents = product.costAmountCents;

  return snapshot;
}

export function productMatchesSearch(product: Product, filters: ProductSearchFilters) {
  if (product.tenantId !== filters.tenantId) return false;
  if (!filters.includeArchived && isArchivedProduct(product)) return false;
  if (filters.status && product.status !== filters.status) return false;
  if (filters.branchId && !productAppliesToBranch(product, filters.branchId)) return false;
  if (filters.categoryId && product.categoryId !== filters.categoryId) return false;

  const query = normalizeProductSearchText(filters.query);
  if (!query) return true;

  return [product.name, product.sku, product.barcode, product.description]
    .filter(Boolean)
    .some((value) => normalizeProductSearchText(value).includes(query));
}

export function filterProductsForCatalogSearch(
  products: readonly Product[],
  filters: ProductSearchFilters,
) {
  return products.filter((product) => productMatchesSearch(product, filters));
}

function normalizeProductSearchText(value: string | undefined) {
  return (value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
