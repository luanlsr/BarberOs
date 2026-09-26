import type {
  Appointment,
  AppointmentStatus,
  AppointmentStatusHistory,
  Customer,
  Permission,
  Professional,
  RequestContext,
  Service,
  SessionContext,
} from '@barberos/contracts';
import { createSupabaseServerClient } from './auth/server';
import { SupabaseCustomerRepository } from '../src/modules/customers/infrastructure/supabase-customer-repository';
import { SupabaseProfessionalRepository } from '../src/modules/professionals/infrastructure/supabase-professional-repository';
import { SupabaseSchedulingRepository } from '../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { SupabaseServiceRepository } from '../src/modules/services/infrastructure/supabase-service-repository';
import {
  buildOperationalTimeOptions,
  getStoreOperationsSettings,
  toFullCalendarSlotMaxTime,
  toFullCalendarSlotTime,
  type StoreScheduleBlock,
} from './store-operations-settings';

export type AgendaTone = 'neutral' | 'success' | 'warning' | 'danger';

export type AgendaKpi = {
  label: string;
  value: string;
  note: string;
  tone: AgendaTone;
};

export type AgendaProfessional = {
  id: string;
  name: string;
  roleLabel: string;
  branchIds: readonly string[];
};

export type AgendaService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type AgendaCustomerOption = {
  id: string;
  name: string;
  phone: string;
};

export type AgendaTimeOption = {
  value: string;
  label: string;
};

export type AgendaOccupiedSlot = {
  professionalId: string;
  timeLabel: string;
  customerName: string;
  kind?: 'appointment' | 'block';
};

export type AgendaOpeningHours = {
  startTime: string;
  endTime: string;
  slotMinTime: string;
  slotMaxTime: string;
  slotDuration: string;
};

export type AgendaScheduleBlock = {
  id: string;
  professionalId: string | null;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  startLabel: string;
  endLabel: string;
  reason: string;
};

export type AgendaNewAppointmentModel = {
  isOpen: boolean;
  dateIso: string;
  defaultTimeLabel: string;
  branchId: string;
  canCreateAppointment: boolean;
  canCreateCustomer: boolean;
  defaultProfessionalId: string;
  customers: readonly AgendaCustomerOption[];
  professionals: readonly AgendaProfessional[];
  services: readonly AgendaService[];
  timeOptions: readonly AgendaTimeOption[];
  occupiedSlots: readonly AgendaOccupiedSlot[];
};

export type AgendaCheckInAction = {
  appointmentId: string;
  label: string;
  description: string;
};

export type AgendaAppointment = {
  id: string;
  branchId: string;
  customerName: string;
  customerPhone: string;
  professionalId: string;
  professionalName: string;
  serviceNames: readonly string[];
  startsAt: string;
  endsAt: string;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  status: AppointmentStatus;
  statusLabel: string;
  statusTone: Exclude<AgendaTone, 'danger'>;
  sourceLabel: string;
  totalLabel: string;
  totalCents: number;
  notes?: string;
  checkInAction?: AgendaCheckInAction;
};

export type AgendaAppointmentAction = {
  id: 'check-in' | 'contact' | 'reschedule' | 'cancel';
  label: string;
  description: string;
  permission: Permission;
  appointmentId?: string;
  href?: string;
  disabledReason?: string;
  variant: 'primary' | 'secondary' | 'danger';
};

export type AgendaAppointmentHistoryItem = {
  id: string;
  label: string;
  atLabel: string;
  actorName: string;
  statusLabel: string;
  reason?: string;
};

export type AgendaAppointmentDetail = {
  appointment: AgendaAppointment;
  customer: {
    name: string;
    phone: string;
    lastVisitLabel: string;
    visitsLabel: string;
    notes?: string;
  };
  history: readonly AgendaAppointmentHistoryItem[];
  actions: readonly AgendaAppointmentAction[];
};

export type AgendaTimelineSlot = {
  timeLabel: string;
  appointments: readonly AgendaAppointment[];
};

