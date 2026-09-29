'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  MessageSquare,
  PlugZap,
  RefreshCcw,
  Send,
  Settings,
  WifiOff,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  MessagingActionModel,
  MessagingStatusTone,
  MessagingStatusViewModel,
} from '../lib/messaging-status-data';
import { SummaryTile } from './product-view';

export function MessagingStatusView({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  if (model.state === 'permission-denied') return <MessagingBoundaryState model={model} />;
  if (model.state === 'error') return <MessagingBoundaryState model={model} />;

  return (
    <div className="messaging-page">
      <header className="messaging-heading">
        <div>
          <p className="eyebrow">Comunicação</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <MessagingActions actions={model.allowedActions} />
      </header>

      <MessagingInlineState model={model} />

      {model.state === 'loading' ? (
        <MessagingLoadingState />
      ) : (
        <>
          <section className="inventory-summary-grid" aria-label="Resumo de mensagens">
            <SummaryTile
              label="Conexão"
              value={model.connection ? model.connection.statusLabel : 'Pendente'}
              tone={
                model.connection?.statusTone ?? (model.state === 'empty' ? 'warning' : 'neutral')
              }
            />
            <SummaryTile
              label="Entregues"
              value={String(metricCount(model, 'DELIVERED'))}
              tone="success"
            />
            <SummaryTile
              label="Falhas"
              value={String(metricCount(model, 'FAILED'))}
              tone={metricCount(model, 'FAILED') > 0 ? 'danger' : 'neutral'}
            />
          </section>

          <div className="messaging-workspace" aria-label="Status de mensagens responsivo">
            <main className="messaging-primary" aria-label="Conexão WhatsApp">
              <ConnectionPanel model={model} />
              <HealthNotes model={model} />
            </main>
            <aside className="messaging-side" aria-label="Saúde de entregas">
              <DeliveryHealthPanel model={model} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function MessagingActions({ actions }: Readonly<{ actions: readonly MessagingActionModel[] }>) {
  return (
    <div className="inventory-heading-actions" aria-label="Ações de mensagens">
      {actions.map((action) => {
        const content = (
          <>
            {iconForAction(action.id)}
            {action.label}
          </>
        );
        const className =
          action.id === 'messaging.setup' ? 'button button-primary' : 'button button-secondary';
        if (action.href && action.enabled) {
          return (
            <Link className={className} href={action.href} key={action.id}>
              {content}
            </Link>
          );
        }
        return (
          <button
            className={className}
            disabled={!action.enabled}
            key={action.id}
            title={action.reason}
            type="button"
            onClick={() => {
              if (action.id === 'messaging.refresh') window.location.reload();
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function iconForAction(id: MessagingActionModel['id']) {
  if (id === 'messaging.refresh') return <RefreshCcw size={16} aria-hidden="true" />;
  if (id === 'messaging.open-campaigns') return <Send size={16} aria-hidden="true" />;
  if (id === 'messaging.open-conversations') return <MessageSquare size={16} aria-hidden="true" />;
  if (id === 'messaging.setup') return <PlugZap size={16} aria-hidden="true" />;
  return <Settings size={16} aria-hidden="true" />;
}

function MessagingInlineState({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  if (model.state === 'offline') {
    return (
      <div className="inventory-inline-state inventory-tone-warning" role="status">
        <WifiOff size={17} aria-hidden="true" />
        <span>Modo offline: envio, agendamento de campanhas e setup ficam bloqueados.</span>
      </div>
    );
  }
  if (model.state === 'empty') {
    return (
      <div className="inventory-inline-state inventory-tone-neutral" role="status">
        <PlugZap size={17} aria-hidden="true" />
        <span>Configure um WhatsApp para liberar mensagens transacionais e campanhas.</span>
      </div>
    );
  }
  if (model.state === 'inactive-provider') {
    return (
      <div className="inventory-inline-state inventory-tone-warning" role="status">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>Provider inativo: entregas e campanhas permanecem pausadas.</span>
      </div>
    );
  }
  return null;
}

function ConnectionPanel({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  const connection = model.connection;
  return (
    <section className="messaging-panel" aria-labelledby="messaging-connection-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">WhatsApp</p>
          <h2 id="messaging-connection-title">Conexão da unidade</h2>
        </div>
        <PlugZap size={20} aria-hidden="true" />
      </div>

      {connection ? (
        <div className="messaging-connection-card">
          <div className="messaging-connection-head">
            <div>
              <strong>{connection.label}</strong>
              <span>{connection.providerLabel}</span>
            </div>
            <StatusBadge variant={badgeVariant(connection.statusTone)}>
              {connection.statusLabel}
            </StatusBadge>
          </div>
          <dl className="messaging-detail-grid">
            <DetailTerm label="Telefone" value={connection.phoneLabel} />
            <DetailTerm label="Escopo" value={connection.branchLabel} />
            <DetailTerm label="Fallback" value={connection.fallbackLabel} />
            <DetailTerm label="Atualizado" value={connection.updatedAtLabel} />
          </dl>
          <p className="messaging-muted">
            Referências de credencial e segredo de webhook ficam somente no servidor.
          </p>
        </div>
      ) : (
        <div className="messaging-empty-panel">
          <PlugZap size={28} aria-hidden="true" />
          <h2>Nenhuma conexão ativa</h2>
          <p>
            Um usuário autorizado precisa configurar o provider usando referências seguras de
            credenciais.
          </p>
          <button
            className="button button-primary"
            disabled={!model.canManage || model.state === 'offline'}
            title={
              model.canManage
                ? 'Disponível quando o setup for conectado ao provider.'
                : 'Sem permissão para gerenciar provider.'
            }
            type="button"
          >
            <PlugZap size={16} aria-hidden="true" />
            Configurar WhatsApp
          </button>
        </div>
      )}
    </section>
  );
}

function HealthNotes({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  return (
    <section className="messaging-panel" aria-labelledby="messaging-notes-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Operação segura</p>
          <h2 id="messaging-notes-title">Regras ativas</h2>
        </div>
        <CheckCircle2 size={20} aria-hidden="true" />
      </div>
      <ul className="messaging-note-list">
        {model.healthNotes.map((note) => (
          <li key={note}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeliveryHealthPanel({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  return (
    <section className="messaging-panel" aria-labelledby="messaging-delivery-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Entregas</p>
          <h2 id="messaging-delivery-title">Últimas 24h</h2>
        </div>
        <Send size={20} aria-hidden="true" />
      </div>
      {model.canReadDeliveryHealth ? (
        model.deliveryMetrics.length ? (
          <div className="messaging-metric-list">
            {model.deliveryMetrics.map((metric) => (
              <article className={'messaging-metric inventory-tone-' + metric.tone} key={metric.id}>
                <span>{metric.label}</span>
                <strong>{metric.count}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="messaging-muted">Sem eventos de entrega para este estado.</p>
        )
      ) : (
        <div className="messaging-empty-panel compact">
          <LockKeyhole size={24} aria-hidden="true" />
          <h2>Saúde restrita</h2>
          <p>Seu perfil não possui permissão para status de entrega.</p>
        </div>
      )}
    </section>
  );
}

function MessagingLoadingState() {
  return (
    <section className="messaging-loading-state" aria-label="Carregando mensagens">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </section>
  );
}

function MessagingBoundaryState({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="inventory-boundary-state" aria-labelledby="messaging-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="messaging-boundary-title">{denied ? 'Mensagens indisponíveis' : model.title}</h1>
        <p>{model.error?.message ?? model.description}</p>
      </div>
    </section>
  );
}

function DetailTerm({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function metricCount(model: MessagingStatusViewModel, id: string) {
  return model.deliveryMetrics.find((metric) => metric.id === id)?.count ?? 0;
}

function badgeVariant(tone: MessagingStatusTone) {
  if (tone === 'danger') return 'warning';
  return tone;
}
