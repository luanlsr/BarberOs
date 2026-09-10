import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CreateOrderItemCommand,
  CreateWalkInOrderCommand,
  Order,
  OrderDetail,
  OrderHistory,
  OrderStatus,
  RemoveOrderItemCommand,
  RequestContext,
  UpdateOrderItemCommand,
} from '@barberos/contracts';

import type {
  CheckInAppointmentSnapshot,
  OpenOrderFromAppointmentCommand,
  OrderAppointmentRepository,
  OrderAuditSink,
  OrderListFilters,
  OrderRepository,
} from '../domain';
import { CheckInApplicationService, CoreOperationsApplicationError } from './check-in-service';

const receptionistContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['appointments.check_in', 'orders.create', 'orders.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const appointment: CheckInAppointmentSnapshot = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'CONFIRMED',
  services: [
    {
      serviceId: 'service-1',
      serviceName: 'Corte Masculino',
      priceCents: 5000,
      sequence: 1,
    },
  ],
};

const checkedInAppointment: CheckInAppointmentSnapshot = {
  ...appointment,
  id: 'appointment-checked-in',
  status: 'CHECKED_IN',
};

const otherTenantAppointment: CheckInAppointmentSnapshot = {
  ...appointment,
  id: 'appointment-other-tenant',
  tenantId: 'tenant-2',
};

const completedAppointment: CheckInAppointmentSnapshot = {
  ...appointment,
  id: 'appointment-completed',
  status: 'COMPLETED',
};

const existingOrder: OrderDetail = {
  id: 'order-existing',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  appointmentId: checkedInAppointment.id,
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'OPEN',
  subtotalAmountCents: 5000,
  discountAmountCents: 0,
  totalAmountCents: 5000,
  openedAt: '2026-09-05T13:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-05T13:00:00.000Z',
  updatedAt: '2026-09-05T13:00:00.000Z',
  items: [],
  history: [],
};

class FakeAppointmentRepository implements OrderAppointmentRepository {
  readonly appointments = new Map<string, CheckInAppointmentSnapshot>([
    [appointment.id, appointment],
    [checkedInAppointment.id, checkedInAppointment],
    [otherTenantAppointment.id, otherTenantAppointment],
    [completedAppointment.id, completedAppointment],
  ]);

  async findAppointmentForCheckIn(_context: RequestContext, appointmentId: string) {
    return this.appointments.get(appointmentId) ?? null;
  }
}

class FakeOrderRepository implements OrderRepository {
  readonly orders = new Map<string, OrderDetail>([[existingOrder.id, existingOrder]]);
  createdFromAppointmentCommand: OpenOrderFromAppointmentCommand | null = null;
  readonly history: Array<Omit<OrderHistory, 'id' | 'createdAt'>> = [];

  async list(_context: RequestContext, _filters: OrderListFilters = {}) {
    return Array.from(this.orders.values());
  }

  async findById(_context: RequestContext, orderId: string) {
    return this.orders.get(orderId) ?? null;
  }

  async findByAppointmentId(_context: RequestContext, appointmentId: string) {
    return (
      Array.from(this.orders.values()).find(
        (candidate) => candidate.appointmentId === appointmentId,
      ) ?? null
    );
  }

  async createWalkIn(_context: RequestContext, _command: CreateWalkInOrderCommand) {
    return existingOrder;
  }

  async createFromAppointment(context: RequestContext, command: OpenOrderFromAppointmentCommand) {
    this.createdFromAppointmentCommand = command;
    const subtotalAmountCents = command.appointment.services.reduce(
      (total, service) => total + service.priceCents,
      0,
    );
    const created: OrderDetail = {
      id: 'order-created',
      tenantId: command.appointment.tenantId,
      branchId: command.appointment.branchId,
      appointmentId: command.appointment.id,
      customerId: command.appointment.customerId,
      professionalId: command.appointment.professionalId,
      status: 'OPEN',
      subtotalAmountCents,
      discountAmountCents: 0,
      totalAmountCents: subtotalAmountCents,
      notes: command.notes,
      openedAt: '2026-09-05T13:00:00.000Z',
      createdBy: context.userId,
      updatedBy: context.userId,
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
      items: command.appointment.services.map((service) => ({
        id: `item-${service.sequence}`,
        tenantId: command.appointment.tenantId,
        branchId: command.appointment.branchId,
        orderId: 'order-created',
        sourceType: 'SERVICE',
        sourceId: service.serviceId,
        nameSnapshot: service.serviceName,
        quantity: 1,
        unitPriceAmountCents: service.priceCents,
        discountAmountCents: 0,
        finalAmountCents: service.priceCents,
        professionalId: command.appointment.professionalId,
        createdBy: context.userId,
        createdAt: '2026-09-05T13:00:00.000Z',
      })),
      history: [
        {
          id: 'history-1',
          tenantId: command.appointment.tenantId,
          branchId: command.appointment.branchId,
          orderId: 'order-created',
          eventType: 'CHECK_IN',
          actorId: context.userId,
          metadata: {},
          createdAt: '2026-09-05T13:00:00.000Z',
        },
      ],
    };
    this.orders.set(created.id, created);
    return created;
  }

