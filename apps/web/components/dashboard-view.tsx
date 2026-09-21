'use client';

import Link from 'next/link';
import type { SessionContext } from '@barberos/contracts';
import { ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert, Sparkles } from 'lucide-react';
import { Button, StatusBadge } from '@barberos/ui';

const ownerAppointments = [
  { time: '09:00', client: 'Marcos Vinicius', service: 'Corte + barba', status: 'Confirmado' },
  { time: '10:30', client: 'Rafael Alves', service: 'Corte classico', status: 'Aguardando' },
  { time: '14:00', client: 'Thiago Martins', service: 'Barba', status: 'Confirmado' },
  { time: '16:30', client: 'Joao Pedro', service: 'Combo completo', status: 'Confirmado' },
];

const receptionistAppointments = [
  { time: '09:00', client: 'Joao Silva', service: 'Corte Masculino', status: 'Confirmado' },
  { time: '09:40', client: 'Pedro Souza', service: 'Barba', status: 'Aguardando' },
  { time: '10:20', client: 'Marcos Lima', service: 'Corte + Barba', status: 'Confirmado' },
  { time: '11:30', client: 'Encaixe livre', service: 'Disponivel', status: 'Livre' },
];

const barberAppointments = [
  { time: '09:00', client: 'Joao Silva', service: 'Corte Masculino', status: 'Confirmado' },
  { time: '11:00', client: 'Rafael Costa', service: 'Barba', status: 'Confirmado' },
  { time: '14:30', client: 'Pedro Souza', service: 'Corte + Barba', status: 'Aguardando' },
];

type DashboardViewProps = {
  session: SessionContext;
};

export function DashboardView({ session }: DashboardViewProps) {
  if (session.role === 'PROFESSIONAL') return <BarberDashboard session={session} />;
  if (session.role === 'RECEPTIONIST') return <ReceptionDashboard session={session} />;
  return <AdminDashboard session={session} />;
}

function AdminDashboard({ session }: DashboardViewProps) {
  return (
    <DashboardFrame
      eyebrow="Hoje na barbearia"
      title={`Bom dia, ${firstName(session.userName)}.`}
      subtitle="Visao executiva da operacao, financeiro, equipe e oportunidades de crescimento."
      actionHref="/agenda?mode=new"
      actionLabel="Novo agendamento"
      metrics={[
        { label: 'Atendimentos hoje', value: '18', note: '3 a mais que ontem', positive: true },
        {
          label: 'Faturamento previsto',
          value: 'R$ 1.240',
          note: '72% confirmado',
          positive: true,
        },
        { label: 'Lucro estimado', value: 'R$ 684', note: 'Margem de 55%', positive: true },
        { label: 'Ticket medio', value: 'R$ 86', note: 'R$ 8 acima da media', positive: true },
      ]}
      appointments={ownerAppointments}
      agendaTitle="Agenda de hoje"
      agendaCaption={`${session.branchName} · toda a equipe`}
      insightTitle="Barber AI"
      insightCaption="Sinais que merecem atencao"
      insights={[
        {
          icon: 'alert',
          title: '12 clientes no periodo de retorno',
          body: 'Uma campanha pode preencher os horarios livres da proxima semana.',
        },
        {
          icon: 'calendar',
          title: 'Dois horarios vagos hoje',
          body: 'O intervalo entre 12h e 14h ainda pode ser aproveitado.',
        },
      ]}
      nextTitle="Administracao"
      nextCaption="Equipe, filiais e permissoes"
      nextBody="Gerencie usuarios, profissionais, filiais, financeiro, estoque e repasses da barbearia."
      nextActionLabel="Administrar equipe"
      nextHref="/equipe"
    />
  );
}

function ReceptionDashboard({ session }: DashboardViewProps) {
  return (
    <DashboardFrame
      eyebrow="Balcao e atendimento"
      title={`Bom trabalho, ${firstName(session.userName)}.`}
      subtitle="Atalhos para agenda, comandas, pagamentos, caixa e estoque do dia."
      actionHref="/comandas?mode=walk-in#nova-comanda"
      actionLabel="Nova comanda"
      metrics={[
        { label: 'Agendamentos hoje', value: '18', note: '4 aguardando chegada' },
        { label: 'Comandas abertas', value: '05', note: '2 prontas para pagamento' },
        { label: 'Caixa', value: 'Aberto', note: 'Unidade Centro', positive: true },
        { label: 'Alertas de estoque', value: '02', note: 'Repor produtos do balcao' },
      ]}
      appointments={receptionistAppointments}
      agendaTitle="Fila operacional"
      agendaCaption={`${session.branchName} · recepcao`}
      insightTitle="Acoes rapidas"
      insightCaption="Prioridade do turno"
      insights={[
        {
          icon: 'calendar',
          title: 'Confirmar dois clientes pendentes',
          body: 'Os horarios das 09h40 e 14h30 ainda precisam de confirmacao.',
        },
        {
          icon: 'alert',
          title: 'Produto com estoque baixo',
          body: 'Pomada Matte esta abaixo do minimo na Unidade Centro.',
        },
      ]}
      nextTitle="Proximo atendimento"
      nextCaption="Fluxo Agenda -> Comanda -> Pagamento"
      nextBody="Use check-in para abrir a comanda com os servicos agendados e finalizar no caixa."
      nextActionLabel="Abrir agenda"
      nextHref="/agenda"
    />
  );
}

function BarberDashboard({ session }: DashboardViewProps) {
  return (
    <DashboardFrame
      eyebrow="Minha operacao"
      title={`Sua agenda, ${firstName(session.userName)}.`}
      subtitle="Acompanhe seus atendimentos, clientes, producao, comissoes, gorjetas e repasses."
      actionHref="/minha-carteira"
      actionLabel="Minha carteira"
      metrics={[
        { label: 'Atendimentos hoje', value: '03', note: '1 aguardando confirmacao' },
        {
          label: 'Producao do mes',
          value: 'R$ 1.450',
          note: 'Servicos finalizados',
          positive: true,
        },
        {
          label: 'Comissoes abertas',
          value: 'R$ 725',
          note: 'Previsto para repasse',
          positive: true,
        },
        { label: 'Repasses pagos', value: 'R$ 300', note: 'Ultimos 7 dias', positive: true },
      ]}
      appointments={barberAppointments}
      agendaTitle="Minha agenda de hoje"
      agendaCaption={`${session.branchName} · somente seus atendimentos`}
      insightTitle="Minha performance"
      insightCaption="Acompanhe seus ganhos"
      insights={[
        {
          icon: 'calendar',
          title: 'Proximo atendimento as 09h',
          body: 'Cliente Joao Silva esta confirmado para Corte Masculino.',
        },
        {
          icon: 'alert',
          title: 'Comissoes abertas para conferencia',
          body: 'Revise sua carteira para acompanhar valores a receber.',
        },
      ]}
      nextTitle="Carteira profissional"
      nextCaption="Producao, gorjetas e repasses"
      nextBody="Veja seus cortes realizados, comissoes abertas, valores pagos e historico de repasses."
      nextActionLabel="Ver carteira"
      nextHref="/minha-carteira"
    />
  );
}

function DashboardFrame({
  eyebrow,
  title,
  subtitle,
  actionHref,
  actionLabel,
  metrics,
  appointments,
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
            {appointments.map((appointment) => (
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
            ))}
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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'time';
}
