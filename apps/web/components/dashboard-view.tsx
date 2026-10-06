'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert, Sparkles } from 'lucide-react';
import { Button, StatusBadge } from '@barberos/ui';
import type { DashboardViewModel } from '../lib/dashboard-data';

type DashboardViewProps = {
  model: DashboardViewModel;
};

export function DashboardView({ model }: DashboardViewProps) {
  return <DashboardFrame {...model} />;
}

function DashboardFrame({
  eyebrow,
  title,
  subtitle,
  actionHref,
  actionLabel,
  metrics,
  appointments,
  emptyAppointmentsMessage,
  agendaTitle,
  agendaCaption,
  insightTitle,
  insightCaption,
  insights,
  nextTitle,
  nextCaption,
  nextBody,
  nextActionLabel,
  nextHref,
}: Readonly<{
  eyebrow: string;
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
  metrics: readonly MetricProps[];
  appointments: readonly AppointmentItem[];
  emptyAppointmentsMessage: string;
  agendaTitle: string;
  agendaCaption: string;
  insightTitle: string;
  insightCaption: string;
  insights: readonly InsightItem[];
  nextTitle: string;
  nextCaption: string;
  nextBody: string;
  nextActionLabel: string;
  nextHref: string;
}>) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="subheading">{subtitle}</p>
        </div>
        <Button asChild variant="primary">
          <Link href={actionHref}>
            {actionLabel} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="page-grid metrics-grid">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>

      <div className="page-grid content-grid">
        <section className="panel" aria-labelledby="agenda-title">
          <div className="panel-header">
            <div>
              <h2 id="agenda-title">{agendaTitle}</h2>
              <p className="section-caption">{agendaCaption}</p>
            </div>
            <Link className="button button-ghost" href="/agenda">
              Ver agenda <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="panel-body agenda-list">
            {appointments.length ? (
              appointments.map((appointment) => (
                <div className="appointment-row" key={`${appointment.time}-${appointment.client}`}>
                  <span className="appointment-time">{appointment.time}</span>
                  <div>
                    <div className="appointment-client">{appointment.client}</div>
                    <div className="appointment-service">{appointment.service}</div>
                  </div>
                  <StatusBadge variant={badgeVariantFor(appointment.status)}>
                    {appointment.status}
                  </StatusBadge>
                </div>
              ))
            ) : (
              <p className="section-caption">{emptyAppointmentsMessage}</p>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="panel" aria-labelledby="ai-title">
            <div className="panel-header">
              <div>
                <h2 id="ai-title">{insightTitle}</h2>
                <p className="section-caption">{insightCaption}</p>
              </div>
              <Sparkles size={18} color="var(--ai)" aria-hidden="true" />
            </div>
            <div className="panel-body action-list">
              {insights.map((insight) => (
                <div className="action-item" key={insight.title}>
                  <span className="action-icon">
                    {insight.icon === 'alert' ? (
                      <CircleAlert size={17} aria-hidden="true" />
                    ) : (
                      <CalendarClock size={17} aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <h3>{insight.title}</h3>
                    <p>{insight.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="next-title">
            <div className="panel-header">
              <div>
                <h2 id="next-title">{nextTitle}</h2>
                <p className="section-caption">{nextCaption}</p>
              </div>
              <CheckCircle2 size={18} color="var(--success)" aria-hidden="true" />
            </div>
            <div className="panel-body">
              <p className="section-caption">{nextBody}</p>
              <Button asChild variant="secondary">
                <Link href={nextHref}>{nextActionLabel}</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

type AppointmentItem = {
  time: string;
  client: string;
  service: string;
  status: string;
};

type InsightItem = {
  icon: 'alert' | 'calendar';
  title: string;
  body: string;
};

type MetricProps = {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
};

function Metric({ label, value, note, positive = false }: Readonly<MetricProps>) {
  return (
    <article className="panel metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className={`metric-note ${positive ? 'positive' : ''}`}>{note}</span>
    </article>
  );
}

function badgeVariantFor(status: string) {
  if (status === 'Aguardando' || status === 'Livre') return 'warning';
  return 'success';
}
