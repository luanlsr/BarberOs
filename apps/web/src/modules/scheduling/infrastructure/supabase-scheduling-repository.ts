import type { SupabaseClient } from '@supabase/supabase-js';
import {
  appointmentSchema,
  appointmentStatusHistorySchema,
  professionalScheduleSchema,
  scheduleBlockSchema,
  type Appointment,
  type AppointmentService,
  type AppointmentStatus,
  type AppointmentStatusHistory,
  type AvailabilityQuery,
  type CreateProfessionalScheduleCommand,
  type CreateScheduleBlockCommand,
  type RequestContext,
  type ScheduleBlock,
} from '@barberos/contracts';

import type {
  AppointmentRepository,
  CancelAppointmentRecordCommand,
  CreateAppointmentRecordCommand,
  RescheduleAppointmentRecordCommand,
  ScheduleRepository,
  ScheduleWindowQuery,
  SchedulingAppointmentLookup,
  SchedulingBranchLookup,
  UpdateAppointmentStatusRecordCommand,
} from '../domain';

type ProfessionalScheduleRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  professional_id: string;
  weekday: number;
  starts_at_local: string;
  ends_at_local: string;
  break_starts_at_local?: string | null;
  break_ends_at_local?: string | null;
  active: boolean;
};

type ScheduleBlockRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  professional_id?: string | null;
  starts_at: string;
  ends_at: string;
  type: ScheduleBlock['type'];
  reason?: string | null;
  active: boolean;
};

type AppointmentServiceRow = {
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
  sequence: number;
};

type AppointmentRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: Appointment['source'];
  notes?: string | null;
  appointment_services?: AppointmentServiceRow[] | null;
};

type AppointmentStatusHistoryRow = {
  id: string;
  appointment_id: string;
  previous_status?: AppointmentStatus | null;
  next_status: AppointmentStatus;
  actor_id?: string | null;
  reason?: string | null;
  created_at: string;
};

const professionalScheduleSelect = `
  id,
  tenant_id,
  branch_id,
  professional_id,
  weekday,
  starts_at_local,
  ends_at_local,
  break_starts_at_local,
  break_ends_at_local,
  active
`;

const scheduleBlockSelect = `
  id,
  tenant_id,
  branch_id,
  professional_id,
  starts_at,
  ends_at,
  type,
  reason,
  active
`;

const appointmentSelect = `
  id,
  tenant_id,
  branch_id,
  customer_id,
  professional_id,
  starts_at,
  ends_at,
  status,
  source,
  notes,
  appointment_services(service_id, service_name, duration_minutes, price_cents, sequence)
`;

const appointmentStatusHistorySelect = `
  id,
  appointment_id,
  previous_status,
  next_status,
  actor_id,
  reason,
  created_at
`;

const activeAppointmentStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'] as const;

