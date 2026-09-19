import type { SupabaseClient } from '@supabase/supabase-js';
import {
  inventoryLocationSchema,
  lowStockAlertSchema,
  stockBalanceSchema,
  stockMovementSchema,
  type InventoryLocation,
  type LowStockAlert,
  type Product,
  type RequestContext,
  type StockBalance,
  type StockMovement,
} from '@barberos/contracts';

import { signedQuantityForStockMovement, type InventoryRepository } from '../domain';
import type {
  InventoryLocationFilters,
  LowStockAlertFilters,
  StockBalanceFilters,
  StockMovementFilters,
  StockTransferResult,
} from '../domain';
import {
  applyBranchScope,
  toIsoDateTime,
} from '../../catalog/infrastructure/supabase-catalog-repository';

const locationSelect =
  'id, tenant_id, branch_id, name, description, active, created_by, updated_by, created_at, updated_at';
const movementSelect =
  'id, tenant_id, branch_id, location_id, product_id, type, quantity, balance_after_quantity, source_type, source_id, order_id, order_item_id, payment_id, idempotency_key, reason, created_by, created_at';
const productSelect = 'id, tenant_id, stock_tracking_policy, minimum_stock_quantity';
const lowStockAlertSelect =
  'id, tenant_id, branch_id, product_id, state, current_quantity, minimum_stock_quantity, triggered_at, resolved_at';

export type InventoryLocationRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  description?: string | null;
  active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type StockMovementRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  location_id?: string | null;
  product_id: string;
  type: StockMovement['type'];
  quantity: number;
  balance_after_quantity?: number | null;
  source_type: StockMovement['sourceType'];
  source_id?: string | null;
  order_id?: string | null;
  order_item_id?: string | null;
  payment_id?: string | null;
  idempotency_key?: string | null;
  reason?: string | null;
  created_by?: string | null;
  created_at: string;
};