export type AgendaProfessionalColumn = {
  professional: AgendaProfessional;
  appointments: readonly AgendaAppointment[];
};

export type AgendaCalendarView = 'month' | 'week' | 'day';

export type AgendaViewModel = {
  dateIso: string;
  calendarView: AgendaCalendarView;
  dateLabel: string;
  branchId: string;
  branchName: string;
  selectedProfessionalId: string;
  selectedProfessionalLabel: string;
  canCreateAppointment: boolean;
  newAppointment: AgendaNewAppointmentModel;
  hasReadPermission: boolean;
  professionals: readonly AgendaProfessional[];
  services: readonly AgendaService[];
  customers: readonly AgendaCustomerOption[];
  openingHours: AgendaOpeningHours;
  scheduleBlocks: readonly AgendaScheduleBlock[];
  appointments: readonly AgendaAppointment[];
  timeline: readonly AgendaTimelineSlot[];
  professionalColumns: readonly AgendaProfessionalColumn[];
  selectedAppointmentDetail?: AgendaAppointmentDetail;
  kpis: readonly AgendaKpi[];
  emptyMessage: string;
};

export type AgendaDataSource = {
  professionals: readonly AgendaProfessional[];
  services: readonly AgendaService[];
  customers: readonly AgendaCustomerOption[];
  appointments: readonly AgendaAppointmentRecord[];
  selectedAppointmentHistory?: readonly AppointmentStatusHistory[];
};

export type AgendaAppointmentRecord = {
  id: string;
  branchId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  professionalId: string;
  professionalName: string;
  serviceNames: readonly string[];
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  sourceLabel: string;
  totalCents: number;
  notes?: string;
};

const emptyAgendaDataSource: AgendaDataSource = {
  professionals: [],
  services: [],
  customers: [],
  appointments: [],
};
const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Aguardando',
  CONFIRMED: 'Confirmado',
  CHECKED_IN: 'Check-in',
  IN_SERVICE: 'Em atendimento',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

const statusTones: Record<AppointmentStatus, AgendaAppointment['statusTone']> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CHECKED_IN: 'neutral',
  IN_SERVICE: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'warning',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

export async function getAgendaViewModel(
  session: SessionContext,
  options: {
    date?: string;
    professionalId?: string;
    appointmentId?: string;
    mode?: string;
    view?: string;
    time?: string;
  } = {},
): Promise<AgendaViewModel> {
  const dateIso = normalizeDate(options.date);
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const data = await loadAgendaData(session, {
    branchId,
    dateIso,
    professionalId: options.professionalId,
    appointmentId: options.appointmentId,
  });
  return buildAgendaViewModel({ session, ...options, date: dateIso, data });
}

