import type { AppointmentStatus, Permission, SessionContext } from '@barberos/contracts';

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

export type AgendaAppointment = {
  id: string;
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
};

export type AgendaAppointmentAction = {
  id: 'check-in' | 'contact' | 'reschedule' | 'cancel';
  label: string;
  description: string;
  permission: Permission;
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

export type AgendaViewModel = {
  dateIso: string;
  dateLabel: string;
  branchId: string;
  branchName: string;
  selectedProfessionalId: string;
  selectedProfessionalLabel: string;
  canCreateAppointment: boolean;
  hasReadPermission: boolean;
  professionals: readonly AgendaProfessional[];
  services: readonly AgendaService[];
  appointments: readonly AgendaAppointment[];
  timeline: readonly AgendaTimelineSlot[];
  professionalColumns: readonly AgendaProfessionalColumn[];
  selectedAppointmentDetail?: AgendaAppointmentDetail;
  kpis: readonly AgendaKpi[];
  emptyMessage: string;
};

const professionals: AgendaProfessional[] = [
  {
    id: 'dev-professional-carlos',
    name: 'Carlos Mendes',
    roleLabel: 'Barbeiro senior',
    branchIds: ['dev-branch'],
  },
  {
    id: 'dev-professional-joao',
    name: 'Joao Pereira',
    roleLabel: 'Barbeiro',
    branchIds: ['dev-branch'],
  },
  {
    id: 'dev-professional-rafael',
    name: 'Rafael Lima',
    roleLabel: 'Especialista em barba',
    branchIds: ['dev-branch'],
  },
  {
    id: 'dev-professional-north-ana',
    name: 'Ana Costa',
    roleLabel: 'Barbeira',
    branchIds: ['dev-branch-north'],
  },
];

const services: AgendaService[] = [
  { id: 'dev-service-cut', name: 'Corte classico', durationMinutes: 45, priceCents: 6000 },
  { id: 'dev-service-beard', name: 'Barba', durationMinutes: 30, priceCents: 4000 },
  { id: 'dev-service-combo', name: 'Corte + barba', durationMinutes: 75, priceCents: 9500 },
  { id: 'dev-service-premium', name: 'Combo completo', durationMinutes: 90, priceCents: 13000 },
];

type AppointmentSeed = {
  id: string;
  customerName: string;
  customerPhone: string;
  professionalId: string;
  serviceIds: readonly string[];
  startsAtLocal: string;
  status: AppointmentStatus;
  sourceLabel: string;
  notes?: string;
};

const appointmentSeeds: AppointmentSeed[] = [
  {
    id: 'dev-appointment-0900',
    customerName: 'Marcos Vinicius',
    customerPhone: '(11) 98800-1100',
    professionalId: 'dev-professional-carlos',
    serviceIds: ['dev-service-combo'],
    startsAtLocal: '09:00',
    status: 'CONFIRMED',
    sourceLabel: 'Manual',
  },
  {
    id: 'dev-appointment-1000',
    customerName: 'Rafael Alves',
    customerPhone: '(11) 97700-2211',
    professionalId: 'dev-professional-joao',
    serviceIds: ['dev-service-cut'],
    startsAtLocal: '10:00',
    status: 'PENDING',
    sourceLabel: 'WhatsApp',
    notes: 'Cliente pediu encaixe se houver atraso anterior.',
  },
  {
    id: 'dev-appointment-1130',
    customerName: 'Bruno Martins',
    customerPhone: '(11) 96600-3322',
    professionalId: 'dev-professional-rafael',
    serviceIds: ['dev-service-beard'],
    startsAtLocal: '11:30',
    status: 'CHECKED_IN',
    sourceLabel: 'Recepcao',
  },
  {
    id: 'dev-appointment-1400',
    customerName: 'Thiago Martins',
    customerPhone: '(11) 95500-4433',
    professionalId: 'dev-professional-carlos',
    serviceIds: ['dev-service-cut'],
    startsAtLocal: '14:00',
    status: 'CONFIRMED',
    sourceLabel: 'Online',
  },
  {
    id: 'dev-appointment-1530',
    customerName: 'Joao Pedro',
    customerPhone: '(11) 94400-5544',
    professionalId: 'dev-professional-joao',
    serviceIds: ['dev-service-premium'],
    startsAtLocal: '15:30',
    status: 'CONFIRMED',
    sourceLabel: 'Manual',
  },
  {
    id: 'dev-appointment-1730',
    customerName: 'Felipe Nunes',
    customerPhone: '(11) 93300-6655',
    professionalId: 'dev-professional-rafael',
    serviceIds: ['dev-service-combo'],
    startsAtLocal: '17:30',
    status: 'IN_SERVICE',
    sourceLabel: 'Recepcao',
  },
];

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

export function getAgendaViewModel(
  session: SessionContext,
  options: { date?: string; professionalId?: string; appointmentId?: string } = {},
): AgendaViewModel {
  return buildAgendaViewModel({ session, ...options });
}

export function buildAgendaViewModel({
  session,
  date,
  professionalId,
  appointmentId,
}: {
  session: SessionContext;
  date?: string;
  professionalId?: string;
  appointmentId?: string;
}): AgendaViewModel {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const hasReadPermission =
    session.permissions.includes('appointments.read') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(branchId);
  const scopedProfessionals = professionals.filter((professional) =>
    professional.branchIds.includes(branchId),
  );
  const visibleProfessionals =
    session.role === 'PROFESSIONAL' ? scopedProfessionals.slice(0, 1) : scopedProfessionals;
  const selectedProfessionalId =
    professionalId && visibleProfessionals.some((item) => item.id === professionalId)
      ? professionalId
      : 'all';
  const dateIso = normalizeDate(date);
  const appointments = hasReadPermission
    ? appointmentSeeds
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
        .map((appointment) => toAgendaAppointment(appointment, dateIso))
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    : [];
  const professionalColumns = visibleProfessionals.map((professional) => ({
    professional,
    appointments: appointments.filter(
      (appointment) => appointment.professionalId === professional.id,
    ),
  }));
  const selectedAppointment =
    appointments.find((appointment) => appointment.id === appointmentId) ?? appointments[0];

  return {
    dateIso,
    dateLabel: formatDateLabel(dateIso),
    branchId,
    branchName: session.branchName,
    selectedProfessionalId,
    selectedProfessionalLabel:
      selectedProfessionalId === 'all'
        ? 'Todos os profissionais'
        : (visibleProfessionals.find((professional) => professional.id === selectedProfessionalId)
            ?.name ?? 'Profissional'),
    canCreateAppointment:
      session.permissions.includes('appointments.create') &&
      (session.entitlements ?? []).includes('core.operations') &&
      session.branchScope.includes(branchId),
    hasReadPermission,
    professionals: visibleProfessionals,
    services,
    appointments,
    timeline: buildTimeline(appointments),
    professionalColumns,
    selectedAppointmentDetail:
      hasReadPermission && selectedAppointment
        ? buildAppointmentDetail(session, selectedAppointment, dateIso)
        : undefined,
    kpis: buildKpis(appointments, visibleProfessionals.length),
    emptyMessage: hasReadPermission
      ? 'Nenhum agendamento encontrado para este filtro.'
      : 'Seu perfil nao tem permissao para visualizar a agenda desta unidade.',
  };
}

function toAgendaAppointment(seed: AppointmentSeed, dateIso: string): AgendaAppointment {
  const professional = professionals.find((item) => item.id === seed.professionalId);
  const selectedServices = seed.serviceIds.flatMap(
    (serviceId) => services.find((service) => service.id === serviceId) ?? [],
  );
  const durationMinutes = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );
  const totalCents = selectedServices.reduce((total, service) => total + service.priceCents, 0);
  const startsAt = toIsoDateTime(dateIso, seed.startsAtLocal);
  const endsAt = addMinutes(startsAt, durationMinutes);

  return {
    id: seed.id,
    customerName: seed.customerName,
    customerPhone: seed.customerPhone,
    professionalId: seed.professionalId,
    professionalName: professional?.name ?? 'Profissional',
    serviceNames: selectedServices.map((service) => service.name),
    startsAt,
    endsAt,
    startLabel: seed.startsAtLocal,
    endLabel: toLocalTimeLabel(endsAt),
    durationLabel: `${durationMinutes} min`,
    status: seed.status,
    statusLabel: statusLabels[seed.status],
    statusTone: statusTones[seed.status],
    sourceLabel: seed.sourceLabel,
    totalLabel: currencyFormatter.format(totalCents / 100),
    totalCents,
    notes: seed.notes,
  };
}

