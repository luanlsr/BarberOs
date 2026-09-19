import type { SupabaseClient } from '@supabase/supabase-js';
import {
  paymentTerminalIntentSchema,
  paymentTerminalSchema,
  type PaymentTerminal,
  type PaymentTerminalIntent,
  type RequestContext,
} from '@barberos/contracts';

import type {
  CreatePaymentTerminalIntentRecord,
  PaymentTerminalListFilters,
  PaymentTerminalRepository,
  TerminalProviderChargeResult,
} from '../domain';

const terminalSelect =
  'id, tenant_id, branch_id, provider, provider_terminal_id, name, status, created_at, updated_at';
const intentSelect =
  'id, tenant_id, branch_id, order_id, terminal_id, provider, method, status, amount_cents, installments, provider_intent_id, provider_reference, payment_id, idempotency_key, created_by, created_at, updated_at, paid_at, failure_code, failure_message';

type PaymentTerminalRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  provider: PaymentTerminal['provider'];
  provider_terminal_id: string;
  name: string;
  status: PaymentTerminal['status'];
  created_at: string;
  updated_at: string;
};

type PaymentTerminalIntentRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  order_id: string;
  terminal_id: string;
  provider: PaymentTerminalIntent['provider'];
  method: PaymentTerminalIntent['method'];
  status: PaymentTerminalIntent['status'];
  amount_cents: number;
  installments?: number | null;
  provider_intent_id?: string | null;
  provider_reference?: string | null;
  payment_id?: string | null;
  idempotency_key: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
};

export class SupabasePaymentTerminalRepository implements PaymentTerminalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listTerminals(context: RequestContext, filters: PaymentTerminalListFilters = {}) {
    let request = this.client
      .from('payment_terminals')
      .select(terminalSelect)
      .eq('tenant_id', context.tenantId)
      .order('name', { ascending: true });

    if (filters.branchId) request = request.eq('branch_id', filters.branchId);
    if (filters.status) request = request.eq('status', filters.status);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as PaymentTerminalRow[]).map(toPaymentTerminal);
  }

  async findTerminalById(context: RequestContext, terminalId: string) {
    const { data, error } = await this.client
      .from('payment_terminals')
      .select(terminalSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', terminalId)
      .maybeSingle();

    if (error) throw error;
    return data ? toPaymentTerminal(data as PaymentTerminalRow) : null;
  }

  async findIntentByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('payment_terminal_intents')
      .select(intentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data ? toPaymentTerminalIntent(data as PaymentTerminalIntentRow) : null;
  }

  async createIntent(context: RequestContext, record: CreatePaymentTerminalIntentRecord) {
    const { data, error } = await this.client
      .from('payment_terminal_intents')
      .insert({
        tenant_id: context.tenantId,
        branch_id: record.branchId,
        order_id: record.orderId,
        terminal_id: record.terminalId,
        provider: record.provider,
        method: record.method,
        amount_cents: record.amountCents,
        installments: record.installments ?? null,
        idempotency_key: record.idempotencyKey,
        created_by: context.userId,
      })
      .select(intentSelect)
      .single();

    if (error) throw error;
    return toPaymentTerminalIntent(data as PaymentTerminalIntentRow);
  }

  async updateIntentProviderState(
    context: RequestContext,
    intentId: string,
    result: TerminalProviderChargeResult,
  ) {
    const { data, error } = await this.client
      .from('payment_terminal_intents')
      .update({
        status: result.status,
        provider_intent_id: result.providerIntentId,
        provider_reference: result.providerReference,
        provider_payload: result.payload ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', intentId)
      .select(intentSelect)
      .single();

    if (error) throw error;
    return toPaymentTerminalIntent(data as PaymentTerminalIntentRow);
  }

  async markIntentPaid(context: RequestContext, intentId: string, paymentId: string) {
    const { data, error } = await this.client
      .from('payment_terminal_intents')
      .update({
        status: 'PAID',
        payment_id: paymentId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', intentId)
      .select(intentSelect)
      .single();

    if (error) throw error;
    return toPaymentTerminalIntent(data as PaymentTerminalIntentRow);
  }
}

export function toPaymentTerminal(row: PaymentTerminalRow) {
  return paymentTerminalSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    provider: row.provider,
    providerTerminalId: row.provider_terminal_id,
    name: row.name,
    status: row.status,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toPaymentTerminalIntent(row: PaymentTerminalIntentRow) {
  return paymentTerminalIntentSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    orderId: row.order_id,
    terminalId: row.terminal_id,
    provider: row.provider,
    method: row.method,
    status: row.status,
    amountCents: row.amount_cents,
    installments: row.installments ?? undefined,
    providerIntentId: row.provider_intent_id ?? undefined,
    providerReference: row.provider_reference ?? undefined,
    paymentId: row.payment_id ?? undefined,
    idempotencyKey: row.idempotency_key,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
    paidAt: row.paid_at ? toIsoDateTime(row.paid_at) : undefined,
    failureCode: row.failure_code ?? undefined,
    failureMessage: row.failure_message ?? undefined,
  });
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
