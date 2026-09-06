import Link from 'next/link';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Scissors,
  Users,
  WifiOff,
} from 'lucide-react';
import { Button, StatusBadge } from '@barberos/ui';
import type {
  AgendaAppointment,
  AgendaProfessionalColumn,
  AgendaTimelineSlot,
  AgendaViewModel,
} from '../lib/agenda-data';

export function AgendaView({ agenda }: Readonly<{ agenda: AgendaViewModel }>) {
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
        <div className="agenda-heading-actions" aria-label="Acoes da agenda">
          <Link
            className="icon-button"
            href={`/agenda?date=${agenda.dateIso}`}
            aria-label="Dia anterior"
            title="Dia anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Link>
          <Link
            className="icon-button"
            href={`/agenda?date=${agenda.dateIso}`}
            aria-label="Proximo dia"
            title="Proximo dia"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
          {agenda.canCreateAppointment ? (
            <Link
              className="button button-primary"
              href={`/agenda?mode=new&date=${agenda.dateIso}`}
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Novo agendamento
            </Link>
          ) : null}
        </div>
      </div>

      <form className="agenda-filterbar" method="get" aria-label="Filtros da agenda">
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
          Atualizada para hoje
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

      {agenda.appointments.length ? (
        <>
          <section className="agenda-mobile-timeline" aria-labelledby="agenda-mobile-title">
            <div className="agenda-section-title">
              <h2 id="agenda-mobile-title">Timeline do dia</h2>
              <span>{agenda.appointments.length} agendamentos</span>
            </div>
            <div className="agenda-timeline-list">
              {agenda.timeline.map((slot) => (
                <TimelineSlot key={slot.timeLabel} slot={slot} />
              ))}
            </div>
          </section>

          <section className="agenda-tablet-columns" aria-labelledby="agenda-tablet-title">
            <div className="agenda-section-title">
              <h2 id="agenda-tablet-title">Agenda por profissional</h2>
              <span>{agenda.appointments.length} agendamentos</span>
            </div>
            <div className="agenda-column-grid">
              {agenda.professionalColumns.map((column) => (
                <ProfessionalColumn column={column} key={column.professional.id} />
              ))}
            </div>
          </section>

          <section className="agenda-desktop-grid" aria-labelledby="agenda-desktop-title">
            <div className="agenda-section-title">
              <h2 id="agenda-desktop-title">Grade operacional</h2>
              <span>{agenda.appointments.length} agendamentos</span>
            </div>
            <div
              className="agenda-grid-table"
              style={{
                gridTemplateColumns: `76px repeat(${Math.max(agenda.professionalColumns.length, 1)}, minmax(180px, 1fr))`,
              }}
            >
              <div className="agenda-grid-corner" aria-hidden="true" />
              {agenda.professionalColumns.map((column) => (
                <div className="agenda-grid-header" key={column.professional.id}>
                  <strong>{column.professional.name}</strong>
                  <span>{column.professional.roleLabel}</span>
                </div>
              ))}
              {agenda.timeline.map((slot) => (
                <DesktopRow columns={agenda.professionalColumns} key={slot.timeLabel} slot={slot} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="agenda-empty-state" aria-labelledby="agenda-empty-title">
          <AlertTriangle size={24} aria-hidden="true" />
          <div>
            <h2 id="agenda-empty-title">Agenda vazia</h2>
            <p>{agenda.emptyMessage}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function TimelineSlot({ slot }: Readonly<{ slot: AgendaTimelineSlot }>) {
  return (
    <div className="agenda-timeline-slot">
      <time>{slot.timeLabel}</time>
      <div className="agenda-timeline-items">
        {slot.appointments.length ? (
          slot.appointments.map((appointment) => (
            <AgendaAppointmentTile appointment={appointment} key={appointment.id} />
          ))
        ) : (
          <span className="agenda-free-slot">Livre</span>
        )}
      </div>
    </div>
  );
}

function ProfessionalColumn({ column }: Readonly<{ column: AgendaProfessionalColumn }>) {
  return (
    <article className="agenda-professional-column">
      <header>
        <div>
          <h3>{column.professional.name}</h3>
          <span>{column.professional.roleLabel}</span>
        </div>
        <strong>{String(column.appointments.length).padStart(2, '0')}</strong>
      </header>
      <div className="agenda-column-items">
        {column.appointments.length ? (
          column.appointments.map((appointment) => (
            <AgendaAppointmentTile appointment={appointment} key={appointment.id} />
          ))
        ) : (
          <span className="agenda-free-slot">Sem agendamentos</span>
        )}
      </div>
    </article>
  );
}

function DesktopRow({
  columns,
  slot,
}: Readonly<{ columns: readonly AgendaProfessionalColumn[]; slot: AgendaTimelineSlot }>) {
  return (
    <>
      <time className="agenda-grid-time">{slot.timeLabel}</time>
      {columns.map((column) => {
        const appointments = slot.appointments.filter(
          (appointment) => appointment.professionalId === column.professional.id,
        );
        return (
          <div className="agenda-grid-cell" key={`${slot.timeLabel}-${column.professional.id}`}>
            {appointments.map((appointment) => (
              <AgendaAppointmentTile appointment={appointment} key={appointment.id} compact />
            ))}
          </div>
        );
      })}
    </>
  );
}

function AgendaAppointmentTile({
  appointment,
  compact = false,
}: Readonly<{ appointment: AgendaAppointment; compact?: boolean }>) {
  return (
    <article className={`agenda-appointment-tile ${compact ? 'compact' : ''}`} tabIndex={0}>
      <div className="agenda-appointment-time">
        <strong>{appointment.startLabel}</strong>
        <span>{appointment.endLabel}</span>
      </div>
      <div className="agenda-appointment-main">
        <div className="agenda-appointment-title">
          <h3>{appointment.customerName}</h3>
          <StatusBadge variant={appointment.statusTone}>{appointment.statusLabel}</StatusBadge>
        </div>
        <p>{appointment.serviceNames.join(' + ')}</p>
        <div className="agenda-appointment-meta">
          <span>
            <Users size={14} aria-hidden="true" />
            {appointment.professionalName}
          </span>
          <span>
            <Scissors size={14} aria-hidden="true" />
            {appointment.durationLabel}
          </span>
          <span>{appointment.totalLabel}</span>
        </div>
      </div>
    </article>
  );
}