function buildAppointmentDetail(
  session: SessionContext,
  appointment: AgendaAppointment,
  dateIso: string,
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
    history: buildAppointmentHistory(appointment, dateIso),
    actions: buildAppointmentActions(session, appointment),
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
      actorName: appointment.sourceLabel === 'WhatsApp' ? 'Automacao WhatsApp' : 'Recepcao',
      statusLabel: appointment.statusLabel,
      reason:
        appointment.status === 'CONFIRMED'
          ? 'Cliente confirmado para o horario.'
          : 'Fluxo operacional atualizado.',
    });
  }

  return baseHistory;
}

function buildAppointmentActions(
  session: SessionContext,
  appointment: AgendaAppointment,
): AgendaAppointmentAction[] {
  const actions: AgendaAppointmentAction[] = [];
  const isActive = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status);
  const canCheckIn = ['PENDING', 'CONFIRMED'].includes(appointment.status);

  if (hasPermission(session, 'appointments.update') && canCheckIn) {
    actions.push({
      id: 'check-in',
      label: 'Check-in',
      description: 'Iniciar atendimento e abrir a futura Comanda.',
      permission: 'appointments.update',
      href: `/agenda?appointmentId=${appointment.id}&mode=check-in`,
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
      description: 'Escolher outro profissional, data ou horario.',
      permission: 'appointments.update',
      href: `/agenda?appointmentId=${appointment.id}&mode=reschedule`,
      variant: 'secondary',
    });
  }

  if (hasPermission(session, 'appointments.cancel') && isActive) {
    actions.push({
      id: 'cancel',
      label: 'Cancelar',
      description: 'Cancelar o agendamento com motivo auditavel.',
      permission: 'appointments.cancel',
      href: `/agenda?appointmentId=${appointment.id}&mode=cancel`,
      variant: 'danger',
    });
  }

  return actions;
}

function buildTimeline(appointments: readonly AgendaAppointment[]) {
  const slotLabels = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];
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
): AgendaKpi[] {
  const confirmed = appointments.filter((appointment) => appointment.status === 'CONFIRMED').length;
  const active = appointments.filter(
    (appointment) => appointment.status === 'CHECKED_IN' || appointment.status === 'IN_SERVICE',
  ).length;
  const revenueCents = appointments.reduce(
    (total, appointment) => total + appointment.totalCents,
    0,
  );
  const freeSlotsEstimate = Math.max(professionalCount * 8 - appointments.length, 0);

  return [
    {
      label: 'Agendamentos',
      value: String(appointments.length).padStart(2, '0'),
      note: `${confirmed} confirmados`,
      tone: 'success',
    },
    {
      label: 'Em operacao',
      value: String(active).padStart(2, '0'),
      note: 'check-in ou atendimento',
      tone: active ? 'warning' : 'neutral',
    },
    {
      label: 'Receita prevista',
      value: currencyFormatter.format(revenueCents / 100),
      note: 'servicos do dia',
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

function nextHour(timeLabel: string) {
  const [hour] = timeLabel.split(':').map(Number);
  return `${String(hour + 1).padStart(2, '0')}:00`;
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
