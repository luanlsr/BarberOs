import {
  archiveProductCategoryCommandSchema,
  archiveProductCommandSchema,
  createProductCategoryCommandSchema,
  createProductCommandSchema,
  updateProductCategoryCommandSchema,
  updateProductCommandSchema,
  type Entitlement,
  type Permission,
  type Product,
  type ProductCategory,
  type ProductStatus,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  CatalogAuditSink,
  CatalogRepository,
  ProductDetailFilters,
  ProductListFilters,
} from '../domain';

const inventoryEntitlement = 'inventory' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export type CatalogApplicationServiceDependencies = {
  repository: CatalogRepository;
  auditSink?: CatalogAuditSink;
};

export class CatalogApplicationService {
  private readonly catalog: CatalogRepository;
  private readonly audit?: CatalogAuditSink;

  constructor(dependencies: CatalogApplicationServiceDependencies | CatalogRepository) {
    if ('repository' in dependencies) {
      this.catalog = dependencies.repository;
      this.audit = dependencies.auditSink;
    } else {
      this.catalog = dependencies;
    }
  }

  async listProducts(context: RequestContext, filters: ProductListFilters = {}) {
    authorizeCatalogRead(context, filters.branchId);
    const response = await this.catalog.listProducts(context, filters);

    if (response.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product list was not found.');
    }
    if (response.branchId) assertBranchInScope(context, response.branchId);

    for (const product of response.products) assertProductVisibleToContext(context, product);
    for (const category of response.categories) assertCategoryVisibleToContext(context, category);
    for (const balance of response.balances) assertBranchInScope(context, balance.branchId);
    for (const alert of response.alerts) assertBranchInScope(context, alert.branchId);

    return response;
  }

  async getProductDetail(
    context: RequestContext,
    productId: string,
    filters: ProductDetailFilters = {},
  ) {
    authorizeCatalogRead(context, filters.branchId);
    const response = await this.catalog.findProductById(context, productId, filters);

    if (!response || response.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product was not found.');
    }
    if (response.branchId) assertBranchInScope(context, response.branchId);
    assertProductVisibleToContext(context, response.product);
    if (response.category) assertCategoryVisibleToContext(context, response.category);
    for (const balance of response.balances) assertBranchInScope(context, balance.branchId);
    for (const movement of response.movements) assertBranchInScope(context, movement.branchId);
    for (const alert of response.alerts) assertBranchInScope(context, alert.branchId);

    return response;
  }

  async listCategories(context: RequestContext, branchId?: string) {
    authorizeCatalogRead(context, branchId);
    const categories = await this.catalog.listCategories(context, branchId);
    for (const category of categories) assertCategoryVisibleToContext(context, category);
    return categories;
  }

  async createCategory(context: RequestContext, command: unknown) {
    const parsed = createProductCategoryCommandSchema.parse(command);
    authorizeCatalogWrite(context, parsed.branchIds);

    const created = await this.catalog.createCategory(context, parsed);
    assertCategoryVisibleToContext(context, created);

    await this.audit?.record(context, {
      action: 'PRODUCT_CATEGORY_CREATED',
      entityType: 'PRODUCT_CATEGORY',
      entityId: created.id,
      result: 'SUCCESS',
      branchIds: created.branchIds,
      afterState: created,
    });

    return created;
  }

  async updateCategory(context: RequestContext, command: unknown) {
    const parsed = updateProductCategoryCommandSchema.parse(command);
    const current = await this.getVisibleCategory(context, parsed.id);
    authorizeCatalogWrite(context, parsed.branchIds ?? current.branchIds);
    assertCategoryCanBeChanged(current);

    const updated = await this.catalog.updateCategory(context, current.id, parsed);
    assertCategoryVisibleToContext(context, updated);
    if (updated.id !== current.id) {
      throw new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Product category update returned an unexpected category.',
      );
    }

    await this.audit?.record(context, {
      action: 'PRODUCT_CATEGORY_UPDATED',
      entityType: 'PRODUCT_CATEGORY',
      entityId: updated.id,
      result: 'SUCCESS',
      branchIds: updated.branchIds,
      beforeState: current,
      afterState: updated,
    });

