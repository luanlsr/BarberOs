import type {
  AssignTenantSubscriptionCommand,
  BillingInvoiceSummary,
  EntitlementDecision,
  EntitlementOverrideCommand,
  PlatformAuditEntry,
  PlatformAuditFilter,
  PlatformTenantSummary,
  RequestContext,
  SaasPlan,
  SupportScope,
  TenantLifecycleActionCommand,
  TenantSubscription,
} from '@barberos/contracts';

export type PlatformRequestContext = Pick<
  RequestContext,
  'requestId' | 'userId' | 'role' | 'permissions'
>;

export type TenantOverviewFilters = {
  status?: string;
  planCode?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

export interface PlatformAdminRepository {
  listTenants(
    context: PlatformRequestContext,
    filters?: TenantOverviewFilters,
  ): Promise<PlatformTenantSummary[]>;
  updateTenantLifecycle(
    context: PlatformRequestContext,
    command: TenantLifecycleActionCommand,
  ): Promise<PlatformTenantSummary>;
  listPlans(context: PlatformRequestContext): Promise<SaasPlan[]>;
  listSubscriptions(context: PlatformRequestContext): Promise<TenantSubscription[]>;
  assignSubscription(
    context: PlatformRequestContext,
    command: AssignTenantSubscriptionCommand,
  ): Promise<TenantSubscription>;
  listInvoices(context: PlatformRequestContext): Promise<BillingInvoiceSummary[]>;
  resolveEntitlement(
    context: PlatformRequestContext,
    tenantId: string,
    entitlement: string,
  ): Promise<EntitlementDecision>;
  applyEntitlementOverride(
    context: PlatformRequestContext,
    command: EntitlementOverrideCommand,
  ): Promise<EntitlementDecision>;
  listSupportScopes(context: PlatformRequestContext, tenantId?: string): Promise<SupportScope[]>;
  listAuditEntries(
    context: PlatformRequestContext,
    filters?: PlatformAuditFilter,
  ): Promise<PlatformAuditEntry[]>;
}

export interface PlatformAuditSink {
  record(
    context: PlatformRequestContext,
    entry: Omit<PlatformAuditEntry, 'id' | 'actorUserId' | 'createdAt'>,
  ): Promise<void>;
}
