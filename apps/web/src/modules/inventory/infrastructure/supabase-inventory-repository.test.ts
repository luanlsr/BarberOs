import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';

import {
  toInventoryLocation,
  toInventoryLowStockAlert,
  toStockBalances,
  toStockMovement,
} from './supabase-inventory-repository';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['inventory.read', 'inventory.write'],
  entitlements: ['inventory'],
  branchScope: ['branch-1', 'branch-2'],
};

describe('SupabaseInventoryRepository mapping', () => {
  it('maps locations, movements and alerts into contract-safe records', () => {
    expect(
      toInventoryLocation({
        id: 'location-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        name: 'Vitrine',
        description: null,
        active: true,
        created_by: 'user-1',
        updated_by: null,
        created_at: '2026-09-07T09:00:00Z',
        updated_at: '2026-09-07T10:00:00Z',
      }),
    ).toMatchObject({
      id: 'location-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      active: true,
      updatedBy: 'system',
    });

    expect(
      toStockMovement({
        id: 'movement-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        location_id: 'location-1',
        product_id: 'product-1',
        type: 'SALE',
        quantity: -2,
        balance_after_quantity: 5,
        source_type: 'ORDER_ITEM',
        source_id: 'order-item-1',
        order_id: 'order-1',
        order_item_id: 'order-item-1',
        payment_id: 'payment-1',
        idempotency_key: 'stock-sale-1',
        reason: null,
        created_by: 'user-1',
        created_at: '2026-09-07T11:00:00Z',
      }),
    ).toMatchObject({
      id: 'movement-1',
      type: 'SALE',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
    });

    expect(
      toInventoryLowStockAlert({
        id: 'alert-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        product_id: 'product-1',
        state: 'RESOLVED',
        current_quantity: 8,
        minimum_stock_quantity: 5,
        triggered_at: '2026-09-07T09:00:00Z',
        resolved_at: '2026-09-07T12:00:00Z',
      }),
    ).toMatchObject({
      state: 'RESOLVED',
      resolvedAt: '2026-09-07T12:00:00.000Z',
    });
  });

  it('projects branch-scoped stock balances from immutable movements', () => {
    const balances = toStockBalances(
      context,
      [
        {
          id: 'product-1',
          tenant_id: 'tenant-1',
          stock_tracking_policy: 'TRACKED',
          minimum_stock_quantity: 5,
        },
      ],
      [
        {
          id: 'movement-entry',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          productId: 'product-1',
          type: 'ENTRY',
          quantity: 7,
          sourceType: 'MANUAL',
          createdBy: 'user-1',
          createdAt: '2026-09-07T09:00:00.000Z',
        },
        {
          id: 'movement-sale',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          productId: 'product-1',
          type: 'SALE',
          quantity: -2,
          sourceType: 'ORDER_ITEM',
          createdBy: 'user-1',
          createdAt: '2026-09-07T10:00:00.000Z',
        },
      ],
      { branchId: 'branch-1' },
    );

    expect(balances).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        productId: 'product-1',
        currentQuantity: 5,
        minimumStockQuantity: 5,
        lowStock: true,
      }),
    ]);
  });
});
