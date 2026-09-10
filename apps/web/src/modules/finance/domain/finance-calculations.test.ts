import { describe, expect, it } from 'vitest';
import type { FinancialEntry } from '@barberos/contracts';
import {
  calculateFinancialEntryTotals,
  createFinancialEntryReversal,
  duplicatePostedFinancialEntrySourceKeys,
  filterFinancialEntriesByPeriod,
  financialEntryMatchesPeriod,
  financialEntrySourceKey,
  signedAmountForDirection,
} from './index';

const entry = (overrides: Partial<FinancialEntry> = {}): FinancialEntry => ({
  id: 'entry-a',
  tenantId: 'tenant-a',
  branchId: 'branch-a',
  direction: 'IN',
  type: 'SERVICE_REVENUE',
  status: 'POSTED',
  amountCents: 10_000,
  signedAmountCents: 10_000,
  competenceDate: '2026-09-07',
  cashDate: '2026-09-07',
  sourceType: 'PAYMENT',
  sourceId: 'payment-a',
  createdBy: 'user-a',
  createdAt: '2026-09-07T15:00:00.000Z',
  ...overrides,
});

describe('finance domain helpers', () => {
  it('derives signed amounts from entry direction using exact cents', () => {
    expect(signedAmountForDirection('IN', 3333)).toBe(3333);
    expect(signedAmountForDirection('OUT', 3333)).toBe(-3333);
    expect(() => signedAmountForDirection('OUT', 0)).toThrow(/positive integer/);
  });

  it('filters entries by competence or cash period without timezone math', () => {
    const entries = [
      entry({ id: 'entry-in', competenceDate: '2026-09-01', cashDate: '2026-09-08' }),
      entry({ id: 'entry-out', competenceDate: '2026-10-01', cashDate: '2026-09-30' }),
    ];
    const period = { periodStart: '2026-09-01', periodEnd: '2026-09-30' };

    expect(financialEntryMatchesPeriod(entries[0], period)).toBe(true);
    expect(filterFinancialEntriesByPeriod(entries, period).map((item) => item.id)).toEqual([
      'entry-in',
    ]);
    expect(filterFinancialEntriesByPeriod(entries, period, 'cash').map((item) => item.id)).toEqual([
      'entry-in',
      'entry-out',
    ]);
  });

  it('calculates finance totals without floating point rounding', () => {
    const totals = calculateFinancialEntryTotals([
      entry({ amountCents: 3333, signedAmountCents: 3333 }),
      entry({
        id: 'entry-product',
        type: 'PRODUCT_REVENUE',
        amountCents: 3334,
        signedAmountCents: 3334,
      }),
      entry({
        id: 'entry-expense',
        direction: 'OUT',
        type: 'EXPENSE',
        amountCents: 1200,
        signedAmountCents: -1200,
        sourceType: 'EXPENSE',
        sourceId: 'expense-a',
      }),
      entry({
        id: 'entry-payout',
        direction: 'OUT',
        type: 'PAYOUT',
        amountCents: 2500,
        signedAmountCents: -2500,
        sourceType: 'PAYOUT',
        sourceId: 'payout-a',
      }),
      entry({ id: 'entry-voided', status: 'VOIDED' }),
    ]);

    expect(totals).toEqual({
      revenueAmountCents: 6667,
      expenseAmountCents: 1200,
      payoutAmountCents: 2500,
      resultAmountCents: 5467,
      cashInAmountCents: 6667,
      cashOutAmountCents: 3700,
      entriesCount: 4,
    });
  });

  it('detects duplicate posted source keys while allowing voided history', () => {
    const source = entry({ id: 'entry-source-a' });
    const duplicate = entry({ id: 'entry-source-b' });
    const voidedDuplicate = entry({ id: 'entry-source-c', status: 'VOIDED' });

    expect(financialEntrySourceKey(source)).toBe('tenant-a:PAYMENT:payment-a:SERVICE_REVENUE:IN');
    expect(duplicatePostedFinancialEntrySourceKeys([source, duplicate, voidedDuplicate])).toEqual([
      'tenant-a:PAYMENT:payment-a:SERVICE_REVENUE:IN',
    ]);
  });

  it('creates immutable reversal entries instead of mutating originals', () => {
    const original = entry({ categoryId: 'category-a' });
    const reversal = createFinancialEntryReversal(original, {
      id: 'entry-reversal-a',
      sourceType: 'REFUND',
      sourceId: 'refund-a',
      type: 'REFUND',
      idempotencyKey: 'refund-a:finance',
      description: 'Refund reversal',
      createdBy: 'user-b',
      createdAt: '2026-09-08T12:00:00.000Z',
    });

    expect(reversal).toMatchObject({
      id: 'entry-reversal-a',
      tenantId: original.tenantId,
      branchId: original.branchId,
      direction: 'OUT',
      type: 'REFUND',
      amountCents: original.amountCents,
      signedAmountCents: -original.amountCents,
      reversedEntryId: original.id,
      categoryId: 'category-a',
    });
    expect(original.status).toBe('POSTED');
    expect(() => createFinancialEntryReversal(entry({ status: 'REVERSED' }), reversal)).toThrow(
      /posted financial entries/,
    );
  });
});