  async updateStatus(_context: RequestContext, orderId: string, status: OrderStatus) {
    const current = this.orders.get(orderId) ?? existingOrder;
    const updated = { ...current, status } satisfies Order;
    this.orders.set(updated.id, { ...current, ...updated });
    return updated;
  }

  async addItem(_context: RequestContext, _command: CreateOrderItemCommand) {
    return existingOrder;
  }

  async updateItem(_context: RequestContext, _command: UpdateOrderItemCommand) {
    return existingOrder;
  }

  async removeItem(_context: RequestContext, _command: RemoveOrderItemCommand) {
    return existingOrder;
  }

  async recordHistory(_context: RequestContext, entry: Omit<OrderHistory, 'id' | 'createdAt'>) {
    this.history.push(entry);
  }
}

class FakeOrderAuditSink implements OrderAuditSink {
  readonly events: Array<Parameters<OrderAuditSink['record']>[1]> = [];

  async record(_context: RequestContext, event: Parameters<OrderAuditSink['record']>[1]) {
    this.events.push(event);
  }
}

describe('CheckInApplicationService', () => {
  let appointments: FakeAppointmentRepository;
  let orders: FakeOrderRepository;
  let audit: FakeOrderAuditSink;
  let service: CheckInApplicationService;

  beforeEach(() => {
    appointments = new FakeAppointmentRepository();
    orders = new FakeOrderRepository();
    audit = new FakeOrderAuditSink();
    service = new CheckInApplicationService(appointments, orders, audit);
  });

  it('opens an order with service snapshots for an eligible appointment', async () => {
    const result = await service.checkIn(receptionistContext, {
      appointmentId: appointment.id,
      idempotencyKey: 'checkin-appointment-1',
      notes: 'Cliente chegou.',
    });

    expect(result.appointmentId).toBe(appointment.id);
    expect(result.totalAmountCents).toBe(5000);
    expect(result.items[0]).toMatchObject({
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      nameSnapshot: 'Corte Masculino',
      finalAmountCents: 5000,
    });
    expect(orders.createdFromAppointmentCommand?.appointment.status).toBe('CONFIRMED');
    expect(orders.history.at(-1)).toMatchObject({
      eventType: 'CHECK_IN',
      orderId: 'order-created',
      reason: 'Cliente chegou.',
      metadata: {
        appointmentId: appointment.id,
        idempotencyKey: 'checkin-appointment-1',
        itemCount: 1,
      },
    });
    expect(audit.events.map((event) => event.action)).toEqual([
      'appointment.checked_in',
      'order.created',
    ]);
  });

  it('returns the existing linked order on safe retry', async () => {
    await expect(
      service.checkIn(receptionistContext, { appointmentId: checkedInAppointment.id }),
    ).resolves.toEqual(existingOrder);
    expect(orders.createdFromAppointmentCommand).toBeNull();
    expect(orders.history).toEqual([]);
    expect(audit.events).toEqual([]);
  });

  it('rejects appointments that are not eligible for check-in', async () => {
    await expect(
      service.checkIn(receptionistContext, { appointmentId: completedAppointment.id }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'CHECK_IN_INVALID_APPOINTMENT_STATUS',
        'Appointment cannot be checked in from its current status.',
      ),
    );
  });

  it('does not leak appointments from another tenant', async () => {
    await expect(
      service.checkIn(receptionistContext, { appointmentId: otherTenantAppointment.id }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Appointment was not found.'),
    );
  });

  it('requires check-in and order create permissions', async () => {
    const withoutCheckIn = {
      ...receptionistContext,
      permissions: ['orders.create'],
    } satisfies RequestContext;
    const withoutOrderCreate = {
      ...receptionistContext,
      permissions: ['appointments.check_in'],
    } satisfies RequestContext;

    await expect(
      service.checkIn(withoutCheckIn, { appointmentId: appointment.id }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(
      service.checkIn(withoutOrderCreate, { appointmentId: appointment.id }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});