export class SupabaseSchedulingRepository
  implements
    ScheduleRepository,
    AppointmentRepository,
    SchedulingAppointmentLookup,
    SchedulingBranchLookup
{
  constructor(private readonly client: SupabaseClient) {}

  async listProfessionalSchedules(context: RequestContext, branchId: string) {
    const { data, error } = await this.client
      .from('professional_schedules')
      .select(professionalScheduleSelect)
      .eq('tenant_id', context.tenantId)
      .eq('branch_id', branchId)
      .order('weekday', { ascending: true })
      .order('starts_at_local', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as ProfessionalScheduleRow[]).map(toProfessionalSchedule);
  }

  async upsertProfessionalSchedule(
    context: RequestContext,
    command: CreateProfessionalScheduleCommand,
  ) {
    const { data, error } = await this.client
      .from('professional_schedules')
      .upsert(
        {
          tenant_id: context.tenantId,
          branch_id: command.branchId,
          professional_id: command.professionalId,
          weekday: command.weekday,
          starts_at_local: command.startsAtLocal,
          ends_at_local: command.endsAtLocal,
          break_starts_at_local: command.breakStartsAtLocal,
          break_ends_at_local: command.breakEndsAtLocal,
          active: command.active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,branch_id,professional_id,weekday,starts_at_local,ends_at_local' },
      )
      .select(professionalScheduleSelect)
      .single();

    if (error) throw error;
    return toProfessionalSchedule(data as ProfessionalScheduleRow);
  }

  async listScheduleBlocks(context: RequestContext, branchId: string) {
    const { data, error } = await this.client
      .from('schedule_blocks')
      .select(scheduleBlockSelect)
      .eq('tenant_id', context.tenantId)
      .eq('branch_id', branchId)
      .order('starts_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as ScheduleBlockRow[]).map(toScheduleBlock);
  }

  async createScheduleBlock(context: RequestContext, command: CreateScheduleBlockCommand) {
    const { data, error } = await this.client
      .from('schedule_blocks')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        professional_id: command.professionalId,
        starts_at: command.startsAt,
        ends_at: command.endsAt,
        type: command.type,
        reason: command.reason,
        active: command.active ?? true,
      })
      .select(scheduleBlockSelect)
      .single();

    if (error) throw error;
    return toScheduleBlock(data as ScheduleBlockRow);
  }

  async findBranchTimezone(context: RequestContext, branchId: string) {
    const { data, error } = await this.client
      .from('branches')
      .select('timezone')
      .eq('tenant_id', context.tenantId)
      .eq('id', branchId)
      .maybeSingle();

    if (error) throw error;
    return (data as { timezone?: string } | null)?.timezone ?? null;
  }

  async list(context: RequestContext, query: AvailabilityQuery) {
    const parsed = normalizeAppointmentListWindow(query);
    let request = this.client
      .from('appointments')
      .select(appointmentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('branch_id', parsed.branchId)
      .gte('starts_at', parsed.startsAt)
      .lt('starts_at', parsed.endsAt);

    if (parsed.professionalId) request = request.eq('professional_id', parsed.professionalId);

    const { data, error } = await request.order('starts_at', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as AppointmentRow[]).map(toAppointment);
  }

  async findById(context: RequestContext, appointmentId: string) {
    const { data, error } = await this.client
      .from('appointments')
      .select(appointmentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data ? toAppointment(data as AppointmentRow) : null;
  }

  async create(context: RequestContext, command: CreateAppointmentRecordCommand) {
    const { data, error } = await this.client
      .from('appointments')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        customer_id: command.customerId,
        professional_id: command.professionalId,
        starts_at: command.startsAt,
        ends_at: command.endsAt,
        status: command.status ?? 'CONFIRMED',
        source: command.source ?? 'MANUAL',
        notes: command.notes,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    const appointmentId = (data as { id: string }).id;
    await this.replaceAppointmentServices(context, appointmentId, command.services);
    await this.createStatusHistory(
      context,
      appointmentId,
      null,
      command.status ?? 'CONFIRMED',
      undefined,
    );
    return this.findById(context, appointmentId) as Promise<Appointment>;
  }

  async reschedule(context: RequestContext, command: RescheduleAppointmentRecordCommand) {
    const { error } = await this.client
      .from('appointments')
      .update({
        professional_id: command.professionalId,
        starts_at: command.startsAt,
        ends_at: command.endsAt,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.id);

    if (error) throw error;
    return this.findById(context, command.id) as Promise<Appointment>;
  }

  async updateStatus(context: RequestContext, command: UpdateAppointmentStatusRecordCommand) {
    const { error } = await this.client
      .from('appointments')
      .update({
        status: command.status,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.id);

    if (error) throw error;
    await this.createStatusHistory(
      context,
      command.id,
      command.previousStatus,
      command.status,
      command.reason,
    );
    return this.findById(context, command.id) as Promise<Appointment>;
  }

  async cancel(context: RequestContext, command: CancelAppointmentRecordCommand) {
    return this.updateStatus(context, command);
  }

  async listStatusHistory(context: RequestContext, appointmentId: string) {
    const { data, error } = await this.client
      .from('appointment_status_history')
      .select(appointmentStatusHistorySelect)
      .eq('tenant_id', context.tenantId)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as AppointmentStatusHistoryRow[]).map(toAppointmentStatusHistory);
  }

  async listActiveAppointmentsForWindow(context: RequestContext, query: ScheduleWindowQuery) {
    let request = this.client
      .from('appointments')
      .select(appointmentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('branch_id', query.branchId)
      .in('status', [...activeAppointmentStatuses])
      .lt('starts_at', query.endsAt)
      .gt('ends_at', query.startsAt);

    if (query.professionalId) request = request.eq('professional_id', query.professionalId);
    if (query.excludeAppointmentId) request = request.neq('id', query.excludeAppointmentId);

    const { data, error } = await request.order('starts_at', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as AppointmentRow[]).map(toAppointment);
  }

  private async replaceAppointmentServices(
    context: RequestContext,
    appointmentId: string,
    services: readonly AppointmentService[],
  ) {
    const { error: deleteError } = await this.client
      .from('appointment_services')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('appointment_id', appointmentId);
    if (deleteError) throw deleteError;

    const rows = services.map((service) => ({
      tenant_id: context.tenantId,
      appointment_id: appointmentId,
      service_id: service.serviceId,
      service_name: service.serviceName,
      duration_minutes: service.durationMinutes,
      price_cents: service.priceCents,
      sequence: service.sequence,
    }));

    const { error: insertError } = await this.client.from('appointment_services').insert(rows);
    if (insertError) throw insertError;
  }

  private async createStatusHistory(
    context: RequestContext,
    appointmentId: string,
    previousStatus: AppointmentStatus | null,
    nextStatus: AppointmentStatus,
    reason: string | undefined,
  ) {
    const { error } = await this.client.from('appointment_status_history').insert({
      tenant_id: context.tenantId,
      appointment_id: appointmentId,
      previous_status: previousStatus,
      next_status: nextStatus,
      actor_id: context.userId,
      reason,
    });
    if (error) throw error;
  }
}

function normalizeAppointmentListWindow(query: AvailabilityQuery) {
  return {
    branchId: query.branchId,
    professionalId: query.professionalId,
    startsAt: `${query.startsOn}T00:00:00.000Z`,
    endsAt: `${addDays(query.endsOn, 1)}T00:00:00.000Z`,
  };
}

function toProfessionalSchedule(row: ProfessionalScheduleRow) {
  return professionalScheduleSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    professionalId: row.professional_id,
    weekday: row.weekday,
    startsAtLocal: normalizeLocalTime(row.starts_at_local),
    endsAtLocal: normalizeLocalTime(row.ends_at_local),
    breakStartsAtLocal: row.break_starts_at_local
      ? normalizeLocalTime(row.break_starts_at_local)
      : undefined,
    breakEndsAtLocal: row.break_ends_at_local
      ? normalizeLocalTime(row.break_ends_at_local)
      : undefined,
    active: row.active,
  });
}

function toScheduleBlock(row: ScheduleBlockRow) {
  return scheduleBlockSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    professionalId: row.professional_id ?? undefined,
    startsAt: toIsoDateTime(row.starts_at),
    endsAt: toIsoDateTime(row.ends_at),
    type: row.type,
    reason: row.reason ?? undefined,
    active: row.active,
  });
}

function toAppointment(row: AppointmentRow) {
  return appointmentSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    customerId: row.customer_id,
    professionalId: row.professional_id,
    startsAt: toIsoDateTime(row.starts_at),
    endsAt: toIsoDateTime(row.ends_at),
    status: row.status,
    source: row.source,
    notes: row.notes ?? undefined,
    services: (row.appointment_services ?? [])
      .map((service) => ({
        serviceId: service.service_id,
        serviceName: service.service_name,
        durationMinutes: service.duration_minutes,
        priceCents: service.price_cents,
        sequence: service.sequence,
      }))
      .sort((left, right) => left.sequence - right.sequence),
  });
}

function toAppointmentStatusHistory(row: AppointmentStatusHistoryRow): AppointmentStatusHistory {
  return appointmentStatusHistorySchema.parse({
    id: row.id,
    appointmentId: row.appointment_id,
    previousStatus: row.previous_status ?? undefined,
    nextStatus: row.next_status,
    actorId: row.actor_id ?? 'system',
    reason: row.reason ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
  });
}

function normalizeLocalTime(value: string) {
  return value.slice(0, 5);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
