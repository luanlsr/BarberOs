import {
  checkInAppointmentCommandSchema,
  type AppointmentStatus,
  type CheckInAppointmentCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  CheckInAppointmentSnapshot,
  OrderAppointmentRepository,
  OrderAuditSink,
  OrderRepository,
} from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;
const checkInEligibleStatuses = [
  'PENDING',
  'CONFIRMED',
] as const satisfies readonly AppointmentStatus[];

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class CheckInApplicationService {
  constructor(
    private readonly appointments: OrderAppointmentRepository,
    private readonly orders: OrderRepository,
    private readonly audit?: OrderAuditSink,
  ) {}

  async checkIn(context: RequestContext, command: CheckInAppointmentCommand) {
    const parsed = checkInAppointmentCommandSchema.parse(command);
    const appointment = await this.getVisibleAppointment(context, parsed.appointmentId);

    authorizeCheckInAccess(context, 'appointments.check_in', appointment.branchId);
    authorizeCheckInAccess(context, 'orders.create', appointment.branchId);

    const existingOrder = await this.orders.findByAppointmentId(context, appointment.id);
    if (existingOrder) {
      return existingOrder;
    }

    assertAppointmentCanBeCheckedIn(appointment);

    const order = await this.orders.createFromAppointment(context, {
      ...parsed,
      appointment,
    });
    await this.orders.recordHistory(context, {
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      eventType: 'CHECK_IN',
      actorId: context.userId,
      reason: parsed.notes,
      metadata: {
        appointmentId: appointment.id,
        idempotencyKey: parsed.idempotencyKey,
        itemCount: order.items.length,
      },
    });
    await this.audit?.record(context, {
      action: 'appointment.checked_in',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      result: 'SUCCESS',
      beforeState: appointment,
      afterState: { ...appointment, status: 'CHECKED_IN', orderId: order.id },
    });
    await this.audit?.record(context, {
      action: 'order.created',
      entityType: 'ORDER',
      entityId: order.id,
      result: 'SUCCESS',
      afterState: order,
    });
    return order;
  }

  private async getVisibleAppointment(context: RequestContext, appointmentId: string) {
    const appointment = await this.appointments.findAppointmentForCheckIn(context, appointmentId);
    if (!appointment || appointment.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Appointment was not found.');
    }
    if (!context.branchScope.includes(appointment.branchId)) {
      throw new CoreOperationsApplicationError(
        'CORE_BRANCH_SCOPE_DENIED',
        'Appointment is outside the authorized branch scope.',
      );
    }
    return appointment;
  }
}

function authorizeCheckInAccess(context: RequestContext, permission: Permission, branchId: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function assertAppointmentCanBeCheckedIn(appointment: CheckInAppointmentSnapshot) {
  if (
    !checkInEligibleStatuses.includes(
      appointment.status as (typeof checkInEligibleStatuses)[number],
    )
  ) {
    throw new CoreOperationsApplicationError(
      'CHECK_IN_INVALID_APPOINTMENT_STATUS',
      'Appointment cannot be checked in from its current status.',
    );
  }
}
