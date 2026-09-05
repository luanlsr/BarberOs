import type {
  Appointment,
  AppointmentService,
  AppointmentStatus,
  AppointmentStatusHistory,
  AvailabilityQuery,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  CreateProfessionalScheduleCommand,
  CreateScheduleBlockCommand,
  Customer,
  Professional,
  ProfessionalSchedule,
  RequestContext,
  RescheduleAppointmentCommand,
  ScheduleBlock,
  Service,
  UpdateAppointmentStatusCommand,
} from '@barberos/contracts';

export type AvailabilitySlot = {
  professionalId: string;
  branchId: string;
  startsAt: string;
  endsAt: string;
};

export type ScheduleWindowQuery = {
  branchId: string;
  professionalId?: string;
  startsAt: string;
  endsAt: string;
  excludeAppointmentId?: string;
};

export interface ScheduleRepository {
  listProfessionalSchedules(context: RequestContext, branchId: string): Promise<ProfessionalSchedule[]>;
  upsertProfessionalSchedule(
    context: RequestContext,
    command: CreateProfessionalScheduleCommand,
  ): Promise<ProfessionalSchedule>;
  listScheduleBlocks(context: RequestContext, branchId: string): Promise<ScheduleBlock[]>;
  createScheduleBlock(context: RequestContext, command: CreateScheduleBlockCommand): Promise<ScheduleBlock>;
}

export interface SchedulingAppointmentLookup {
  listActiveAppointmentsForWindow(context: RequestContext, query: ScheduleWindowQuery): Promise<Appointment[]>;
}

export interface SchedulingBranchLookup {
  findBranchTimezone(context: RequestContext, branchId: string): Promise<string | null>;
}

export interface SchedulingServiceLookup {
  findServiceById(context: RequestContext, serviceId: string): Promise<Service | null>;
}

export interface SchedulingCustomerLookup {
  findCustomerById(context: RequestContext, customerId: string): Promise<Customer | null>;
}

export interface SchedulingProfessionalLookup {
  findProfessionalById(context: RequestContext, professionalId: string): Promise<Professional | null>;
}

export type CreateAppointmentRecordCommand = Omit<CreateAppointmentCommand, 'services'> & {
  endsAt: string;
  services: AppointmentService[];
};

export type RescheduleAppointmentRecordCommand = RescheduleAppointmentCommand & {
  professionalId: string;
  endsAt: string;
};

export type UpdateAppointmentStatusRecordCommand = UpdateAppointmentStatusCommand & {
  previousStatus: AppointmentStatus;
  actorId: string;
};

export type CancelAppointmentRecordCommand = CancelAppointmentCommand & {
  status: 'CANCELLED';
  previousStatus: AppointmentStatus;
  actorId: string;
};

export interface AppointmentRepository {
  list(context: RequestContext, query: AvailabilityQuery): Promise<Appointment[]>;
  findById(context: RequestContext, appointmentId: string): Promise<Appointment | null>;
  create(context: RequestContext, command: CreateAppointmentRecordCommand): Promise<Appointment>;
  reschedule(context: RequestContext, command: RescheduleAppointmentRecordCommand): Promise<Appointment>;
  updateStatus(context: RequestContext, command: UpdateAppointmentStatusRecordCommand): Promise<Appointment>;
  cancel(context: RequestContext, command: CancelAppointmentRecordCommand): Promise<Appointment>;
  listStatusHistory(context: RequestContext, appointmentId: string): Promise<AppointmentStatusHistory[]>;
}

export interface AvailabilityRepository {
  findAvailableSlots(context: RequestContext, query: AvailabilityQuery): Promise<AvailabilitySlot[]>;
}