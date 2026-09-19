import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentProductPickerViewModel } from './product-picker-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function pickerSession(overrides: Partial<SessionContext> = {}) {
  return sessionWith({
    permissions: [...developmentSession.permissions, 'inventory.read', 'inventory.write'],
    entitlements: [...(developmentSession.entitlements ?? []), 'inventory'],
    ...overrides,
  });
}

describe('Product picker data loading layer', () => {
  test('builds active products, favorites and common product groups for Comanda selection', () => {
    const model = getDevelopmentProductPickerViewModel(pickerSession());

    expect(model.state).toBe('ready');
    expect(model.canSelectProducts).toBe(true);
    expect(model.categories.map((category) => category.name)).toEqual(['Finalizadores', 'Bebidas']);
    expect(model.commonProducts.map((product) => product.name)).toEqual([
      'Pomada Matte 80g',
      'Coca-Cola lata',
    ]);
    expect(model.products[0]).toMatchObject({
      name: 'Pomada Matte 80g',
      available: true,
      favorite: true,
      unitPriceLabel: 'R$ 45,00',
      stockLabel: '18 disponiveis',
      stockTone: 'success',
    });
  });

  test('keeps inactive and branch-unavailable products visible with disabled reasons', () => {
    const model = getDevelopmentProductPickerViewModel(pickerSession());

    expect(
      model.products.find((product) => product.productId === 'dev-product-inactive'),
    ).toMatchObject({
      available: false,
      disabledReason: 'Produto inativo no catalogo.',
    });
    expect(
      model.products.find((product) => product.productId === 'dev-product-branch-unavailable'),
    ).toMatchObject({
      available: false,
      disabledReason: 'Produto indisponivel nesta unidade.',
      stockLabel: 'Sem saldo nesta unidade',
    });
  });

  test('filters products by category and search', () => {
    const byCategory = getDevelopmentProductPickerViewModel(pickerSession(), {
      categoryId: 'dev-product-category-beverages',
    });
    expect(byCategory.products.map((product) => product.name)).toEqual(['Coca-Cola lata']);

    const bySearch = getDevelopmentProductPickerViewModel(pickerSession(), { search: 'pomada' });
    expect(bySearch.products.map((product) => product.name)).toEqual(['Pomada Matte 80g']);
  });

  test('blocks selection without inventory catalog permission or while offline', () => {
    const denied = getDevelopmentProductPickerViewModel(
      sessionWith({
        permissions: ['orders.item.add'],
        entitlements: ['core.operations'],
      }),
    );
    expect(denied.state).toBe('permission-denied');
    expect(denied.products).toEqual([]);

    const offline = getDevelopmentProductPickerViewModel(pickerSession(), { state: 'offline' });
    expect(offline.state).toBe('offline');
    expect(offline.products).toEqual([]);
    expect(offline.description).toContain('offline');
  });
});