export function buildAgendaViewModel({
  session,
  date,
  professionalId,
  appointmentId,
  mode,
  view,
  time,
  data = emptyAgendaDataSource,
}: {
  session: SessionContext;
  date?: string;
  professionalId?: string;
  appointmentId?: string;
  mode?: string;
  view?: string;
  time?: string;
  data?: AgendaDataSource;
}): AgendaViewModel {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const hasReadPermission =
    session.permissions.includes('appointments.read') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(branchId);
  const scopedProfessionals = data.professionals.filter((professional) =>
    professional.branchIds.includes(branchId),
  );
  const visibleProfessionals =
    session.role === 'PROFESSIONAL' ? scopedProfessionals.slice(0, 1) : scopedProfessionals;
  const selectedProfessionalId =
    professionalId && visibleProfessionals.some((item) => item.id === professionalId)
      ? professionalId
      : 'all';
  const dateIso = normalizeDate(date);
  const calendarView = normalizeCalendarView(view);
  const defaultTimeLabel = normalizeTimeLabel(time);
  const operationsSettings = getStoreOperationsSettings(branchId);
  const openingHours = toAgendaOpeningHours(operationsSettings.openingHours);
  const appointments = hasReadPermission
    ? data.appointments
        .filter((appointment) => appointment.branchId === branchId)
        .filter((appointment) =>
          visibleProfessionals.some(
            (professional) => professional.id === appointment.professionalId,
          ),
        )
        .filter(
          (appointment) =>
            selectedProfessionalId === 'all' ||
            appointment.professionalId === selectedProfessionalId,
        )
        .map(toAgendaAppointment)
        .map((appointment) => withCheckInAction(session, appointment))
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    : [];
  const professionalColumns = visibleProfessionals.map((professional) => ({
    professional,
    appointments: appointments.filter(
      (appointment) => appointment.professionalId === professional.id,
    ),
  }));
  const selectedAppointment = appointmentId
    ? appointments.find((appointment) => appointment.id === appointmentId)
    : undefined;
  const canCreateAppointment =
    session.permissions.includes('appointments.create') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(branchId);
  const scheduleBlocks = buildScheduleBlocks(
    operationsSettings.blocks,
    dateIso,
    visibleProfessionals,
  );
  const newAppointment = buildNewAppointmentModel({
    isOpen: mode === 'new',
    dateIso,
    defaultTimeLabel,
    branchId,
    canCreateAppointment,
    canCreateCustomer: hasPermission(session, 'customers.create'),
    professionals: visibleProfessionals,
    services: data.services,
    customers: data.customers,
    appointments,
    scheduleBlocks,
    openingHours,
    selectedProfessionalId,
  });

  return {
    dateIso,
    calendarView,
    dateLabel: formatDateLabel(dateIso),
    branchId,
    branchName: session.branchName,
    selectedProfessionalId,
    selectedProfessionalLabel:
      selectedProfessionalId === 'all'
        ? 'Todos os profissionais'
        : (visibleProfessionals.find((professional) => professional.id === selectedProfessionalId)
            ?.name ?? 'Profissional'),
    canCreateAppointment,
    newAppointment,
    hasReadPermission,
    professionals: visibleProfessionals,
    services: data.services,
    customers: data.customers,
    openingHours,
    scheduleBlocks,
    appointments,
    timeline: buildTimeline(appointments, openingHours),
    professionalColumns,
    selectedAppointmentDetail:
      hasReadPermission && selectedAppointment
        ? buildAppointmentDetail(
            session,
            selectedAppointment,
            dateIso,
            data.selectedAppointmentHistory,
          )
        : undefined,
    kpis: buildKpis(
      appointments,
      visibleProfessionals.length,
      operationsSettings.openingHours.slotMinutes,
      operationsSettings.openingHours.startTime,
      operationsSettings.openingHours.endTime,
      scheduleBlocks.length,
    ),
    emptyMessage: hasReadPermission
      ? 'Nenhum agendamento encontrado para este filtro.'
      : 'Seu perfil não tem permissão para visualizar a agenda desta unidade.',
  };
}

function toAgendaAppointment(record: AgendaAppointmentRecord): AgendaAppointment {
  const durationMinutes = Math.max(
    Math.round((Date.parse(record.endsAt) - Date.parse(record.startsAt)) / 60_000),
    0,
  );

  return {
    id: record.id,
    branchId: record.branchId,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    professionalId: record.professionalId,
    professionalName: record.professionalName,
    serviceNames: record.serviceNames,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    startLabel: toLocalTimeLabel(record.startsAt),
    endLabel: toLocalTimeLabel(record.endsAt),
    durationLabel: `${durationMinutes} min`,
    status: record.status,
    statusLabel: statusLabels[record.status],
    statusTone: statusTones[record.status],
    sourceLabel: record.sourceLabel,
    totalLabel: currencyFormatter.format(record.totalCents / 100),
    totalCents: record.totalCents,
    notes: record.notes,
  };
}
function buildAppointmentDetail(
  session: SessionContext,
  appointment: AgendaAppointment,
  dateIso: string,
  history?: readonly AppointmentStatusHistory[],
): AgendaAppointmentDetail {
  return {
    appointment,
    customer: {
      name: appointment.customerName,
      phone: appointment.customerPhone,
      lastVisitLabel: 'Ultima visita ha 28 dias',
      visitsLabel: '8 atendimentos registrados',
      notes: appointment.notes,
    },
    history: history?.length
      ? history.map((item) => toAgendaHistoryItem(item, appointment))
      : buildAppointmentHistory(appointment, dateIso),
    actions: buildAppointmentActions(session, appointment),
  };
}

