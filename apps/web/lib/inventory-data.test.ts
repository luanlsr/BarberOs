import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentInventoryViewModel } from './inventory-data';

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

function action(model: ReturnType<typeof getDevelopmentInventoryViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Inventory data loading layer', () => {
  test('builds normal, low-stock and zero-stock balance rows with movement labels', () => {
    const model = getDevelopmentInventoryViewModel(inventorySession());

    expect(model.state).toBe('ready');
    expect(model.summary).toEqual({
      trackedProductCount: 3,
      lowStockCount: 2,
      zeroStockCount: 1,
    });
    expect(model.balances.map((item) => item.productName)).toEqual([
      'Pomada Matte 80g',
      'Coca-Cola lata',
      'Lamina Derby',
    ]);
    expect(model.balances[0]).toMatchObject({
      quantityLabel: '18 un. (min. 5)',
      tone: 'success',
      supplierName: 'Barber Supply',
      canAdjust: true,
    });
    expect(model.balances[1]).toMatchObject({ lowStock: true, tone: 'warning' });
    expect(model.balances[2]).toMatchObject({ zeroStock: true, tone: 'danger' });
    expect(model.lowStockAlerts.map((item) => item.productName)).toEqual([
      'Coca-Cola lata',
      'Lamina Derby',
    ]);
    expect(model.movements.map((item) => item.typeLabel)).toEqual(['Entrada', 'Venda', 'Perda']);
    expect(action(model, 'inventory.record-entry').enabled).toBe(true);
    expect(action(model, 'inventory.adjust-stock').enabled).toBe(true);
  });

  test('builds restocked state with resolved low-stock alerts', () => {
    const model = getDevelopmentInventoryViewModel(inventorySession(), { state: 'restocked' });

    expect(model.state).toBe('ready');
    expect(model.description).toContain('alertas de estoque baixo resolvidos');
    expect(model.summary).toEqual({
      trackedProductCount: 3,
      lowStockCount: 0,
      zeroStockCount: 0,
    });
    expect(model.lowStockAlerts).toEqual([]);
    expect(model.balances.find((item) => item.productName === 'Coca-Cola lata')).toMatchObject({
      currentQuantity: 20,
      lowStock: false,
      quantityLabel: '20 un. (min. 12)',
      tone: 'success',
    });
    expect(model.movements[0]).toMatchObject({
      productName: 'Coca-Cola lata',
      typeLabel: 'Entrada',
      quantityLabel: '+16',
      reason: 'Entrada de reposicao',
    });
  });
  test('filters balances by branch scope', () => {
    const model = getDevelopmentInventoryViewModel(inventorySession(), {
      branchId: 'dev-branch-north',
    });

    expect(model.branchName).toBe('Unidade Norte');
    expect(model.balances.map((item) => item.productName)).toEqual(['Pomada Matte 80g']);
    expect(model.summary).toEqual({
      trackedProductCount: 1,
      lowStockCount: 0,
      zeroStockCount: 0,
    });
  });

  test('builds empty state with write actions blocked except refresh', () => {
    const model = getDevelopmentInventoryViewModel(inventorySession(), { state: 'empty' });

    expect(model.state).toBe('empty');
    expect(model.balances).toEqual([]);
    expect(model.lowStockAlerts).toEqual([]);
    expect(model.movements).toEqual([]);
    expect(action(model, 'inventory.record-entry')).toMatchObject({
      enabled: false,
      reason: undefined,
    });
    expect(action(model, 'inventory.adjust-stock')).toMatchObject({
      enabled: false,
      reason: 'Nenhum produto com saldo.',
    });
  });

  test('builds error and offline states with movement mutations disabled', () => {
    const error = getDevelopmentInventoryViewModel(inventorySession(), { state: 'error' });
    expect(error.state).toBe('error');
    expect(error.error).toEqual({
      code: 'INVENTORY_VALIDATION_ERROR',
      message: 'Estoque local indisponivel.',
      requestId: 'local-inventory-error',
    });
    expect(action(error, 'inventory.record-entry')).toMatchObject({
      enabled: false,
      reason: 'Recarregue o estoque antes de executar esta acao.',
    });

    const offline = getDevelopmentInventoryViewModel(inventorySession(), { state: 'offline' });
    expect(offline.state).toBe('offline');
    expect(offline.balances.length).toBeGreaterThan(0);
    expect(action(offline, 'inventory.record-loss')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexao voltar.',
    });
  });

  test('communicates permission denied without exposing inventory records', () => {
    const model = getDevelopmentInventoryViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.balances).toEqual([]);
    expect(model.lowStockAlerts).toEqual([]);
    expect(model.movements).toEqual([]);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
  });
});
