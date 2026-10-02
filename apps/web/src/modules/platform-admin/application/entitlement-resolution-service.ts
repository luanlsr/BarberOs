import {
  entitlementOverrideCommandSchema,
  entitlementDecisionSchema,
  entitlementSchema,
  type Entitlement,
  type EntitlementOverrideCommand,
  type EntitlementDecision,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext } from '../domain';
import { authorizePlatformPermission } from './platform-authorization';

export type TenantEntitlementOverrideRecord = {
  id: string;
  tenantId: string;
  entitlement: Entitlement;
  enabled: boolean;
  limit?: number;
  reason?: string;
  expiresAt?: string;
};

export type PlanEntitlementRecord = {
  planId: string;
  entitlement: Entitlement;
  enabled: boolean;
  limit?: number;
};

export type LegacyTenantEntitlementRecord = {
  tenantId: string;
  entitlement: Entitlement;
  enabled: boolean;
  limit?: number;
};

export type EntitlementResolutionRepository = {
  applyOverride(
    context: PlatformRequestContext,
    command: EntitlementOverrideCommand,
  ): Promise<TenantEntitlementOverrideRecord>;
  findActiveOverride(
    context: PlatformRequestContext,
    tenantId: string,
    entitlement: Entitlement,
  ): Promise<TenantEntitlementOverrideRecord | null>;
  findActivePlanEntitlement(
    context: PlatformRequestContext,
    tenantId: string,
    entitlement: Entitlement,
  ): Promise<PlanEntitlementRecord | null>;
  findLegacyTenantEntitlement(
    context: PlatformRequestContext,
    tenantId: string,
    entitlement: Entitlement,
  ): Promise<LegacyTenantEntitlementRecord | null>;
};

export type EntitlementResolutionServiceDependencies = {
  repository: EntitlementResolutionRepository;
  auditSink?: PlatformAuditSink;
  now?: () => Date;
};

export class EntitlementResolutionService {
  private readonly repository: EntitlementResolutionRepository;
  private readonly audit?: PlatformAuditSink;
  private readonly now: () => Date;

  constructor(dependencies: EntitlementResolutionServiceDependencies) {
    this.repository = dependencies.repository;
    this.audit = dependencies.auditSink;
    this.now = dependencies.now ?? (() => new Date());
  }

  async resolveEntitlement(
    context: PlatformRequestContext,
    input: { tenantId: string; entitlement: unknown },
  ): Promise<EntitlementDecision> {
    authorizePlatformPermission(context, 'platform.tenants.read');
    const entitlement = entitlementSchema.parse(input.entitlement);
    const resolvedAt = this.now().toISOString();

    const override = await this.repository.findActiveOverride(context, input.tenantId, entitlement);
    if (override && !isExpired(override.expiresAt, this.now())) {
      return entitlementDecisionSchema.parse({
        tenantId: input.tenantId,
        entitlement,
        allowed: override.enabled,
        source: 'OVERRIDE',
        limit: override.limit,
        overrideId: override.id,
        reason: override.reason,
        resolvedAt,
      });
    }

    const plan = await this.repository.findActivePlanEntitlement(
      context,
      input.tenantId,
      entitlement,
    );
    if (plan) {
      return entitlementDecisionSchema.parse({
        tenantId: input.tenantId,
        entitlement,
        allowed: plan.enabled,
        source: 'PLAN',
        limit: plan.limit,
        planId: plan.planId,
        resolvedAt,
      });
    }

    const legacy = await this.repository.findLegacyTenantEntitlement(
      context,
      input.tenantId,
      entitlement,
    );
    if (legacy) {
      return entitlementDecisionSchema.parse({
        tenantId: input.tenantId,
        entitlement,
        allowed: legacy.enabled,
        source: 'LEGACY_TENANT_ENTITLEMENT',
        limit: legacy.limit,
        resolvedAt,
      });
    }

    return entitlementDecisionSchema.parse({
      tenantId: input.tenantId,
      entitlement,
      allowed: false,
      source: 'MISSING',
      reason: 'No active plan entitlement, override or legacy tenant entitlement found.',
      resolvedAt,
    });
  }

  async applyOverride(
    context: PlatformRequestContext,
    decision: EntitlementDecision,
    reason: string,
  ) {
    authorizePlatformPermission(context, 'platform.tenants.manage');
    await this.audit?.record(context, {
      action: 'ENTITLEMENT_OVERRIDE_APPLIED',
      tenantId: decision.tenantId,
      targetType: 'tenant_entitlement_override',
      targetId: decision.overrideId,
      result: 'SUCCESS',
      requestId: context.requestId,
      reason,
      metadata: {
        entitlement: decision.entitlement,
        allowed: decision.allowed,
        limit: decision.limit,
        source: decision.source,
      },
    });
  }

  async applyEntitlementOverride(
    context: PlatformRequestContext,
    command: unknown,
  ): Promise<EntitlementDecision> {
    authorizePlatformPermission(context, 'platform.tenants.manage');
    const parsed = entitlementOverrideCommandSchema.parse(command);
    const override = await this.repository.applyOverride(context, parsed);
    const decision = entitlementDecisionSchema.parse({
      tenantId: parsed.tenantId,
      entitlement: parsed.entitlement,
      allowed: parsed.enabled,
      source: 'OVERRIDE',
      limit: parsed.limit,
      overrideId: override.id,
      reason: parsed.reason,
      resolvedAt: this.now().toISOString(),
    });
    await this.applyOverride(context, decision, parsed.reason);
    return decision;
  }
}

function isExpired(expiresAt: string | undefined, now: Date) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= now.getTime());
}
