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
  X,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  MessagingActionModel,
  MessagingConversationItemModel,
  MessagingStatusTone,
  MessagingStatusViewModel,
} from '../lib/messaging-status-data';
import { SummaryTile } from './product-view';

export function MessagingStatusView({ model }: Readonly<{ model: MessagingStatusViewModel }>) {
  const [selectedConversationId, setSelectedConversationId] = React.useState(
    model.selectedConversation?.id,
  );
  const [setupOpen, setSetupOpen] = React.useState(false);
  const selectedConversation =
    model.conversations.find((conversation) => conversation.id === selectedConversationId) ??
    model.selectedConversation;

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
        <MessagingActions actions={model.allowedActions} onSetup={() => setSetupOpen(true)} />
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
              <ConnectionPanel model={model} onSetup={() => setSetupOpen(true)} />
              <ConversationList
                conversations={model.conversations}
                selectedId={selectedConversation?.id}
                onSelect={setSelectedConversationId}
              />
              <HealthNotes model={model} />
            </main>
            <aside className="messaging-side" aria-label="Saúde de entregas">
              <ConversationDetail conversation={selectedConversation} />
              <DeliveryHealthPanel model={model} />
            </aside>
          </div>
        </>
      )}
      {setupOpen ? <WhatsappSetupDialog model={model} onClose={() => setSetupOpen(false)} /> : null}
    </div>
  );
}

function ConversationList({
  conversations,
  onSelect,
  selectedId,
}: Readonly<{
  conversations: readonly MessagingConversationItemModel[];
  onSelect: (conversationId: string) => void;
  selectedId?: string;
}>) {
  return (
    <section className="messaging-panel" aria-labelledby="messaging-conversation-list-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Conversas</p>
          <h2 id="messaging-conversation-list-title">Atendimento WhatsApp</h2>
        </div>
        <MessageSquare size={20} aria-hidden="true" />
      </div>
      {conversations.length ? (
        <div className="messaging-conversation-list">
          {conversations.map((conversation) => (
            <button
              aria-pressed={selectedId === conversation.id}
              className="messaging-conversation-row"
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
            >
              <div>
                <strong>{conversation.customerLabel}</strong>
                <span>{conversation.lastMessagePreview}</span>
              </div>
              <div className="messaging-conversation-meta">
                <StatusBadge variant={badgeVariant(conversation.statusTone)}>
                  {conversation.statusLabel}
                </StatusBadge>
                <span>{conversation.lastMessageAtLabel}</span>
                {conversation.unreadCount ? <strong>{conversation.unreadCount}</strong> : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="messaging-muted">Sem conversas visíveis para esta unidade.</p>
      )}
    </section>
  );
}

function ConversationDetail({
  conversation,
}: Readonly<{ conversation?: MessagingConversationItemModel }>) {
  return (
    <section className="messaging-panel" aria-labelledby="messaging-conversation-detail-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Mensagens</p>
          <h2 id="messaging-conversation-detail-title">
            {conversation ? conversation.customerLabel : 'Conversa'}
          </h2>
        </div>
        <MessageSquare size={20} aria-hidden="true" />
      </div>
      {conversation ? (
        <>
          <dl className="messaging-detail-grid">
            <DetailTerm label="Unidade" value={conversation.branchName} />
            <DetailTerm label="Status" value={conversation.statusLabel} />
            <DetailTerm label="Não lidas" value={String(conversation.unreadCount)} />
            <DetailTerm label="Última" value={conversation.lastMessageAtLabel} />
          </dl>
          <div className="messaging-message-list">
            {conversation.messages.map((message) => (
              <article
                className={`messaging-message-bubble ${message.directionLabel === 'Cliente' ? 'inbound' : 'outbound'}`}
                key={message.id}
              >
                <div>
                  <strong>{message.directionLabel}</strong>
                  <span>{message.createdAtLabel}</span>
                </div>
                <p>{message.bodyPreview}</p>
                <StatusBadge variant={badgeVariant(message.deliveryTone)}>
                  {message.deliveryStateLabel}
                </StatusBadge>
              </article>
            ))}
          </div>
          <p className="messaging-muted">
            Prévia sanitizada: telefones, emails e links são removidos desta superfície.
          </p>
        </>
      ) : (
        <div className="messaging-empty-panel compact">
          <MessageSquare size={24} aria-hidden="true" />
          <h2>Nenhuma conversa</h2>
          <p>Conversas aparecem conforme escopo de unidade e permissão.</p>
        </div>
      )}
    </section>
  );
}

function MessagingActions({
  actions,
  onSetup,
}: Readonly<{ actions: readonly MessagingActionModel[]; onSetup: () => void }>) {
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
              if (action.id === 'messaging.setup' && action.enabled) onSetup();
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

function ConnectionPanel({
  model,
  onSetup,
}: Readonly<{ model: MessagingStatusViewModel; onSetup: () => void }>) {
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
            onClick={onSetup}
          >
            <PlugZap size={16} aria-hidden="true" />
            Configurar WhatsApp
          </button>
        </div>
      )}
    </section>
  );
}

function WhatsappSetupDialog({
  model,
  onClose,
}: Readonly<{ model: MessagingStatusViewModel; onClose: () => void }>) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [provider, setProvider] = React.useState(model.connection?.providerLabel ?? 'Z-API');
  const [label, setLabel] = React.useState(model.connection?.label ?? model.branchName);
  const [credentialRef, setCredentialRef] = React.useState('');

  return (
    <div className="app-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog messaging-setup-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="app-dialog-header">
          <div>
            <p className="eyebrow">WhatsApp</p>
            <h2 id={titleId}>Configurar conexão</h2>
            <p id={descriptionId}>
              Informe referências seguras do provider. Tokens e segredos continuam somente no
              servidor.
            </p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <form className="messaging-setup-form">
          <fieldset disabled={!model.canManage || model.state === 'offline'}>
            <div className="campaign-form-grid">
              <label>
                Provider
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  <option value="Z-API">Z-API</option>
                  <option value="Meta Cloud API">Meta Cloud API</option>
                  <option value="Evolution API">Evolution API</option>
                </select>
              </label>
              <label>
                Nome da conexão
                <input
                  maxLength={120}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
            </div>
            <label>
              Referência da credencial
              <input
                maxLength={160}
                placeholder="Ex.: secret://barberos/whatsapp/centro"
                value={credentialRef}
                onChange={(event) => setCredentialRef(event.target.value)}
              />
            </label>
            <div className="messaging-setup-preview">
              <span>Unidade</span>
              <strong>{model.branchName}</strong>
              <span>Status após salvar</span>
              <strong>Pronto para validação</strong>
            </div>
          </fieldset>
          <div className="app-dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={!model.canManage || model.state === 'offline' || !credentialRef.trim()}
              type="button"
              onClick={onClose}
            >
              <PlugZap size={16} aria-hidden="true" />
              Salvar configuração
            </button>
          </div>
        </form>
      </section>
    </div>
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
