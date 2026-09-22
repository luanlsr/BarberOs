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
import { AppointmentDetailSurface } from './appointment-detail-surface';
import { NewAppointmentFlow } from './new-appointment-flow';
import type { AgendaAppointment, AgendaCalendarView, AgendaViewModel } from '../lib/agenda-data';

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
  const selectedDetail = agenda.selectedAppointmentDetail;
  const events = React.useMemo(
    () => buildCalendarEvents(agenda.appointments),
    [agenda.appointments],
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

  function handleDateClick(arg: { date: Date }) {
    navigateTo({ mode: 'new', date: toDateIso(arg.date), time: toTimeLabel(arg.date) });
  }

  function handleSelect(arg: { start: Date }) {
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
          {agenda.canCreateAppointment ? (
            <Link
              className="button button-primary"
              href={agendaHref(agenda, { mode: 'new', view: calendarView })}
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Novo agendamento
            </Link>
          ) : null}
        </div>
      </div>

      <form className="agenda-filterbar" method="get" aria-label="Filtros da agenda">
        <input type="hidden" name="view" value={calendarView} />
        <label>
          <span>Data</span>
          <input type="date" name="date" defaultValue={agenda.dateIso} />
        </label>
        <label>
          <span>Profissional</span>
          <select name="professionalId" defaultValue={agenda.selectedProfessionalId}>
            <option value="all">Todos</option>
            {agenda.professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" type="submit">
          Aplicar
        </Button>
      </form>

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
            selectable={agenda.canCreateAppointment}
            selectMirror
            nowIndicator
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="19:00:00"
            slotDuration="00:30:00"
            locale="pt-br"
            height="auto"
            headerToolbar={false}
            dayMaxEvents={3}
            eventClick={handleEventClick}
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

      {agenda.newAppointment.isOpen ? (
        <AgendaModal title="Novo agendamento" onCloseHref={agendaBaseHref(agenda, calendarView)}>
          <NewAppointmentFlow model={agenda.newAppointment} />
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
  return (
    <div className="app-dialog-backdrop" role="presentation">
      <section
        aria-label={title}
        aria-modal="true"
        className="app-dialog agenda-dialog"
        role="dialog"
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

function buildCalendarEvents(appointments: readonly AgendaAppointment[]) {
  return appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.customerName,
    start: appointment.startsAt,
    end: appointment.endsAt,
    classNames: ['agenda-calendar-event', 'agenda-calendar-event-' + appointment.statusTone],
    extendedProps: {
      appointment,
    },
  }));
}

function renderEventContent(arg: {
  event: { title: string; extendedProps: { appointment?: AgendaAppointment } };
}) {
  const appointment = arg.event.extendedProps.appointment as AgendaAppointment | undefined;
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
  overrides: Partial<Record<'appointmentId' | 'date' | 'mode' | 'time' | 'view', string>> = {},
) {
  const params = new URLSearchParams({
    date: overrides.date ?? agenda.dateIso,
    view: overrides.view ?? agenda.calendarView,
  });
  if (agenda.selectedProfessionalId !== 'all') {
    params.set('professionalId', agenda.selectedProfessionalId);
  }
  if (overrides.mode) params.set('mode', overrides.mode);
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
