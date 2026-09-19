import type { SupabaseClient } from '@supabase/supabase-js';
import {
  commissionAccrualSchema,
  commissionRuleSchema,
  commissionSummarySchema,
  payoutAllocationSchema,
  payoutDetailSchema,
  payoutSchema,
  professionalWalletSchema,
  type ClosePayoutCommand,
  type CommissionAccrual,
  type CommissionRule,
  type CorrectPayoutCommand,
  type CreateCommissionRuleCommand,
  type PayPayoutCommand,
  type Payout,
  type PayoutAllocation,
  type PayoutSource,
  type RequestContext,
  type UpdateCommissionRuleCommand,
} from '@barberos/contracts';

import type {
  CommissionAccrualFilters,
  CommissionPeriod,
  CommissionRepository,
  CommissionRuleFilters,
  PayoutFilters,
  ProfessionalWalletFilters,
  ReverseCommissionAccrualsCommand,
} from '../domain';

const commissionRuleSelect =
  'id, tenant_id, branch_id, scope, type, status, professional_id, source_type, source_id, percentage_bps, fixed_amount_cents, effective_from, effective_until, created_by, updated_by, created_at, updated_at';
const commissionAccrualSelect =
  'id, tenant_id, branch_id, professional_id, order_id, order_item_id, payment_id, rule_id, rule_type_snapshot, rule_scope_snapshot, rule_percentage_bps_snapshot, rule_fixed_amount_cents_snapshot, base_amount_cents, commission_amount_cents, status, accrued_at, reversed_accrual_id, payout_id, created_at, updated_at';
const payoutSelect =
  'id, tenant_id, branch_id, professional_id, status, period_start, period_end, total_amount_cents, payment_method, financial_entry_id, cash_movement_id, idempotency_key, payment_idempotency_key, correction_idempotency_key, closed_by, closed_at, approved_by, approved_at, paid_by, paid_at, correction_reason, created_at, updated_at';
const payoutAllocationSelect =
  'id, tenant_id, branch_id, payout_id, accrual_id, amount_cents, created_at';

type QueryResult = { data: unknown; error: unknown };

type QueryLike = PromiseLike<QueryResult> & {
  eq(column: string, value: unknown): QueryLike;
  in(column: string, values: unknown[]): QueryLike;
  or(filter: string): QueryLike;
  lt(column: string, value: unknown): QueryLike;
  gte(column: string, value: unknown): QueryLike;
  lte(column: string, value: unknown): QueryLike;
};

export type CommissionRuleRow = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  scope: CommissionRule['scope'];
  type: CommissionRule['type'];
  status: CommissionRule['status'];
  professional_id?: string | null;
  source_type?: CommissionRule['sourceType'] | null;
  source_id?: string | null;
  percentage_bps?: number | null;
  fixed_amount_cents?: number | null;
  effective_from: string;
  effective_until?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionAccrualRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  professional_id: string;
  order_id: string;
  order_item_id: string;
  payment_id?: string | null;
  rule_id?: string | null;
  rule_type_snapshot: CommissionAccrual['ruleTypeSnapshot'];
  rule_scope_snapshot: CommissionAccrual['ruleScopeSnapshot'];
  rule_percentage_bps_snapshot?: number | null;
  rule_fixed_amount_cents_snapshot?: number | null;
  base_amount_cents: number;
  commission_amount_cents: number;
  status: CommissionAccrual['status'];
  accrued_at: string;
  reversed_accrual_id?: string | null;
  payout_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type PayoutRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  professional_id: string;
  status: Payout['status'];
  period_start: string;
  period_end: string;
  total_amount_cents: number;
  payment_method?: Payout['paymentMethod'] | null;
  financial_entry_id?: string | null;
  cash_movement_id?: string | null;
  idempotency_key?: string | null;
  payment_idempotency_key?: string | null;
  correction_idempotency_key?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  correction_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type PayoutAllocationRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  payout_id: string;
  accrual_id: string;
  amount_cents: number;
  created_at: string;
};

