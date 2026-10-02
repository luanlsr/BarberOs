import { describe, expect, it, vi } from 'vitest';
import type {
  BillingInvoiceSummary,
  TenantSubscription,
  TenantSubscriptionStatus,
} from '@barberos/contracts';

import {
  SubscriptionBillingService,
  type SubscriptionBillingRepository,
} from './subscription-billing-service';
import { PlatformAdminApplicationError } from './platform-admin-errors';
import type { PlatformAuditSink, PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.billing.read', 'platform.billing.manage'],
};

function subscription(
  status: TenantSubscriptionStatus,
  overrides: Partial<TenantSubscription> = {},
): TenantSubscription {
  return {
    id: `subscription-${status.toLowerCase()}`,
    tenantId: 'tenant-a',
    planId: 'plan-pro',
    provider: 'ASAAS',
    externalReference: `external-${status.toLowerCase()}`,
    status,
    currentPeriodStart: '2026-10-01',
    currentPeriodEnd: '2026-11-01',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function invoice(overrides: Partial<BillingInvoiceSummary> = {}): BillingInvoiceSummary {
  return {
    id: 'invoice-a',
    tenantId: 'tenant-a',
    subscriptionId: 'subscription-active',
    provider: 'ASAAS',
    externalReference: 'invoice-external-a',
    status: 'OPEN',
    amountCents: 9900,
    dueDate: '2026-10-10',
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function setup(initialSubscriptions: TenantSubscription[], invoices: BillingInvoiceSummary[] = []) {
  const subscriptions = new Map(initialSubscriptions.map((item) => [item.id, item]));
  const repository: SubscriptionBillingRepository = {
    async listSubscriptions() {
      return [...subscriptions.values()];
    },
    async findSubscriptionById(_context, subscriptionId) {
      return subscriptions.get(subscriptionId) ?? null;
    },
    async assignSubscription(_context, command) {
      const assigned = subscription(command.status ?? 'ACTIVE', {
        id: 'subscription-assigned',
        tenantId: command.tenantId,
        planId: command.planId,
        provider: command.provider,
        externalReference: command.externalReference,
        currentPeriodStart: command.currentPeriodStart,
        currentPeriodEnd: command.currentPeriodEnd,
      });
      subscriptions.set(assigned.id, assigned);
      return assigned;
    },
    async updateSubscriptionStatus(_context, command) {
      const current = subscriptions.get(command.subscriptionId);
      if (!current) throw new Error('Unexpected missing subscription.');
      const updated = {
        ...current,
        status: command.status,
        updatedAt: '2026-10-01T13:00:00.000Z',
      };
      subscriptions.set(updated.id, updated);
      return updated;
    },
    async listInvoices() {
      return invoices;
    },
  };
  const audit: PlatformAuditSink = {
    record: vi.fn(async () => undefined),
  };

  return { service: new SubscriptionBillingService({ repository, auditSink: audit }), audit };
}

describe('SubscriptionBillingService', () => {
  it('lists subscription states and marks restricted access states', async () => {
    const { service } = setup([
      subscription('ACTIVE'),
      subscription('TRIALING'),
      subscription('PAST_DUE'),
      subscription('CANCELLED'),
      subscription('EXPIRED'),
    ]);

    const result = await service.listSubscriptions(platformContext);

    expect(
      result.find((item) => item.subscription.status === 'ACTIVE')?.restrictsTenantAccess,
    ).toBe(false);
    expect(
      result.find((item) => item.subscription.status === 'TRIALING')?.restrictsTenantAccess,
    ).toBe(false);
    expect(
      result.find((item) => item.subscription.status === 'PAST_DUE')?.restrictsTenantAccess,
    ).toBe(true);
    expect(
      result.find((item) => item.subscription.status === 'CANCELLED')?.restrictsTenantAccess,
    ).toBe(true);
    expect(
      result.find((item) => item.subscription.status === 'EXPIRED')?.restrictsTenantAccess,
    ).toBe(true);
  });

  it('lists invoice summaries without provider secrets', async () => {
    const { service } = setup(
      [],
      [
        {
          ...invoice({ status: 'OVERDUE' }),
          providerApiKey: 'secret',
        } as BillingInvoiceSummary,
      ],
    );

    const result = await service.listInvoices(platformContext);

    expect(result[0]).toMatchObject({ status: 'OVERDUE', amountCents: 9900 });
    expect(result[0]).not.toHaveProperty('providerApiKey');
  });

  it('assigns subscriptions and records audit', async () => {
    const { service, audit } = setup([]);

    const assigned = await service.assignSubscription(platformContext, {
      tenantId: 'tenant-a',
      planId: 'plan-pro',
      provider: 'ASAAS',
      externalReference: 'asaas-subscription-a',
      status: 'ACTIVE',
      currentPeriodStart: '2026-10-01',
      currentPeriodEnd: '2026-11-01',
      reason: 'Checkout pago.',
    });

    expect(assigned.status).toBe('ACTIVE');
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'SUBSCRIPTION_ASSIGNED',
        tenantId: 'tenant-a',
        targetType: 'tenant_subscription',
        result: 'SUCCESS',
        reason: 'Checkout pago.',
      }),
    );
  });

  it('updates subscription status and reports restricted access', async () => {
    const { service, audit } = setup([subscription('ACTIVE')]);

    const updated = await service.updateSubscriptionStatus(platformContext, {
      subscriptionId: 'subscription-active',
      status: 'PAST_DUE',
      reason: 'Invoice vencida.',
    });

    expect(updated.subscription.status).toBe('PAST_DUE');
    expect(updated.restrictsTenantAccess).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'SUBSCRIPTION_STATUS_CHANGED',
        metadata: expect.objectContaining({
          previousStatus: 'ACTIVE',
          nextStatus: 'PAST_DUE',
        }),
      }),
    );
  });

  it('rejects status updates without reason or unknown subscriptions', async () => {
    const { service } = setup([]);

    await expect(
      service.updateSubscriptionStatus(platformContext, {
        subscriptionId: '',
        status: 'CANCELLED',
        reason: '',
      }),
    ).rejects.toThrowError(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_VALIDATION_ERROR',
        'Subscription status updates require subscription id and reason.',
      ),
    );
    await expect(
      service.updateSubscriptionStatus(platformContext, {
        subscriptionId: 'subscription-missing',
        status: 'CANCELLED',
        reason: 'Cancelamento solicitado.',
      }),
    ).rejects.toThrowError(PlatformAdminApplicationError);
  });
});
