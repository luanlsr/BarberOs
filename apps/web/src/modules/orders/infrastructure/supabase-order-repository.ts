import type { SupabaseClient } from '@supabase/supabase-js';
import {
  orderDetailSchema,
  orderHistorySchema,
  orderItemSchema,
  orderSchema,
  type AppointmentStatus,
  type CreateOrderItemCommand,
  type CreateWalkInOrderCommand,
  type Order,
  type OrderDetail,
  type OrderHistory,
  type OrderItem,
  type OrderStatus,
  type RemoveOrderItemCommand,
  type RequestContext,
  type UpdateOrderItemCommand,
} from '@barberos/contracts';

import {
  calculateOrderItemFinalAmount,
  calculateOrderTotals,
  type CheckInAppointmentSnapshot,
  type OpenOrderFromAppointmentCommand,
  type OrderAppointmentRepository,
  type OrderListFilters,
  type OrderRepository,
} from '../domain';

const orderSelect =
  'id, tenant_id, branch_id, appointment_id, customer_id, professional_id, status, subtotal_amount_cents, discount_amount_cents, total_amount_cents, notes, opened_at, closed_at, created_by, updated_by, created_at, updated_at';
const orderItemSelect =
  'id, tenant_id, branch_id, order_id, source_type, source_id, name_snapshot, quantity, unit_price_amount_cents, discount_amount_cents, final_amount_cents, professional_id, notes, created_by, created_at';
const orderHistorySelect =
  'id, tenant_id, branch_id, order_id, event_type, actor_id, reason, metadata, created_at';
const appointmentSelect =
  'id, tenant_id, branch_id, customer_id, professional_id, status, appointment_services(service_id, service_name, price_cents, sequence)';

type OrderRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  appointment_id?: string | null;
  customer_id?: string | null;
  professional_id?: string | null;
  status: OrderStatus;
  subtotal_amount_cents: number;
  discount_amount_cents: number;
  total_amount_cents: number;
  notes?: string | null;
  opened_at: string;
  closed_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  order_id: string;
  source_type: OrderItem['sourceType'];
  source_id?: string | null;
  name_snapshot: string;
  quantity: number;
  unit_price_amount_cents: number;
  discount_amount_cents: number;
  final_amount_cents: number;
  professional_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
};

type OrderHistoryRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  order_id: string;
  event_type: OrderHistory['eventType'];
  actor_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type AppointmentServiceRow = {
  service_id: string;
  service_name: string;
  price_cents: number;
  sequence: number;
};

type CheckInAppointmentRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string;
  professional_id: string;
  status: AppointmentStatus;
  appointment_services?: AppointmentServiceRow[] | null;
};

export class SupabaseOrderRepository implements OrderRepository, OrderAppointmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(context: RequestContext, filters: OrderListFilters = {}) {
    let request = this.client
      .from('orders')
      .select(orderSelect)
      .eq('tenant_id', context.tenantId)
      .order('opened_at', { ascending: false })
      .limit(filters.limit ?? 25);

