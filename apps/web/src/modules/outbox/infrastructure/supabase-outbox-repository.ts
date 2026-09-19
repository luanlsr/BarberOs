import type { SupabaseClient } from '@supabase/supabase-js';
import {
  outboxEventSchema,
  workerJobAttemptSchema,
  workerJobSchema,
  type CreateOutboxEventCommand,
  type CreateWorkerJobCommand,
  type OutboxEvent,
  type RequestContext,
  type WorkerJob,
  type WorkerJobAttempt,
} from '@barberos/contracts';
import type {
  OutboxEventFilters,
  OutboxRepository,
  WorkerJobFilters,
  WorkerJobRepository,
} from '../domain';

const eventSelect = 'id, tenant_id, branch_id, event_type, source_type, source_id, payload, idempotency_key, status, correlation_id, schema_version, attempt_count, available_at, locked_by, locked_until, last_error, dispatched_at, created_by, created_at, updated_at';
const jobSelect = 'id, tenant_id, branch_id, type, status, schema_version, source_type, source_id, outbox_event_id, notification_intent_id, payload, idempotency_key, correlation_id, priority, attempt_count, max_attempts, run_at, locked_by, locked_until, last_error, completed_at, created_at, updated_at';
const attemptSelect = 'id, tenant_id, branch_id, job_id, outbox_event_id, status, attempt_number, worker_id, started_at, finished_at, error';

