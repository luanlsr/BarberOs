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
  const [selectedId, setSelectedId] = React.useState(model.selectedCampaign?.id);
  const selected =
    model.campaigns.find((campaign) => campaign.id === selectedId) ?? model.selectedCampaign;

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
        <CampaignActions actions={model.allowedActions} />
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
                campaigns={model.campaigns}
                selectedId={selected?.id}
                onSelect={setSelectedId}
              />
              <CampaignEditor model={model} selected={selected} />
            </main>
            <aside className="campaigns-side" aria-label="Prévia e resultado">
              <AudiencePreview selected={selected} />
              <CampaignLifecycle selected={selected} />
              <CampaignResults selected={selected} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function CampaignActions({ actions }: Readonly<{ actions: readonly CampaignActionModel[] }>) {
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
  selected,
}: Readonly<{ model: CampaignsViewModel; selected?: CampaignItemModel }>) {
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
        >
          <ClipboardCheck size={16} aria-hidden="true" />
          Enviar para revisão
        </button>
        <button
          className="button button-primary"
          disabled={!model.canCreate || !selected.canEdit}
          title={selected.disabledReason}
          type="button"
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

function CampaignLifecycle({ selected }: Readonly<{ selected?: CampaignItemModel }>) {
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
            >
              <ClipboardCheck size={16} aria-hidden="true" />
              Aprovar
            </button>
            <button
              className="button button-secondary"
              disabled={!selected.canSchedule}
              title={selected.disabledReason}
              type="button"
            >
              <CalendarClock size={16} aria-hidden="true" />
              Agendar
            </button>
            <button
              className="button button-primary"
              disabled={!selected.canSend}
              title={selected.disabledReason}
              type="button"
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
