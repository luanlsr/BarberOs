import * as React from 'react';
import Link from 'next/link';
import { Clock3, Scissors, UserRound } from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type { AgendaAppointment } from '../lib/agenda-data';

type AppointmentCardProps = Readonly<{
  appointment: AgendaAppointment;
  compact?: boolean;
  detailHref: string;
}>;

export function AppointmentCard({
  appointment,
  compact = false,
  detailHref,
}: AppointmentCardProps) {
  return (
    <article className={`appointment-card ${compact ? 'compact' : ''}`}>
      <div className="appointment-card-time" aria-label="Horario do agendamento">
        <strong>{appointment.startLabel}</strong>
        <span>{appointment.endLabel}</span>
      </div>
      <div className="appointment-card-main">
        <div className="appointment-card-title">
          <h3>{appointment.customerName}</h3>
          <StatusBadge variant={appointment.statusTone}>{appointment.statusLabel}</StatusBadge>
        </div>
        <p>{appointment.serviceNames.join(' + ')}</p>
        <div className="appointment-card-meta">
          <span>
            <UserRound size={14} aria-hidden="true" />
            {appointment.professionalName}
          </span>
          <span>
            <Scissors size={14} aria-hidden="true" />
            {appointment.durationLabel}
          </span>
          <span>
            <Clock3 size={14} aria-hidden="true" />
            {appointment.totalLabel}
          </span>
        </div>
        <Link className="appointment-card-detail-link" href={detailHref}>
          Ver detalhes
        </Link>
      </div>
    </article>
  );
}
