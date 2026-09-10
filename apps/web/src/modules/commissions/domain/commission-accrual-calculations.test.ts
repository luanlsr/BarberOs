import { describe, expect, it } from 'vitest';
import type { CommissionRule, OrderItem } from '@barberos/contracts';

import {
  calculateCommissionAccrualForItem,
  calculateCommissionAccrualsForItems,
  calculateCommissionAmountCents,
} from './index';

const rule = (overrides: Partial<CommissionRule> = {}): CommissionRule => ({
  id: 'rule-default',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  scope: 'TENANT_DEFAULT',
  type: 'PERCENTAGE',
  status: 'ACTIVE',
  percentageBps: 5000,
  effectiveFrom: '2026-09-01',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  orderId: 'order-1',
  sourceType: 'SERVICE',
  sourceId: 'service-1',
  nameSnapshot: 'Corte masculino',
  quantity: 2,
  unitPriceAmountCents: 5_000,
  discountAmountCents: 1_000,
  finalAmountCents: 9_000,
  professionalId: 'professional-1',
  createdBy: 'user-1',
  createdAt: '2026-09-08T12:00:00.000Z',
  ...overrides,
});

describe('commission accrual calculation helpers', () => {
  it('calculates percentage commission from the paid item final amount', () => {
    const accrual = calculateCommissionAccrualForItem({
      id: 'accrual-1',
      item: item(),
      rules: [
        rule({
          id: 'rule-service',
          scope: 'SERVICE',
          sourceType: 'SERVICE',
          sourceId: 'service-1',
        }),
      ],
      paymentId: 'payment-1',
      accruedAt: '2026-09-08T12:30:00.000Z',
    });

    expect(accrual).toMatchObject({
      id: 'accrual-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      paymentId: 'payment-1',
      ruleId: 'rule-service',
      ruleTypeSnapshot: 'PERCENTAGE',
      ruleScopeSnapshot: 'SERVICE',
      rulePercentageBpsSnapshot: 5000,
      baseAmountCents: 9_000,
      commissionAmountCents: 4_500,
      status: 'OPEN',
    });
  });

  it('uses fixed amount rules without depending on item price changes', () => {
    const fixedRule = rule({
      id: 'rule-fixed',
      scope: 'PROFESSIONAL',
      professionalId: 'professional-1',
      type: 'FIXED_AMOUNT',
      percentageBps: undefined,
      fixedAmountCents: 1_200,
    });

    expect(calculateCommissionAmountCents(fixedRule, 9_000)).toBe(1_200);
    expect(
      calculateCommissionAccrualForItem({
        id: 'accrual-fixed',
        item: item(),
        rules: [fixedRule],
        accruedAt: '2026-09-08T12:30:00.000Z',
      }),
    ).toMatchObject({
      ruleTypeSnapshot: 'FIXED_AMOUNT',
      ruleFixedAmountCentsSnapshot: 1_200,
      commissionAmountCents: 1_200,
    });
  });

  it('rounds percentage commission in cents without floating point arithmetic', () => {
    expect(calculateCommissionAmountCents(rule({ percentageBps: 3333 }), 10_000)).toBe(3_333);
    expect(calculateCommissionAmountCents(rule({ percentageBps: 3333 }), 10_002)).toBe(3_334);
  });

  it('uses quantity and discounts through the immutable order item final amount', () => {
    const discountedItem = item({
      quantity: 3,
      unitPriceAmountCents: 4_000,
      discountAmountCents: 2_500,
      finalAmountCents: 9_500,
    });

    expect(
      calculateCommissionAccrualForItem({
        id: 'accrual-discounted',
        item: discountedItem,
        rules: [rule()],
        accruedAt: '2026-09-08T12:30:00.000Z',
      }),
    ).toMatchObject({ baseAmountCents: 9_500, commissionAmountCents: 4_750 });
  });

  it('does not create accruals for zero value or unattributed items', () => {
    expect(
      calculateCommissionAccrualsForItems([
        {
          id: 'accrual-zero',
          item: item({ id: 'item-zero', finalAmountCents: 0 }),
          rules: [rule()],
          accruedAt: '2026-09-08T12:30:00.000Z',
        },
        {
          id: 'accrual-no-professional',
          item: item({ id: 'item-no-professional', professionalId: undefined }),
          rules: [rule()],
          accruedAt: '2026-09-08T12:30:00.000Z',
        },
      ]),
    ).toEqual([]);
  });

  it('returns null when no commission rule matches the item', () => {
    expect(
      calculateCommissionAccrualForItem({
        id: 'accrual-no-rule',
        item: item({ sourceId: 'service-without-rule' }),
        rules: [rule({ scope: 'SERVICE', sourceType: 'SERVICE', sourceId: 'service-other' })],
        accruedAt: '2026-09-08T12:30:00.000Z',
      }),
    ).toBeNull();
  });
});
