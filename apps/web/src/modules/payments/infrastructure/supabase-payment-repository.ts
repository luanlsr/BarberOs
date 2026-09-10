import type { SupabaseClient } from '@supabase/supabase-js';
import {
  paymentSchema,
  type Payment,
  type ReceivePaymentCommand,
  type RefundPaymentCommand,
  type RequestContext,
} from '@barberos/contracts';

import {
  calculateAmountDue,
  calculatePaidAmount,
  type PaymentListFilters,
  type PaymentReceiveResult,
  type PaymentRepository,
} from '../domain';

const paymentSelect =
  'id, tenant_id, branch_id, order_id, method, status, amount_cents, cash_received_amount_cents, change_due_amount_cents, external_reference, idempotency_key, received_by, received_at, refunded_amount_cents, created_at, updated_at';
const orderPaymentSelect = 'id, tenant_id, branch_id, total_amount_cents';

type PaymentRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  order_id: string;
  method: Payment['method'];
  status: Payment['status'];
  amount_cents: number;
  cash_received_amount_cents?: number | null;
  change_due_amount_cents: number;
  external_reference?: string | null;
  idempotency_key?: string | null;
  received_by?: string | null;
  received_at: string;
  refunded_amount_cents: number;
  created_at: string;
  updated_at: string;
};

type OrderPaymentRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  total_amount_cents: number;
};

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(context: RequestContext, filters: PaymentListFilters = {}) {
    let request = this.client
      .from('payments')
      .select(paymentSelect)
      .eq('tenant_id', context.tenantId)
      .order('received_at', { ascending: false })
      .limit(filters.limit ?? 25);

    if (filters.branchId) request = request.eq('branch_id', filters.branchId);
    if (filters.orderId) request = request.eq('order_id', filters.orderId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.method) request = request.eq('method', filters.method);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as PaymentRow[]).map(toPayment);
  }

  async findById(context: RequestContext, paymentId: string) {
    const { data, error } = await this.client
      .from('payments')
      .select(paymentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', paymentId)
      .maybeSingle();

    if (error) throw error;
    return data ? toPayment(data as PaymentRow) : null;
  }

  async findReceiveResultByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('payments')
      .select(paymentSelect)
      .eq('tenant_id', context.tenantId)
      .like('idempotency_key', idempotencyKey + ':%')
      .order('received_at', { ascending: true });

    if (error) throw error;
    const payments = ((data ?? []) as PaymentRow[]).map(toPayment);
    if (!payments.length) return null;
    const first = payments[0];
    const order = await this.findOrderForPayment(context, first.orderId);
    const orderPayments = await this.list(context, { orderId: first.orderId, limit: 100 });
    const paidAmountCents = calculatePaidAmount(orderPayments);
    const result: PaymentReceiveResult = {
      tenantId: first.tenantId,
      branchId: first.branchId,
      orderId: first.orderId,
      paymentIds: payments.map((payment) => payment.id),
      paidAmountCents,
      amountDueCents: order ? calculateAmountDue(order.total_amount_cents, orderPayments) : 0,
      status: order && paidAmountCents < order.total_amount_cents ? 'PARTIALLY_PAID' : 'PAID',
      idempotencyKey,
    };
    return result;
  }

  async findRefundResultByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('payment_refunds')
      .select('payment_id')
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    const paymentId = (data as { payment_id?: string } | null)?.payment_id;
    return paymentId ? this.findById(context, paymentId) : null;
  }

  async receivePayment(context: RequestContext, command: ReceivePaymentCommand) {
    const order = await this.findOrderForPayment(context, command.orderId);
    if (!order) throw new Error('Order was not found.');

    const { error } = await this.client.rpc('receive_order_payment_with_money_effects', {
      p_tenant_id: context.tenantId,
      p_branch_id: order.branch_id,
      p_order_id: command.orderId,
      p_actor_id: context.userId,
      p_idempotency_key: command.idempotencyKey,
      p_payments: command.payments,
      p_notes: command.notes ?? null,
    });
    if (error) throw error;

    const payments = await this.list(context, { orderId: command.orderId, limit: 100 });
    const paidAmountCents = calculatePaidAmount(payments);
    const amountDueCents = calculateAmountDue(order.total_amount_cents, payments);
    const result: PaymentReceiveResult = {
      tenantId: order.tenant_id,
      branchId: order.branch_id,
      orderId: command.orderId,
      paymentIds: payments.map((payment) => payment.id),
      paidAmountCents,
      amountDueCents,
      status: amountDueCents === 0 ? 'PAID' : 'PARTIALLY_PAID',
      idempotencyKey: command.idempotencyKey,
    };
    return result;
  }

  async refundPayment(context: RequestContext, command: RefundPaymentCommand) {
    const payment = await this.findById(context, command.paymentId);
    if (!payment) throw new Error('Payment was not found.');

    const { error } = await this.client.rpc('refund_payment_with_money_effects', {
      p_tenant_id: context.tenantId,
      p_branch_id: payment.branchId,
      p_payment_id: command.paymentId,
      p_actor_id: context.userId,
      p_amount_cents: command.amountCents,
      p_reason: command.reason,
      p_idempotency_key: command.idempotencyKey,
    });
    if (error) throw error;

    return (await this.findById(context, command.paymentId)) as Payment;
  }

  private async findOrderForPayment(context: RequestContext, orderId: string) {
    const { data, error } = await this.client
      .from('orders')
      .select(orderPaymentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return (data as OrderPaymentRow | null) ?? null;
  }
}

export function toPayment(row: PaymentRow) {
  return paymentSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amountCents: row.amount_cents,
    cashReceivedAmountCents: row.cash_received_amount_cents ?? undefined,
    changeDueAmountCents: row.change_due_amount_cents,
    externalReference: row.external_reference ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    receivedBy: row.received_by ?? 'system',
    receivedAt: toIsoDateTime(row.received_at),
    refundedAmountCents: row.refunded_amount_cents,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
