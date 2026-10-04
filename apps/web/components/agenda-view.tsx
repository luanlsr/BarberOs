'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AlertTriangle, CalendarPlus, Clock3, Users, WifiOff, X } from 'lucide-react';
import { Button } from '@barberos/ui';
import {
  availabilitySummaryByProfessional,
  getSaoPauloTodayIso,
  type AgendaAvailabilitySlot,
} from '../lib/agenda-availability';
import {
  buildOperationalTimeOptions,
  getStoreOperationsSettingsStorageKey,
  toFullCalendarSlotMaxTime,
  toFullCalendarSlotTime,
  type StoreOperationsSettings,
} from '../lib/store-operations-settings';
import { AppointmentDetailSurface } from './appointment-detail-surface';
import { RelatedSelect } from './form-controls';
import { NewAppointmentFlow } from './new-appointment-flow';
import type {
  AgendaAppointment,
  AgendaCalendarView,
  AgendaPanel,
  AgendaScheduleBlock,
  AgendaViewModel,
} from '../lib/agenda-data';

type FullCalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

const fullCalendarViews: Record<AgendaCalendarView, FullCalendarView> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
};

const agendaViews: Record<FullCalendarView, AgendaCalendarView> = {
  dayGridMonth: 'month',
  timeGridWeek: 'week',
  timeGridDay: 'day',
};

