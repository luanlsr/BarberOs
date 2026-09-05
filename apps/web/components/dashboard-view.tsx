'use client';

import Link from 'next/link';
import { ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert, Sparkles } from 'lucide-react';
import { Button, StatusBadge } from '@barberos/ui';

const appointments = [
  { time: '09:00', client: 'Marcos Vinícius', service: 'Corte + barba', status: 'Confirmado' },
  { time: '10:30', client: 'Rafael Alves', service: 'Corte clássico', status: 'Aguardando' },
  { time: '14:00', client: 'Thiago Martins', service: 'Barba', status: 'Confirmado' },
  { time: '16:30', client: 'João Pedro', service: 'Combo completo', status: 'Confirmado' },
];

export function DashboardView() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sexta-feira, 05 de setembro</p>
          <h1>Bom dia, Luan.</h1>
          <p className="subheading">
            Aqui está o pulso da sua operação para você decidir o próximo movimento.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/agenda?mode=new">
            Novo agendamento <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="page-grid metrics-grid">
        <Metric label="Atendimentos hoje" value="18" note="3 a mais que ontem" positive />
        <Metric label="Faturamento previsto" value="R$ 1.240" note="72% já confirmado" positive />
        <Metric label="Horários livres" value="06" note="2 nas próximas 3 horas" />
        <Metric label="Ticket médio" value="R$ 86" note="R$ 8 acima da média" positive />
      </div>

      <div className="page-grid content-grid">
        <section className="panel" aria-labelledby="agenda-title">
          <div className="panel-header">
            <div>
              <h2 id="agenda-title">Agenda de hoje</h2>
              <p className="section-caption">Sexta, 05 de setembro · Unidade Centro</p>
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
                <StatusBadge variant={appointment.status === 'Aguardando' ? 'warning' : 'success'}>
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
                <h2 id="ai-title">Barber AI</h2>
                <p className="section-caption">Sinais que merecem atenção</p>
              </div>
              <Sparkles size={18} color="var(--ai)" aria-hidden="true" />
            </div>
            <div className="panel-body action-list">
              <div className="action-item">
                <span className="action-icon">
                  <CircleAlert size={17} aria-hidden="true" />
                </span>
                <div>
                  <h3>12 clientes no período de retorno</h3>
                  <p>Uma campanha pode preencher os horários livres da próxima semana.</p>
                </div>
              </div>
              <div className="action-item">
                <span className="action-icon">
                  <CalendarClock size={17} aria-hidden="true" />
                </span>
                <div>
                  <h3>Dois horários vagos hoje</h3>
                  <p>O intervalo entre 12h e 14h ainda pode ser aproveitado.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="next-title">
            <div className="panel-header">
              <div>
                <h2 id="next-title">Próximo passo</h2>
                <p className="section-caption">Configuração inicial</p>
              </div>
              <CheckCircle2 size={18} color="var(--success)" aria-hidden="true" />
            </div>
            <div className="panel-body">
              <p className="section-caption">
                Conecte os dados da sua equipe para calcular comissões e acompanhar a produção.
              </p>
              <Button variant="secondary" disabled>
                Configurar equipe
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  positive = false,
}: Readonly<{ label: string; value: string; note: string; positive?: boolean }>) {
  return (
    <article className="panel metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className={`metric-note ${positive ? 'positive' : ''}`}>{note}</span>
    </article>
  );
}
