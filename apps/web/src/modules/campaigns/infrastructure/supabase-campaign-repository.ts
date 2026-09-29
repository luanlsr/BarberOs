import type { SupabaseClient } from '@supabase/supabase-js';
import {
  campaignRecipientOutcomeSchema,
  campaignRunSchema,
  campaignSchema,
  type Campaign,
  type CampaignRecipientOutcome,
  type CampaignRun,
  type RequestContext,
} from '@barberos/contracts';

import type {
  CampaignAudienceCandidate,
  CampaignAudienceRepository,
  CampaignFilters,
  CampaignMetricRollup,
  CampaignRepository,
  CampaignRunEngagementMetrics,
  CampaignRunRepository,
  CampaignRunSnapshot,
  CreateCampaignDraftRecordCommand,
  CreateCampaignRunSnapshotCommand,
  UpdateCampaignLifecycleCommand,
} from '../domain';

type BranchScopedQuery<T> = {
  eq(column: string, value: unknown): T;
  in(column: string, values: readonly unknown[]): T;
};

const campaignSelect =
  'id, tenant_id, branch_id, name, status, audience_criteria, content, scheduled_for, approved_by, approved_at, created_by, updated_by, created_at, updated_at';
const runSelect =
  'id, tenant_id, branch_id, campaign_id, status, audience_size, eligible_count, excluded_count, scheduled_for, started_at, completed_at, idempotency_key, created_at, updated_at';
const outcomeSelect =
  'id, tenant_id, branch_id, campaign_id, campaign_run_id, customer_id, contact_phone_hash, status, notification_intent_id, provider_message_id, exclusion_reason, idempotency_key, created_at, updated_at';
const metricSelect =
  'tenant_id, branch_id, campaign_id, campaign_run_id, audience_size, sent_count, delivered_count, failed_count, skipped_count, blocked_by_consent_count, opt_out_count, reply_count, updated_at';

export class SupabaseCampaignRepository
  implements CampaignRepository, CampaignAudienceRepository, CampaignRunRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async createDraft(context: RequestContext, command: CreateCampaignDraftRecordCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('campaigns')
      .insert({
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        name: command.name,
        status: command.status,
        audience_criteria: command.audienceCriteria,
        content: command.content,
        created_by: command.createdBy,
        updated_by: command.updatedBy,
      })
      .select(campaignSelect)
      .single();
    if (error) throw error;
    return toCampaign(data);
  }

  async findById(context: RequestContext, campaignId: string) {
    const { data, error } = await this.client
      .from('campaigns')
      .select(campaignSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', campaignId)
      .maybeSingle();
    if (error) throw error;
    return data ? toCampaign(data) : null;
  }

  async list(context: RequestContext, filters: CampaignFilters = {}) {
    let query = this.client
      .from('campaigns')
      .select(campaignSelect)
      .eq('tenant_id', context.tenantId)
      .order('updated_at', { ascending: false });
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toCampaign);
  }

  async updateLifecycle(context: RequestContext, command: UpdateCampaignLifecycleCommand) {
    const payload: Record<string, unknown> = {
      status: command.status,
      updated_by: command.updatedBy,
      updated_at: new Date().toISOString(),
    };
    if (command.approvedBy !== undefined) payload.approved_by = command.approvedBy;
    if (command.approvedAt !== undefined) payload.approved_at = command.approvedAt;
    if (command.scheduledFor !== undefined) payload.scheduled_for = command.scheduledFor;

    const { data, error } = await this.client
      .from('campaigns')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', command.id)
      .select(campaignSelect)
      .single();
    if (error) throw error;
    return toCampaign(data);
  }

  async findAudienceCandidates(context: RequestContext) {
    let query = this.client
      .from('customers')
      .select('id, tenant_id, branch_id, phone, consent_whatsapp, consent_marketing, status')
      .eq('tenant_id', context.tenantId)
      .neq('status', 'ARCHIVED');
    query = applyBranchScope(query, context);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>): CampaignAudienceCandidate => ({
      tenantId: String(row.tenant_id),
      branchId: typeof row.branch_id === 'string' ? row.branch_id : undefined,
      customerId: String(row.id),
      contactPhoneHash:
        typeof row.phone === 'string' && row.phone.trim()
          ? `phone:${row.phone.replace(/\D/g, '')}`
          : undefined,
      hasReachableDestination: Boolean(row.phone),
      whatsappConsentState: row.consent_whatsapp ? 'OPTED_IN' : 'UNKNOWN',
      marketingConsentState: row.consent_marketing ? 'OPTED_IN' : 'UNKNOWN',
    }));
  }

  async createFrozenAudienceSnapshot(
    context: RequestContext,
    command: CreateCampaignRunSnapshotCommand,
  ): Promise<CampaignRunSnapshot> {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data: runData, error: runError } = await this.client
      .from('campaign_runs')
      .insert({
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        campaign_id: command.campaignId,
        status: command.status,
        audience_size: command.audienceSize,
        eligible_count: command.eligibleCount,
        excluded_count: command.excludedCount,
        scheduled_for: command.scheduledFor,
        idempotency_key: command.idempotencyKey,
      })
      .select(runSelect)
      .single();
    if (runError) throw runError;
    const run = toCampaignRun(runData);

    const recipientRows = command.recipients.map((recipient) => ({
      tenant_id: recipient.tenantId,
      branch_id: recipient.branchId,
      campaign_id: recipient.campaignId,
      campaign_run_id: run.id,
      customer_id: recipient.customerId,
      contact_phone_hash: recipient.contactPhoneHash,
      status: recipient.status,
      exclusion_reason: recipient.exclusionReason,
      idempotency_key: recipient.idempotencyKey,
    }));
    const { data: outcomeData, error: outcomeError } = await this.client
      .from('campaign_recipient_outcomes')
      .insert(recipientRows)
      .select(outcomeSelect);
    if (outcomeError) throw outcomeError;
    return { run, recipients: (outcomeData ?? []).map(toRecipientOutcome) };
  }

  async findRunById(context: RequestContext, campaignRunId: string) {
    const { data, error } = await this.client
      .from('campaign_runs')
      .select(runSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', campaignRunId)
      .maybeSingle();
    if (error) throw error;
    return data ? toCampaignRun(data) : null;
  }

  async listRecipientOutcomes(context: RequestContext, campaignRunId: string) {
    let query = this.client
      .from('campaign_recipient_outcomes')
      .select(outcomeSelect)
      .eq('tenant_id', context.tenantId)
      .eq('campaign_run_id', campaignRunId)
      .order('created_at', { ascending: true });
    query = applyBranchScope(query, context);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toRecipientOutcome);
  }

  async countRunEngagementMetrics(
    context: RequestContext,
    campaignRunId: string,
  ): Promise<CampaignRunEngagementMetrics> {
    const { count: replyCount, error } = await this.client
      .from('messaging_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .eq('campaign_run_id', campaignRunId)
      .eq('direction', 'INBOUND');
    if (error) throw error;
    return { optOutCount: 0, replyCount: replyCount ?? 0 };
  }

  async findMetricRollup(context: RequestContext, campaignRunId: string) {
    const { data, error } = await this.client
      .from('campaign_metric_rollups')
      .select(metricSelect)
      .eq('tenant_id', context.tenantId)
      .eq('campaign_run_id', campaignRunId)
      .maybeSingle();
    if (error) throw error;
    return data ? toMetricRollup(data) : null;
  }

  async upsertMetricRollup(context: RequestContext, rollup: CampaignMetricRollup) {
    assertTenant(context, rollup.tenantId);
    assertBranch(context, rollup.branchId);
    const { data, error } = await this.client
      .from('campaign_metric_rollups')
      .upsert(
        {
          tenant_id: rollup.tenantId,
          branch_id: rollup.branchId,
          campaign_id: rollup.campaignId,
          campaign_run_id: rollup.campaignRunId,
          audience_size: rollup.audienceSize,
          sent_count: rollup.sentCount,
          delivered_count: rollup.deliveredCount,
          failed_count: rollup.failedCount,
          skipped_count: rollup.skippedCount,
          blocked_by_consent_count: rollup.blockedByConsentCount,
          opt_out_count: rollup.optOutCount,
          reply_count: rollup.replyCount,
          updated_at: rollup.updatedAt,
        },
        { onConflict: 'tenant_id,campaign_run_id' },
      )
      .select(metricSelect)
      .single();
    if (error) throw error;
    return toMetricRollup(data);
  }
}

