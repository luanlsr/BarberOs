import { describe, expect, it, vi } from 'vitest';

import type { PlatformRequestContext } from '../domain';
import { EntitlementResolutionService } from './entitlement-resolution-service';
import { PlatformAuditService } from './platform-audit-service';
import { PlatformAuthorizationError } from './platform-authorization';
import { SaasPlanService } from './saas-plan-service';
import { SubscriptionBillingService } from './subscription-billing-service';
import { SupportScopeService } from './support-scope-service';
import { TenantLifecycleService } from './tenant-lifecycle-service';
import { TenantOverviewService } from './tenant-overview-service';

const maliciousTenantContext: PlatformRequestContext = {
  requestId: 'request-tenant-malicious',
  userId: 'tenant-user-1',
  role: 'OWNER',
  permissions: [
    'platform.tenants.read',
    'platform.tenants.manage',
    'platform.plans.manage',
    'platform.billing.read',
    'platform.billing.manage',
    'platform.support.manage',
    'platform.audit.read',
  ],
};

describe('platform admin tenant isolation', () => {
  it('denies tenant users before platform read repositories are called', async () => {
    const tenantReader = { listTenants: vi.fn(async () => []) };
    const planRepository = {
      listPlans: vi.fn(async () => []),
      findPlanById: vi.fn(),
      findPlanByCode: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
    };
    const billingRepository = {
      listSubscriptions: vi.fn(async () => []),
      findSubscriptionById: vi.fn(),
      assignSubscription: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      listInvoices: vi.fn(async () => []),
    };
    const entitlementRepository = {
      applyOverride: vi.fn(),
      findActiveOverride: vi.fn(),
      findActivePlanEntitlement: vi.fn(),
      findLegacyTenantEntitlement: vi.fn(),
    };
    const supportRepository = {
      listSupportScopes: vi.fn(async () => []),
      createSupportScope: vi.fn(),
      findActiveScope: vi.fn(),
    };
    const auditRepository = { listAuditEntries: vi.fn(async () => []) };
    const auditSink = { record: vi.fn() };

    await expect(
      new TenantOverviewService(tenantReader).listTenants(maliciousTenantContext),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SaasPlanService({ repository: planRepository, auditSink }).listPlans(
        maliciousTenantContext,
      ),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SubscriptionBillingService({
        repository: billingRepository,
        auditSink,
      }).listSubscriptions(maliciousTenantContext),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new PlatformAuditService(auditRepository).listAuditEntries(maliciousTenantContext),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SupportScopeService({ repository: supportRepository, auditSink }).listSupportScopes(
        maliciousTenantContext,
      ),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new EntitlementResolutionService({
        repository: entitlementRepository,
        auditSink,
      }).resolveEntitlement(maliciousTenantContext, {
        tenantId: 'tenant-1',
        entitlement: 'ai',
      }),
    ).rejects.toThrowError(PlatformAuthorizationError);

    expect(tenantReader.listTenants).not.toHaveBeenCalled();
    expect(planRepository.listPlans).not.toHaveBeenCalled();
    expect(billingRepository.listSubscriptions).not.toHaveBeenCalled();
    expect(auditRepository.listAuditEntries).not.toHaveBeenCalled();
    expect(supportRepository.listSupportScopes).not.toHaveBeenCalled();
    expect(entitlementRepository.findActiveOverride).not.toHaveBeenCalled();
  });

  it('denies tenant users before platform mutation repositories or audit sinks are called', async () => {
    const lifecycleRepository = {
      findTenantById: vi.fn(),
      updateTenantLifecycle: vi.fn(),
    };
    const planRepository = {
      listPlans: vi.fn(),
      findPlanById: vi.fn(),
      findPlanByCode: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
    };
    const billingRepository = {
      listSubscriptions: vi.fn(),
      findSubscriptionById: vi.fn(),
      assignSubscription: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      listInvoices: vi.fn(),
    };
    const entitlementRepository = {
      applyOverride: vi.fn(),
      findActiveOverride: vi.fn(),
      findActivePlanEntitlement: vi.fn(),
      findLegacyTenantEntitlement: vi.fn(),
    };
    const supportRepository = {
      listSupportScopes: vi.fn(),
      createSupportScope: vi.fn(),
      findActiveScope: vi.fn(),
    };
    const auditSink = { record: vi.fn() };

    await expect(
      new TenantLifecycleService({
        repository: lifecycleRepository,
        auditSink,
      }).applyLifecycleAction(maliciousTenantContext, {}),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SaasPlanService({ repository: planRepository, auditSink }).createPlan(
        maliciousTenantContext,
        {},
      ),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SubscriptionBillingService({
        repository: billingRepository,
        auditSink,
      }).assignSubscription(maliciousTenantContext, {}),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new EntitlementResolutionService({
        repository: entitlementRepository,
        auditSink,
      }).applyEntitlementOverride(maliciousTenantContext, {}),
    ).rejects.toThrowError(PlatformAuthorizationError);
    await expect(
      new SupportScopeService({ repository: supportRepository, auditSink }).createSupportScope(
        maliciousTenantContext,
        {},
      ),
    ).rejects.toThrowError(PlatformAuthorizationError);

    expect(lifecycleRepository.findTenantById).not.toHaveBeenCalled();
    expect(planRepository.createPlan).not.toHaveBeenCalled();
    expect(billingRepository.assignSubscription).not.toHaveBeenCalled();
    expect(entitlementRepository.applyOverride).not.toHaveBeenCalled();
    expect(supportRepository.createSupportScope).not.toHaveBeenCalled();
    expect(auditSink.record).not.toHaveBeenCalled();
  });
});