function toAgendaHistoryItem(
  item: AppointmentStatusHistory,
  appointment: AgendaAppointment,
): AgendaAppointmentHistoryItem {
  return {
    id: item.id,
    label: item.previousStatus ? 'Status atualizado' : 'Agendamento criado',
    atLabel: toLocalDateTimeLabel(item.createdAt),
    actorName: item.actorId === 'system' ? 'Sistema' : 'Equipe',
    statusLabel: statusLabels[item.nextStatus],
    reason:
      item.reason ?? (item.nextStatus === appointment.status ? appointment.sourceLabel : undefined),
  };
}
function buildAppointmentHistory(
  appointment: AgendaAppointment,
  dateIso: string,
): AgendaAppointmentHistoryItem[] {
  const createdAt = toIsoDateTime(dateIso, subtractMinutes(appointment.startLabel, 90));
  const baseHistory: AgendaAppointmentHistoryItem[] = [
    {
      id: `${appointment.id}-created`,
      label: 'Agendamento criado',
      atLabel: toLocalDateTimeLabel(createdAt),
      actorName: appointment.sourceLabel,
      statusLabel: statusLabels.PENDING,
      reason: 'Registro inicial na agenda.',
    },
  ];

  if (appointment.status !== 'PENDING') {
    const updatedAt = toIsoDateTime(dateIso, subtractMinutes(appointment.startLabel, 30));
    baseHistory.push({
      id: `${appointment.id}-current`,
      label: 'Status atualizado',
      atLabel: toLocalDateTimeLabel(updatedAt),
      actorName: appointment.sourceLabel === 'WhatsApp' ? 'Automacao WhatsApp' : 'Recepção',
      statusLabel: appointment.statusLabel,
      reason:
        appointment.status === 'CONFIRMED'
          ? 'Cliente confirmado para o horário.'
          : 'Fluxo operacional atualizado.',
    });
  }

  return baseHistory;
}

const checkInEligibleStatuses: readonly AppointmentStatus[] = ['PENDING', 'CONFIRMED'];
const checkInRequiredPermissions: readonly Permission[] = [
  'appointments.check_in',
  'orders.create',
  'orders.read',
];

function withCheckInAction(
  session: SessionContext,
  appointment: AgendaAppointment,
): AgendaAppointment {
  const canCheckIn =
    checkInEligibleStatuses.includes(appointment.status) &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(appointment.branchId) &&
    checkInRequiredPermissions.every((permission) => hasPermission(session, permission));

  if (!canCheckIn) return appointment;

  return {
    ...appointment,
    checkInAction: {
      appointmentId: appointment.id,
      label: 'Check-in',
      description: 'Iniciar atendimento e abrir a Comanda.',
    },
  };
}

function buildAppointmentActions(
  session: SessionContext,
  appointment: AgendaAppointment,
): AgendaAppointmentAction[] {
  const actions: AgendaAppointmentAction[] = [];
  const isActive = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status);

  if (appointment.checkInAction) {
    actions.push({
      id: 'check-in',
      label: appointment.checkInAction.label,
      description: appointment.checkInAction.description,
      permission: 'appointments.check_in',
      appointmentId: appointment.id,
      variant: 'primary',
    });
  }

  if (hasPermission(session, 'customers.read')) {
    actions.push({
      id: 'contact',
      label: 'Contato',
      description: 'Abrir telefone do cliente.',
      permission: 'customers.read',
      href: `tel:${appointment.customerPhone.replace(/\D/g, '')}`,
      variant: 'secondary',
    });
  }

  if (hasPermission(session, 'appointments.update') && isActive) {
    actions.push({
      id: 'reschedule',
      label: 'Reagendar',
      description: 'Escolher outro profissional, data ou horário.',
      permission: 'appointments.update',
      href: `/agenda?appointmentId=${appointment.id}&mode=reschedule`,
      variant: 'secondary',
    });
  }

  if (hasPermission(session, 'appointments.cancel') && isActive) {
    actions.push({
      id: 'cancel',
      label: 'Cancelar',
      description: 'Cancelar o agendamento com motivo auditável.',
      permission: 'appointments.cancel',
      href: `/agenda?appointmentId=${appointment.id}&mode=cancel`,
      variant: 'danger',
    });
  }

  return actions;
}

