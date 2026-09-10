import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cashMovementSchema,
  cashRegisterSessionSchema,
  type CashMovement,
  type CashRegisterMovementCommand,
  type CashRegisterSession,
  type CloseCashRegisterCommand,
  type OpenCashRegisterCommand,
  type RequestContext,
} from '@barberos/contracts';

import type {
  CashMovementListFilters,
  CashRegisterRepository,
  CashRegisterSessionFilters,
  CashRegisterSummary,
} from '../domain';

const cashRegisterSessionSelect =
  'id, tenant_id, branch_id, status, opened_by, opened_at, opening_balance_amount_cents, expected_balance_amount_cents, actual_balance_amount_cents, difference_amount_cents, closed_by, closed_at, closing_notes, created_at, updated_at';
const cashMovementSelect =
  'id, tenant_id, branch_id, session_id, type, amount_cents, signed_amount_cents, order_id, payment_id, reason, created_by, created_at';

type CashRegisterSessionRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  status: CashRegisterSession['status'];
  opened_by?: string | null;
  opened_at: string;
  opening_balance_amount_cents: number;
  expected_balance_amount_cents: number;
  actual_balance_amount_cents?: number | null;
  difference_amount_cents: number;
  closed_by?: string | null;
  closed_at?: string | null;
  closing_notes?: string | null;
  created_at: string;
  updated_at: string;
};

type CashMovementRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  session_id: string;
  type: CashMovement['type'];
  amount_cents: number;
  signed_amount_cents: number;
  order_id?: string | null;
  payment_id?: string | null;
  reason?: string | null;
  created_by?: string | null;
  created_at: string;
};

export class SupabaseCashRegisterRepository implements CashRegisterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findCurrentSession(context: RequestContext, filters: CashRegisterSessionFilters = {}) {
    let request = this.client
      .from('cash_register_sessions')
      .select(cashRegisterSessionSelect)
      .eq('tenant_id', context.tenantId)
      .eq('status', filters.status ?? 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (filters.branchId) request = request.eq('branch_id', filters.branchId);

    const { data, error } = await request.maybeSingle();
    if (error) throw error;
    return data ? this.toSummary(context, data as CashRegisterSessionRow) : null;
  }

  async findSessionById(context: RequestContext, sessionId: string) {
    const { data, error } = await this.client
      .from('cash_register_sessions')
      .select(cashRegisterSessionSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.toSummary(context, data as CashRegisterSessionRow) : null;
  }

  async openSession(context: RequestContext, command: OpenCashRegisterCommand) {
    const { data, error } = await this.client.rpc('open_cash_register_session', {
      p_tenant_id: context.tenantId,
      p_branch_id: command.branchId,
      p_actor_id: context.userId,
      p_opening_balance_amount_cents: command.openingBalanceAmountCents,
      p_idempotency_key: command.idempotencyKey,
      p_notes: command.notes ?? null,
    });

    if (error) throw error;
    return (await this.findSessionById(context, data as string)) as CashRegisterSession;
  }

  async recordMovement(context: RequestContext, command: CashRegisterMovementCommand) {
    const { data, error } = await this.client.rpc('record_cash_register_movement', {
      p_tenant_id: context.tenantId,
      p_branch_id: command.branchId,
      p_actor_id: context.userId,
      p_type: command.type,
      p_amount_cents: command.amountCents,
      p_reason: command.reason,
      p_idempotency_key: command.idempotencyKey,
    });

    if (error) throw error;
    return (await this.findMovementById(context, data as string)) as CashMovement;
  }

  async closeSession(context: RequestContext, command: CloseCashRegisterCommand) {
    const current = await this.findSessionById(context, command.sessionId);
    if (!current) throw new Error('Cash register session was not found.');

    const { data, error } = await this.client.rpc('close_cash_register_session', {
      p_tenant_id: context.tenantId,
      p_branch_id: current.branchId,
      p_session_id: command.sessionId,
      p_actor_id: context.userId,
      p_actual_balance_amount_cents: command.actualBalanceAmountCents,
      p_difference_reason: command.differenceReason ?? null,
      p_idempotency_key: command.idempotencyKey,
    });

    if (error) throw error;
    return (await this.findSessionById(context, data as string)) as CashRegisterSession;
  }

  async listMovements(context: RequestContext, filters: CashMovementListFilters = {}) {
    let request = this.client
      .from('cash_movements')
      .select(cashMovementSelect)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);

    if (filters.branchId) request = request.eq('branch_id', filters.branchId);
    if (filters.sessionId) request = request.eq('session_id', filters.sessionId);
    if (filters.type) request = request.eq('type', filters.type);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as CashMovementRow[]).map(toCashMovement);
  }

  private async findMovementById(context: RequestContext, movementId: string) {
    const { data, error } = await this.client
      .from('cash_movements')
      .select(cashMovementSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', movementId)
      .maybeSingle();

    if (error) throw error;
    return data ? toCashMovement(data as CashMovementRow) : null;
  }

  private async toSummary(
    context: RequestContext,
    row: CashRegisterSessionRow,
  ): Promise<CashRegisterSummary> {
    const movements = await this.listMovements(context, {
      branchId: row.branch_id,
      sessionId: row.id,
    });
    const cashInAmountCents = movements
      .filter((movement) => movement.signedAmountCents > 0)
      .reduce((total, movement) => total + movement.signedAmountCents, 0);
    const cashOutAmountCents = movements
      .filter((movement) => movement.signedAmountCents < 0)
      .reduce((total, movement) => total + Math.abs(movement.signedAmountCents), 0);
    return { ...toCashRegisterSession(row), movements, cashInAmountCents, cashOutAmountCents };
  }
}

export function toCashRegisterSession(row: CashRegisterSessionRow) {
  return cashRegisterSessionSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    status: row.status,
    openedBy: row.opened_by ?? 'system',
    openedAt: toIsoDateTime(row.opened_at),
    openingBalanceAmountCents: row.opening_balance_amount_cents,
    expectedBalanceAmountCents: row.expected_balance_amount_cents,
    actualBalanceAmountCents: row.actual_balance_amount_cents ?? undefined,
    differenceAmountCents: row.difference_amount_cents,
    closedBy: row.closed_by ?? undefined,
    closedAt: row.closed_at ? toIsoDateTime(row.closed_at) : undefined,
    closingNotes: row.closing_notes ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toCashMovement(row: CashMovementRow) {
  return cashMovementSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    sessionId: row.session_id,
    type: row.type,
    amountCents: row.amount_cents,
    signedAmountCents: row.signed_amount_cents,
    orderId: row.order_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    reason: row.reason ?? undefined,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
  });
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
