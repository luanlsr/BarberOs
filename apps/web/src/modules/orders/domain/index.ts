import type {
  Appointment,
  CheckInAppointmentCommand,
  CreateOrderItemCommand,
  CreateWalkInOrderCommand,
  Order,
  OrderDetail,
  OrderHistory,
  OrderItem,
  OrderStatus,
  RemoveOrderItemCommand,
  RequestContext,
  UpdateOrderItemCommand,
} from '@barberos/contracts';

export type OrderListFilters = {
  branchId?: string;
  status?: OrderStatus;
  customerId?: string;
  professionalId?: string;
  appointmentId?: string;
  limit?: number;
  cursor?: string;
};

export type OrderServiceSnapshot = {
  serviceId: string;
  serviceName: string;
  priceCents: number;
  sequence: number;
};

export type CheckInAppointmentSnapshot = Pick<
  Appointment,
  'id' | 'tenantId' | 'branchId' | 'customerId' | 'professionalId' | 'status'
> & {
  services: readonly OrderServiceSnapshot[];
};

export type OpenOrderFromAppointmentCommand = CheckInAppointmentCommand & {
  appointment: CheckInAppointmentSnapshot;
};

export interface OrderRepository {
  list(context: RequestContext, filters?: OrderListFilters): Promise<Order[]>;
  findById(context: RequestContext, orderId: string): Promise<OrderDetail | null>;
  findByAppointmentId(context: RequestContext, appointmentId: string): Promise<OrderDetail | null>;
  createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand): Promise<OrderDetail>;
  createFromAppointment(
    context: RequestContext,
    command: OpenOrderFromAppointmentCommand,
  ): Promise<OrderDetail>;
  updateStatus(context: RequestContext, orderId: string, status: OrderStatus): Promise<Order>;
  addItem(context: RequestContext, command: CreateOrderItemCommand): Promise<OrderDetail>;
  updateItem(context: RequestContext, command: UpdateOrderItemCommand): Promise<OrderDetail>;
  removeItem(context: RequestContext, command: RemoveOrderItemCommand): Promise<OrderDetail>;
  recordHistory(
    context: RequestContext,
    entry: Omit<OrderHistory, 'id' | 'createdAt'>,
  ): Promise<void>;
}

export interface OrderAppointmentRepository {
  findAppointmentForCheckIn(
    context: RequestContext,
    appointmentId: string,
  ): Promise<CheckInAppointmentSnapshot | null>;
}

export interface OrderAuditSink {
  record(
    context: RequestContext,
    event: {
      action: string;
      entityType: 'ORDER' | 'ORDER_ITEM' | 'APPOINTMENT';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}

export function calculateOrderItemFinalAmount(
  item: Pick<CreateOrderItemCommand, 'quantity' | 'unitPriceAmountCents' | 'discountAmountCents'>,
) {
  const quantity = item.quantity ?? 1;
  const discountAmountCents = item.discountAmountCents ?? 0;
  return quantity * item.unitPriceAmountCents - discountAmountCents;
}

export function calculateOrderTotals(items: readonly OrderItem[]) {
  const subtotalAmountCents = items.reduce(
    (total, item) => total + item.quantity * item.unitPriceAmountCents,
    0,
  );
  const discountAmountCents = items.reduce((total, item) => total + item.discountAmountCents, 0);
  return {
    subtotalAmountCents,
    discountAmountCents,
    totalAmountCents: subtotalAmountCents - discountAmountCents,
  };
}
