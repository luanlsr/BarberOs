import {
  availabilityQuerySchema,
  type Appointment,
  type AvailabilityQuery,
  type Entitlement,
  type Permission,
  type RequestContext,
  type ScheduleBlock,
  type Service,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  AvailabilitySlot,
  ScheduleRepository,
  SchedulingAppointmentLookup,
  SchedulingBranchLookup,
  SchedulingServiceLookup,
} from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;
const activeAppointmentStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'] as const;

export class AvailabilityApplicationService {
  constructor(
    private readonly schedules: ScheduleRepository,
    private readonly appointments: SchedulingAppointmentLookup,
    private readonly branches: SchedulingBranchLookup,
    private readonly services: SchedulingServiceLookup,
  ) {}

  async findAvailableSlots(context: RequestContext, query: AvailabilityQuery): Promise<AvailabilitySlot[]> {
    const parsed = availabilityQuerySchema.parse(query);
    authorizeAvailabilityAccess(context, 'schedules.read', parsed.branchId);

    const [timezone, service, schedules, blocks] = await Promise.all([
      this.branches.findBranchTimezone(context, parsed.branchId),
      this.services.findServiceById(context, parsed.serviceId),
      this.schedules.listProfessionalSchedules(context, parsed.branchId),
      this.schedules.listScheduleBlocks(context, parsed.branchId),
    ]);

    if (!timezone) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Branch timezone was not found.');
    }
    if (!service || service.tenantId !== context.tenantId || service.status === 'ARCHIVED') {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Service was not found.');
    }

    const appointmentWindow = buildAvailabilityWindow(parsed.startsOn, parsed.endsOn, timezone);
    const activeAppointments = await this.appointments.listActiveAppointmentsForWindow(context, {
      branchId: parsed.branchId,
      professionalId: parsed.professionalId,
      startsAt: appointmentWindow.startsAt,
      endsAt: appointmentWindow.endsAt,
    });

    const slots: AvailabilitySlot[] = [];
    for (const date of eachDate(parsed.startsOn, parsed.endsOn)) {
      const weekday = weekdayForDate(date);
      const dailySchedules = schedules.filter(
        (schedule) =>
          schedule.active &&
          schedule.weekday === weekday &&
          (!parsed.professionalId || schedule.professionalId === parsed.professionalId) &&
          isServiceEnabledForProfessional(service, schedule.professionalId),
      );

      for (const schedule of dailySchedules) {
        const workingStart = zonedDateTimeToUtc(date, schedule.startsAtLocal, timezone);
        const workingEnd = zonedDateTimeToUtc(date, schedule.endsAtLocal, timezone);
        const breakWindow =
          schedule.breakStartsAtLocal && schedule.breakEndsAtLocal
            ? {
                startsAt: zonedDateTimeToUtc(date, schedule.breakStartsAtLocal, timezone),
                endsAt: zonedDateTimeToUtc(date, schedule.breakEndsAtLocal, timezone),
              }
            : null;

        for (
          let slotStart = workingStart;
          slotStart.getTime() + service.durationMinutes * 60_000 <= workingEnd.getTime();
          slotStart = new Date(slotStart.getTime() + parsed.slotStepMinutes * 60_000)
        ) {
          const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60_000);
          const slot = {
            professionalId: schedule.professionalId,
            branchId: parsed.branchId,
            startsAt: slotStart.toISOString(),
            endsAt: slotEnd.toISOString(),
          } satisfies AvailabilitySlot;

          if (
            breakWindow && rangesOverlap(slot.startsAt, slot.endsAt, breakWindow.startsAt.toISOString(), breakWindow.endsAt.toISOString())
          ) {
            continue;
          }
          if (overlapsScheduleBlock(slot, blocks)) continue;
          if (overlapsActiveAppointment(slot, activeAppointments)) continue;

          slots.push(slot);
        }
      }
    }

    return slots.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }
}

function authorizeAvailabilityAccess(context: RequestContext, permission: Permission, branchId: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function isServiceEnabledForProfessional(service: Service, professionalId: string) {
  return service.enabledProfessionalIds.length === 0 || service.enabledProfessionalIds.includes(professionalId);
}

function overlapsScheduleBlock(slot: AvailabilitySlot, blocks: readonly ScheduleBlock[]) {
  return blocks.some(
    (block) =>
      block.active &&
      block.branchId === slot.branchId &&
      (!block.professionalId || block.professionalId === slot.professionalId) &&
      rangesOverlap(slot.startsAt, slot.endsAt, block.startsAt, block.endsAt),
  );
}

function overlapsActiveAppointment(slot: AvailabilitySlot, appointments: readonly Appointment[]) {
  return appointments.some(
    (appointment) =>
      appointment.branchId === slot.branchId &&
      appointment.professionalId === slot.professionalId &&
      activeAppointmentStatuses.includes(appointment.status as (typeof activeAppointmentStatuses)[number]) &&
      rangesOverlap(slot.startsAt, slot.endsAt, appointment.startsAt, appointment.endsAt),
  );
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return Date.parse(leftStart) < Date.parse(rightEnd) && Date.parse(rightStart) < Date.parse(leftEnd);
}

function buildAvailabilityWindow(startsOn: string, endsOn: string, timezone: string) {
  const startsAt = zonedDateTimeToUtc(startsOn, '00:00', timezone).toISOString();
  const dayAfterEnd = addDays(endsOn, 1);
  const endsAt = zonedDateTimeToUtc(dayAfterEnd, '00:00', timezone).toISOString();
  return { startsAt, endsAt };
}

function* eachDate(startsOn: string, endsOn: string) {
  for (let current = startsOn; current <= endsOn; current = addDays(current, 1)) {
    yield current;
  }
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function weekdayForDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

function zonedDateTimeToUtc(date: string, localTime: string, timezone: string) {
  const [hours, minutes] = localTime.split(':').map(Number);
  const approximateUtc = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(approximateUtc, timezone);
  return new Date(approximateUtc.getTime() - offsetMinutes * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (zonedAsUtc - date.getTime()) / 60_000;
}