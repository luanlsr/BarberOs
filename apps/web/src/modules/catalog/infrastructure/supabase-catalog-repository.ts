import type { SupabaseClient } from '@supabase/supabase-js';
import {
  lowStockAlertSchema,
  productCategorySchema,
  productDetailResponseSchema,
  productListResponseSchema,
  productSchema,
  stockBalanceSchema,
  type ArchiveProductCategoryCommand,
  type ArchiveProductCommand,
  type CreateProductCategoryCommand,
  type CreateProductCommand,
  type LowStockAlert,
  type Product,
  type ProductCategory,
  type RequestContext,
  type StockBalance,
  type UpdateProductCategoryCommand,
  type UpdateProductCommand,
} from '@barberos/contracts';

import type { CatalogRepository, ProductDetailFilters, ProductListFilters } from '../domain';

const productSelect =
  'id, tenant_id, category_id, sku, barcode, name, description, status, sale_price_amount_cents, cost_amount_cents, stock_tracking_policy, allow_negative_stock, minimum_stock_quantity, supplier_metadata, archived_at, created_by, updated_by, created_at, updated_at';
const categorySelect =
  'id, tenant_id, name, description, status, archived_at, created_by, updated_by, created_at, updated_at';
const productBranchSelect = 'product_id, branch_id';
const categoryBranchSelect = 'category_id, branch_id';
const movementBalanceSelect = 'tenant_id, branch_id, location_id, product_id, quantity, created_at';
const lowStockAlertSelect =
  'id, tenant_id, branch_id, product_id, state, current_quantity, minimum_stock_quantity, triggered_at, resolved_at';