function buildTimeline(
  appointments: readonly AgendaAppointment[],
  openingHours: AgendaOpeningHours,
) {
  const slotLabels = buildHourLabels(openingHours.startTime, openingHours.endTime);
  return slotLabels.map((timeLabel) => ({
    timeLabel,
    appointments: appointments.filter(
      (appointment) =>
        appointment.startLabel >= timeLabel && appointment.startLabel < nextHour(timeLabel),
    ),
  }));
}

function buildKpis(
  appointments: readonly AgendaAppointment[],
  professionalCount: number,
  slotMinutes: number,
  startTime: string,
  endTime: string,
  blockedSlots: number,
): AgendaKpi[] {
  const confirmed = appointments.filter((appointment) => appointment.status === 'CONFIRMED').length;
  const active = appointments.filter(
    (appointment) => appointment.status === 'CHECKED_IN' || appointment.status === 'IN_SERVICE',
  ).length;
  const revenueCents = appointments.reduce(
    (total, appointment) => total + appointment.totalCents,
    0,
  );
  const dailySlots = Math.floor((toMinutes(endTime) - toMinutes(startTime)) / slotMinutes) + 1;
  const freeSlotsEstimate = Math.max(
    professionalCount * dailySlots - appointments.length - blockedSlots,
    0,
  );

  return [
    {
      label: 'Agendamentos',
      value: String(appointments.length).padStart(2, '0'),
      note: `${confirmed} confirmados`,
      tone: 'success',
    },
    {
      label: 'Em operação',
      value: String(active).padStart(2, '0'),
      note: 'check-in ou atendimento',
      tone: active ? 'warning' : 'neutral',
    },
    {
      label: 'Receita prevista',
      value: currencyFormatter.format(revenueCents / 100),
      note: 'serviços do dia',
      tone: 'success',
    },
    {
      label: 'Janelas livres',
      value: String(freeSlotsEstimate).padStart(2, '0'),
      note: 'estimativa operacional',
      tone: 'neutral',
    },
  ];
}
function normalizeDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return '2026-09-05';
}

function normalizeCalendarView(view?: string): AgendaCalendarView {
  if (view === 'month' || view === 'week' || view === 'day') return view;
  return 'day';
}

function normalizeTimeLabel(time?: string) {
  return time && /^\d{2}:\d{2}$/.test(time) ? time : '12:00';
}