type ProductStockRow = {
  id: string;
  tenant_id: string;
  stock_tracking_policy: Product['stockTrackingPolicy'];
  minimum_stock_quantity: number;
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

export class SupabaseInventoryRepository implements InventoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listLocations(context: RequestContext, filters: InventoryLocationFilters = {}) {
    let request = this.client
      .from('inventory_locations')
      .select(locationSelect)
      .eq('tenant_id', context.tenantId)
      .order('name', { ascending: true });
    request = applyBranchScope(request, context, filters.branchId);
    if (filters.active !== undefined) request = request.eq('active', filters.active);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as InventoryLocationRow[]).map(toInventoryLocation);
  }

  async listBalances(context: RequestContext, filters: StockBalanceFilters = {}) {
    const [products, movements] = await Promise.all([
      this.fetchTrackedProducts(context, filters),
      this.listMovements(context, filters),
    ]);
    const balances = toStockBalances(context, products, movements, filters);
    return filters.lowStockOnly ? balances.filter((balance) => balance.lowStock) : balances;
  }

  async listMovements(context: RequestContext, filters: StockMovementFilters = {}) {
    let request = this.client
      .from('stock_movements')
      .select(movementSelect)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);
    request = applyBranchScope(request, context, filters.branchId);
    if (filters.productId) request = request.eq('product_id', filters.productId);
    if (filters.locationId) request = request.eq('location_id', filters.locationId);
    if (filters.type) request = request.eq('type', filters.type);
    if (filters.sourceType) request = request.eq('source_type', filters.sourceType);
    if (filters.sourceId) request = request.eq('source_id', filters.sourceId);
    if (filters.orderId) request = request.eq('order_id', filters.orderId);
    if (filters.paymentId) request = request.eq('payment_id', filters.paymentId);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as StockMovementRow[]).map(toStockMovement);
  }

  async listLowStockAlerts(context: RequestContext, filters: LowStockAlertFilters = {}) {
    let request = this.client
      .from('low_stock_alerts')
      .select(lowStockAlertSelect)
      .eq('tenant_id', context.tenantId)
      .order('triggered_at', { ascending: false })
      .limit(filters.limit ?? 100);
    request = applyBranchScope(request, context, filters.branchId);
    if (filters.productId) request = request.eq('product_id', filters.productId);
    if (filters.state) request = request.eq('state', filters.state);
    if (filters.cursor) request = request.lt('triggered_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as LowStockAlertRow[]).map(toInventoryLowStockAlert);
  }

  async findMovementById(context: RequestContext, movementId: string) {
    const { data, error } = await this.client
      .from('stock_movements')
      .select(movementSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', movementId)
      .maybeSingle();

    if (error) throw error;
    return data ? toStockMovement(data as StockMovementRow) : null;
  }

  async findMovementByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('stock_movements')
      .select(movementSelect)
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data ? toStockMovement(data as StockMovementRow) : null;
  }

  async recordStockEntry(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockEntry']>[1],
  ) {
    return this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.locationId,
      productId: command.productId,
      type: 'ENTRY',
      quantity: command.quantity,
      sourceType: 'MANUAL',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
  }

  async recordStockSaleEffect(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockSaleEffect']>[1],
  ) {
    return this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.locationId,
      productId: command.productId,
      type: 'SALE',
      quantity: command.quantity,
      sourceType: 'ORDER_ITEM',
      sourceId: command.orderItemId,
      orderId: command.orderId,
      orderItemId: command.orderItemId,
      paymentId: command.paymentId,
      idempotencyKey: command.idempotencyKey,
    });
  }

  async recordStockLoss(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockLoss']>[1],
  ) {
    return this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.locationId,
      productId: command.productId,
      type: 'LOSS',
      quantity: command.quantity,
      sourceType: 'MANUAL',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
  }

  async recordStockConsumption(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockConsumption']>[1],
  ) {
    return this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.locationId,
      productId: command.productId,
      type: 'CONSUMPTION',
      quantity: command.quantity,
      sourceType: 'MANUAL',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
  }

  async recordStockAdjustment(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockAdjustment']>[1],
  ) {
    return this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.locationId,
      productId: command.productId,
      type: 'ADJUSTMENT',
      quantity: command.quantity,
      sourceType: 'MANUAL',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
  }

  async recordStockTransfer(
    context: RequestContext,
    command: Parameters<InventoryRepository['recordStockTransfer']>[1],
  ): Promise<StockTransferResult> {
    const transferOut = await this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.fromLocationId,
      productId: command.productId,
      type: 'TRANSFER_OUT',
      quantity: -command.quantity,
      sourceType: 'TRANSFER',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
    const transferIn = await this.insertMovement(context, {
      branchId: command.branchId,
      locationId: command.toLocationId,
      productId: command.productId,
      type: 'TRANSFER_IN',
      quantity: command.quantity,
      sourceType: 'TRANSFER',
      sourceId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey,
      reason: command.reason,
    });
    return { transferOut, transferIn };
  }

  private async insertMovement(
    context: RequestContext,
    input: {
      branchId: string;
      locationId?: string;
      productId: string;
      type: StockMovement['type'];
      quantity: number;
      sourceType: StockMovement['sourceType'];
      sourceId?: string;
      orderId?: string;
      orderItemId?: string;
      paymentId?: string;
      idempotencyKey?: string;
      reason?: string;
    },
  ) {
    const signedQuantity = signedQuantityForStockMovement(input.type, input.quantity);
    const currentQuantity = await this.currentQuantity(context, {
      branchId: input.branchId,
      locationId: input.locationId,
      productId: input.productId,
    });

    const { data, error } = await this.client
      .from('stock_movements')
      .insert({
        tenant_id: context.tenantId,
        branch_id: input.branchId,
        location_id: input.locationId ?? null,
        product_id: input.productId,
        type: input.type,
        quantity: signedQuantity,
        balance_after_quantity: currentQuantity + signedQuantity,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        order_id: input.orderId ?? null,
        order_item_id: input.orderItemId ?? null,
        payment_id: input.paymentId ?? null,
        idempotency_key: input.idempotencyKey ?? null,
        reason: input.reason ?? null,
        created_by: context.userId,
      })
      .select(movementSelect)
      .single();

    if (error) throw error;
    return toStockMovement(data as StockMovementRow);
  }

  private async currentQuantity(
    context: RequestContext,
    filters: { branchId: string; productId: string; locationId?: string },
  ) {
    let request = this.client
      .from('stock_movements')
      .select('quantity')
      .eq('tenant_id', context.tenantId)
      .eq('branch_id', filters.branchId)
      .eq('product_id', filters.productId);
    if (filters.locationId) request = request.eq('location_id', filters.locationId);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as Array<{ quantity: number }>).reduce(
      (total, row) => total + row.quantity,
      0,
    );
  }

  private async fetchTrackedProducts(context: RequestContext, filters: StockBalanceFilters) {
    let request = this.client
      .from('products')
      .select(productSelect)
      .eq('tenant_id', context.tenantId)
      .eq('stock_tracking_policy', 'TRACKED')
      .neq('status', 'ARCHIVED');
    if (filters.productId) request = request.eq('id', filters.productId);

    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []) as ProductStockRow[];
  }
}

