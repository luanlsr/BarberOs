import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestContext } from '@barberos/contracts';
type BranchScopedQuery<T> = {
  eq(column: string, value: unknown): T;
  in(column: string, values: readonly unknown[]): T;
};

type DomainTable =
  | 'customer_tags'
  | 'customer_tag_assignments'
  | 'customer_metrics'
  | 'waitlist_entries'
  | 'suppliers'
  | 'purchase_orders'
  | 'purchase_order_items'
  | 'service_packages'
  | 'service_package_items'
  | 'customer_package_balances'
  | 'messaging_connections'
  | 'conversations'
  | 'messages'
  | 'messaging_consents'
  | 'campaigns'
  | 'campaign_audiences'
  | 'campaign_runs'
  | 'ai_conversations'
  | 'ai_messages'
  | 'ai_pending_actions'
  | 'ai_tool_executions'
  | 'ai_usage'
  | 'knowledge_documents'
  | 'tenant_subscriptions'
  | 'usage_counters'
  | 'billing_invoices'
  | 'storage_objects';

export type DomainListOptions = {
  branchId?: string;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, string | number | boolean | null | undefined>;
};

export type DomainWrite = Record<string, unknown>;

export class TenantScopedSupabaseService {
  constructor(protected readonly client: SupabaseClient) {}

  async list<T = Record<string, unknown>>(
    context: RequestContext,
    table: DomainTable,
    options: DomainListOptions = {},
  ): Promise<T[]> {
    let query = this.client.from(table).select('*').eq('tenant_id', context.tenantId);
    query = this.applyBranchScope(query, context, options.branchId);
    for (const [column, value] of Object.entries(options.filters ?? {})) {
      if (value !== undefined)
        query = value === null ? query.is(column, null) : query.eq(column, value);
    }
    const { data, error } = await query
      .order(options.orderBy ?? 'created_at', { ascending: options.ascending ?? false })
      .limit(options.limit ?? 100);
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async find<T = Record<string, unknown>>(
    context: RequestContext,
    table: DomainTable,
    id: string,
  ): Promise<T | null> {
    let query = this.client.from(table).select('*').eq('tenant_id', context.tenantId).eq('id', id);
    query = this.applyBranchScope(query, context);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data ?? null) as T | null;
  }

  async create<T = Record<string, unknown>>(
    context: RequestContext,
    table: DomainTable,
    values: DomainWrite,
  ): Promise<T> {
    const payload = { ...values, tenant_id: context.tenantId };
    if (typeof values.branch_id === 'string') this.assertBranch(context, values.branch_id);
    const { data, error } = await this.client.from(table).insert(payload).select('*').single();
    if (error) throw error;
    return data as T;
  }

  async update<T = Record<string, unknown>>(
    context: RequestContext,
    table: DomainTable,
    id: string,
    values: DomainWrite,
  ): Promise<T> {
    if (typeof values.tenant_id === 'string' && values.tenant_id !== context.tenantId)
      throw new Error('Cross-tenant writes are not allowed.');
    if (typeof values.branch_id === 'string') this.assertBranch(context, values.branch_id);
    let query = this.client
      .from(table)
      .update({ ...values, tenant_id: context.tenantId, updated_at: new Date().toISOString() })
      .eq('tenant_id', context.tenantId)
      .eq('id', id);
    query = this.applyBranchScope(query, context);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as T;
  }

  protected applyBranchScope<T extends BranchScopedQuery<T>>(
    query: T,
    context: RequestContext,
    branchId?: string,
  ) {
    if (branchId) {
      this.assertBranch(context, branchId);
      return query.eq('branch_id', branchId);
    }
    if (context.branchScope.length > 0) return query.in('branch_id', [...context.branchScope]);
    return query;
  }

  protected assertBranch(context: RequestContext, branchId: string) {
    if (!context.branchScope.includes(branchId))
      throw new Error('Branch is outside request scope.');
  }
}

export class CrmService extends TenantScopedSupabaseService {
  listTags(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'customer_tags', options);
  }
  listMetrics(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'customer_metrics', options);
  }
  listWaitlist(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'waitlist_entries', options);
  }
  createTag(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'customer_tags', values);
  }
  createWaitlistEntry(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'waitlist_entries', values);
  }
}

export class ProcurementService extends TenantScopedSupabaseService {
  listSuppliers(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'suppliers', options);
  }
  listPurchaseOrders(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'purchase_orders', options);
  }
  createSupplier(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'suppliers', values);
  }
  createPurchaseOrder(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'purchase_orders', values);
  }
}

export class PackagesService extends TenantScopedSupabaseService {
  listPackages(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'service_packages', options);
  }
  listCustomerBalances(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'customer_package_balances', options);
  }
  createPackage(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'service_packages', values);
  }
  updatePackage(context: RequestContext, id: string, values: DomainWrite) {
    return this.update(context, 'service_packages', id, values);
  }
}

export class MessagingService extends TenantScopedSupabaseService {
  listConnections(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'messaging_connections', options);
  }
  listConversations(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'conversations', options);
  }
  listMessages(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'messages', options);
  }
  createConnection(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'messaging_connections', values);
  }
  createMessage(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'messages', values);
  }
}

export class CampaignService extends TenantScopedSupabaseService {
  listCampaigns(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'campaigns', options);
  }
  listRuns(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'campaign_runs', options);
  }
  createCampaign(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'campaigns', values);
  }
  updateCampaign(context: RequestContext, id: string, values: DomainWrite) {
    return this.update(context, 'campaigns', id, values);
  }
}

export class AiService extends TenantScopedSupabaseService {
  listConversations(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'ai_conversations', options);
  }
  listToolExecutions(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'ai_tool_executions', options);
  }
  listPendingActions(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'ai_pending_actions', options);
  }
  listKnowledgeDocuments(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'knowledge_documents', options);
  }
  createConversation(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'ai_conversations', values);
  }
  createPendingAction(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'ai_pending_actions', values);
  }
}

export class BillingService extends TenantScopedSupabaseService {
  listSubscriptions(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'tenant_subscriptions', options);
  }
  listInvoices(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'billing_invoices', options);
  }
  listUsage(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'usage_counters', options);
  }
}

export class StorageService extends TenantScopedSupabaseService {
  listObjects(context: RequestContext, options?: DomainListOptions) {
    return this.list(context, 'storage_objects', options);
  }
  registerObject(context: RequestContext, values: DomainWrite) {
    return this.create(context, 'storage_objects', values);
  }
  archiveObject(context: RequestContext, id: string) {
    return this.update(context, 'storage_objects', id, { status: 'ARCHIVED' });
  }
}

export class PlatformService extends TenantScopedSupabaseService {
  listPlans(context: RequestContext, options?: DomainListOptions) {
    if (context.role !== 'PLATFORM_MASTER' && context.role !== 'PLATFORM_SUPPORT')
      throw new Error('Platform access is required.');
    return this.client
      .from('saas_plans')
      .select('*')
      .order('name')
      .limit(options?.limit ?? 100);
  }
}