function formatDateLabel(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const formatted = dateFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function toIsoDateTime(dateIso: string, timeLabel: string) {
  return `${dateIso}T${timeLabel}:00-03:00`;
}

function addMinutes(isoDateTime: string, minutes: number) {
  const date = new Date(isoDateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function toLocalTimeLabel(isoDateTime: string) {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function toLocalDateTimeLabel(isoDateTime: string) {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function subtractMinutes(timeLabel: string, minutes: number) {
  const [hour = 0, minute = 0] = timeLabel.split(':').map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));
  date.setMinutes(date.getMinutes() - minutes);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function buildNewAppointmentModel({
  isOpen,
  dateIso,
  defaultTimeLabel,
  branchId,
  canCreateAppointment,
  canCreateCustomer,
  professionals: visibleProfessionals,
  services: visibleServices,
  customers,
  openingHours,
  scheduleBlocks,
  appointments,
  selectedProfessionalId,
}: {
  isOpen: boolean;
  dateIso: string;
  defaultTimeLabel: string;
  branchId: string;
  canCreateAppointment: boolean;
  canCreateCustomer: boolean;
  professionals: readonly AgendaProfessional[];
  services: readonly AgendaService[];
  customers: readonly AgendaCustomerOption[];
  openingHours: AgendaOpeningHours;
  scheduleBlocks: readonly AgendaScheduleBlock[];
  appointments: readonly AgendaAppointment[];
  selectedProfessionalId: string;
}): AgendaNewAppointmentModel {
  return {
    isOpen,
    dateIso,
    defaultTimeLabel,
    branchId,
    canCreateAppointment,
    canCreateCustomer,
    defaultProfessionalId:
      selectedProfessionalId !== 'all'
        ? selectedProfessionalId
        : (visibleProfessionals[0]?.id ?? ''),
    customers,
    professionals: visibleProfessionals,
    services: visibleServices,
    timeOptions: buildTimeOptions(openingHours),
    occupiedSlots: buildOccupiedSlots(appointments, scheduleBlocks, visibleProfessionals),
  };
}

function buildTimeOptions(openingHours: AgendaOpeningHours): AgendaTimeOption[] {
  const slotMinutes = Number(openingHours.slotDuration.slice(3, 5));
  return buildOperationalTimeOptions({
    branchId: '',
    startTime: openingHours.startTime,
    endTime: openingHours.endTime,
    slotMinutes,
    timezone: 'America/Sao_Paulo',
  });
}

function buildOccupiedSlots(
  appointments: readonly AgendaAppointment[],
  scheduleBlocks: readonly AgendaScheduleBlock[],
  visibleProfessionals: readonly AgendaProfessional[],
): AgendaOccupiedSlot[] {
  const appointmentSlots = appointments
    .filter((appointment) => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status))
    .map((appointment) => ({
      professionalId: appointment.professionalId,
      timeLabel: appointment.startLabel,
      customerName: appointment.customerName,
    }));

  const blockSlots = scheduleBlocks.flatMap((block) => {
    const professionalsForBlock = block.professionalId
      ? visibleProfessionals.filter((professional) => professional.id === block.professionalId)
      : visibleProfessionals;

    return professionalsForBlock.map((professional) => ({
      professionalId: professional.id,
      timeLabel: block.startLabel,
      customerName: `bloqueio: ${block.reason}`,
      kind: 'block' as const,
    }));
  });

  return [...appointmentSlots, ...blockSlots];
}

function buildScheduleBlocks(
  blocks: readonly StoreScheduleBlock[],
  dateIso: string,
  visibleProfessionals: readonly AgendaProfessional[],
): AgendaScheduleBlock[] {
  return blocks
    .filter((block) => block.dateIso === dateIso)
    .filter(
      (block) =>
        !block.professionalId ||
        visibleProfessionals.some((professional) => professional.id === block.professionalId),
    )
    .map((block) => {
      const professionalName = block.professionalId
        ? (visibleProfessionals.find((professional) => professional.id === block.professionalId)
            ?.name ?? 'Profissional')
        : 'Todos os profissionais';

      return {
        id: block.id,
        professionalId: block.professionalId,
        professionalName,
        startsAt: toIsoDateTime(dateIso, block.startTime),
        endsAt: toIsoDateTime(dateIso, block.endTime),
        startLabel: block.startTime,
        endLabel: block.endTime,
        reason: block.reason,
      };
    });
}

function toAgendaOpeningHours(openingHours: {
  startTime: string;
  endTime: string;
  slotMinutes: number;
}) {
  return {
    startTime: openingHours.startTime,
    endTime: openingHours.endTime,
    slotMinTime: toFullCalendarSlotTime(openingHours.startTime),
    slotMaxTime: toFullCalendarSlotMaxTime({
      ...openingHours,
      branchId: '',
      timezone: 'America/Sao_Paulo',
    }),
    slotDuration: `00:${String(openingHours.slotMinutes).padStart(2, '0')}:00`,
  };
}

function buildHourLabels(startTime: string, endTime: string) {
  const labels: string[] = [];
  for (let minutes = toMinutes(startTime); minutes <= toMinutes(endTime); minutes += 60) {
    labels.push(fromMinutes(minutes));
  }
  return labels;
}

function toMinutes(timeLabel: string) {
  const [hour = 0, minute = 0] = timeLabel.split(':').map(Number);
  return hour * 60 + minute;
}

function fromMinutes(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function nextHour(timeLabel: string) {
  const [hour] = timeLabel.split(':').map(Number);
  return `${String(hour + 1).padStart(2, '0')}:00`;
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}

async function loadAgendaData(
  session: SessionContext,
  options: {
    branchId: string;
    dateIso: string;
    professionalId?: string;
    appointmentId?: string;
  },
): Promise<AgendaDataSource> {
  if (!canReadAgenda(session, options.branchId)) return emptyAgendaDataSource;

  const client = await createSupabaseServerClient();
  if (!client) return emptyAgendaDataSource;

  const context = toRequestContext(session);
  const professionalsRepository = new SupabaseProfessionalRepository(client);
  const servicesRepository = new SupabaseServiceRepository(client);
  const customersRepository = new SupabaseCustomerRepository(client);
  const schedulingRepository = new SupabaseSchedulingRepository(client);

  const [professionals, services, customers] = await Promise.all([
    professionalsRepository.list(context, { branchId: options.branchId, status: 'ACTIVE' }),
    servicesRepository.list(context, { status: 'ACTIVE' }),
    customersRepository.search(context, { branchId: options.branchId }),
  ]);

  const appointments = await schedulingRepository.list(context, {
    branchId: options.branchId,
    serviceId: services[0]?.id ?? 'agenda-list',
    professionalId: options.professionalId === 'all' ? undefined : options.professionalId,
    startsOn: options.dateIso,
    endsOn: options.dateIso,
  });

  const selectedAppointmentHistory = options.appointmentId
    ? await schedulingRepository.listStatusHistory(context, options.appointmentId)
    : undefined;

  return {
    professionals: professionals.map(toAgendaProfessional),
    services: services.map(toAgendaService),
    customers: customers.map(toAgendaCustomerOption),
    appointments: appointments.map((appointment) =>
      toAgendaAppointmentRecord(appointment, professionals, customers),
    ),
    selectedAppointmentHistory,
  };
}

function canReadAgenda(session: SessionContext, branchId: string) {
  return (
    session.permissions.includes('appointments.read') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(branchId)
  );
}

function toRequestContext(session: SessionContext): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: session.userId,
    tenantId: session.tenantId,
    membershipId: session.membershipId,
    role: session.role,
    permissions: session.permissions,
    entitlements: session.entitlements ?? [],
    branchScope: session.branchScope,
  };
}

function toAgendaProfessional(professional: Professional): AgendaProfessional {
  return {
    id: professional.id,
    name: professional.displayName,
    roleLabel: professional.roleLabel,
    branchIds: professional.branchIds,
  };
}

function toAgendaService(service: Service): AgendaService {
  return {
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
  };
}

function toAgendaCustomerOption(customer: Customer): AgendaCustomerOption {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  };
}

function toAgendaAppointmentRecord(
  appointment: Appointment,
  professionals: readonly Professional[],
  customers: readonly Customer[],
): AgendaAppointmentRecord {
  const customer = customers.find((item) => item.id === appointment.customerId);
  const professional = professionals.find((item) => item.id === appointment.professionalId);

  return {
    id: appointment.id,
    branchId: appointment.branchId,
    customerId: appointment.customerId,
    customerName: customer?.name ?? 'Cliente',
    customerPhone: customer?.phone ?? '',
    professionalId: appointment.professionalId,
    professionalName: professional?.displayName ?? 'Profissional',
    serviceNames: appointment.services.map((service) => service.serviceName),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    sourceLabel: sourceLabels[appointment.source] ?? appointment.source,
    totalCents: appointment.services.reduce((total, service) => total + service.priceCents, 0),
    notes: appointment.notes,
  };
}

const sourceLabels: Record<string, string> = {
  MANUAL: 'Manual',
  ONLINE: 'Online',
  WHATSAPP: 'WhatsApp',
  AI: 'IA',
};