export class SupabaseOutboxRepository implements OutboxRepository, WorkerJobRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createEvent(context: RequestContext, command: CreateOutboxEventCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client.from('outbox_events').insert(toEventRow(command)).select(eventSelect).single();
    if (error) throw error;
    return toOutboxEvent(data);
  }

  async findEventById(context: RequestContext, eventId: string) {
    const { data, error } = await this.client.from('outbox_events').select(eventSelect).eq('tenant_id', context.tenantId).eq('id', eventId).maybeSingle();
    if (error) throw error;
    return data ? toOutboxEvent(data) : null;
  }

  async findEventByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client.from('outbox_events').select(eventSelect).eq('tenant_id', context.tenantId).eq('idempotency_key', idempotencyKey).maybeSingle();
    if (error) throw error;
    return data ? toOutboxEvent(data) : null;
  }

  async listEvents(context: RequestContext, filters: OutboxEventFilters = {}) {
    let query = this.client.from('outbox_events').select(eventSelect).eq('tenant_id', context.tenantId).order('created_at', { ascending: false }).limit(filters.limit ?? 100);
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
    if (filters.sourceId) query = query.eq('source_id', filters.sourceId);
    if (filters.cursor) query = query.lt('created_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toOutboxEvent);
  }

  async createJob(context: RequestContext, command: CreateWorkerJobCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client.from('worker_jobs').insert(toJobRow(command)).select(jobSelect).single();
    if (error) throw error;
    return toWorkerJob(data);
  }

  async findJobById(context: RequestContext, jobId: string) {
    const { data, error } = await this.client.from('worker_jobs').select(jobSelect).eq('tenant_id', context.tenantId).eq('id', jobId).maybeSingle();
    if (error) throw error;
    return data ? toWorkerJob(data) : null;
  }

  async findJobByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client.from('worker_jobs').select(jobSelect).eq('tenant_id', context.tenantId).eq('idempotency_key', idempotencyKey).maybeSingle();
    if (error) throw error;
    return data ? toWorkerJob(data) : null;
  }

  async listJobs(context: RequestContext, filters: WorkerJobFilters = {}) {
    let query = this.client.from('worker_jobs').select(jobSelect).eq('tenant_id', context.tenantId).order('run_at', { ascending: true }).limit(filters.limit ?? 100);
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
    if (filters.sourceId) query = query.eq('source_id', filters.sourceId);
    if (filters.cursor) query = query.gt('run_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toWorkerJob);
  }

  async listJobAttempts(context: RequestContext, jobId: string) {
    const { data, error } = await this.client.from('worker_job_attempts').select(attemptSelect).eq('tenant_id', context.tenantId).eq('job_id', jobId).order('attempt_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toWorkerJobAttempt);
  }
}

function applyBranchScope<T extends { eq: Function; in: Function }>(query: T, context: RequestContext, branchId?: string) {
  if (branchId) {
    assertBranch(context, branchId);
    return query.eq('branch_id', branchId);
  }
  return context.branchScope.length ? query.in('branch_id', [...context.branchScope]) : query;
}

function assertTenant(context: RequestContext, tenantId: string) {
  if (context.tenantId !== tenantId) throw new Error('Cross-tenant write is not allowed.');
}

function assertBranch(context: RequestContext, branchId?: string) {
  if (branchId && !context.branchScope.includes(branchId)) throw new Error('Branch is outside request scope.');
}

function toEventRow(command: CreateOutboxEventCommand) {
  return { tenant_id: command.tenantId, branch_id: command.branchId, event_type: command.eventType, source_type: command.sourceType, source_id: command.sourceId, payload: command.payload, idempotency_key: command.idempotencyKey, correlation_id: command.correlationId, available_at: command.availableAt ?? new Date().toISOString(), schema_version: 1, status: 'PENDING' };
}

function toJobRow(command: CreateWorkerJobCommand) {
  return { tenant_id: command.tenantId, branch_id: command.branchId, type: command.type, schema_version: command.schemaVersion, source_type: command.sourceType, source_id: command.sourceId, outbox_event_id: command.outboxEventId, notification_intent_id: command.notificationIntentId, payload: command.payload, idempotency_key: command.idempotencyKey, correlation_id: command.correlationId, priority: command.priority, max_attempts: command.maxAttempts, run_at: command.runAt ?? new Date().toISOString(), status: 'PENDING' };
}

export function toOutboxEvent(row: Record<string, unknown>): OutboxEvent {
  return outboxEventSchema.parse({ id: row.id, tenantId: row.tenant_id, branchId: row.branch_id ?? undefined, eventType: row.event_type, sourceType: row.source_type, sourceId: row.source_id, payload: row.payload, idempotencyKey: row.idempotency_key, status: row.status, correlationId: row.correlation_id, schemaVersion: row.schema_version, attemptCount: row.attempt_count, availableAt: row.available_at, lockedBy: row.locked_by ?? undefined, lockedUntil: row.locked_until ?? undefined, lastError: row.last_error ?? undefined, dispatchedAt: row.dispatched_at ?? undefined, createdBy: row.created_by ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at });
}

export function toWorkerJob(row: Record<string, unknown>): WorkerJob {
  return workerJobSchema.parse({ id: row.id, tenantId: row.tenant_id, branchId: row.branch_id ?? undefined, type: row.type, status: row.status, schemaVersion: row.schema_version, sourceType: row.source_type ?? undefined, sourceId: row.source_id ?? undefined, outboxEventId: row.outbox_event_id ?? undefined, notificationIntentId: row.notification_intent_id ?? undefined, payload: row.payload, idempotencyKey: row.idempotency_key, correlationId: row.correlation_id, priority: row.priority, attemptCount: row.attempt_count, maxAttempts: row.max_attempts, runAt: row.run_at, lockedBy: row.locked_by ?? undefined, lockedUntil: row.locked_until ?? undefined, lastError: row.last_error ?? undefined, completedAt: row.completed_at ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at });
}

export function toWorkerJobAttempt(row: Record<string, unknown>): WorkerJobAttempt {
  return workerJobAttemptSchema.parse({ id: row.id, tenantId: row.tenant_id, branchId: row.branch_id ?? undefined, jobId: row.job_id, outboxEventId: row.outbox_event_id ?? undefined, status: row.status, attemptNumber: row.attempt_number, workerId: row.worker_id, startedAt: row.started_at, finishedAt: row.finished_at ?? undefined, error: row.error ?? undefined });
}
