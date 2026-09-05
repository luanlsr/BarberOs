import {
  createProfessionalScheduleCommandSchema,
  createScheduleBlockCommandSchema,
  type CreateProfessionalScheduleCommand,
  type CreateScheduleBlockCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { ScheduleRepository, ScheduleWindowQuery, SchedulingAppointmentLookup } from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class SchedulingApplicationService {
  constructor(
    private readonly schedules: ScheduleRepository,
    private readonly appointments?: SchedulingAppointmentLookup,
  ) {}

  async listProfessionalSchedules(context: RequestContext, branchId: string) {
    authorizeScheduleAccess(context, 'schedules.read', branchId);
    return this.schedules.listProfessionalSchedules(context, branchId);
  }

  async upsertProfessionalSchedule(context: RequestContext, command: CreateProfessionalScheduleCommand) {
    const parsed = createProfessionalScheduleCommandSchema.parse(command);
    authorizeScheduleAccess(context, 'schedules.manage', parsed.branchId);
    return this.schedules.upsertProfessionalSchedule(context, parsed);
  }

  async listScheduleBlocks(context: RequestContext, branchId: string) {
    authorizeScheduleAccess(context, 'schedules.read', branchId);
    return this.schedules.listScheduleBlocks(context, branchId);
  }

  async createScheduleBlock(context: RequestContext, command: CreateScheduleBlockCommand) {
    const parsed = createScheduleBlockCommandSchema.parse(command);
    authorizeScheduleAccess(context, 'schedules.manage', parsed.branchId);
    await this.assertNoAppointmentOverlap(context, parsed);
    return this.schedules.createScheduleBlock(context, parsed);
  }

  async isWindowBlocked(context: RequestContext, query: ScheduleWindowQuery) {
    authorizeScheduleAccess(context, 'schedules.read', query.branchId);
    const blocks = await this.schedules.listScheduleBlocks(context, query.branchId);
    return blocks.some(
      (block) =>
        block.active &&
        (!block.professionalId || !query.professionalId || block.professionalId === query.professionalId) &&
        rangesOverlap(block.startsAt, block.endsAt, query.startsAt, query.endsAt),
    );
  }

  private async assertNoAppointmentOverlap(context: RequestContext, block: CreateScheduleBlockCommand) {
    if (!block.professionalId || !this.appointments) return;

    const conflicts = await this.appointments.listActiveAppointmentsForWindow(context, {
      branchId: block.branchId,
      professionalId: block.professionalId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
    });

    if (conflicts.length) {
      throw new CoreOperationsApplicationError('APPOINTMENT_CONFLICT', 'Schedule block overlaps an active appointment.');
    }
  }
}

function authorizeScheduleAccess(context: RequestContext, permission: Permission, branchId: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return Date.parse(leftStart) < Date.parse(rightEnd) && Date.parse(rightStart) < Date.parse(leftEnd);
}