export class SupabaseCommissionRepository implements CommissionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listRules(context: RequestContext, filters: CommissionRuleFilters = {}) {
    let request = this.client
      .from('commission_rules')
      .select(commissionRuleSelect)
      .eq('tenant_id', context.tenantId)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100) as unknown as QueryLike;

    request = applyNullableBranchScope(request, context, filters.branchId);
    if (filters.professionalId) request = request.eq('professional_id', filters.professionalId);
    if (filters.sourceType) request = request.eq('source_type', filters.sourceType);
    if (filters.sourceId) request = request.eq('source_id', filters.sourceId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as CommissionRuleRow[]).map((row) =>
      toVisibleCommissionRule(context, row),
    );
  }

  async findRuleById(context: RequestContext, ruleId: string) {
    const { data, error } = await this.client
      .from('commission_rules')
      .select(commissionRuleSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', ruleId)
      .maybeSingle();

    if (error) throw error;
    return data ? toVisibleCommissionRule(context, data as CommissionRuleRow) : null;
  }

  async createRule(context: RequestContext, command: CreateCommissionRuleCommand) {
    const { data, error } = await this.client
      .from('commission_rules')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId ?? null,
        scope: command.scope,
        type: command.type,
        status: 'ACTIVE',
        professional_id: command.professionalId ?? null,
        source_type: command.sourceType ?? null,
        source_id: command.sourceId ?? null,
        percentage_bps: command.percentageBps ?? null,
        fixed_amount_cents: command.fixedAmountCents ?? null,
        effective_from: command.effectiveFrom,
        effective_until: command.effectiveUntil ?? null,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select(commissionRuleSelect)
      .single();

    if (error) throw error;
    return toVisibleCommissionRule(context, data as CommissionRuleRow);
  }

  async updateRule(context: RequestContext, ruleId: string, command: UpdateCommissionRuleCommand) {
    const payload: Record<string, unknown> = {
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (command.branchId !== undefined) payload.branch_id = command.branchId;
    if (command.scope !== undefined) payload.scope = command.scope;
    if (command.type !== undefined) payload.type = command.type;
    if (command.status !== undefined) payload.status = command.status;
    if (command.professionalId !== undefined) payload.professional_id = command.professionalId;
    if (command.sourceType !== undefined) payload.source_type = command.sourceType;
    if (command.sourceId !== undefined) payload.source_id = command.sourceId;
    if (command.percentageBps !== undefined) payload.percentage_bps = command.percentageBps;
    if (command.fixedAmountCents !== undefined)
      payload.fixed_amount_cents = command.fixedAmountCents;
    if (command.effectiveFrom !== undefined) payload.effective_from = command.effectiveFrom;
    if (command.effectiveUntil !== undefined) payload.effective_until = command.effectiveUntil;

    if (command.type === 'PERCENTAGE' || command.percentageBps !== undefined) {
      payload.fixed_amount_cents = null;
    }
    if (command.type === 'FIXED_AMOUNT' || command.fixedAmountCents !== undefined) {
      payload.percentage_bps = null;
    }

    const { data, error } = await this.client
      .from('commission_rules')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', ruleId)
      .select(commissionRuleSelect)
      .single();

    if (error) throw error;
    return toVisibleCommissionRule(context, data as CommissionRuleRow);
  }

  async listAccruals(context: RequestContext, filters: CommissionAccrualFilters = {}) {
    let request = this.client
      .from('commission_accruals')
      .select(commissionAccrualSelect)
      .eq('tenant_id', context.tenantId)
      .order('accrued_at', { ascending: false })
      .limit(filters.limit ?? 100) as unknown as QueryLike;

    request = applyBranchScope(request, context, filters.branchId);
    if (filters.professionalId) request = request.eq('professional_id', filters.professionalId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.payoutId) request = request.eq('payout_id', filters.payoutId);
    if (filters.orderId) request = request.eq('order_id', filters.orderId);
    if (filters.periodStart) request = request.gte('accrued_at', filters.periodStart);
    if (filters.periodEnd) request = request.lte('accrued_at', endOfDay(filters.periodEnd));
    if (filters.cursor) request = request.lt('accrued_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as CommissionAccrualRow[]).map((row) =>
      toVisibleCommissionAccrual(context, row),
    );
  }

  async generateAccruals(
    context: RequestContext,
    command: Parameters<CommissionRepository['generateAccruals']>[1],
    accruals: readonly CommissionAccrual[],
  ) {
    if (accruals.length === 0) return [];
    const { error } = await this.client.from('commission_accruals').insert(
      accruals.map((accrual) => ({
        tenant_id: context.tenantId,
        branch_id: accrual.branchId,
        professional_id: accrual.professionalId,
        order_id: command.orderId,
        order_item_id: accrual.orderItemId,
        payment_id: command.paymentId ?? accrual.paymentId ?? null,
        rule_id: accrual.ruleId ?? null,
        rule_type_snapshot: accrual.ruleTypeSnapshot,
        rule_scope_snapshot: accrual.ruleScopeSnapshot,
        rule_percentage_bps_snapshot: accrual.rulePercentageBpsSnapshot ?? null,
        rule_fixed_amount_cents_snapshot: accrual.ruleFixedAmountCentsSnapshot ?? null,
        base_amount_cents: accrual.baseAmountCents,
        commission_amount_cents: accrual.commissionAmountCents,
        status: 'OPEN',
        accrued_at: accrual.accruedAt,
      })),
    );

    if (error) throw error;
    return this.listAccruals(context, {
      branchId: accruals[0]?.branchId,
      orderId: command.orderId,
      limit: Math.max(accruals.length, 100),
    });
  }

  async reverseAccruals(
    context: RequestContext,
    command: ReverseCommissionAccrualsCommand,
    reversals: readonly CommissionAccrual[],
  ) {
    if (reversals.length === 0) return [];
    const { error } = await this.client.from('commission_accruals').insert(
      reversals.map((reversal) => ({
        tenant_id: context.tenantId,
        branch_id: reversal.branchId,
        professional_id: reversal.professionalId,
        order_id: command.orderId,
        order_item_id: reversal.orderItemId,
        payment_id: command.paymentId ?? reversal.paymentId ?? null,
        rule_id: reversal.ruleId ?? null,
        rule_type_snapshot: reversal.ruleTypeSnapshot,
        rule_scope_snapshot: reversal.ruleScopeSnapshot,
        rule_percentage_bps_snapshot: reversal.rulePercentageBpsSnapshot ?? null,
        rule_fixed_amount_cents_snapshot: reversal.ruleFixedAmountCentsSnapshot ?? null,
        base_amount_cents: reversal.baseAmountCents,
        commission_amount_cents: reversal.commissionAmountCents,
        status: 'REVERSED',
        accrued_at: reversal.accruedAt,
        reversed_accrual_id: reversal.reversedAccrualId ?? null,
      })),
    );

    if (error) throw error;
    return this.listAccruals(context, {
      branchId: reversals[0]?.branchId,
      orderId: command.orderId,
      status: 'REVERSED',
      limit: Math.max(reversals.length, 100),
    });
  }

  async getSummary(context: RequestContext, filters: CommissionPeriod & { branchId?: string }) {
    const [accruals, payouts] = await Promise.all([
      this.listAccruals(context, { ...filters, limit: 1_000 }),
      this.listPayouts(context, { ...filters, status: 'PAID', limit: 1_000 }),
    ]);
    const professionalIds = new Set(accruals.map((accrual) => accrual.professionalId));

    return commissionSummarySchema.parse({
      tenantId: context.tenantId,
      branchId: filters.branchId,
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      openAccrualAmountCents: sumAccruals(accruals, ['OPEN']),
      settledAccrualAmountCents: sumAccruals(accruals, ['SETTLED']),
      reversedAccrualAmountCents: sumAccruals(accruals, ['REVERSED', 'ADJUSTED']),
      paidPayoutAmountCents: payouts.reduce((total, payout) => total + payout.totalAmountCents, 0),
      professionalCount: professionalIds.size,
      accrualCount: accruals.length,
    });
  }

  async listPayouts(context: RequestContext, filters: PayoutFilters = {}) {
    let request = this.client
      .from('payouts')
      .select(payoutSelect)
      .eq('tenant_id', context.tenantId)
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100) as unknown as QueryLike;

    request = applyBranchScope(request, context, filters.branchId);
    if (filters.professionalId) request = request.eq('professional_id', filters.professionalId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.periodStart) request = request.gte('period_start', filters.periodStart);
    if (filters.periodEnd) request = request.lte('period_end', filters.periodEnd);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    const rows = (data ?? []) as PayoutRow[];
    return Promise.all(rows.map((row) => this.toVisiblePayoutWithSources(context, row)));
  }

  async getPayoutDetail(context: RequestContext, payoutId: string) {
    const { data, error } = await this.client
      .from('payouts')
      .select(payoutSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', payoutId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const payout = await this.toVisiblePayoutWithSources(context, data as PayoutRow);
    const [allocations, accruals] = await Promise.all([
      this.listPayoutAllocations(context, payout.id),
      this.listAccruals(context, { branchId: payout.branchId, payoutId: payout.id, limit: 1_000 }),
    ]);

    return payoutDetailSchema.parse({ payout, allocations, accruals });
  }

  async closePayout(context: RequestContext, command: ClosePayoutCommand) {
    const { data, error } = await this.client.rpc('close_professional_payout', {
      p_tenant_id: context.tenantId,
      p_branch_id: command.branchId,
      p_professional_id: command.professionalId,
      p_period_start: command.periodStart,
      p_period_end: command.periodEnd,
      p_actor_id: context.userId,
      p_idempotency_key: command.idempotencyKey,
    });

    if (error) throw error;
    return (await this.getPayoutDetail(context, data as string)) as NonNullable<
      Awaited<ReturnType<CommissionRepository['getPayoutDetail']>>
    >;
  }

  async payPayout(context: RequestContext, command: PayPayoutCommand) {
    const current = await this.getPayoutDetail(context, command.payoutId);
    if (!current) throw new Error('Payout was not found.');

    const { error } = await this.client.rpc('pay_professional_payout', {
      p_tenant_id: context.tenantId,
      p_branch_id: current.payout.branchId,
      p_payout_id: command.payoutId,
      p_actor_id: context.userId,
      p_payment_method: command.paymentMethod,
      p_cash_session_id: command.cashRegisterSessionId ?? null,
      p_idempotency_key: command.idempotencyKey,
    });

    if (error) throw error;
    return (await this.getPayoutDetail(context, command.payoutId)) as NonNullable<
      Awaited<ReturnType<CommissionRepository['getPayoutDetail']>>
    >;
  }

  async correctPayout(context: RequestContext, command: CorrectPayoutCommand) {
    const current = await this.getPayoutDetail(context, command.payoutId);
    if (!current) throw new Error('Payout was not found.');

    const signedAmountCents =
      command.direction === 'IN' ? command.amountCents : -command.amountCents;
    const { error: entryError } = await this.client.from('financial_entries').insert({
      tenant_id: context.tenantId,
      branch_id: current.payout.branchId,
      direction: command.direction,
      type: 'ADJUSTMENT',
      status: 'POSTED',
      amount_cents: command.amountCents,
      signed_amount_cents: signedAmountCents,
      competence_date: new Date().toISOString().slice(0, 10),
      cash_date: new Date().toISOString().slice(0, 10),
      source_type: 'PAYOUT',
      source_id: command.payoutId,
      description: command.reason,
      idempotency_key: command.idempotencyKey,
      created_by: context.userId,
    });
    if (entryError) throw entryError;

    const { error: payoutError } = await this.client
      .from('payouts')
      .update({
        status: 'CORRECTED',
        correction_reason: command.reason,
        correction_idempotency_key: command.idempotencyKey,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.payoutId);
    if (payoutError) throw payoutError;

    return (await this.getPayoutDetail(context, command.payoutId)) as NonNullable<
      Awaited<ReturnType<CommissionRepository['getPayoutDetail']>>
    >;
  }

  async getProfessionalWallet(context: RequestContext, filters: ProfessionalWalletFilters) {
    const [accruals, payouts] = await Promise.all([
      this.listAccruals(context, {
        branchId: filters.branchId,
        professionalId: filters.professionalId,
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd,
        limit: 1_000,
      }),
      this.listPayouts(context, {
        branchId: filters.branchId,
        professionalId: filters.professionalId,
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd,
        limit: 1_000,
      }),
    ]);
    const branchIds = Array.from(
      new Set([
        ...accruals.map((accrual) => accrual.branchId),
        ...payouts.map((payout) => payout.branchId),
      ]),
    );
    const productionAmountCents = accruals.reduce(
      (total, accrual) => total + accrual.baseAmountCents,
      0,
    );
    const openCommissionAmountCents = sumAccruals(accruals, ['OPEN']);
    const paidPayoutAmountCents = payouts
      .filter((payout) => payout.status === 'PAID')
      .reduce((total, payout) => total + payout.totalAmountCents, 0);

    return professionalWalletSchema.parse({
      tenantId: context.tenantId,
      professionalId: filters.professionalId,
      branchIds: branchIds.length
        ? branchIds
        : filters.branchId
          ? [filters.branchId]
          : [...context.branchScope],
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      productionAmountCents,
      openCommissionAmountCents,
      paidPayoutAmountCents,
      expectedBalanceAmountCents: openCommissionAmountCents - paidPayoutAmountCents,
      accruals,
      payouts,
    });
  }

  private async toVisiblePayoutWithSources(context: RequestContext, row: PayoutRow) {
    assertVisibleRow(context, row, 'payout');
    const sources = await this.listPayoutSources(context, row.id);
    return toPayout(row, sources);
  }

  private async listPayoutSources(
    context: RequestContext,
    payoutId: string,
  ): Promise<PayoutSource[]> {
    const allocations = await this.listPayoutAllocations(context, payoutId);
    return allocations.map((allocation) => ({
      accrualId: allocation.accrualId,
      amountCents: allocation.amountCents,
    }));
  }

  private async listPayoutAllocations(context: RequestContext, payoutId: string) {
    const { data, error } = await this.client
      .from('payout_allocations')
      .select(payoutAllocationSelect)
      .eq('tenant_id', context.tenantId)
      .eq('payout_id', payoutId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as PayoutAllocationRow[]).map((row) =>
      toVisiblePayoutAllocation(context, row),
    );
  }
}

export function toCommissionRule(row: CommissionRuleRow) {
  return commissionRuleSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    scope: row.scope,
    type: row.type,
    status: row.status,
    professionalId: row.professional_id ?? undefined,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
    percentageBps: row.percentage_bps ?? undefined,
    fixedAmountCents: row.fixed_amount_cents ?? undefined,
    effectiveFrom: toDateOnly(row.effective_from),
    effectiveUntil: row.effective_until ? toDateOnly(row.effective_until) : undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toCommissionAccrual(row: CommissionAccrualRow) {
  return commissionAccrualSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    professionalId: row.professional_id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    paymentId: row.payment_id ?? undefined,
    ruleId: row.rule_id ?? undefined,
    ruleTypeSnapshot: row.rule_type_snapshot,
    ruleScopeSnapshot: row.rule_scope_snapshot,
    rulePercentageBpsSnapshot: row.rule_percentage_bps_snapshot ?? undefined,
    ruleFixedAmountCentsSnapshot: row.rule_fixed_amount_cents_snapshot ?? undefined,
    baseAmountCents: row.base_amount_cents,
    commissionAmountCents: row.commission_amount_cents,
    status: row.status,
    accruedAt: toIsoDateTime(row.accrued_at),
    reversedAccrualId: row.reversed_accrual_id ?? undefined,
    payoutId: row.payout_id ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toPayout(row: PayoutRow, sources: readonly PayoutSource[]) {
  return payoutSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    professionalId: row.professional_id,
    status: row.status,
    periodStart: toDateOnly(row.period_start),
    periodEnd: toDateOnly(row.period_end),
    totalAmountCents: row.total_amount_cents,
    sources,
    paymentMethod: row.payment_method ?? undefined,
    financialEntryId: row.financial_entry_id ?? undefined,
    cashMovementId: row.cash_movement_id ?? undefined,
    idempotencyKey: row.payment_idempotency_key ?? row.idempotency_key ?? undefined,
    closedBy: row.closed_by ?? undefined,
    closedAt: row.closed_at ? toIsoDateTime(row.closed_at) : undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ? toIsoDateTime(row.approved_at) : undefined,
    paidBy: row.paid_by ?? undefined,
    paidAt: row.paid_at ? toIsoDateTime(row.paid_at) : undefined,
    correctionReason: row.correction_reason ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toPayoutAllocation(row: PayoutAllocationRow): PayoutAllocation {
  return payoutAllocationSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    payoutId: row.payout_id,
    accrualId: row.accrual_id,
    amountCents: row.amount_cents,
    createdAt: toIsoDateTime(row.created_at),
  });
}

function toVisibleCommissionRule(context: RequestContext, row: CommissionRuleRow) {
  assertVisibleRow(context, row, 'commission rule');
  return toCommissionRule(row);
}

function toVisibleCommissionAccrual(context: RequestContext, row: CommissionAccrualRow) {
  assertVisibleRow(context, row, 'commission accrual');
  return toCommissionAccrual(row);
}

function toVisiblePayoutAllocation(context: RequestContext, row: PayoutAllocationRow) {
  assertVisibleRow(context, row, 'payout allocation');
  return toPayoutAllocation(row);
}

function applyBranchScope(request: QueryLike, context: RequestContext, branchId?: string) {
  if (branchId) return request.eq('branch_id', branchId);
  if (context.branchScope.length === 1) return request.eq('branch_id', context.branchScope[0]);
  return request.in('branch_id', [...context.branchScope]);
}

function applyNullableBranchScope<Query extends QueryLike>(
  request: Query,
  context: RequestContext,
  branchId?: string,
): Query {
  if (branchId) return request.or(`branch_id.is.null,branch_id.eq.${branchId}`) as Query;
  if (context.branchScope.length === 1) {
    return request.or(`branch_id.is.null,branch_id.eq.${context.branchScope[0]}`) as Query;
  }
  return request.or(`branch_id.is.null,branch_id.in.(${context.branchScope.join(',')})`) as Query;
}

function assertVisibleRow(
  context: RequestContext,
  row: { tenant_id: string; branch_id?: string | null },
  label: string,
) {
  if (row.tenant_id !== context.tenantId) {
    throw new Error(`${label} row is outside the requested tenant scope.`);
  }
  if (row.branch_id && !context.branchScope.includes(row.branch_id)) {
    throw new Error(`${label} row is outside the authorized branch scope.`);
  }
}

function sumAccruals(
  accruals: readonly CommissionAccrual[],
  statuses: readonly CommissionAccrual['status'][],
) {
  return accruals
    .filter((accrual) => statuses.includes(accrual.status))
    .reduce((total, accrual) => total + accrual.commissionAmountCents, 0);
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function endOfDay(value: string) {
  return `${value}T23:59:59.999Z`;
}
