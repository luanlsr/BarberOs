import { describe, expect, it } from 'vitest';
import {
  assignTenantSubscriptionCommandSchema,
  billingInvoiceSummarySchema,
  createSaasPlanCommandSchema,
  createSupportScopeCommandSchema,
  entitlementDecisionSchema,
  entitlementOverrideCommandSchema,
  permissionSchema,
  planEntitlementSchema,
  platformAuditEntrySchema,
  platformAuditFilterSchema,
  platformTenantSummarySchema,
  saasPlanSchema,
  supportScopeSchema,
  tenantLifecycleActionCommandSchema,
  tenantSubscriptionSchema,
  updateSaasPlanCommandSchema,
} from './index';

describe('platform admin and billing contracts', () => {
  const createdAt = '2026-10-01T12:00:00.000Z';

  it('recognizes platform permissions without accepting unknown platform actions', () => {
    expect(permissionSchema.parse('platform.tenants.read')).toBe('platform.tenants.read');
    expect(permissionSchema.parse('platform.billing.manage')).toBe('platform.billing.manage');
    expect(permissionSchema.parse('platform.audit.read')).toBe('platform.audit.read');
    expect(permissionSchema.safeParse('platform.secrets.read').success).toBe(false);
  });

  it('accepts tenant summaries without tenant-private operational payloads', () => {
    const summary = platformTenantSummarySchema.parse({
      tenantId: 'tenant-a',
      tenantName: 'Barbearia Centro',
      lifecycleStatus: 'ACTIVE',
      branchCount: 2,
      userCount: 7,
      planId: 'plan-pro',
      planCode: 'PRO',
      planName: 'Pro',
      subscriptionStatus: 'ACTIVE',
      openBillingExposureCents: 0,
      usage: { appointmentsThisMonth: 320, messagesThisMonth: 1800 },
      health: 'OK',
      createdAt,
      updatedAt: createdAt,
      customers: [{ id: 'customer-private' }],
      orders: [{ id: 'order-private' }],
      messages: [{ body: 'private message' }],
    });

    expect(summary).toEqual({
      tenantId: 'tenant-a',
      tenantName: 'Barbearia Centro',
      lifecycleStatus: 'ACTIVE',
      branchCount: 2,
      userCount: 7,
      planId: 'plan-pro',
      planCode: 'PRO',
      planName: 'Pro',
      subscriptionStatus: 'ACTIVE',
      openBillingExposureCents: 0,
      usage: { appointmentsThisMonth: 320, messagesThisMonth: 1800 },
      health: 'OK',
      healthSignals: [],
      createdAt,
      updatedAt: createdAt,
    });
  });

  it('validates tenant lifecycle actions and requires an audit reason', () => {
    const command = tenantLifecycleActionCommandSchema.parse({
      tenantId: 'tenant-a',
      action: 'SUSPEND',
      reason: 'Pagamento vencido ha mais de 30 dias.',
      requestId: 'request-platform-a',
    });

    expect(command.action).toBe('SUSPEND');
    expect(
      tenantLifecycleActionCommandSchema.safeParse({
        tenantId: 'tenant-a',
        action: 'REACTIVATE',
        reason: '',
      }).success,
    ).toBe(false);
  });

  it('accepts SaaS plans, plan entitlements and plan mutation commands', () => {
    const entitlement = planEntitlementSchema.parse({
      entitlement: 'campaigns',
      enabled: true,
      limit: 5000,
      metadata: { unit: 'messages_per_month' },
    });
    const plan = saasPlanSchema.parse({
      id: 'plan-pro',
      code: 'PRO',
      name: 'Pro',
      priceAmountCents: 9900,
      billingInterval: 'MONTHLY',
      status: 'ACTIVE',
      entitlements: [entitlement],
      createdAt,
      updatedAt: createdAt,
    });
    const createPlan = createSaasPlanCommandSchema.parse({
      code: 'AI',
      name: 'Pro AI',
      priceAmountCents: 14900,
      billingInterval: 'MONTHLY',
      entitlements: [{ entitlement: 'ai', limit: 1000 }],
    });
    const updatePlan = updateSaasPlanCommandSchema.parse({
      id: 'plan-pro',
      status: 'ARCHIVED',
    });

    expect(plan.entitlements[0]?.limit).toBe(5000);
    expect(createPlan.status).toBe('ACTIVE');
    expect(updatePlan.status).toBe('ARCHIVED');
    expect(updateSaasPlanCommandSchema.safeParse({ id: 'plan-pro' }).success).toBe(false);
  });

  it('validates subscription assignment and invoice summaries without provider secrets', () => {
    const subscription = tenantSubscriptionSchema.parse({
      id: 'subscription-a',
      tenantId: 'tenant-a',
      planId: 'plan-pro',
      provider: 'ASAAS',
      externalReference: 'sub_123',
      status: 'TRIALING',
      trialStartsOn: '2026-10-01',
      trialEndsOn: '2026-10-15',
      createdAt,
      updatedAt: createdAt,
    });
    const assignment = assignTenantSubscriptionCommandSchema.parse({
      tenantId: 'tenant-a',
      planId: 'plan-pro',
      provider: 'ASAAS',
      status: 'ACTIVE',
      reason: 'Assinatura confirmada no checkout.',
    });
    const invoice = billingInvoiceSummarySchema.parse({
      id: 'invoice-a',
      tenantId: 'tenant-a',
      subscriptionId: subscription.id,
      provider: 'ASAAS',
      externalReference: 'inv_123',
      status: 'OPEN',
      amountCents: 9900,
      dueDate: '2026-10-10',
      createdAt,
      providerApiKey: 'secret',
      webhookSecret: 'secret',
    });

    expect(assignment.status).toBe('ACTIVE');
    expect(invoice).not.toHaveProperty('providerApiKey');
    expect(invoice).not.toHaveProperty('webhookSecret');
  });

  it('captures entitlement decision sources and rejects inconsistent decisions', () => {
    const planDecision = entitlementDecisionSchema.parse({
      tenantId: 'tenant-a',
      entitlement: 'inventory',
      allowed: true,
      source: 'PLAN',
      limit: 200,
      planId: 'plan-pro',
      resolvedAt: createdAt,
    });
    const overrideDecision = entitlementDecisionSchema.parse({
      tenantId: 'tenant-a',
      entitlement: 'ai',
      allowed: false,
      source: 'OVERRIDE',
      overrideId: 'override-ai-off',
      reason: 'Paused during support investigation.',
      resolvedAt: createdAt,
    });
    const legacyDecision = entitlementDecisionSchema.parse({
      tenantId: 'tenant-a',
      entitlement: 'finance',
      allowed: true,
      source: 'LEGACY_TENANT_ENTITLEMENT',
      resolvedAt: createdAt,
    });
    const missingDecision = entitlementDecisionSchema.parse({
      tenantId: 'tenant-a',
      entitlement: 'campaigns',
      allowed: false,
      source: 'MISSING',
      resolvedAt: createdAt,
    });

    expect(planDecision.limit).toBe(200);
    expect(overrideDecision.allowed).toBe(false);
    expect(legacyDecision.allowed).toBe(true);
    expect(missingDecision.allowed).toBe(false);
    expect(
      entitlementDecisionSchema.safeParse({
        tenantId: 'tenant-a',
        entitlement: 'campaigns',
        allowed: true,
        source: 'MISSING',
        resolvedAt: createdAt,
      }).success,
    ).toBe(false);
    expect(
      entitlementDecisionSchema.safeParse({
        tenantId: 'tenant-a',
        entitlement: 'inventory',
        allowed: true,
        source: 'PLAN',
        resolvedAt: createdAt,
      }).success,
    ).toBe(false);
  });

  it('validates entitlement overrides, support scopes and platform audit filters', () => {
    const override = entitlementOverrideCommandSchema.parse({
      tenantId: 'tenant-a',
      entitlement: 'messaging',
      enabled: true,
      limit: 3000,
      reason: 'Credito promocional aprovado.',
    });
    const supportScope = supportScopeSchema.parse({
      id: 'support-a',
      tenantId: 'tenant-a',
      actorUserId: 'support-user-a',
      purpose: 'Investigar falha de invoice.',
      operationClass: 'BILLING_SUPPORT',
      status: 'ACTIVE',
      expiresAt: '2026-10-02T12:00:00.000Z',
      createdAt,
    });
    const createSupportScope = createSupportScopeCommandSchema.parse({
      tenantId: 'tenant-a',
      actorUserId: 'support-user-a',
      purpose: 'Investigar falha de webhook.',
      operationClass: 'TENANT_HEALTH',
      expiresAt: '2099-10-02T12:00:00.000Z',
    });
    const audit = platformAuditEntrySchema.parse({
      id: 'audit-a',
      action: 'SUPPORT_SCOPE_CREATED',
      actorUserId: 'platform-user-a',
      tenantId: 'tenant-a',
      targetType: 'support_scope',
      targetId: supportScope.id,
      result: 'SUCCESS',
      requestId: 'request-platform-a',
      metadata: { providerToken: '[redacted]' },
      createdAt,
    });
    const filter = platformAuditFilterSchema.parse({
      tenantId: 'tenant-a',
      startsAt: '2026-10-01T00:00:00.000Z',
      endsAt: '2026-10-31T23:59:59.000Z',
    });

    expect(override.limit).toBe(3000);
    expect(supportScope.operationClass).toBe('BILLING_SUPPORT');
    expect(createSupportScope.operationClass).toBe('TENANT_HEALTH');
    expect(audit.result).toBe('SUCCESS');
    expect(filter.limit).toBe(25);
    expect(
      platformAuditFilterSchema.safeParse({
        startsAt: '2026-11-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
