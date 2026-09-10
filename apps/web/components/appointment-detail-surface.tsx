import * as React from 'react';
import Link from 'next/link';
import { CalendarClock, PhoneCall, Scissors, ShieldCheck, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import { CheckInActionButton } from './check-in-action-button';
import type { AgendaAppointmentAction, AgendaAppointmentDetail } from '../lib/agenda-data';

type AppointmentDetailSurfaceProps = Readonly<{
  detail?: AgendaAppointmentDetail;
}>;

const actionIcons: Record<AgendaAppointmentAction['id'], LucideIcon> = {
  'check-in': ShieldCheck,
  contact: PhoneCall,
  reschedule: CalendarClock,
  cancel: XCircle,
};

export function AppointmentDetailSurface({ detail }: AppointmentDetailSurfaceProps) {
  if (!detail) {
    return (
      <aside
        className="appointment-detail-surface"
        aria-labelledby="appointment-detail-empty-title"
      >
        <div className="appointment-detail-empty">
          <CalendarClock size={24} aria-hidden="true" />
          <h2 id="appointment-detail-empty-title">Selecione um agendamento</h2>
          <p>Os detalhes aparecem aqui quando houver um agendamento visivel na agenda.</p>
        </div>
      </aside>
    );
  }

  const { appointment } = detail;

  return (
    <aside className="appointment-detail-surface" aria-labelledby="appointment-detail-title">
      <header className="appointment-detail-header">
        <div>
          <p className="eyebrow">Detalhe do agendamento</p>
          <h2 id="appointment-detail-title">{appointment.customerName}</h2>
          <p>
            {appointment.startLabel} - {appointment.endLabel} · {appointment.professionalName}
          </p>
        </div>
        <StatusBadge variant={appointment.statusTone}>{appointment.statusLabel}</StatusBadge>
      </header>

      <section className="appointment-detail-section" aria-label="Resumo do atendimento">
        <div className="appointment-detail-summary">
          <span>
            <Scissors size={15} aria-hidden="true" />
            {appointment.serviceNames.join(' + ')}
          </span>
          <strong>{appointment.totalLabel}</strong>
          <small>
            {appointment.durationLabel} · origem {appointment.sourceLabel}
          </small>
        </div>
      </section>

      <section className="appointment-detail-section" aria-labelledby="appointment-customer-title">
        <h3 id="appointment-customer-title">Cliente</h3>
        <dl className="appointment-detail-list">
          <div>
            <dt>Telefone</dt>
            <dd>{detail.customer.phone}</dd>
          </div>
          <div>
            <dt>Relacionamento</dt>
            <dd>{detail.customer.visitsLabel}</dd>
          </div>
          <div>
            <dt>Retorno</dt>
            <dd>{detail.customer.lastVisitLabel}</dd>
          </div>
          {detail.customer.notes ? (
            <div>
              <dt>Observacao</dt>
              <dd>{detail.customer.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="appointment-detail-section" aria-labelledby="appointment-actions-title">
        <div className="appointment-detail-section-title">
          <h3 id="appointment-actions-title">Acoes permitidas</h3>
          <span>{detail.actions.length}</span>
        </div>
        {detail.actions.length ? (
          <div className="appointment-action-grid">
            {detail.actions.map((action) => (
              <AppointmentActionControl action={action} key={action.id} />
            ))}
          </div>
        ) : (
          <p className="appointment-detail-muted">
            Seu perfil pode consultar este agendamento, mas nao possui acoes operacionais para ele.
          </p>
        )}
      </section>

      <section className="appointment-detail-section" aria-labelledby="appointment-history-title">
        <h3 id="appointment-history-title">Historico</h3>
        <ol className="appointment-history-list">
          {detail.history.map((item) => (
            <li key={item.id}>
              <time>{item.atLabel}</time>
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.statusLabel} por {item.actorName}
                </span>
                {item.reason ? <p>{item.reason}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function AppointmentActionControl({ action }: Readonly<{ action: AgendaAppointmentAction }>) {
  const Icon = actionIcons[action.id];
  const className = `appointment-action appointment-action-${action.variant}`;

  if (action.id === 'check-in' && action.appointmentId && !action.disabledReason) {
    return (
      <CheckInActionButton
        appointmentId={action.appointmentId}
        className={className}
        description={action.description}
        label={action.label}
      />
    );
  }

  if (!action.href || action.disabledReason) {
    return (
      <span className={`${className} disabled`} aria-disabled="true" title={action.disabledReason}>
        <Icon size={16} aria-hidden={true} />
        <span>{action.label}</span>
      </span>
    );
  }

  return (
    <Link className={className} href={action.href} title={action.description}>
      <Icon size={16} aria-hidden={true} />
      <span>{action.label}</span>
    </Link>
  );
}
