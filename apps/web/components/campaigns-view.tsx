'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  Megaphone,
  Pencil,
  RefreshCcw,
  Send,
  Users,
} from 'lucide-react';
import { StatusBadge } from '@barberos/ui';
import type {
  CampaignActionModel,
  CampaignItemModel,
  CampaignsViewModel,
  CampaignTone,
} from '../lib/campaigns-view-data';
import { SummaryTile } from './product-view';

export function CampaignsView({ model }: Readonly<{ model: CampaignsViewModel }>) {
  const [campaigns, setCampaigns] = React.useState(() => [...model.campaigns]);
  const [selectedId, setSelectedId] = React.useState(model.selectedCampaign?.id);
  const selected =
    campaigns.find((campaign) => campaign.id === selectedId) ?? model.selectedCampaign;

  function createDraftCampaign() {
    const draft = buildDraftCampaign(model);
    setCampaigns((current) => [draft, ...current]);
    setSelectedId(draft.id);
  }

  function patchCampaign(campaignId: string, changes: Partial<CampaignItemModel>) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? normalizeCampaign({ ...campaign, ...changes }, model)
          : campaign,
      ),
    );
  }

  if (model.state === 'permission-denied') return <CampaignBoundaryState model={model} />;
  if (model.state === 'error') return <CampaignBoundaryState model={model} />;

  return (
    <div className="campaigns-page">
      <header className="campaigns-heading">
        <div>
          <p className="eyebrow">Crescimento</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <CampaignActions actions={model.allowedActions} onCreate={createDraftCampaign} />
      </header>

      <CampaignInlineState model={model} />

      {model.state === 'loading' ? (
        <CampaignLoadingState />
      ) : (
        <>
          <section className="inventory-summary-grid" aria-label="Resumo de campanhas">
            {model.summary.map((metric) => (
              <SummaryTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </section>

          <div className="campaigns-workspace" aria-label="Campanhas responsivas">
            <main className="campaigns-primary" aria-label="Lista e editor">
              <CampaignList
                campaigns={campaigns}
                selectedId={selected?.id}
                onSelect={setSelectedId}
              />
              <CampaignEditor model={model} selected={selected} onPatch={patchCampaign} />
            </main>
            <aside className="campaigns-side" aria-label="Prévia e resultado">
              <AudiencePreview selected={selected} />
              <CampaignLifecycle selected={selected} onPatch={patchCampaign} />
              <CampaignResults selected={selected} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function CampaignActions({
  actions,
  onCreate,
}: Readonly<{ actions: readonly CampaignActionModel[]; onCreate: () => void }>) {
  return (
    <div className="inventory-heading-actions" aria-label="Ações de campanhas">
      {actions.map((action) => (
        <button
          className={
            action.id === 'campaigns.create' ? 'button button-primary' : 'button button-secondary'
          }
          disabled={!action.enabled}
          key={action.id}
          title={action.reason}
          type="button"
          onClick={() => {
            if (action.id === 'campaigns.refresh') window.location.reload();
            if (action.id === 'campaigns.create' && action.enabled) onCreate();
          }}
        >
          {action.id === 'campaigns.create' ? (
            <Megaphone size={16} aria-hidden="true" />
          ) : (
            <RefreshCcw size={16} aria-hidden="true" />
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function buildDraftCampaign(model: CampaignsViewModel): CampaignItemModel {
  const now = new Date();
  return {
    id: 'draft-' + now.getTime(),
    name: 'Nova campanha',
    status: 'DRAFT',
    statusLabel: 'Rascunho',
    statusTone: 'neutral',
    branchName: model.branchName,
    templateKey: 'retorno-cliente',
    bodyPreview: 'Olá, {{nome}}! Temos horários disponíveis esta semana.',
    updatedAtLabel: 'Agora',
    audiencePreview: {
      audienceSize: 0,
      eligibleCount: 0,
      excludedCount: 0,
      unknownContactCount: 0,
      exclusionReasons: [],
    },
    resultMetrics: [],
    canEdit: model.canCreate,
    canSubmitForReview: model.canCreate,
    canApprove: false,
    canSchedule: false,
    canSend: false,
    canCancel: true,
    disabledReason: model.canCreate ? undefined : 'Sem permissão para criar campanhas.',
  };
}

function normalizeCampaign(campaign: CampaignItemModel, model: CampaignsViewModel) {
  const statusLabels = {
    DRAFT: 'Rascunho',
    READY_FOR_REVIEW: 'Em revisão',
    APPROVED: 'Aprovada',
    SCHEDULED: 'Agendada',
    SENDING: 'Enviando',
    SENT: 'Enviada',
    PARTIALLY_FAILED: 'Falha parcial',
    CANCELLED: 'Cancelada',
  } as const;
  const statusTone =
    campaign.status === 'SENT' || campaign.status === 'APPROVED'
      ? 'success'
      : campaign.status === 'PARTIALLY_FAILED'
        ? 'danger'
        : campaign.status === 'CANCELLED'
          ? 'neutral'
          : 'warning';
  return {
    ...campaign,
    statusLabel: statusLabels[campaign.status],
    statusTone,
    updatedAtLabel: 'Agora',
    canEdit: model.canCreate && campaign.status === 'DRAFT',
    canSubmitForReview: model.canCreate && campaign.status === 'DRAFT',
    canApprove: model.canApprove && campaign.status === 'READY_FOR_REVIEW',
    canSchedule: model.canApprove && campaign.status === 'APPROVED',
    canSend: model.canSend && ['APPROVED', 'SCHEDULED'].includes(campaign.status),
    canCancel:
      model.canApprove && !['SENT', 'PARTIALLY_FAILED', 'CANCELLED'].includes(campaign.status),
  } satisfies CampaignItemModel;
}

function CampaignInlineState({ model }: Readonly<{ model: CampaignsViewModel }>) {
  if (model.state === 'offline') {
    return (
      <div className="inventory-inline-state inventory-tone-warning" role="status">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>Modo offline: envio e agendamento ficam bloqueados até reconectar.</span>
      </div>
    );
  }
  if (model.state === 'empty') {
    return (
      <div className="inventory-inline-state inventory-tone-neutral" role="status">
        <Megaphone size={17} aria-hidden="true" />
        <span>Crie uma campanha para segmentar clientes com consentimento válido.</span>
      </div>
    );
  }
  return null;
}

function CampaignList({
  campaigns,
  onSelect,
  selectedId,
}: Readonly<{
  campaigns: readonly CampaignItemModel[];
  onSelect: (campaignId: string) => void;
  selectedId?: string;
}>) {
  return (
    <section className="campaigns-panel" aria-labelledby="campaign-list-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Campanhas</p>
          <h2 id="campaign-list-title">Lista operacional</h2>
        </div>
        <Megaphone size={20} aria-hidden="true" />
      </div>
      {campaigns.length ? (
        <div className="campaign-list">
          {campaigns.map((campaign) => (
            <button
              aria-pressed={selectedId === campaign.id}
              className="campaign-row"
              key={campaign.id}
              type="button"
              onClick={() => onSelect(campaign.id)}
            >
              <div>
                <strong>{campaign.name}</strong>
                <span>{campaign.templateKey}</span>
              </div>
              <StatusBadge variant={badgeVariant(campaign.statusTone)}>
                {campaign.statusLabel}
              </StatusBadge>
            </button>
          ))}
        </div>
      ) : (
        <p className="campaign-muted">Nenhuma campanha nesta unidade.</p>
      )}
    </section>
  );
}

function CampaignEditor({
  model,
  onPatch,
  selected,
}: Readonly<{
  model: CampaignsViewModel;
  onPatch: (campaignId: string, changes: Partial<CampaignItemModel>) => void;
  selected?: CampaignItemModel;
}>) {
  if (!selected) {
    return (
      <section className="campaigns-panel">
        <div className="campaign-empty-panel">
          <Megaphone size={28} aria-hidden="true" />
          <h2>Nenhuma campanha selecionada</h2>
          <p>Selecione uma campanha ou crie um novo rascunho.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="campaigns-panel" aria-labelledby="campaign-editor-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Editor</p>
          <h2 id="campaign-editor-title">{selected.name}</h2>
        </div>
        <Pencil size={20} aria-hidden="true" />
      </div>
      <form className="campaign-form">
        <fieldset disabled={!selected.canEdit}>
          <label>
            Nome da campanha
            <input defaultValue={selected.name} maxLength={160} />
          </label>
          <div className="campaign-form-grid">
            <label>
              Template
              <input defaultValue={selected.templateKey} maxLength={120} />
            </label>
            <label>
              Unidade
              <input defaultValue={selected.branchName} readOnly />
            </label>
          </div>
          <label>
            Prévia do corpo
            <textarea defaultValue={selected.bodyPreview} rows={4} maxLength={500} />
          </label>
        </fieldset>
      </form>
      <div className="campaign-actions-row">
        <button
          className="button button-secondary"
          disabled={!selected.canSubmitForReview}
          title={selected.disabledReason}
          type="button"
          onClick={() => onPatch(selected.id, { status: 'READY_FOR_REVIEW' })}
        >
          <ClipboardCheck size={16} aria-hidden="true" />
          Enviar para revisão
        </button>
        <button
          className="button button-primary"
          disabled={!model.canCreate || !selected.canEdit}
          title={selected.disabledReason}
          type="button"
          onClick={() => onPatch(selected.id, { updatedAtLabel: 'Agora' })}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Salvar rascunho
        </button>
      </div>
    </section>
  );
}

function AudiencePreview({ selected }: Readonly<{ selected?: CampaignItemModel }>) {
  return (
    <section className="campaigns-panel" aria-labelledby="campaign-audience-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Audiência</p>
          <h2 id="campaign-audience-title">Prévia segura</h2>
        </div>
        <Users size={20} aria-hidden="true" />
      </div>
      {selected ? (
        <div className="campaign-metric-grid">
          <MetricTile
            label="Total"
            value={String(selected.audiencePreview.audienceSize)}
            tone="neutral"
          />
          <MetricTile
            label="Elegíveis"
            value={String(selected.audiencePreview.eligibleCount)}
            tone="success"
          />
          <MetricTile
            label="Excluídos"
            value={String(selected.audiencePreview.excludedCount)}
            tone="warning"
          />
          <MetricTile
            label="Sem contato"
            value={String(selected.audiencePreview.unknownContactCount)}
            tone="warning"
          />
          {selected.audiencePreview.exclusionReasons.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </div>
      ) : (
        <p className="campaign-muted">A prévia aparece após selecionar uma campanha.</p>
      )}
    </section>
  );
}

function CampaignLifecycle({
  onPatch,
  selected,
}: Readonly<{
  onPatch: (campaignId: string, changes: Partial<CampaignItemModel>) => void;
  selected?: CampaignItemModel;
}>) {
  return (
    <section className="campaigns-panel" aria-labelledby="campaign-lifecycle-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Lifecycle</p>
          <h2 id="campaign-lifecycle-title">Aprovar e enviar</h2>
        </div>
        <Send size={20} aria-hidden="true" />
      </div>
      {selected ? (
        <>
          <dl className="campaign-detail-grid">
            <DetailTerm label="Status" value={selected.statusLabel} />
            <DetailTerm label="Atualizado" value={selected.updatedAtLabel} />
            <DetailTerm label="Agendamento" value={selected.scheduledForLabel ?? 'Não agendada'} />
            <DetailTerm label="Elegíveis" value={String(selected.audiencePreview.eligibleCount)} />
          </dl>
          <label className="campaign-schedule-field">
            Horário de envio
            <input disabled={!selected.canSchedule} type="datetime-local" />
          </label>
          <div className="campaign-actions-row">
            <button
              className="button button-secondary"
              disabled={!selected.canApprove}
              title={selected.disabledReason}
              type="button"
              onClick={() => onPatch(selected.id, { status: 'APPROVED' })}
            >
              <ClipboardCheck size={16} aria-hidden="true" />
              Aprovar
            </button>
            <button
              className="button button-secondary"
              disabled={!selected.canSchedule}
              title={selected.disabledReason}
              type="button"
              onClick={() =>
                onPatch(selected.id, {
                  status: 'SCHEDULED',
                  scheduledForLabel: 'Agendada para o próximo horário selecionado',
                })
              }
            >
              <CalendarClock size={16} aria-hidden="true" />
              Agendar
            </button>
            <button
              className="button button-primary"
              disabled={!selected.canSend}
              title={selected.disabledReason}
              type="button"
              onClick={() =>
                onPatch(selected.id, {
                  status: 'SENT',
                  resultMetrics: [
                    {
                      label: 'Enviadas',
                      value: String(selected.audiencePreview.eligibleCount),
                      tone: 'success',
                    },
                    { label: 'Falhas', value: '0', tone: 'neutral' },
                  ],
                })
              }
            >
              <Send size={16} aria-hidden="true" />
              Enviar agora
            </button>
          </div>
        </>
      ) : (
        <p className="campaign-muted">Selecione uma campanha para ver ações disponíveis.</p>
      )}
    </section>
  );
}

function CampaignResults({ selected }: Readonly<{ selected?: CampaignItemModel }>) {
  return (
    <section className="campaigns-panel" aria-labelledby="campaign-results-title">
      <div className="inventory-panel-heading">
        <div>
          <p className="eyebrow">Resultado</p>
          <h2 id="campaign-results-title">Entrega e resposta</h2>
        </div>
        <CheckCircle2 size={20} aria-hidden="true" />
      </div>
      {selected?.resultMetrics.length ? (
        <div className="campaign-metric-grid">
          {selected.resultMetrics.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </div>
      ) : (
        <p className="campaign-muted">
          Resultados aparecem após envio. Falhas parciais nunca são exibidas como sucesso total.
        </p>
      )}
    </section>
  );
}

function MetricTile({
  label,
  tone,
  value,
}: Readonly<{ label: string; tone: CampaignTone; value: string }>) {
  return (
    <article className={'campaign-metric inventory-tone-' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function CampaignLoadingState() {
  return (
    <section className="campaign-loading-state" aria-label="Carregando campanhas">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </section>
  );
}

function CampaignBoundaryState({ model }: Readonly<{ model: CampaignsViewModel }>) {
  const denied = model.state === 'permission-denied';
  return (
    <section className="inventory-boundary-state" aria-labelledby="campaign-boundary-title">
      {denied ? (
        <LockKeyhole size={28} aria-hidden="true" />
      ) : (
        <AlertTriangle size={28} aria-hidden="true" />
      )}
      <div>
        <p className="eyebrow">{denied ? 'Acesso restrito' : 'Falha ao carregar'}</p>
        <h1 id="campaign-boundary-title">{denied ? 'Campanhas indisponíveis' : model.title}</h1>
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

function badgeVariant(tone: CampaignTone) {
  if (tone === 'danger') return 'warning';
  return tone;
}
