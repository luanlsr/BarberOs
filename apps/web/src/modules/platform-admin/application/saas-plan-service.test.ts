import { describe, expect, it, vi } from 'vitest';
import type { SaasPlan } from '@barberos/contracts';

import { PlatformAdminApplicationError } from './platform-admin-errors';
import { SaasPlanService, type SaasPlanRepository } from './saas-plan-service';
import type { PlatformAuditSink, PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.plans.manage'],
};

function plan(overrides: Partial<SaasPlan> = {}): SaasPlan {
  return {
    id: 'plan-pro',
    code: 'pro',
    name: 'Pro',
    priceAmountCents: 9900,
    billingInterval: 'MONTHLY',
    status: 'ACTIVE',
    entitlements: [
      {
        id: 'entitlement-finance',
        planId: 'plan-pro',
        entitlement: 'finance',
        enabled: true,
        limit: 100,
        metadata: {},
      },
    ],
    metadata: {},
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function setup(initialPlans: SaasPlan[]) {
  const plans = new Map(initialPlans.map((item) => [item.id, item]));
  const repository: SaasPlanRepository = {
    async listPlans() {
      return [...plans.values()];
    },
    async findPlanById(_context, planId) {
      return plans.get(planId) ?? null;
    },
    async findPlanByCode(_context, code) {
      return (
        [...plans.values()].find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? null
      );
    },
    async createPlan(_context, command) {
      const created = plan({
        id: 'plan-created',
        code: command.code,
        name: command.name,
        priceAmountCents: command.priceAmountCents,
        billingInterval: command.billingInterval,
        status: command.status ?? 'ACTIVE',
        entitlements: (command.entitlements ?? []).map((entitlement, index) => ({
          id: `entitlement-${index}`,
          planId: 'plan-created',
          entitlement: entitlement.entitlement,
          enabled: entitlement.enabled ?? true,
          limit: entitlement.limit,
          metadata: entitlement.metadata ?? {},
        })),
      });
      plans.set(created.id, created);
      return created;
    },
    async updatePlan(_context, planId, command) {
      const current = plans.get(planId);
      if (!current) throw new Error('Unexpected missing plan.');
      const updated = {
        ...current,
        ...command,
        entitlements: command.entitlements
          ? command.entitlements.map((entitlement, index) => ({
              id: `updated-entitlement-${index}`,
              planId,
              entitlement: entitlement.entitlement,
              enabled: entitlement.enabled ?? true,
              limit: entitlement.limit,
              metadata: entitlement.metadata ?? {},
            }))
          : current.entitlements,
        updatedAt: '2026-10-01T13:00:00.000Z',
      };
      plans.set(planId, updated);
      return updated;
    },
  };
  const audit: PlatformAuditSink = {
    record: vi.fn(async () => undefined),
  };

  return { service: new SaasPlanService({ repository, auditSink: audit }), audit };
}

describe('SaasPlanService', () => {
  it('creates plans with entitlement limits and emits audit', async () => {
    const { service, audit } = setup([]);

    const created = await service.createPlan(platformContext, {
      code: 'scale',
      name: 'Scale',
      priceAmountCents: 39900,
      billingInterval: 'MONTHLY',
      entitlements: [{ entitlement: 'ai', enabled: true, limit: 5000 }],
    });

    expect(created.code).toBe('scale');
    expect(created.entitlements[0]?.limit).toBe(5000);
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'PLAN_CREATED',
        targetType: 'saas_plan',
        targetId: 'plan-created',
        result: 'SUCCESS',
        metadata: expect.objectContaining({ entitlementCount: 1 }),
      }),
    );
  });

  it('rejects duplicate plan codes on create and update', async () => {
    const { service } = setup([
      plan({ id: 'plan-pro', code: 'pro' }),
      plan({ id: 'plan-ai', code: 'ai' }),
    ]);

    await expect(
      service.createPlan(platformContext, {
        code: 'PRO',
        name: 'Pro Duplicate',
        priceAmountCents: 9900,
        billingInterval: 'MONTHLY',
      }),
    ).rejects.toThrowError(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_DUPLICATE_CODE',
        'SaaS plan code already exists.',
      ),
    );

    await expect(
      service.updatePlan(platformContext, {
        id: 'plan-ai',
        code: 'pro',
      }),
    ).rejects.toThrowError(PlatformAdminApplicationError);
  });

  it('updates and archives plans with audit trail', async () => {
    const { service, audit } = setup([plan()]);

    const updated = await service.updatePlan(platformContext, {
      id: 'plan-pro',
      priceAmountCents: 12900,
      entitlements: [{ entitlement: 'finance', enabled: true, limit: 200 }],
    });
    const archived = await service.archivePlan(platformContext, {
      planId: 'plan-pro',
      reason: 'Plano substituido por nova grade comercial.',
    });

    expect(updated.priceAmountCents).toBe(12900);
    expect(updated.entitlements[0]?.limit).toBe(200);
    expect(archived.status).toBe('ARCHIVED');
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'PLAN_ARCHIVED',
        reason: 'Plano substituido por nova grade comercial.',
      }),
    );
  });

  it('rejects archive without reason or when already archived', async () => {
    const { service } = setup([plan({ status: 'ARCHIVED' })]);

    await expect(
      service.archivePlan(platformContext, { planId: 'plan-pro', reason: '' }),
    ).rejects.toThrowError(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_VALIDATION_ERROR',
        'Plan archive requires a reason.',
      ),
    );
    await expect(
      service.archivePlan(platformContext, {
        planId: 'plan-pro',
        reason: 'Ja arquivado.',
      }),
    ).rejects.toThrowError(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_INVALID_STATUS',
        'Plan is already archived.',
      ),
    );
  });
});