function applyBranchScope<T extends BranchScopedQuery<T>>(
  query: T,
  context: RequestContext,
  branchId?: string,
) {
  if (branchId) {
    assertBranch(context, branchId);
    return query.eq('branch_id', branchId);
  }
  return context.branchScope.length ? query.in('branch_id', [...context.branchScope]) : query;
}

function assertTenant(context: RequestContext, tenantId: string) {
  if (context.tenantId !== tenantId) throw new Error('Cross-tenant campaign write is not allowed.');
}

function assertBranch(context: RequestContext, branchId?: string) {
  if (branchId && !context.branchScope.includes(branchId)) {
    throw new Error('Campaign branch is outside request scope.');
  }
}

function toCampaign(row: Record<string, unknown>): Campaign {
  return campaignSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    name: row.name,
    status: row.status,
    audienceCriteria: row.audience_criteria,
    content: row.content,
    scheduledFor: row.scheduled_for ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toCampaignRun(row: Record<string, unknown>): CampaignRun {
  return campaignRunSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    campaignId: row.campaign_id,
    status: row.status,
    audienceSize: row.audience_size,
    eligibleCount: row.eligible_count,
    excludedCount: row.excluded_count,
    scheduledFor: row.scheduled_for ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toRecipientOutcome(row: Record<string, unknown>): CampaignRecipientOutcome {
  return campaignRecipientOutcomeSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    campaignId: row.campaign_id,
    campaignRunId: row.campaign_run_id,
    customerId: row.customer_id ?? undefined,
    contactPhoneHash: row.contact_phone_hash,
    status: row.status,
    notificationIntentId: row.notification_intent_id ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    exclusionReason: row.exclusion_reason ?? undefined,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toMetricRollup(row: Record<string, unknown>): CampaignMetricRollup {
  return {
    tenantId: String(row.tenant_id),
    branchId: typeof row.branch_id === 'string' ? row.branch_id : undefined,
    campaignId: String(row.campaign_id),
    campaignRunId: String(row.campaign_run_id),
    audienceSize: Number(row.audience_size ?? 0),
    sentCount: Number(row.sent_count ?? 0),
    deliveredCount: Number(row.delivered_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    blockedByConsentCount: Number(row.blocked_by_consent_count ?? 0),
    optOutCount: Number(row.opt_out_count ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    updatedAt: String(row.updated_at),
  };
}
