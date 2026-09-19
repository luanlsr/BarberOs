import { describe, expect, it } from 'vitest';
import type { Product, ProductCategory } from '@barberos/contracts';
import {
  assertCategoryAllowsActiveProduct,
  categoryAppliesToBranch,
  createProductSaleSnapshot,
  filterProductsForCatalogSearch,
  isProductVisibleForSale,
  productAppliesToBranch,
} from './index';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-a',
  tenantId: 'tenant-a',
  branchIds: ['branch-a'],
  categoryId: 'category-a',
  sku: 'POM-MATTE-80G',
  barcode: '7890000000001',
  name: 'Pomada Matte 80g',
  description: 'Finalizador de alta fixacao',
  status: 'ACTIVE',
  salePriceAmountCents: 4500,
  costAmountCents: 1800,
  stockTrackingPolicy: 'TRACKED',
  allowNegativeStock: false,
  minimumStockQuantity: 5,
  supplierMetadata: { supplierName: 'Barber Supply' },
  createdBy: 'user-a',
  updatedBy: 'user-a',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

const category = (overrides: Partial<ProductCategory> = {}): ProductCategory => ({
  id: 'category-a',
  tenantId: 'tenant-a',
  branchIds: ['branch-a'],
  name: 'Finalizadores',
  status: 'ACTIVE',
  createdBy: 'user-a',
  updatedBy: 'user-a',
  createdAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

describe('catalog domain helpers', () => {
  it('exposes only active non-archived products for new sale selection', () => {
    expect(isProductVisibleForSale(product())).toBe(true);
    expect(isProductVisibleForSale(product({ status: 'INACTIVE' }))).toBe(false);
    expect(
      isProductVisibleForSale(
        product({ status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' }),
      ),
    ).toBe(false);
  });

  it('checks branch applicability for products and categories', () => {
    const sharedProduct = product({ branchIds: ['branch-a', 'branch-b'] });
    const sharedCategory = category({ branchIds: ['branch-a', 'branch-b'] });

    expect(productAppliesToBranch(sharedProduct, 'branch-b')).toBe(true);
    expect(productAppliesToBranch(sharedProduct, 'branch-c')).toBe(false);
    expect(categoryAppliesToBranch(sharedCategory, 'branch-b')).toBe(true);
    expect(categoryAppliesToBranch(sharedCategory, 'branch-c')).toBe(false);
  });

  it('guards archived categories when assigning active products', () => {
    expect(() => assertCategoryAllowsActiveProduct(category())).not.toThrow();
    expect(() =>
      assertCategoryAllowsActiveProduct(
        category({ status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' }),
      ),
    ).toThrow(/archived product categories/i);
  });

  it('creates stable sale and cost snapshots from active products', () => {
    const snapshot = createProductSaleSnapshot(product(), {
      quantity: 2,
      discountAmountCents: 500,
    });

    expect(snapshot).toEqual({
      sourceType: 'PRODUCT',
      sourceId: 'product-a',
      nameSnapshot: 'Pomada Matte 80g',
      quantity: 2,
      unitPriceAmountCents: 4500,
      discountAmountCents: 500,
      finalAmountCents: 8500,
      costAmountCents: 1800,
    });
  });

  it('rejects invalid sale snapshots for unavailable products and invalid arithmetic', () => {
    expect(() => createProductSaleSnapshot(product({ status: 'INACTIVE' }))).toThrow(
      /active products/i,
    );
    expect(() => createProductSaleSnapshot(product(), { quantity: 0 })).toThrow(/quantity/i);
    expect(() => createProductSaleSnapshot(product(), { discountAmountCents: 5000 })).toThrow(
      /discount/i,
    );
  });

  it('filters catalog search by tenant, branch, category, status and normalized text', () => {
    const products = [
      product(),
      product({
        id: 'product-b',
        name: 'Shampoo para Barba',
        sku: 'SHM-BARBA-120ML',
        branchIds: ['branch-b'],
      }),
      product({ id: 'product-c', tenantId: 'tenant-b', name: 'Produto de outro tenant' }),
      product({ id: 'product-d', status: 'ARCHIVED', archivedAt: '2026-09-08T10:00:00.000Z' }),
    ];

    expect(
      filterProductsForCatalogSearch(products, {
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        categoryId: 'category-a',
        status: 'ACTIVE',
        query: 'pomada',
      }).map((item) => item.id),
    ).toEqual(['product-a']);

    expect(
      filterProductsForCatalogSearch(products, {
        tenantId: 'tenant-a',
        branchId: 'branch-b',
        query: 'barba',
      }).map((item) => item.id),
    ).toEqual(['product-b']);

    expect(
      filterProductsForCatalogSearch(products, {
        tenantId: 'tenant-a',
        includeArchived: true,
      }).map((item) => item.id),
    ).toEqual(['product-a', 'product-b', 'product-d']);
  });
});