export type ProductRow = {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  status: Product['status'];
  sale_price_amount_cents: number;
  cost_amount_cents?: number | null;
  stock_tracking_policy: Product['stockTrackingPolicy'];
  allow_negative_stock: boolean;
  minimum_stock_quantity: number;
  supplier_metadata?: Record<string, unknown> | null;
  archived_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryRow = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  status: ProductCategory['status'];
  archived_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

type ProductBranchRow = { product_id: string; branch_id: string };
type CategoryBranchRow = { category_id: string; branch_id: string };
type MovementBalanceRow = {
  tenant_id: string;
  branch_id: string;
  location_id?: string | null;
  product_id: string;
  quantity: number;
  created_at: string;
};
type LowStockAlertRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  state: LowStockAlert['state'];
  current_quantity: number;
  minimum_stock_quantity: number;
  triggered_at: string;
  resolved_at?: string | null;
};

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listProducts(context: RequestContext, filters: ProductListFilters = {}) {
    const products = await this.fetchProducts(context, filters);
    const productIds = products.map((product) => product.id);
    const [categories, balances, alerts] = await Promise.all([
      this.listCategories(context, filters.branchId),
      this.fetchBalances(context, products, filters.branchId),
      this.fetchAlerts(context, productIds, filters.branchId),
    ]);

    return productListResponseSchema.parse({
      tenantId: context.tenantId,
      branchId: filters.branchId,
      products,
      categories,
      balances,
      alerts,
    });
  }

  async findProductById(
    context: RequestContext,
    productId: string,
    filters: ProductDetailFilters = {},
  ) {
    const { data, error } = await this.client
      .from('products')
      .select(productSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', productId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const branchRows = await this.fetchProductBranches(context, [productId], filters.branchId);
    const product = toProduct(data as ProductRow, branchRows);
    if (filters.branchId && !product.branchIds.includes(filters.branchId)) return null;

    const [category, balances, movements, alerts] = await Promise.all([
      product.categoryId
        ? this.findCategoryById(context, product.categoryId)
        : Promise.resolve(null),
      this.fetchBalances(context, [product], filters.branchId),
      this.fetchProductMovements(context, product.id, filters.branchId),
      this.fetchAlerts(context, [product.id], filters.branchId),
    ]);

    return productDetailResponseSchema.parse({
      tenantId: context.tenantId,
      branchId: filters.branchId,
      product,
      category: category ?? undefined,
      balances,
      movements,
      alerts,
    });
  }

  async listCategories(context: RequestContext, branchId?: string) {
    const { data, error } = await this.client
      .from('product_categories')
      .select(categorySelect)
      .eq('tenant_id', context.tenantId)
      .order('name', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as ProductCategoryRow[];
    const branches = await this.fetchCategoryBranches(
      context,
      rows.map((row) => row.id),
      branchId,
    );

    return rows
      .map((row) => toProductCategory(row, branches))
      .filter((category) => !branchId || category.branchIds.includes(branchId));
  }

  async findCategoryById(context: RequestContext, categoryId: string) {
    const { data, error } = await this.client
      .from('product_categories')
      .select(categorySelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', categoryId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const branches = await this.fetchCategoryBranches(context, [categoryId]);
    return toProductCategory(data as ProductCategoryRow, branches);
  }

  async createCategory(context: RequestContext, command: CreateProductCategoryCommand) {
    const { data, error } = await this.client
      .from('product_categories')
      .insert({
        tenant_id: context.tenantId,
        name: command.name,
        description: command.description ?? null,
        status: command.status ?? 'ACTIVE',
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    const categoryId = (data as { id: string }).id;
    await this.replaceCategoryBranches(context, categoryId, command.branchIds);
    return (await this.findCategoryById(context, categoryId)) as ProductCategory;
  }

  async updateCategory(
    context: RequestContext,
    categoryId: string,
    command: UpdateProductCategoryCommand,
  ) {
    const payload: Record<string, unknown> = {
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (command.name !== undefined) payload.name = command.name;
    if (command.description !== undefined) payload.description = command.description;
    if (command.status !== undefined) payload.status = command.status;

    const { error } = await this.client
      .from('product_categories')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', categoryId);

    if (error) throw error;
    if (command.branchIds)
      await this.replaceCategoryBranches(context, categoryId, command.branchIds);
    return (await this.findCategoryById(context, categoryId)) as ProductCategory;
  }

  async archiveCategory(context: RequestContext, command: ArchiveProductCategoryCommand) {
    const { error } = await this.client
      .from('product_categories')
      .update({
        status: 'ARCHIVED',
        archived_at: new Date().toISOString(),
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.id);

    if (error) throw error;
    return (await this.findCategoryById(context, command.id)) as ProductCategory;
  }

  async createProduct(context: RequestContext, command: CreateProductCommand) {
    const { data, error } = await this.client
      .from('products')
      .insert(toProductInsertPayload(context, command))
      .select('id')
      .single();

    if (error) throw error;
    const productId = (data as { id: string }).id;
    await this.replaceProductBranches(context, productId, command.branchIds);
    return (await this.findProductById(context, productId))!.product;
  }

  async updateProduct(context: RequestContext, productId: string, command: UpdateProductCommand) {
    const { error } = await this.client
      .from('products')
      .update(toProductUpdatePayload(context, command))
      .eq('tenant_id', context.tenantId)
      .eq('id', productId);

    if (error) throw error;
    if (command.branchIds) await this.replaceProductBranches(context, productId, command.branchIds);
    return (await this.findProductById(context, productId))!.product;
  }

  async archiveProduct(context: RequestContext, command: ArchiveProductCommand) {
    const { error } = await this.client
      .from('products')
      .update({
        status: 'ARCHIVED',
        archived_at: new Date().toISOString(),
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.id);

    if (error) throw error;
    return (await this.findProductById(context, command.id))!.product;
  }

  private async fetchProducts(context: RequestContext, filters: ProductListFilters) {
    let request = this.client
      .from('products')
      .select(productSelect)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);

    if (!filters.includeArchived) request = request.neq('status', 'ARCHIVED');
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.categoryId) request = request.eq('category_id', filters.categoryId);
    if (filters.query) request = request.ilike('name', `%${filters.query}%`);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;

    const rows = (data ?? []) as ProductRow[];
    const branches = await this.fetchProductBranches(
      context,
      rows.map((row) => row.id),
      filters.branchId,
    );

    return rows
      .map((row) => toProduct(row, branches))
      .filter((product) => !filters.branchId || product.branchIds.includes(filters.branchId));
  }

  private async fetchProductBranches(
    context: RequestContext,
    productIds: readonly string[],
    branchId?: string,
  ) {
    if (productIds.length === 0) return [];
    let request = this.client
      .from('product_branches')
      .select(productBranchSelect)
      .eq('tenant_id', context.tenantId)
      .in('product_id', [...productIds]);
    if (branchId) request = request.eq('branch_id', branchId);

    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []) as ProductBranchRow[];
  }

  private async fetchCategoryBranches(
    context: RequestContext,
    categoryIds: readonly string[],
    branchId?: string,
  ) {
    if (categoryIds.length === 0) return [];
    let request = this.client
      .from('product_category_branches')
      .select(categoryBranchSelect)
      .eq('tenant_id', context.tenantId)
      .in('category_id', [...categoryIds]);
    if (branchId) request = request.eq('branch_id', branchId);

    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []) as CategoryBranchRow[];
  }

  private async fetchBalances(
    context: RequestContext,
    products: readonly Product[],
    branchId?: string,
  ) {
    const trackedProducts = products.filter((product) => product.stockTrackingPolicy === 'TRACKED');
    if (trackedProducts.length === 0) return [];

    let request = this.client
      .from('stock_movements')
      .select(movementBalanceSelect)
      .eq('tenant_id', context.tenantId)
      .in(
        'product_id',
        trackedProducts.map((product) => product.id),
      )
      .order('created_at', { ascending: true });
    request = applyBranchScope(request, context, branchId);

    const { data, error } = await request;
    if (error) throw error;

    return toStockBalances(
      (data ?? []) as MovementBalanceRow[],
      trackedProducts,
      context,
      branchId,
    );
  }

  private async fetchProductMovements(
    context: RequestContext,
    productId: string,
    branchId?: string,
  ) {
    const { SupabaseInventoryRepository } =
      await import('../../inventory/infrastructure/supabase-inventory-repository');
    return new SupabaseInventoryRepository(this.client).listMovements(context, {
      productId,
      branchId,
      limit: 50,
    });
  }

  private async fetchAlerts(
    context: RequestContext,
    productIds: readonly string[],
    branchId?: string,
  ) {
    if (productIds.length === 0) return [];
    let request = this.client
      .from('low_stock_alerts')
      .select(lowStockAlertSelect)
      .eq('tenant_id', context.tenantId)
      .in('product_id', [...productIds])
      .order('triggered_at', { ascending: false });
    request = applyBranchScope(request, context, branchId);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as LowStockAlertRow[]).map(toLowStockAlert);
  }

  private async replaceProductBranches(
    context: RequestContext,
    productId: string,
    branchIds: readonly string[],
  ) {
    const { error: deleteError } = await this.client
      .from('product_branches')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('product_id', productId);
    if (deleteError) throw deleteError;

    const { error: insertError } = await this.client.from('product_branches').insert(
      branchIds.map((branchId) => ({
        tenant_id: context.tenantId,
        product_id: productId,
        branch_id: branchId,
      })),
    );
    if (insertError) throw insertError;
  }

  private async replaceCategoryBranches(
    context: RequestContext,
    categoryId: string,
    branchIds: readonly string[],
  ) {
    const { error: deleteError } = await this.client
      .from('product_category_branches')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('category_id', categoryId);
    if (deleteError) throw deleteError;

    const { error: insertError } = await this.client.from('product_category_branches').insert(
      branchIds.map((branchId) => ({
        tenant_id: context.tenantId,
        category_id: categoryId,
        branch_id: branchId,
      })),
    );
    if (insertError) throw insertError;
  }
}

export function toProduct(row: ProductRow, branches: readonly ProductBranchRow[]): Product {
  return productSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchIds: branches
      .filter((branch) => branch.product_id === row.id)
      .map((branch) => branch.branch_id),
    categoryId: row.category_id ?? undefined,
    sku: row.sku ?? undefined,
    barcode: row.barcode ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    salePriceAmountCents: row.sale_price_amount_cents,
    costAmountCents: row.cost_amount_cents ?? undefined,
    stockTrackingPolicy: row.stock_tracking_policy,
    allowNegativeStock: row.allow_negative_stock,
    minimumStockQuantity: row.minimum_stock_quantity,
    supplierMetadata:
      row.supplier_metadata && Object.keys(row.supplier_metadata).length > 0
        ? row.supplier_metadata
        : undefined,
    archivedAt: row.archived_at ?? undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toProductCategory(
  row: ProductCategoryRow,
  branches: readonly CategoryBranchRow[],
): ProductCategory {
  return productCategorySchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchIds: branches
      .filter((branch) => branch.category_id === row.id)
      .map((branch) => branch.branch_id),
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    archivedAt: row.archived_at ?? undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toLowStockAlert(row: LowStockAlertRow): LowStockAlert {
  return lowStockAlertSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    productId: row.product_id,
    state: row.state,
    currentQuantity: row.current_quantity,
    minimumStockQuantity: row.minimum_stock_quantity,
    triggeredAt: toIsoDateTime(row.triggered_at),
    resolvedAt: row.resolved_at ? toIsoDateTime(row.resolved_at) : undefined,
  });
}

function toStockBalances(
  movements: readonly MovementBalanceRow[],
  products: readonly Product[],
  context: RequestContext,
  branchId?: string,
): StockBalance[] {
  const branchIds = branchId ? [branchId] : context.branchScope;
  const groups = new Map<string, MovementBalanceRow[]>();

  for (const movement of movements) {
    const key = `${movement.branch_id}:${movement.location_id ?? ''}:${movement.product_id}`;
    groups.set(key, [...(groups.get(key) ?? []), movement]);
  }

  const balances: StockBalance[] = [];
  for (const product of products) {
    for (const productBranchId of product.branchIds.filter((id) => branchIds.includes(id))) {
      const productGroups = [...groups.entries()].filter(([, rows]) => {
        const first = rows[0];
        return first?.product_id === product.id && first.branch_id === productBranchId;
      });

      if (productGroups.length === 0) {
        balances.push(makeStockBalance(context, product, productBranchId, undefined, []));
      } else {
        for (const [, rows] of productGroups) {
          balances.push(
            makeStockBalance(context, product, productBranchId, rows[0]?.location_id, rows),
          );
        }
      }
    }
  }

  return balances;
}

function makeStockBalance(
  context: RequestContext,
  product: Product,
  branchId: string,
  locationId: string | null | undefined,
  movements: readonly MovementBalanceRow[],
) {
  const currentQuantity = movements.reduce((total, movement) => total + movement.quantity, 0);
  const lastMovementAt = movements.at(-1)?.created_at;
  return stockBalanceSchema.parse({
    tenantId: context.tenantId,
    branchId,
    locationId: locationId ?? undefined,
    productId: product.id,
    currentQuantity,
    minimumStockQuantity: product.minimumStockQuantity,
    lowStock: currentQuantity <= product.minimumStockQuantity,
    lastMovementAt: lastMovementAt ? toIsoDateTime(lastMovementAt) : undefined,
    updatedAt: lastMovementAt ? toIsoDateTime(lastMovementAt) : new Date(0).toISOString(),
  });
}

function toProductInsertPayload(context: RequestContext, command: CreateProductCommand) {
  return {
    tenant_id: context.tenantId,
    category_id: command.categoryId ?? null,
    sku: command.sku ?? null,
    barcode: command.barcode ?? null,
    name: command.name,
    description: command.description ?? null,
    status: command.status ?? 'ACTIVE',
    sale_price_amount_cents: command.salePriceAmountCents,
    cost_amount_cents: command.costAmountCents ?? null,
    stock_tracking_policy: command.stockTrackingPolicy ?? 'TRACKED',
    allow_negative_stock: command.allowNegativeStock ?? false,
    minimum_stock_quantity: command.minimumStockQuantity ?? 0,
    supplier_metadata: command.supplierMetadata ?? {},
    created_by: context.userId,
    updated_by: context.userId,
  };
}

function toProductUpdatePayload(context: RequestContext, command: UpdateProductCommand) {
  const payload: Record<string, unknown> = {
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  };
  if (command.categoryId !== undefined) payload.category_id = command.categoryId;
  if (command.sku !== undefined) payload.sku = command.sku;
  if (command.barcode !== undefined) payload.barcode = command.barcode;
  if (command.name !== undefined) payload.name = command.name;
  if (command.description !== undefined) payload.description = command.description;
  if (command.status !== undefined) payload.status = command.status;
  if (command.salePriceAmountCents !== undefined)
    payload.sale_price_amount_cents = command.salePriceAmountCents;
  if (command.costAmountCents !== undefined) payload.cost_amount_cents = command.costAmountCents;
  if (command.stockTrackingPolicy !== undefined)
    payload.stock_tracking_policy = command.stockTrackingPolicy;
  if (command.allowNegativeStock !== undefined)
    payload.allow_negative_stock = command.allowNegativeStock;
  if (command.minimumStockQuantity !== undefined)
    payload.minimum_stock_quantity = command.minimumStockQuantity;
  if (command.supplierMetadata !== undefined) payload.supplier_metadata = command.supplierMetadata;
  return payload;
}

type BranchScopedQuery<Query> = {
  eq(column: string, value: unknown): Query;
  in(column: string, values: unknown[]): Query;
};

export function applyBranchScope<Query extends BranchScopedQuery<Query>>(
  request: Query,
  context: RequestContext,
  branchId?: string,
): Query {
  if (branchId) return request.eq('branch_id', branchId) as Query;
  if (context.branchScope.length === 1)
    return request.eq('branch_id', context.branchScope[0]) as Query;
  return request.in('branch_id', [...context.branchScope]) as Query;
}

export function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
