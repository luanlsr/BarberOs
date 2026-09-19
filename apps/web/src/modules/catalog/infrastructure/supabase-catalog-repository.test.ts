import { describe, expect, it } from 'vitest';

import { toLowStockAlert, toProduct, toProductCategory } from './supabase-catalog-repository';

describe('SupabaseCatalogRepository mapping', () => {
  it('maps product rows with branch availability into contract-safe records', () => {
    expect(
      toProduct(
        {
          id: 'product-1',
          tenant_id: 'tenant-1',
          category_id: 'category-1',
          sku: 'POM-80',
          barcode: '7890000000001',
          name: 'Pomada Matte 80g',
          description: null,
          status: 'ACTIVE',
          sale_price_amount_cents: 4500,
          cost_amount_cents: 1800,
          stock_tracking_policy: 'TRACKED',
          allow_negative_stock: false,
          minimum_stock_quantity: 5,
          supplier_metadata: { supplierName: 'Barber Supply' },
          archived_at: null,
          created_by: 'user-1',
          updated_by: 'user-2',
          created_at: '2026-09-07T09:00:00Z',
          updated_at: '2026-09-07T10:00:00Z',
        },
        [
          { product_id: 'product-1', branch_id: 'branch-1' },
          { product_id: 'product-1', branch_id: 'branch-2' },
          { product_id: 'product-2', branch_id: 'branch-3' },
        ],
      ),
    ).toMatchObject({
      id: 'product-1',
      tenantId: 'tenant-1',
      branchIds: ['branch-1', 'branch-2'],
      categoryId: 'category-1',
      salePriceAmountCents: 4500,
      costAmountCents: 1800,
      stockTrackingPolicy: 'TRACKED',
      supplierMetadata: { supplierName: 'Barber Supply' },
    });
  });

  it('maps category rows and low-stock alerts without leaking snake_case', () => {
    expect(
      toProductCategory(
        {
          id: 'category-1',
          tenant_id: 'tenant-1',
          name: 'Finalizadores',
          description: 'Produtos de finalizacao',
          status: 'ACTIVE',
          archived_at: null,
          created_by: 'user-1',
          updated_by: null,
          created_at: '2026-09-07T09:00:00Z',
          updated_at: '2026-09-07T10:00:00Z',
        },
        [
          { category_id: 'category-1', branch_id: 'branch-1' },
          { category_id: 'category-2', branch_id: 'branch-2' },
        ],
      ),
    ).toMatchObject({
      id: 'category-1',
      tenantId: 'tenant-1',
      branchIds: ['branch-1'],
      name: 'Finalizadores',
      updatedBy: 'system',
    });

    expect(
      toLowStockAlert({
        id: 'alert-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        product_id: 'product-1',
        state: 'ACTIVE',
        current_quantity: 3,
        minimum_stock_quantity: 5,
        triggered_at: '2026-09-07T09:00:00Z',
        resolved_at: null,
      }),
    ).toMatchObject({
      id: 'alert-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      productId: 'product-1',
      currentQuantity: 3,
      minimumStockQuantity: 5,
    });
  });
});
