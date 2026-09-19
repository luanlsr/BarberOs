import type { SupabaseClient } from '@supabase/supabase-js';
import { productSchema, type Product, type RequestContext } from '@barberos/contracts';

import type { OrderProductCatalog } from '../application/order-service';

const productSelect =
  'id, tenant_id, category_id, sku, barcode, name, description, status, sale_price_amount_cents, cost_amount_cents, stock_tracking_policy, allow_negative_stock, minimum_stock_quantity, supplier_metadata, archived_at, created_by, updated_by, created_at, updated_at';

type ProductRow = {
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

type ProductBranchRow = {
  branch_id: string;
};

export class SupabaseOrderProductCatalog implements OrderProductCatalog {
  constructor(private readonly client: SupabaseClient) {}

  async findProductForSale(context: RequestContext, productId: string, branchId: string) {
    const { data: product, error: productError } = await this.client
      .from('products')
      .select(productSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', productId)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) return null;

    const { data: branches, error: branchError } = await this.client
      .from('product_branches')
      .select('branch_id')
      .eq('tenant_id', context.tenantId)
      .eq('product_id', productId)
      .eq('branch_id', branchId);

    if (branchError) throw branchError;

    return toProduct(product as ProductRow, (branches ?? []) as ProductBranchRow[]);
  }
}

function toProduct(row: ProductRow, branches: readonly ProductBranchRow[]): Product {
  return productSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchIds: branches.map((branch) => branch.branch_id),
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
    supplierMetadata: row.supplier_metadata ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