    return updated;
  }

  async archiveCategory(context: RequestContext, command: unknown) {
    const parsed = archiveProductCategoryCommandSchema.parse(command);
    const current = await this.getVisibleCategory(context, parsed.id);
    authorizeCatalogWrite(context, current.branchIds);

    if (current.status === 'ARCHIVED') return current;

    const archived = await this.catalog.archiveCategory(context, parsed);
    assertCategoryVisibleToContext(context, archived);
    if (archived.id !== current.id || archived.status !== 'ARCHIVED') {
      throw new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Product category archive returned an invalid category.',
      );
    }

    await this.audit?.record(context, {
      action: 'PRODUCT_CATEGORY_ARCHIVED',
      entityType: 'PRODUCT_CATEGORY',
      entityId: archived.id,
      result: 'SUCCESS',
      branchIds: archived.branchIds,
      beforeState: current,
      afterState: archived,
      reason: parsed.reason,
    });

    return archived;
  }

  async createProduct(context: RequestContext, command: unknown) {
    const parsed = createProductCommandSchema.parse(command);
    authorizeCatalogWrite(context, parsed.branchIds);
    if (parsed.categoryId) {
      const category = await this.getVisibleCategory(context, parsed.categoryId);
      assertCategoryCanReceiveProduct(category, parsed.status, parsed.branchIds);
    }

    const created = await this.catalog.createProduct(context, parsed);
    assertProductVisibleToContext(context, created);

    await this.audit?.record(context, {
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: created.id,
      result: 'SUCCESS',
      branchIds: created.branchIds,
      afterState: created,
    });

    return created;
  }

  async updateProduct(context: RequestContext, command: unknown) {
    const parsed = updateProductCommandSchema.parse(command);
    const current = await this.getVisibleProduct(context, parsed.id);
    authorizeCatalogWrite(context, parsed.branchIds ?? current.branchIds);
    assertProductCanBeChanged(current);

    const nextBranchIds = parsed.branchIds ?? current.branchIds;
    const nextStatus = parsed.status ?? current.status;
    const nextCategoryId = parsed.categoryId ?? current.categoryId;
    if (nextCategoryId) {
      const category = await this.getVisibleCategory(context, nextCategoryId);
      assertCategoryCanReceiveProduct(category, nextStatus, nextBranchIds);
    }

    const updated = await this.catalog.updateProduct(context, current.id, parsed);
    assertProductVisibleToContext(context, updated);
    if (updated.id !== current.id) {
      throw new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Product update returned an unexpected product.',
      );
    }

    await this.audit?.record(context, {
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: updated.id,
      result: 'SUCCESS',
      branchIds: updated.branchIds,
      beforeState: current,
      afterState: updated,
    });

    return updated;
  }

  async archiveProduct(context: RequestContext, command: unknown) {
    const parsed = archiveProductCommandSchema.parse(command);
    const current = await this.getVisibleProduct(context, parsed.id);
    authorizeCatalogWrite(context, current.branchIds);

    if (current.status === 'ARCHIVED') return current;

    const archived = await this.catalog.archiveProduct(context, parsed);
    assertProductVisibleToContext(context, archived);
    if (archived.id !== current.id || archived.status !== 'ARCHIVED') {
      throw new CoreOperationsApplicationError(
        'CATALOG_VALIDATION_ERROR',
        'Product archive returned an invalid product.',
      );
    }

    await this.audit?.record(context, {
      action: 'PRODUCT_ARCHIVED',
      entityType: 'PRODUCT',
      entityId: archived.id,
      result: 'SUCCESS',
      branchIds: archived.branchIds,
      beforeState: current,
      afterState: archived,
      reason: parsed.reason,
    });

    return archived;
  }

  private async getVisibleCategory(context: RequestContext, categoryId: string) {
    const category = await this.catalog.findCategoryById(context, categoryId);
    if (!category || category.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError(
        'CATALOG_NOT_FOUND',
        'Product category was not found.',
      );
    }
    assertCategoryVisibleToContext(context, category);
    return category;
  }

  private async getVisibleProduct(context: RequestContext, productId: string) {
    const response = await this.catalog.findProductById(context, productId);
    if (!response || response.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product was not found.');
    }
    assertProductVisibleToContext(context, response.product);
    return response.product;
  }
}

function authorizeCatalogRead(context: RequestContext, branchId?: string) {
  authorize(context, {
    permission: 'inventory.read' satisfies Permission,
    entitlement: inventoryEntitlement,
  });
  if (branchId) assertBranchInScope(context, branchId);
}

function authorizeCatalogWrite(context: RequestContext, branchIds: readonly string[]) {
  authorize(context, {
    permission: 'inventory.write' satisfies Permission,
    entitlement: inventoryEntitlement,
  });
  for (const branchId of branchIds) assertBranchInScope(context, branchId);
}

function assertProductVisibleToContext(context: RequestContext, product: Product) {
  if (product.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('CATALOG_NOT_FOUND', 'Product was not found.');
  }
  if (!product.branchIds.some((branchId) => context.branchScope.includes(branchId))) {
    throw new CoreOperationsApplicationError(
      'CATALOG_BRANCH_SCOPE_DENIED',
      'Product is outside the authorized branch scope.',
    );
  }
}

function assertCategoryVisibleToContext(context: RequestContext, category: ProductCategory) {
  if (category.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError(
      'CATALOG_NOT_FOUND',
      'Product category was not found.',
    );
  }
  if (!category.branchIds.some((branchId) => context.branchScope.includes(branchId))) {
    throw new CoreOperationsApplicationError(
      'CATALOG_BRANCH_SCOPE_DENIED',
      'Product category is outside the authorized branch scope.',
    );
  }
}

function assertBranchInScope(context: RequestContext, branchId: string) {
  if (!context.branchScope.includes(branchId)) {
    throw new CoreOperationsApplicationError(
      'CATALOG_BRANCH_SCOPE_DENIED',
      'Branch is outside the authorized catalog scope.',
    );
  }
}

function assertCategoryCanBeChanged(category: ProductCategory) {
  if (category.status === 'ARCHIVED') {
    throw new CoreOperationsApplicationError(
      'CATALOG_VALIDATION_ERROR',
      'Archived product categories cannot be changed.',
    );
  }
}

function assertProductCanBeChanged(product: Product) {
  if (product.status === 'ARCHIVED') {
    throw new CoreOperationsApplicationError(
      'CATALOG_VALIDATION_ERROR',
      'Archived products cannot be changed.',
    );
  }
}

function assertCategoryCanReceiveProduct(
  category: ProductCategory,
  productStatus: ProductStatus,
  branchIds: readonly string[],
) {
  if (productStatus === 'ACTIVE' && category.status === 'ARCHIVED') {
    throw new CoreOperationsApplicationError(
      'CATALOG_VALIDATION_ERROR',
      'Archived product categories cannot receive active products.',
    );
  }
  for (const branchId of branchIds) {
    if (!category.branchIds.includes(branchId)) {
      throw new CoreOperationsApplicationError(
        'CATALOG_BRANCH_SCOPE_DENIED',
        'Product category is not available in one of the product branches.',
      );
    }
  }
}
