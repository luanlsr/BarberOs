import * as React from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCcw,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  WorkerOperationsIssueModel,
  WorkerOperationsMetricModel,
  WorkerOperationsViewModel,
} from '../lib/worker-operations-data';

export function WorkerOperationsView({ model }: Readonly<{ model: WorkerOperationsViewModel }>) {
  if (model.state === 'permission-denied') return <WorkerBoundaryState model={model} />;
  if (model.state === 'error') return <WorkerBoundaryState model={model} />;

  return (
    <div className="worker-page">
      <header className="worker-heading">
        <div>
          <p className="eyebrow">Operações</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <button
          className="button button-secondary"
          disabled={model.state === 'loading'}
          type="button"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Recarregar
        </button>
      </header>

      {model.state === 'loading' ? <WorkerInlineState text="Carregando worker..." /> : null}
      {model.state === 'offline' ? (
        <WorkerInlineState
          text="Modo offline: falhas aparecem como leitura local."
          tone="warning"
        />
      ) : null}
      {model.state === 'empty' ? (
        <WorkerInlineState text="Nenhuma falha assíncrona encontrada." />
      ) : null}

      <section className="worker-kpi-grid" aria-label="Indicadores do worker">
        {model.metrics.map((metric) => (
          <WorkerMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className="worker-workspace" aria-label="Painel operacional do worker">
        <WorkerIssuePanel
          description="Eventos criados por pagamentos, comandas, agenda e integrações."
          icon={<Clock3 size={20} aria-hidden="true" />}
          issues={model.outboxIssues}
          title="Outbox"
        />
        <WorkerIssuePanel
          description="Jobs reservados, em retry ou enviados para dead letter."
          icon={<AlertTriangle size={20} aria-hidden="true" />}
          issues={model.jobIssues}
          title="Jobs"
        />
        <WorkerIssuePanel
          description="Intenções de envio geradas para lembretes e follow-up."
          icon={<BellRing size={20} aria-hidden="true" />}
          issues={model.notificationIssues}
          title="Notificações"
        />
      </div>
    </div>
  );
}

function WorkerMetricCard({ metric }: Readonly<{ metric: WorkerOperationsMetricModel }>) {
  return (
    <article className={'worker-kpi worker-tone-' + metric.tone}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
    </article>
  );
}

function WorkerIssuePanel({
  description,
  icon,
  issues,
  title,
}: Readonly<{
  description: string;
  icon: ReactNode;
  issues: readonly WorkerOperationsIssueModel[];
  title: string;
}>) {
  return (
    <section className="worker-panel" aria-labelledby={'worker-panel-' + title}>
      <div className="worker-panel-heading">
        <div>
          <p className="eyebrow">Monitor</p>
          <h2 id={'worker-panel-' + title}>{title}</h2>
          <p>{description}</p>
        </div>
        {icon}
      </div>
      {issues.length ? (
        <div className="worker-issue-list">
          {issues.map((issue) => (
            <article className="worker-issue-row" key={issue.id}>
              <div>
                <strong>{issue.title}</strong>
                <span>{issue.description}</span>
              </div>
              <div>
                <StatusBadge variant={badgeVariant(issue.tone)}>{issue.statusLabel}</StatusBadge>
                <small>{issue.updatedAtLabel}</small>
              </div>
              <footer>
                <span>Correlação: {issue.correlationId}</span>
                <span>Tentativas: {issue.attemptCount}</span>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <p className="worker-muted">Sem itens críticos nesta fila.</p>
      )}
    </section>
  );
}

function WorkerInlineState({
  text,
  tone = 'neutral',
}: Readonly<{ text: string; tone?: WorkerOperationsMetricModel['tone'] }>) {
  return (
    <div className={'worker-inline-state worker-tone-' + tone} role="status">
      {tone === 'warning' ? (
        <AlertTriangle size={17} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={17} aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function WorkerBoundaryState({ model }: Readonly<{ model: WorkerOperationsViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="worker-boundary-state" aria-labelledby="worker-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="worker-boundary-title">{denied ? 'Operações indisponíveis' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

function badgeVariant(tone: WorkerOperationsIssueModel['tone']) {
  if (tone === 'success') return 'success';
  if (tone === 'danger') return 'warning';
  if (tone === 'warning') return 'warning';
  return 'neutral';
}
