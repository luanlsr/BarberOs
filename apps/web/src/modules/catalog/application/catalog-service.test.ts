import { beforeEach, describe, expect, it } from 'vitest';
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

import type {
  CatalogAuditSink,
  CatalogRepository,
  ProductDetailFilters,
  ProductListFilters,
} from '../domain';
import { CatalogApplicationService, CoreOperationsApplicationError } from './catalog-service';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  categoryId: 'category-1',
  sku: 'POM-MATTE-80G',
  barcode: '7890000000001',
  name: 'Pomada Matte 80g',
  status: 'ACTIVE',
  salePriceAmountCents: 4500,
  costAmountCents: 1800,
  stockTrackingPolicy: 'TRACKED',
  allowNegativeStock: false,
  minimumStockQuantity: 5,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

const category = (overrides: Partial<ProductCategory> = {}): ProductCategory => ({
  id: 'category-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  name: 'Finalizadores',
  status: 'ACTIVE',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

const ownerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['inventory.read', 'inventory.write'],
  entitlements: ['inventory'],
  branchScope: ['branch-1'],
};

function contextWith(overrides: Partial<RequestContext>): RequestContext {
  return { ...ownerContext, ...overrides };
}

class FakeCatalogRepository implements CatalogRepository {
  products: Product[] = [product()];
  categories: ProductCategory[] = [category()];
  listResponse: ProductListResponse | null = null;
  detailResponse: ProductDetailResponse | null = null;
  lastListFilters: ProductListFilters | null = null;
  lastDetailFilters: ProductDetailFilters | null = null;
  lastCategoryBranchId: string | undefined;
  createdCategoryCommand: CreateProductCategoryCommand | null = null;
  updatedCategoryCommand: UpdateProductCategoryCommand | null = null;
  archivedCategoryCommand: ArchiveProductCategoryCommand | null = null;
  createdProductCommand: CreateProductCommand | null = null;
  updatedProductCommand: UpdateProductCommand | null = null;
  archivedProductCommand: ArchiveProductCommand | null = null;

  async listProducts(_context: RequestContext, filters: ProductListFilters = {}) {
    this.lastListFilters = filters;
    return (
      this.listResponse ?? {
        tenantId: 'tenant-1',
        branchId: filters.branchId,
        products: this.products,
        categories: this.categories,
        balances: [],
        alerts: [],
      }
    );
  }

  async findProductById(
    _context: RequestContext,
    productId: string,
    filters: ProductDetailFilters = {},
  ) {
    this.lastDetailFilters = filters;
    if (this.detailResponse) return this.detailResponse;
    const found = this.products.find((item) => item.id === productId);
    if (!found) return null;
    return {
      tenantId: found.tenantId,
      branchId: filters.branchId,
      product: found,
      category: this.categories.find((item) => item.id === found.categoryId),
      balances: [],
      movements: [],
      alerts: [],
    };
  }

  async listCategories(_context: RequestContext, branchId?: string) {
    this.lastCategoryBranchId = branchId;
    return this.categories;
  }

  async findCategoryById(_context: RequestContext, categoryId: string) {
    return this.categories.find((item) => item.id === categoryId) ?? null;
  }

  async createCategory(context: RequestContext, command: CreateProductCategoryCommand) {
    this.createdCategoryCommand = command;
    const created = category({
      id: 'category-created',
      tenantId: context.tenantId,
      branchIds: command.branchIds,
      name: command.name,
      description: command.description,
      status: command.status ?? 'ACTIVE',
      createdBy: context.userId,
      updatedBy: context.userId,
    });
    this.categories.push(created);
    return created;
  }

  async updateCategory(
    _context: RequestContext,
    categoryId: string,
    command: UpdateProductCategoryCommand,
  ) {
    this.updatedCategoryCommand = command;
    const current = this.categories.find((item) => item.id === categoryId) ?? category();
    const updated = { ...current, ...command, id: categoryId } satisfies ProductCategory;
    this.categories = this.categories.map((item) => (item.id === categoryId ? updated : item));
    return updated;
  }

  async archiveCategory(_context: RequestContext, command: ArchiveProductCategoryCommand) {
    this.archivedCategoryCommand = command;
    const current = this.categories.find((item) => item.id === command.id) ?? category();
    const archived = {
      ...current,
      status: 'ARCHIVED' as const,
      archivedAt: '2026-09-08T10:00:00.000Z',
    };
    this.categories = this.categories.map((item) => (item.id === command.id ? archived : item));
    return archived;
  }

  async createProduct(context: RequestContext, command: CreateProductCommand) {
    this.createdProductCommand = command;
    const created = product({
      id: 'product-created',
      tenantId: context.tenantId,
      branchIds: command.branchIds,
      categoryId: command.categoryId,
      sku: command.sku,
      barcode: command.barcode,
      name: command.name,
      description: command.description,
      status: command.status ?? 'ACTIVE',
      salePriceAmountCents: command.salePriceAmountCents,
      costAmountCents: command.costAmountCents,
      stockTrackingPolicy: command.stockTrackingPolicy ?? 'TRACKED',
      allowNegativeStock: command.allowNegativeStock ?? false,
      minimumStockQuantity: command.minimumStockQuantity ?? 0,
      supplierMetadata: command.supplierMetadata,
      createdBy: context.userId,
      updatedBy: context.userId,
    });
    this.products.push(created);
    return created;
  }

  async updateProduct(_context: RequestContext, productId: string, command: UpdateProductCommand) {
    this.updatedProductCommand = command;
    const current = this.products.find((item) => item.id === productId) ?? product();
    const updated = { ...current, ...command, id: productId } satisfies Product;
    this.products = this.products.map((item) => (item.id === productId ? updated : item));
    return updated;
  }

  async archiveProduct(_context: RequestContext, command: ArchiveProductCommand) {
    this.archivedProductCommand = command;
    const current = this.products.find((item) => item.id === command.id) ?? product();
    const archived = {
      ...current,
      status: 'ARCHIVED' as const,
      archivedAt: '2026-09-08T10:00:00.000Z',
    };
    this.products = this.products.map((item) => (item.id === command.id ? archived : item));
    return archived;
  }
}

class FakeCatalogAuditSink implements CatalogAuditSink {
  readonly events: Array<Parameters<CatalogAuditSink['record']>[1]> = [];

  async record(_context: RequestContext, event: Parameters<CatalogAuditSink['record']>[1]) {
    this.events.push(event);
  }
}

describe('CatalogApplicationService', () => {
  let repository: FakeCatalogRepository;
  let audit: FakeCatalogAuditSink;
  let service: CatalogApplicationService;

  beforeEach(() => {
    repository = new FakeCatalogRepository();
    audit = new FakeCatalogAuditSink();
    service = new CatalogApplicationService({ repository, auditSink: audit });
  });

  it('lists products for owner, manager and receptionist contexts with inventory read entitlement', async () => {
    const manager = contextWith({ role: 'MANAGER' });
    const receptionist = contextWith({ role: 'RECEPTIONIST' });

    await expect(
      service.listProducts(ownerContext, { branchId: 'branch-1' }),
    ).resolves.toMatchObject({
      products: [{ id: 'product-1' }],
    });
    await expect(service.listProducts(manager)).resolves.toMatchObject({ tenantId: 'tenant-1' });
    await expect(service.listProducts(receptionist)).resolves.toMatchObject({
      tenantId: 'tenant-1',
    });
    expect(repository.lastListFilters).toEqual({});
  });

  it('returns product detail and categories only inside the actor branch scope', async () => {
    const detail = await service.getProductDetail(ownerContext, 'product-1', {
      branchId: 'branch-1',
    });
    const categories = await service.listCategories(ownerContext, 'branch-1');

    expect(detail.product.id).toBe('product-1');
    expect(categories.map((item) => item.id)).toEqual(['category-1']);
    expect(repository.lastDetailFilters).toEqual({ branchId: 'branch-1' });
    expect(repository.lastCategoryBranchId).toBe('branch-1');
  });

  it('denies reads without inventory permission or entitlement', async () => {
    await expect(
      service.listProducts(contextWith({ permissions: ['dashboard.read'] })),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(service.listCategories(contextWith({ entitlements: [] }))).rejects.toMatchObject({
      code: 'ENTITLEMENT_DENIED',
    });
  });

  it('denies requested branch filters outside the actor scope before repository access', async () => {
    await expect(service.listProducts(ownerContext, { branchId: 'branch-2' })).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_BRANCH_SCOPE_DENIED',
        'Branch is outside the authorized catalog scope.',
      ),
    );
    expect(repository.lastListFilters).toBeNull();
  });

  it('hides cross-tenant product lists and product details', async () => {
    repository.listResponse = {
      tenantId: 'tenant-2',
      products: [product({ tenantId: 'tenant-2' })],
      categories: [],
      balances: [],
      alerts: [],
    };

    await expect(service.listProducts(ownerContext)).rejects.toEqual(
      new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product list was not found.'),
    );

    repository.detailResponse = {
      tenantId: 'tenant-2',
      product: product({ tenantId: 'tenant-2' }),
      balances: [],
      movements: [],
      alerts: [],
    };

    await expect(service.getProductDetail(ownerContext, 'product-1')).rejects.toEqual(
      new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product was not found.'),
    );
  });

  it('blocks repository rows that leak outside the actor branch scope', async () => {
    repository.products = [product({ branchIds: ['branch-2'] })];

    await expect(service.listProducts(ownerContext)).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_BRANCH_SCOPE_DENIED',
        'Product is outside the authorized branch scope.',
      ),
    );
  });

  it('creates product categories with inventory write permission and records audit', async () => {
    const created = await service.createCategory(ownerContext, {
      branchIds: ['branch-1'],
      name: 'Finalizadores premium',
      description: 'Linha principal',
    });

    expect(created).toMatchObject({
      id: 'category-created',
      tenantId: 'tenant-1',
      branchIds: ['branch-1'],
      name: 'Finalizadores premium',
      status: 'ACTIVE',
    });
    expect(repository.createdCategoryCommand).toMatchObject({
      branchIds: ['branch-1'],
      name: 'Finalizadores premium',
    });
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'PRODUCT_CATEGORY_CREATED',
        entityType: 'PRODUCT_CATEGORY',
        entityId: 'category-created',
        result: 'SUCCESS',
        branchIds: ['branch-1'],
      }),
    ]);
  });

  it('updates active product categories and preserves before/after audit state', async () => {
    const updated = await service.updateCategory(ownerContext, {
      id: 'category-1',
      name: 'Finalizadores atualizados',
    });

    expect(updated.name).toBe('Finalizadores atualizados');
    expect(repository.updatedCategoryCommand).toEqual({
      id: 'category-1',
      name: 'Finalizadores atualizados',
    });
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'PRODUCT_CATEGORY_UPDATED',
        beforeState: expect.objectContaining({ name: 'Finalizadores' }),
        afterState: expect.objectContaining({ name: 'Finalizadores atualizados' }),
      }),
    ]);
  });

  it('archives active categories and treats already archived categories as idempotent', async () => {
    const archived = await service.archiveCategory(ownerContext, {
      id: 'category-1',
      reason: 'Linha substituida',
    });
    const alreadyArchived = await service.archiveCategory(ownerContext, { id: 'category-1' });

    expect(archived.status).toBe('ARCHIVED');
    expect(alreadyArchived).toEqual(archived);
    expect(repository.archivedCategoryCommand).toEqual({
      id: 'category-1',
      reason: 'Linha substituida',
    });
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: 'PRODUCT_CATEGORY_ARCHIVED',
      reason: 'Linha substituida',
    });
  });

  it('denies category writes without permission before repository mutation', async () => {
    const readOnlyContext = contextWith({ permissions: ['inventory.read'] });

    await expect(
      service.createCategory(readOnlyContext, { branchIds: ['branch-1'], name: 'Bebidas' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(repository.createdCategoryCommand).toBeNull();
    expect(audit.events).toEqual([]);
  });

  it('denies category writes outside branch scope', async () => {
    await expect(
      service.createCategory(ownerContext, { branchIds: ['branch-2'], name: 'Bebidas' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_BRANCH_SCOPE_DENIED',
        'Branch is outside the authorized catalog scope.',
      ),
    );
    expect(repository.createdCategoryCommand).toBeNull();
  });

  it('keeps archived categories readable but blocks further updates', async () => {
    repository.categories = [
      category({ status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' }),
    ];

    await expect(service.listCategories(ownerContext)).resolves.toHaveLength(1);
    await expect(
      service.updateCategory(ownerContext, { id: 'category-1', name: 'Não pode mudar' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Archived product categories cannot be changed.',
      ),
    );
    expect(repository.updatedCategoryCommand).toBeNull();
  });
  it('creates products with stock policy, supplier metadata and audit', async () => {
    const created = await service.createProduct(ownerContext, {
      branchIds: ['branch-1'],
      categoryId: 'category-1',
      sku: 'POM-MATTE-80G',
      name: 'Pomada Matte 80g',
      salePriceAmountCents: 4500,
      costAmountCents: 1800,
      stockTrackingPolicy: 'TRACKED',
      allowNegativeStock: true,
      minimumStockQuantity: 4,
      supplierMetadata: { supplierName: 'Barber Supply' },
    });

    expect(created).toMatchObject({
      id: 'product-created',
      tenantId: 'tenant-1',
      branchIds: ['branch-1'],
      categoryId: 'category-1',
      stockTrackingPolicy: 'TRACKED',
      allowNegativeStock: true,
      minimumStockQuantity: 4,
      supplierMetadata: { supplierName: 'Barber Supply' },
    });
    expect(repository.createdProductCommand).toMatchObject({
      branchIds: ['branch-1'],
      categoryId: 'category-1',
      salePriceAmountCents: 4500,
      costAmountCents: 1800,
    });
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: 'product-created',
        result: 'SUCCESS',
        branchIds: ['branch-1'],
      }),
    ]);
  });

  it('updates products and audits price, cost and availability state changes', async () => {
    const updated = await service.updateProduct(ownerContext, {
      id: 'product-1',
      salePriceAmountCents: 4900,
      costAmountCents: 1900,
      status: 'INACTIVE',
      supplierMetadata: { supplierName: 'Novo Fornecedor' },
    });

    expect(updated).toMatchObject({
      id: 'product-1',
      salePriceAmountCents: 4900,
      costAmountCents: 1900,
      status: 'INACTIVE',
      supplierMetadata: { supplierName: 'Novo Fornecedor' },
    });
    expect(repository.updatedProductCommand).toMatchObject({
      id: 'product-1',
      salePriceAmountCents: 4900,
      costAmountCents: 1900,
    });
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'PRODUCT_UPDATED',
        beforeState: expect.objectContaining({ salePriceAmountCents: 4500 }),
        afterState: expect.objectContaining({ salePriceAmountCents: 4900 }),
      }),
    ]);
  });

  it('archives products idempotently and keeps archived products readable', async () => {
    const archived = await service.archiveProduct(ownerContext, {
      id: 'product-1',
      reason: 'Produto descontinuado',
    });
    const alreadyArchived = await service.archiveProduct(ownerContext, { id: 'product-1' });

    expect(archived.status).toBe('ARCHIVED');
    expect(alreadyArchived).toEqual(archived);
    await expect(service.getProductDetail(ownerContext, 'product-1')).resolves.toMatchObject({
      product: { id: 'product-1', status: 'ARCHIVED' },
    });
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: 'PRODUCT_ARCHIVED',
      reason: 'Produto descontinuado',
    });
  });

  it('denies products assigned to categories outside the product branch scope', async () => {
    repository.categories = [category({ branchIds: ['branch-2'] })];

    await expect(
      service.createProduct(ownerContext, {
        branchIds: ['branch-1'],
        categoryId: 'category-1',
        name: 'Pomada',
        salePriceAmountCents: 4500,
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_BRANCH_SCOPE_DENIED',
        'Product category is outside the authorized branch scope.',
      ),
    );
    expect(repository.createdProductCommand).toBeNull();
  });

  it('denies active products assigned to archived categories', async () => {
    repository.categories = [
      category({ status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' }),
    ];

    await expect(
      service.createProduct(ownerContext, {
        branchIds: ['branch-1'],
        categoryId: 'category-1',
        name: 'Pomada',
        salePriceAmountCents: 4500,
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Archived product categories cannot receive active products.',
      ),
    );
    expect(repository.createdProductCommand).toBeNull();
  });

  it('hides cross-tenant products before updates', async () => {
    repository.detailResponse = {
      tenantId: 'tenant-2',
      product: product({ tenantId: 'tenant-2' }),
      balances: [],
      movements: [],
      alerts: [],
    };

    await expect(
      service.updateProduct(ownerContext, { id: 'product-1', name: 'Produto vazado' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product was not found.'),
    );
    expect(repository.updatedProductCommand).toBeNull();
  });

  it('blocks archived product updates while preserving historical readability', async () => {
    repository.products = [product({ status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' })];

    await expect(service.getProductDetail(ownerContext, 'product-1')).resolves.toMatchObject({
      product: { status: 'ARCHIVED' },
    });
    await expect(
      service.updateProduct(ownerContext, { id: 'product-1', name: 'Não pode mudar' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Archived products cannot be changed.',
      ),
    );
    expect(repository.updatedProductCommand).toBeNull();
  });
});
