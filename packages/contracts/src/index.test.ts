import { describe, expect, it } from 'vitest';
import {
  activeAppointmentStatuses,
  appointmentSchema,
  branchScopedAuthorizationRequirementSchema,
  coreOperationsErrorCodeSchema,
  createAppointmentCommandSchema,
  createServiceCommandSchema,
  hasBranchAccess,
  permissionSchema,
  professionalScheduleSchema,
} from './index';

describe('core operations contracts', () => {
  it('recognizes core operations permissions and stable error codes', () => {
    expect(permissionSchema.parse('professionals.create')).toBe('professionals.create');
    expect(permissionSchema.parse('services.update')).toBe('services.update');
    expect(permissionSchema.parse('schedules.manage')).toBe('schedules.manage');
    expect(coreOperationsErrorCodeSchema.parse('APPOINTMENT_CONFLICT')).toBe(
      'APPOINTMENT_CONFLICT',
    );
  });

  it('rejects invalid service duration and price', () => {
    const result = createServiceCommandSchema.safeParse({
      category: 'Cabelo',
      name: 'Corte',
      durationMinutes: 0,
      priceCents: -1,
    });

    expect(result.success).toBe(false);
  });

  it('accepts the minimal valid manual appointment command', () => {
    const result = createAppointmentCommandSchema.parse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [{ serviceId: 'service-a' }],
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.source).toBe('MANUAL');
  });

  it('rejects appointments without scheduled services', () => {
    const result = createAppointmentCommandSchema.safeParse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects appointment entities whose end is not after start', () => {
    const result = appointmentSchema.safeParse({
      id: 'appointment-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      endsAt: '2026-09-05T13:00:00.000Z',
      status: 'CONFIRMED',
      source: 'MANUAL',
      services: [
        {
          serviceId: 'service-a',
          serviceName: 'Corte',
          durationMinutes: 40,
          priceCents: 5000,
          sequence: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('validates branch-scoped authorization requirements', () => {
    const requirement = branchScopedAuthorizationRequirementSchema.parse({
      permission: 'appointments.create',
      entitlement: 'core.operations',
      branchId: 'branch-a',
    });

    expect(requirement.branchId).toBe('branch-a');
    const branchId = requirement.branchId ?? '';
    expect(hasBranchAccess({ branchScope: ['branch-a'] }, branchId)).toBe(true);
    expect(hasBranchAccess({ branchScope: ['branch-b'] }, branchId)).toBe(false);
  });

  it('rejects schedule breaks outside working hours', () => {
    const result = professionalScheduleSchema.safeParse({
      id: 'schedule-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      weekday: 1,
      startsAtLocal: '09:00',
      endsAtLocal: '18:00',
      breakStartsAtLocal: '08:00',
      breakEndsAtLocal: '08:30',
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it('documents active appointment statuses for database conflict protection', () => {
    expect(activeAppointmentStatuses).toEqual(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE']);
  });
});