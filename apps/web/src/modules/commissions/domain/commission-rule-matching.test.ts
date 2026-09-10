import { describe, expect, it } from 'vitest';
import type { CommissionRule } from '@barberos/contracts';

import {
  commissionRuleMatchesInput,
  findMatchingCommissionRule,
  sortCommissionRulesByPrecedence,
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

const input = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  sourceType: 'SERVICE' as const,
  sourceId: 'service-1',
  occurredOn: '2026-09-08',
};

describe('commission rule matching helpers', () => {
  it('selects the most specific item rule before professional and tenant defaults', () => {
    const defaultRule = rule({ id: 'rule-tenant', branchId: undefined });
    const professionalRule = rule({
      id: 'rule-professional',
      scope: 'PROFESSIONAL',
      professionalId: 'professional-1',
      percentageBps: 5500,
    });
    const serviceRule = rule({
      id: 'rule-service',
      scope: 'SERVICE',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      professionalId: 'professional-1',
      percentageBps: 6000,
    });

    expect(findMatchingCommissionRule([defaultRule, professionalRule, serviceRule], input)).toBe(
      serviceRule,
    );
    expect(
      sortCommissionRulesByPrecedence([defaultRule, professionalRule, serviceRule], input).map(
        (match) => match.rule.id,
      ),
    ).toEqual(['rule-service', 'rule-professional', 'rule-tenant']);
  });

  it('prefers a branch-specific rule over a tenant-wide rule at the same specificity', () => {
    const tenantWide = rule({
      id: 'rule-wide',
      branchId: undefined,
      scope: 'SERVICE',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
    });
    const branchSpecific = rule({
      id: 'rule-branch',
      scope: 'SERVICE',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
    });

    expect(findMatchingCommissionRule([tenantWide, branchSpecific], input)).toBe(branchSpecific);
  });

  it('uses the most recent effective rule as a deterministic tie-breaker', () => {
    const oldRule = rule({
      id: 'rule-old',
      scope: 'PROFESSIONAL',
      professionalId: 'professional-1',
      effectiveFrom: '2026-08-01',
    });
    const newRule = rule({
      id: 'rule-new',
      scope: 'PROFESSIONAL',
      professionalId: 'professional-1',
      effectiveFrom: '2026-09-01',
    });

    expect(findMatchingCommissionRule([oldRule, newRule], input)).toBe(newRule);
  });

  it('ignores inactive, expired, cross-tenant and cross-branch rules', () => {
    const active = rule({ id: 'rule-active' });
    const candidates = [
      rule({ id: 'rule-inactive', status: 'INACTIVE' }),
      rule({ id: 'rule-expired', effectiveFrom: '2026-08-01', effectiveUntil: '2026-08-31' }),
      rule({ id: 'rule-tenant-2', tenantId: 'tenant-2' }),
      rule({ id: 'rule-branch-2', branchId: 'branch-2' }),
      active,
    ];

    expect(candidates.filter((candidate) => commissionRuleMatchesInput(candidate, input))).toEqual([
      active,
    ]);
  });

  it('matches product and manual item source scopes explicitly', () => {
    const productRule = rule({
      id: 'rule-product',
      scope: 'PRODUCT',
      sourceType: 'PRODUCT',
      sourceId: 'product-1',
      type: 'FIXED_AMOUNT',
      percentageBps: undefined,
      fixedAmountCents: 700,
    });
    const manualRule = rule({
      id: 'rule-manual',
      scope: 'MANUAL_ITEM',
      sourceType: 'MANUAL',
      sourceId: 'manual-1',
    });

    expect(
      findMatchingCommissionRule([productRule], {
        ...input,
        sourceType: 'PRODUCT',
        sourceId: 'product-1',
      }),
    ).toBe(productRule);
    expect(
      findMatchingCommissionRule([manualRule], {
        ...input,
        sourceType: 'MANUAL',
        sourceId: 'manual-1',
      }),
    ).toBe(manualRule);
  });

  it('returns null when no rule matches the paid item context', () => {
    expect(
      findMatchingCommissionRule(
        [rule({ id: 'rule-other-professional', scope: 'PROFESSIONAL', professionalId: 'other' })],
        input,
      ),
    ).toBeNull();
  });
});