export function AgendaView({ agenda }: Readonly<{ agenda: AgendaViewModel }>) {
  const router = useRouter();
  const calendarRef = React.useRef(null);
  const [calendarView, setCalendarView] = React.useState<AgendaCalendarView>(agenda.calendarView);
  const [filterProfessionalId, setFilterProfessionalId] = React.useState(
    agenda.selectedProfessionalId,
  );
  const [agendaPanel, setAgendaPanel] = React.useState<AgendaPanel>(agenda.agendaPanel);
  const [availabilityServiceId, setAvailabilityServiceId] = React.useState(
    agenda.services[0]?.id ?? '',
  );
  const [setupNotice, setSetupNotice] = React.useState(false);
  const [clientSettings, setClientSettings] = React.useState<StoreOperationsSettings | null>(null);
  const selectedDetail = agenda.selectedAppointmentDetail;
  const hasProfessionals = agenda.professionals.length > 0;
  const professionalFilterOptions = [
    { id: 'all', label: 'Todos' },
    ...agenda.professionals.map((professional) => ({
      id: professional.id,
      label: professional.name,
    })),
  ];
  const availabilityServiceOptions = agenda.services.map((service) => ({
    id: service.id,
    label: service.name,
    description: service.durationMinutes + ' min',
  }));

  React.useEffect(() => {
    function readSettings() {
      const stored = window.localStorage.getItem(
        getStoreOperationsSettingsStorageKey(agenda.branchId),
      );
      if (!stored) {
        setClientSettings(null);
        return;
      }

      try {
        setClientSettings(JSON.parse(stored) as StoreOperationsSettings);
      } catch {
        setClientSettings(null);
      }
    }

    readSettings();
    window.addEventListener('barberos:store-operations-settings-changed', readSettings);
    return () =>
      window.removeEventListener('barberos:store-operations-settings-changed', readSettings);
  }, [agenda.branchId]);

  const effectiveOpeningHours = React.useMemo(
    () => (clientSettings ? toAgendaOpeningHoursFromClient(clientSettings) : agenda.openingHours),
    [agenda.openingHours, clientSettings],
  );
  const effectiveScheduleBlocks = React.useMemo(
    () =>
      clientSettings
        ? toAgendaScheduleBlocks(clientSettings, agenda.dateIso, agenda.professionals)
        : agenda.scheduleBlocks,
    [agenda.dateIso, agenda.professionals, agenda.scheduleBlocks, clientSettings],
  );
  const effectiveNewAppointment = React.useMemo(() => {
    if (!clientSettings) return agenda.newAppointment;

    return {
      ...agenda.newAppointment,
      openingHours: effectiveOpeningHours,
      timeOptions: buildOperationalTimeOptions(clientSettings.openingHours),
      occupiedSlots: [
        ...agenda.newAppointment.occupiedSlots.filter((slot) => slot.kind !== 'block'),
        ...toBlockedOccupiedSlots(effectiveScheduleBlocks, agenda.professionals),
      ],
    };
  }, [agenda.newAppointment, agenda.professionals, clientSettings, effectiveScheduleBlocks]);
  const availabilityService =
    agenda.services.find((service) => service.id === availabilityServiceId) ?? agenda.services[0];
  const availabilitySummary = React.useMemo(
    () =>
      availabilitySummaryByProfessional({
        appointments: agenda.appointments,
        dateIso: agenda.dateIso,
        durationMinutes: availabilityService?.durationMinutes ?? 30,
        occupiedSlots: effectiveNewAppointment.occupiedSlots,
        openingHours: effectiveOpeningHours,
        professionals: agenda.professionals,
        timeOptions: effectiveNewAppointment.timeOptions,
      }),
    [
      agenda.appointments,
      agenda.dateIso,
      agenda.professionals,
      availabilityService?.durationMinutes,
      effectiveNewAppointment.occupiedSlots,
      effectiveNewAppointment.timeOptions,
      effectiveOpeningHours,
    ],
  );
  const events = React.useMemo(
    () => buildCalendarEvents(agenda.appointments, effectiveScheduleBlocks),
    [agenda.appointments, effectiveScheduleBlocks],
  );

  function navigateTo(params: Record<string, string | undefined>) {
    router.push(agendaHref(agenda, { view: calendarView, ...params }));
  }

  function changeView(view: AgendaCalendarView) {
    setCalendarView(view);
    const calendarApi = calendarRef.current as {
      getApi: () => { changeView: (viewName: string) => void };
    } | null;
    calendarApi?.getApi().changeView(fullCalendarViews[view]);
    router.replace(agendaHref(agenda, { view }));
  }

  function changePanel(panel: AgendaPanel) {
    setAgendaPanel(panel);
    router.replace(agendaHref(agenda, { panel, view: calendarView }));
  }

  function handleDateClick(arg: { date: Date }) {
    if (!hasProfessionals) {
      setSetupNotice(true);
      return;
    }
    if (isPastAgendaSelection(arg.date)) return;
    navigateTo({ mode: 'new', date: toDateIso(arg.date), time: toTimeLabel(arg.date) });
  }

  function handleSelect(arg: { start: Date }) {
    if (!hasProfessionals) {
      setSetupNotice(true);
      return;
    }
    if (isPastAgendaSelection(arg.start)) return;
    navigateTo({ mode: 'new', date: toDateIso(arg.start), time: toTimeLabel(arg.start) });
  }

  function handleEventClick(arg: { event: { id: string; start: Date | null } }) {
    const appointmentId = String(arg.event.id);
    navigateTo({ appointmentId, date: toDateIso(arg.event.start ?? new Date(agenda.dateIso)) });
  }

  return (
    <div className="agenda-page">
      <div className="agenda-heading">
        <div>
          <p className="eyebrow">{agenda.dateLabel}</p>
          <h1>Agenda</h1>
          <p className="subheading">
            {agenda.branchName} · {agenda.selectedProfessionalLabel}
          </p>
        </div>
        <div className="agenda-heading-actions" aria-label="Ações da agenda">
          <div className="agenda-view-switcher" aria-label="Visão da agenda">
            <button
              aria-pressed={calendarView === 'day'}
              className="agenda-view-button"
              type="button"
              onClick={() => changeView('day')}
            >
              Dia
            </button>
            <button
              aria-pressed={calendarView === 'week'}
              className="agenda-view-button"
              type="button"
              onClick={() => changeView('week')}
            >
              Semana
            </button>
            <button
              aria-pressed={calendarView === 'month'}
              className="agenda-view-button"
              type="button"
              onClick={() => changeView('month')}
            >
              Mes
            </button>
          </div>
          {agenda.canCreateAppointment && hasProfessionals ? (
            <Link
              className="button button-primary"
              href={agendaHref(agenda, { mode: 'new', view: calendarView })}
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Novo agendamento
            </Link>
          ) : agenda.canCreateAppointment ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setSetupNotice(true)}
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Novo agendamento
            </button>
          ) : null}
        </div>
      </div>

      {setupNotice || (agenda.newAppointment.isOpen && !hasProfessionals) ? (
        <section className="agenda-setup-alert" role="alert">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Cadastre um profissional antes de abrir a agenda.</strong>
            <p>
              A agenda precisa de pelo menos um profissional para reservar horários. O cliente pode
              ser criado na hora do agendamento.
            </p>
          </div>
          <Link className="button button-secondary" href="/equipe?mode=new">
            <Users size={16} aria-hidden="true" />
            Criar profissional
          </Link>
        </section>
      ) : null}
      <form className="agenda-filterbar" method="get" aria-label="Filtros da agenda">
        <input type="hidden" name="view" value={calendarView} />
        <label>
          <span>Data</span>
          <input type="date" name="date" defaultValue={agenda.dateIso} />
        </label>
        <label>
          <span>Profissional</span>
          <RelatedSelect
            emptyLabel="Nenhum profissional cadastrado"
            name="professionalId"
            onChange={setFilterProfessionalId}
            options={professionalFilterOptions}
            placeholder="Todos"
            required
            searchPlaceholder="Buscar profissional"
            value={filterProfessionalId}
          />
        </label>
        <Button variant="secondary" type="submit">
          Aplicar
        </Button>
      </form>

      <div className="agenda-submenu" aria-label="Submenu da agenda">
        <button
          aria-pressed={agendaPanel === 'calendar'}
          onClick={() => changePanel('calendar')}
          type="button"
        >
          Calendário
        </button>
        <button
          aria-pressed={agendaPanel === 'availability'}
          onClick={() => changePanel('availability')}
          type="button"
        >
          Disponibilidade
        </button>
      </div>

      <div className="agenda-kpi-grid" aria-label="Resumo operacional da agenda">
        {agenda.kpis.map((kpi) => (
          <article className={`agenda-kpi agenda-kpi-${kpi.tone}`} key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.note}</small>
          </article>
        ))}
      </div>

      <div className="agenda-state-strip" aria-label="Estado da agenda">
        <span>
          <Clock3 size={15} aria-hidden="true" />
          Clique em um horário para criar
        </span>
        <span>
          <WifiOff size={15} aria-hidden="true" />
          Offline: leitura local mantida
        </span>
        <span>
          <Users size={15} aria-hidden="true" />
          {agenda.professionals.length} profissionais visiveis
        </span>
      </div>

      {agendaPanel === 'calendar' ? (
        <section className="agenda-calendar-panel" aria-labelledby="agenda-calendar-title">
          <div className="agenda-section-title">
            <h2 id="agenda-calendar-title">Calendario operacional</h2>
            <span>{agenda.appointments.length} agendamentos</span>
          </div>
          {agenda.appointments.length || agenda.hasReadPermission ? (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin] as never}
              initialView={fullCalendarViews[agenda.calendarView]}
              initialDate={agenda.dateIso}
              events={events as never}
              selectable={agenda.canCreateAppointment && hasProfessionals}
              selectMirror
              nowIndicator
              allDaySlot={false}
              slotMinTime={effectiveOpeningHours.slotMinTime}
              slotMaxTime={effectiveOpeningHours.slotMaxTime}
              slotDuration={effectiveOpeningHours.slotDuration}
              locale="pt-br"
              height="auto"
              headerToolbar={false}
              dayMaxEvents={3}
              eventClick={handleEventClick}
              selectAllow={(selection) => !isPastAgendaSelection(selection.start)}
              select={handleSelect}
              dateClick={handleDateClick}
              eventContent={renderEventContent}
              datesSet={(arg) =>
                setCalendarView(agendaViews[arg.view.type as FullCalendarView] ?? 'day')
              }
            />
          ) : (
            <section className="agenda-empty-state" aria-labelledby="agenda-empty-title">
              <AlertTriangle size={24} aria-hidden="true" />
              <div>
                <h2 id="agenda-empty-title">Agenda vazia</h2>
                <p>{agenda.emptyMessage}</p>
              </div>
            </section>
          )}
        </section>
      ) : (
        <AgendaAvailabilityPanel
          agenda={agenda}
          onDateChange={(date) =>
            router.push(agendaHref(agenda, { date, panel: 'availability', view: calendarView }))
          }
          onServiceChange={setAvailabilityServiceId}
          serviceId={availabilityService?.id ?? ''}
          serviceOptions={availabilityServiceOptions}
          summary={availabilitySummary}
        />
      )}

      {agenda.newAppointment.isOpen && hasProfessionals ? (
        <AgendaModal title="Novo agendamento" onCloseHref={agendaBaseHref(agenda, calendarView)}>
          <NewAppointmentFlow model={effectiveNewAppointment} />
        </AgendaModal>
      ) : null}

      {selectedDetail ? (
        <AgendaModal
          title={'Detalhes de ' + selectedDetail.appointment.customerName}
          onCloseHref={agendaBaseHref(agenda, calendarView)}
        >
          <AppointmentDetailSurface detail={selectedDetail} />
        </AgendaModal>
      ) : null}
    </div>
  );
}