    if (filters.branchId) request = request.eq('branch_id', filters.branchId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.customerId) request = request.eq('customer_id', filters.customerId);
    if (filters.professionalId) request = request.eq('professional_id', filters.professionalId);
    if (filters.appointmentId) request = request.eq('appointment_id', filters.appointmentId);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as OrderRow[]).map(toOrder);
  }

  async findById(context: RequestContext, orderId: string) {
    const row = await this.findOrderRow(context, orderId);
    return row ? this.toOrderDetail(context, row) : null;
  }

  async findByAppointmentId(context: RequestContext, appointmentId: string) {
    const { data, error } = await this.client
      .from('orders')
      .select(orderSelect)
      .eq('tenant_id', context.tenantId)
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.toOrderDetail(context, data as OrderRow) : null;
  }

  async createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand) {
    const { data, error } = await this.client
      .from('orders')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        customer_id: command.customerId,
        professional_id: command.professionalId,
        status: 'OPEN',
        subtotal_amount_cents: 0,
        discount_amount_cents: 0,
        total_amount_cents: 0,
        notes: command.notes,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return this.findById(context, (data as { id: string }).id) as Promise<OrderDetail>;
  }

  async createFromAppointment(context: RequestContext, command: OpenOrderFromAppointmentCommand) {
    const { data, error } = await this.client.rpc('check_in_appointment_order', {
      p_tenant_id: context.tenantId,
      p_branch_id: command.appointment.branchId,
      p_appointment_id: command.appointment.id,
      p_actor_id: context.userId,
      p_idempotency_key: command.idempotencyKey ?? null,
      p_notes: command.notes ?? null,
    });

    if (error) throw error;
    return this.findById(context, data as string) as Promise<OrderDetail>;
  }

  async updateStatus(context: RequestContext, orderId: string, status: OrderStatus) {
    const { data, error } = await this.client
      .from('orders')
      .update({
        status,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', orderId)
      .select(orderSelect)
      .single();

    if (error) throw error;
    return toOrder(data as OrderRow);
  }

  async addItem(context: RequestContext, command: CreateOrderItemCommand) {
    const order = await this.findById(context, command.orderId);
    if (!order) throw new Error('Order was not found.');

    const quantity = command.quantity ?? 1;
    const discountAmountCents = command.discountAmountCents ?? 0;
    const { error } = await this.client.from('order_items').insert({
      tenant_id: order.tenantId,
      branch_id: order.branchId,
      order_id: order.id,
      source_type: command.sourceType,
      source_id: command.sourceId,
      name_snapshot: command.name,
      quantity,
      unit_price_amount_cents: command.unitPriceAmountCents,
      discount_amount_cents: discountAmountCents,
      final_amount_cents: calculateOrderItemFinalAmount(command),
      professional_id: command.professionalId,
      notes: command.notes,
      created_by: context.userId,
    });

    if (error) throw error;
    return this.recalculateTotals(context, order.id);
  }

  async updateItem(context: RequestContext, command: UpdateOrderItemCommand) {
    const item = await this.findItem(context, command.orderId, command.itemId);
    if (!item) throw new Error('Order item was not found.');

    const quantity = command.quantity ?? item.quantity;
    const discountAmountCents = command.discountAmountCents ?? item.discountAmountCents;
    const { error } = await this.client
      .from('order_items')
      .update({
        quantity,
        discount_amount_cents: discountAmountCents,
        final_amount_cents: quantity * item.unitPriceAmountCents - discountAmountCents,
        professional_id: command.professionalId ?? item.professionalId,
        notes: command.notes ?? item.notes,
      })
      .eq('tenant_id', context.tenantId)
      .eq('order_id', command.orderId)
      .eq('id', command.itemId);

    if (error) throw error;
    return this.recalculateTotals(context, command.orderId);
  }

  async removeItem(context: RequestContext, command: RemoveOrderItemCommand) {
    const { error } = await this.client
      .from('order_items')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('order_id', command.orderId)
      .eq('id', command.itemId);

    if (error) throw error;
    return this.recalculateTotals(context, command.orderId);
  }

  async recordHistory(context: RequestContext, entry: Omit<OrderHistory, 'id' | 'createdAt'>) {
    const { error } = await this.client.from('order_history').insert({
      tenant_id: context.tenantId,
      branch_id: entry.branchId,
      order_id: entry.orderId,
      event_type: entry.eventType,
      actor_id: entry.actorId,
      reason: entry.reason,
      metadata: entry.metadata ?? {},
    });

    if (error) throw error;
  }

  async findAppointmentForCheckIn(context: RequestContext, appointmentId: string) {
    const { data, error } = await this.client
      .from('appointments')
      .select(appointmentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data ? toCheckInAppointment(data as CheckInAppointmentRow) : null;
  }

  private async findOrderRow(context: RequestContext, orderId: string) {
    const { data, error } = await this.client
      .from('orders')
      .select(orderSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return (data as OrderRow | null) ?? null;
  }

  private async findItem(context: RequestContext, orderId: string, itemId: string) {
    const { data, error } = await this.client
      .from('order_items')
      .select(orderItemSelect)
      .eq('tenant_id', context.tenantId)
      .eq('order_id', orderId)
      .eq('id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data ? toOrderItem(data as OrderItemRow) : null;
  }

  private async toOrderDetail(context: RequestContext, row: OrderRow) {
    const [items, history] = await Promise.all([
      this.listItems(context, row.id),
      this.listHistory(context, row.id),
    ]);
    return orderDetailSchema.parse({ ...toOrder(row), items, history });
  }

  private async listItems(context: RequestContext, orderId: string) {
    const { data, error } = await this.client
      .from('order_items')
      .select(orderItemSelect)
      .eq('tenant_id', context.tenantId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as OrderItemRow[]).map(toOrderItem);
  }

  private async listHistory(context: RequestContext, orderId: string) {
    const { data, error } = await this.client
      .from('order_history')
      .select(orderHistorySelect)
      .eq('tenant_id', context.tenantId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as OrderHistoryRow[]).map(toOrderHistory);
  }

  private async recalculateTotals(context: RequestContext, orderId: string) {
    const items = await this.listItems(context, orderId);
    const totals = calculateOrderTotals(items);
    const { error } = await this.client
      .from('orders')
      .update({
        subtotal_amount_cents: totals.subtotalAmountCents,
        discount_amount_cents: totals.discountAmountCents,
        total_amount_cents: totals.totalAmountCents,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', orderId);

    if (error) throw error;
    return this.findById(context, orderId) as Promise<OrderDetail>;
  }
}

function toOrder(row: OrderRow): Order {
  return orderSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    appointmentId: row.appointment_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    professionalId: row.professional_id ?? undefined,
    status: row.status,
    subtotalAmountCents: row.subtotal_amount_cents,
    discountAmountCents: row.discount_amount_cents,
    totalAmountCents: row.total_amount_cents,
    notes: row.notes ?? undefined,
    openedAt: toIsoDateTime(row.opened_at),
    closedAt: row.closed_at ? toIsoDateTime(row.closed_at) : undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return orderItemSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    orderId: row.order_id,
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    nameSnapshot: row.name_snapshot,
    quantity: row.quantity,
    unitPriceAmountCents: row.unit_price_amount_cents,
    discountAmountCents: row.discount_amount_cents,
    finalAmountCents: row.final_amount_cents,
    professionalId: row.professional_id ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
  });
}

function toOrderHistory(row: OrderHistoryRow): OrderHistory {
  return orderHistorySchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    orderId: row.order_id,
    eventType: row.event_type,
    actorId: row.actor_id ?? 'system',
    reason: row.reason ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: toIsoDateTime(row.created_at),
  });
}

function toCheckInAppointment(row: CheckInAppointmentRow): CheckInAppointmentSnapshot {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    customerId: row.customer_id,
    professionalId: row.professional_id,
    status: row.status,
    services: (row.appointment_services ?? [])
      .map((service) => ({
        serviceId: service.service_id,
        serviceName: service.service_name,
        priceCents: service.price_cents,
        sequence: service.sequence,
      }))
      .sort((left, right) => left.sequence - right.sequence),
  };
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