export function toInventoryLocation(row: InventoryLocationRow): InventoryLocation {
  return inventoryLocationSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    name: row.name,
    description: row.description ?? undefined,
    active: row.active,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toStockMovement(row: StockMovementRow): StockMovement {
  return stockMovementSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    locationId: row.location_id ?? undefined,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    balanceAfterQuantity: row.balance_after_quantity ?? undefined,
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    orderId: row.order_id ?? undefined,
    orderItemId: row.order_item_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    reason: row.reason ?? undefined,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
  });
}

export function toInventoryLowStockAlert(row: LowStockAlertRow): LowStockAlert {
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

export function toStockBalances(
  context: RequestContext,
  products: readonly ProductStockRow[],
  movements: readonly StockMovement[],
  filters: StockBalanceFilters,
): StockBalance[] {
  return products.flatMap((product) => {
    const scopedMovements = movements.filter((movement) => movement.productId === product.id);
    const grouped = new Map<string, StockMovement[]>();
    for (const movement of scopedMovements) {
      const key = `${movement.branchId}:${movement.locationId ?? ''}`;
      grouped.set(key, [...(grouped.get(key) ?? []), movement]);
    }

    const explicitBranchIds = filters.branchId ? [filters.branchId] : context.branchScope;
    for (const branchId of explicitBranchIds) {
      const hasBranchGroup = [...grouped.keys()].some((key) => key.startsWith(`${branchId}:`));
      if (!hasBranchGroup) grouped.set(`${branchId}:${filters.locationId ?? ''}`, []);
    }

    return [...grouped.entries()]
      .filter(([key]) => {
        const [branchId, locationId] = key.split(':');
        if (filters.branchId && branchId !== filters.branchId) return false;
        if (filters.locationId && locationId !== filters.locationId) return false;
        return true;
      })
      .map(([key, rows]) => {
        const [branchId, locationId] = key.split(':');
        const currentQuantity = rows.reduce((total, movement) => total + movement.quantity, 0);
        const lastMovementAt = rows[0]?.createdAt;
        return stockBalanceSchema.parse({
          tenantId: context.tenantId,
          branchId,
          locationId: locationId || undefined,
          productId: product.id,
          currentQuantity,
          minimumStockQuantity: product.minimum_stock_quantity,
          lowStock: currentQuantity <= product.minimum_stock_quantity,
          lastMovementAt,
          updatedAt: lastMovementAt ?? new Date(0).toISOString(),
        });
      });
  });
}