function AgendaModal({
  children,
  onCloseHref,
  title,
}: Readonly<{ children: React.ReactNode; onCloseHref: string; title: string }>) {
  const router = useRouter();
  return (
    <div
      className="app-dialog-backdrop"
      role="presentation"
      onClick={() => router.push(onCloseHref)}
    >
      <section
        aria-label={title}
        aria-modal="true"
        className="app-dialog agenda-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="agenda-dialog-close">
          <Link className="icon-button" href={onCloseHref} aria-label="Fechar" title="Fechar">
            <X size={18} aria-hidden="true" />
          </Link>
        </div>
        {children}
      </section>
    </div>
  );
}

function AgendaAvailabilityPanel({
  agenda,
  onDateChange,
  onServiceChange,
  serviceId,
  serviceOptions,
  summary,
}: Readonly<{
  agenda: AgendaViewModel;
  onDateChange: (dateIso: string) => void;
  onServiceChange: (serviceId: string) => void;
  serviceId: string;
  serviceOptions: readonly { id: string; label: string; description?: string }[];
  summary: readonly {
    professional: AgendaViewModel['professionals'][number];
    slots: readonly AgendaAvailabilitySlot[];
  }[];
}>) {
  const totalSlots = summary.reduce((total, item) => total + item.slots.length, 0);

  return (
    <section className="agenda-availability-panel" aria-labelledby="agenda-availability-title">
      <div className="agenda-section-title">
        <div>
          <h2 id="agenda-availability-title">Disponibilidade do dia</h2>
          <p>Veja horários livres por profissional para o serviço selecionado.</p>
        </div>
        <span>{totalSlots} horários livres</span>
      </div>

      <div className="agenda-availability-controls">
        <label>
          <span>Dia</span>
          <input
            min={getSaoPauloTodayIso()}
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={agenda.dateIso}
          />
        </label>
        <label>
          <span>Serviço de referência</span>
          <RelatedSelect
            emptyLabel="Nenhum serviço cadastrado"
            onChange={onServiceChange}
            options={serviceOptions}
            placeholder="Selecione um serviço"
            required
            searchPlaceholder="Buscar serviço"
            value={serviceId}
          />
        </label>
      </div>

      <div className="agenda-availability-grid">
        {summary.map(({ professional, slots }) => (
          <article className="agenda-availability-card" key={professional.id}>
            <header>
              <ProfessionalAvatar professional={professional} />
              <div>
                <strong>{professional.name}</strong>
                <span>{professional.roleLabel}</span>
              </div>
            </header>
            <div
              className="agenda-availability-slots"
              aria-label={`Horários de ${professional.name}`}
            >
              {slots.length ? (
                slots.map((slot) => (
                  <Link
                    className="agenda-availability-slot"
                    href={agendaHref(agenda, {
                      date: agenda.dateIso,
                      mode: 'new',
                      time: slot.value,
                      view: agenda.calendarView,
                    })}
                    key={professional.id + slot.value}
                  >
                    {slot.label}
                  </Link>
                ))
              ) : (
                <span className="agenda-availability-empty">Sem horários livres neste dia.</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfessionalAvatar({
  professional,
}: Readonly<{ professional: AgendaViewModel['professionals'][number] }>) {
  return professional.avatarUrl ? (
    <img className="agenda-professional-avatar" src={professional.avatarUrl} alt="" />
  ) : (
    <span className="agenda-professional-avatar" aria-hidden="true">
      {professional.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}

function toAgendaOpeningHoursFromClient(settings: StoreOperationsSettings) {
  return {
    startTime: settings.openingHours.startTime,
    endTime: settings.openingHours.endTime,
    slotMinTime: toFullCalendarSlotTime(settings.openingHours.startTime),
    slotMaxTime: toFullCalendarSlotMaxTime(settings.openingHours),
    slotDuration: `00:${String(settings.openingHours.slotMinutes).padStart(2, '0')}:00`,
  };
}

function toAgendaScheduleBlocks(
  settings: StoreOperationsSettings,
  dateIso: string,
  professionals: AgendaViewModel['professionals'],
): AgendaScheduleBlock[] {
  return settings.blocks
    .filter((block) => block.dateIso === dateIso)
    .map((block) => ({
      id: block.id,
      professionalId: block.professionalId,
      professionalName: block.professionalId
        ? (professionals.find((professional) => professional.id === block.professionalId)?.name ??
          'Profissional')
        : 'Todos os profissionais',
      startsAt: `${dateIso}T${block.startTime}:00-03:00`,
      endsAt: `${dateIso}T${block.endTime}:00-03:00`,
      startLabel: block.startTime,
      endLabel: block.endTime,
      reason: block.reason,
    }));
}

function toBlockedOccupiedSlots(
  scheduleBlocks: readonly AgendaScheduleBlock[],
  professionals: AgendaViewModel['professionals'],
) {
  return scheduleBlocks.flatMap((block) => {
    const professionalsForBlock = block.professionalId
      ? professionals.filter((professional) => professional.id === block.professionalId)
      : professionals;

    return professionalsForBlock.map((professional) => ({
      professionalId: professional.id,
      dateIso: block.startsAt.slice(0, 10),
      startLabel: block.startLabel,
      endLabel: block.endLabel,
      timeLabel: block.startLabel,
      customerName: `bloqueio: ${block.reason}`,
      kind: 'block' as const,
    }));
  });
}
function buildCalendarEvents(
  appointments: readonly AgendaAppointment[],
  scheduleBlocks: readonly AgendaScheduleBlock[],
) {
  const appointmentEvents = appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.customerName,
    start: appointment.startsAt,
    end: appointment.endsAt,
    classNames: ['agenda-calendar-event', 'agenda-calendar-event-' + appointment.statusTone],
    extendedProps: {
      appointment,
    },
  }));
  const blockEvents = scheduleBlocks.map((block) => ({
    id: block.id,
    title: block.reason,
    start: block.startsAt,
    end: block.endsAt,
    classNames: ['agenda-calendar-event', 'agenda-calendar-event-block'],
    extendedProps: {
      block,
    },
  }));
  return [...appointmentEvents, ...blockEvents];
}

function renderEventContent(arg: {
  event: {
    title: string;
    extendedProps: { appointment?: AgendaAppointment; block?: AgendaScheduleBlock };
  };
}) {
  const appointment = arg.event.extendedProps.appointment as AgendaAppointment | undefined;
  const block = arg.event.extendedProps.block as AgendaScheduleBlock | undefined;
  if (block) {
    return (
      <div className="agenda-calendar-event-content">
        <strong>Bloqueado</strong>
        <span>{block.reason}</span>
        <small>
          {block.startLabel} · {block.professionalName}
        </small>
      </div>
    );
  }
  if (!appointment) return <span>{arg.event.title}</span>;
  return (
    <div className="agenda-calendar-event-content">
      <strong>{appointment.customerName}</strong>
      <span>{appointment.serviceNames.join(' + ')}</span>
      <small>
        {appointment.startLabel} · {appointment.professionalName}
      </small>
    </div>
  );
}
function agendaHref(
  agenda: AgendaViewModel,
  overrides: Partial<
    Record<'appointmentId' | 'date' | 'mode' | 'panel' | 'time' | 'view', string>
  > = {},
) {
  const params = new URLSearchParams({
    date: overrides.date ?? agenda.dateIso,
    view: overrides.view ?? agenda.calendarView,
  });
  if (agenda.selectedProfessionalId !== 'all') {
    params.set('professionalId', agenda.selectedProfessionalId);
  }
  if (overrides.mode) params.set('mode', overrides.mode);
  if (overrides.panel && overrides.panel !== 'calendar') params.set('panel', overrides.panel);
  if (overrides.time) params.set('time', overrides.time);
  if (overrides.appointmentId) params.set('appointmentId', overrides.appointmentId);
  return `/agenda?${params.toString()}`;
}

function agendaBaseHref(agenda: AgendaViewModel, view: AgendaCalendarView) {
  return agendaHref(agenda, { view });
}

function toDateIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function toTimeLabel(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return hours === '00' && minutes === '00' ? '12:00' : `${hours}:${minutes}`;
}

function isPastAgendaSelection(date: Date) {
  const dateIso = toDateIso(date);
  const todayIso = todayIsoDate();
  if (dateIso < todayIso) return true;
  if (dateIso > todayIso) return false;

  const timeLabel = toTimeLabel(date);
  if (timeLabel === '12:00' && date.getHours() === 0 && date.getMinutes() === 0) return false;
  return timeLabel <= currentTimeLabel();
}

function todayIsoDate() {
  const parts = getSaoPauloDateTimeParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentTimeLabel() {
  const parts = getSaoPauloDateTimeParts();
  return `${parts.hour}:${parts.minute}`;
}

function getSaoPauloDateTimeParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<
    'day' | 'hour' | 'minute' | 'month' | 'year',
    string
  >;
}
