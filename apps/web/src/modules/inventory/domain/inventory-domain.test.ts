import { describe, expect, it } from 'vitest';
import type { StockMovement } from '@barberos/contracts';
import {
  assertSufficientStock,
  evaluateLowStock,
  isLowStockQuantity,
  projectStockBalance,
  signedQuantityForStockMovement,
} from './index';

const movement = (quantity: number): Pick<StockMovement, 'quantity'> => ({ quantity });

describe('inventory domain helpers', () => {
  it('normalizes signed quantities by movement type', () => {
    expect(signedQuantityForStockMovement('ENTRY', 3)).toBe(3);
    expect(signedQuantityForStockMovement('ENTRY', -3)).toBe(3);
    expect(signedQuantityForStockMovement('TRANSFER_IN', 2)).toBe(2);
    expect(signedQuantityForStockMovement('SALE', 2)).toBe(-2);
    expect(signedQuantityForStockMovement('LOSS', -1)).toBe(-1);
    expect(signedQuantityForStockMovement('CONSUMPTION', 4)).toBe(-4);
    expect(signedQuantityForStockMovement('TRANSFER_OUT', -5)).toBe(-5);
    expect(signedQuantityForStockMovement('ADJUSTMENT', -7)).toBe(-7);
    expect(signedQuantityForStockMovement('ADJUSTMENT', 6)).toBe(6);
  });

  it('rejects non-integer and zero movement quantities', () => {
    expect(() => signedQuantityForStockMovement('ENTRY', 0)).toThrow(/zero/i);
    expect(() => signedQuantityForStockMovement('SALE', 1.5)).toThrow(/integer/i);
  });

  it('projects balances through immutable movement quantities', () => {
    expect(
      projectStockBalance({
        startingQuantity: 10,
        movements: [movement(5), movement(-3), movement(-2)],
      }),
    ).toBe(10);
    expect(projectStockBalance({ movements: [movement(4), movement(-9)] })).toBe(-5);
  });

  it('evaluates low stock at or below the configured minimum', () => {
    expect(isLowStockQuantity(5, 5)).toBe(true);
    expect(isLowStockQuantity(4, 5)).toBe(true);
    expect(isLowStockQuantity(6, 5)).toBe(false);
    expect(evaluateLowStock({ currentQuantity: 0, minimumStockQuantity: 0 })).toBe(true);
  });

  it('enforces insufficient-stock policy unless negative stock is allowed', () => {
    expect(
      assertSufficientStock({ currentQuantity: 3, quantityToRemove: 2, allowNegativeStock: false }),
    ).toBe(1);
    expect(() =>
      assertSufficientStock({ currentQuantity: 1, quantityToRemove: 2, allowNegativeStock: false }),
    ).toThrow(/insufficient stock/i);
    expect(
      assertSufficientStock({ currentQuantity: 1, quantityToRemove: 2, allowNegativeStock: true }),
    ).toBe(-1);
  });

  it('rejects invalid stock removal quantities', () => {
    expect(() =>
      assertSufficientStock({ currentQuantity: 1, quantityToRemove: 0, allowNegativeStock: true }),
    ).toThrow(/positive integer/i);
    expect(() =>
      assertSufficientStock({
        currentQuantity: 1,
        quantityToRemove: 1.2,
        allowNegativeStock: true,
      }),
    ).toThrow(/integer/i);
  });
});
