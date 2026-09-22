import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentProductsViewModel } from './product-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function inventorySession(overrides: Partial<SessionContext> = {}) {
  return sessionWith({
    permissions: [...developmentSession.permissions, 'inventory.read', 'inventory.write'],
    entitlements: [...(developmentSession.entitlements ?? []), 'inventory'],
    ...overrides,
  });
}

function action(model: ReturnType<typeof getDevelopmentProductsViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Products data loading layer', () => {
  test('builds populated products with categories, pricing, supplier and stock state', () => {
    const model = getDevelopmentProductsViewModel(inventorySession());

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.canWrite).toBe(true);
    expect(model.categories.map((category) => category.name)).toEqual(['Finalizadores', 'Bebidas']);
    expect(model.statusFilters.find((filter) => filter.status === 'ACTIVE')).toMatchObject({
      label: 'Ativo',
      count: 2,
      tone: 'success',
    });
    expect(model.products.map((product) => product.name)).toEqual([
      'Pomada Matte 80g',
      'Coca-Cola lata',
      'Kit presente barba',
    ]);
    expect(model.products[0]).toMatchObject({
      categoryName: 'Finalizadores',
      status: 'ACTIVE',
      salePriceLabel: 'R$ 45,00',
      costLabel: 'R$ 18,00',
      grossMarginLabel: 'R$ 27,00',
      supplierName: 'Barber Supply',
      stockTrackingLabel: 'Controla estoque',
      stockLabel: '18 un. (min. 5)',
      stockTone: 'success',
      canEdit: true,
      canArchive: true,
      canAdjustStock: true,
    });
    expect(model.products[1]).toMatchObject({
      lowStock: true,
      stockTone: 'danger',
      stockLabel: '4 un. (min. 12)',
    });
    expect(model.products[2]).toMatchObject({
      status: 'INACTIVE',
      stockTrackingLabel: 'Sem controle de estoque',
      canAdjustStock: false,
    });
    expect(action(model, 'products.create').enabled).toBe(true);
    expect(action(model, 'products.adjust-stock').enabled).toBe(true);
  });

  test('filters products by status, category and search', () => {
    const byStatus = getDevelopmentProductsViewModel(inventorySession(), { status: 'INACTIVE' });
    expect(byStatus.products.map((product) => product.name)).toEqual(['Kit presente barba']);

    const byCategory = getDevelopmentProductsViewModel(inventorySession(), {
      categoryId: 'dev-product-category-beverages',
    });
    expect(byCategory.products.map((product) => product.name)).toEqual(['Coca-Cola lata']);

    const bySearch = getDevelopmentProductsViewModel(inventorySession(), { search: 'pomada' });
    expect(bySearch.products.map((product) => product.name)).toEqual(['Pomada Matte 80g']);
  });

  test('builds an empty state with product creation still available', () => {
    const model = getDevelopmentProductsViewModel(inventorySession(), { state: 'empty' });

    expect(model.state).toBe('empty');
    expect(model.products).toEqual([]);
    expect(model.categories).toEqual([]);
    expect(action(model, 'products.create').enabled).toBe(true);
    expect(action(model, 'products.edit-selected')).toMatchObject({
      enabled: false,
      reason: 'Nenhum produto editavel selecionado.',
    });
  });

  test('builds error and offline states with mutation actions disabled', () => {
    const error = getDevelopmentProductsViewModel(inventorySession(), { state: 'error' });
    expect(error.state).toBe('error');
    expect(error.error).toEqual({
      code: 'CATALOG_VALIDATION_ERROR',
      message: 'Produtos locais indisponíveis.',
      requestId: 'local-products-error',
    });
    expect(action(error, 'products.refresh').enabled).toBe(true);
    expect(action(error, 'products.create')).toMatchObject({
      enabled: false,
      reason: 'Recarregue produtos antes de executar esta ação.',
    });

    const offline = getDevelopmentProductsViewModel(inventorySession(), { state: 'offline' });
    expect(offline.state).toBe('offline');
    expect(action(offline, 'products.create')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexão voltar.',
    });
  });

  test('communicates permission denied without exposing products or categories', () => {
    const model = getDevelopmentProductsViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.products).toEqual([]);
    expect(model.categories).toEqual([]);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
    expect(action(model, 'products.refresh').reason).toBe(
      'Sem permissão para visualizar produtos.',
    );
  });
});
