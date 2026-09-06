import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react';
import { Button, StatusBadge } from '@barberos/ui';
import type {
  OperationsDirectoryField,
  OperationsDirectoryItem,
  OperationsDirectoryModel,
} from '../lib/operations-directory-data';

export function OperationsDirectoryView({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  return (
    <div className="directory-page">
      <header className="directory-heading">
        <div>
          <p className="eyebrow">{model.eyebrow}</p>
          <h1>{model.title}</h1>
          <p className="subheading">
            {model.branchName} · {model.description}
          </p>
        </div>
        <div className="directory-heading-actions">
          {model.canCreate ? (
            <a className="button button-primary" href="#directory-form">
              <Plus size={16} aria-hidden="true" />
              {model.primaryActionLabel}
            </a>
          ) : null}
          <Link className="button button-secondary" href="/agenda">
            Ver agenda
          </Link>
        </div>
      </header>

      <DirectoryStateStrip model={model} />

      {model.state === 'permission-denied' ? (
        <DirectoryPermissionDenied model={model} />
      ) : model.state === 'error' ? (
        <DirectoryErrorState />
      ) : model.state === 'loading' ? (
        <DirectoryLoadingState />
      ) : (
        <div className="directory-workspace">
          <section className="directory-list-pane" aria-labelledby="directory-list-title">
            <div className="directory-toolbar">
              <div>
                <h2 id="directory-list-title">Registros</h2>
                <span>{model.items.length} registros visiveis</span>
              </div>
              <label className="directory-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Buscar</span>
                <input placeholder={model.searchPlaceholder} />
              </label>
            </div>

            {model.items.length ? (
              <div className="directory-card-grid">
                {model.items.map((item) => (
                  <DirectoryCard canUpdate={model.canUpdate} item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <DirectoryEmptyState model={model} />
            )}
          </section>

          <DirectoryForm model={model} />
        </div>
      )}
    </div>
  );
}

function DirectoryStateStrip({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  return (
    <div className="directory-state-strip" aria-label="Estados da tela">
      <span>
        <CheckCircle2 size={15} aria-hidden="true" />
        Leitura {model.canRead ? 'permitida' : 'bloqueada'}
      </span>
      <span>
        <Clock3 size={15} aria-hidden="true" />
        Formulario {model.canCreate && model.state !== 'disabled' ? 'habilitado' : 'desabilitado'}
      </span>
      <span className={model.state === 'offline' ? 'warning' : ''}>
        <WifiOff size={15} aria-hidden="true" />
        Offline {model.state === 'offline' ? 'ativo' : 'simulado'}
      </span>
    </div>
  );
}

function DirectoryCard({
  canUpdate,
  item,
}: Readonly<{ canUpdate: boolean; item: OperationsDirectoryItem }>) {
  return (
    <article className="directory-card">
      <header>
        <div>
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
        </div>
        <StatusBadge variant={item.statusTone}>{item.statusLabel}</StatusBadge>
      </header>
      <dl className="directory-metrics">
        {item.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="directory-tags" aria-label="Marcadores">
        {item.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {canUpdate ? (
        <button className="button button-secondary directory-card-action" type="button">
          Editar
        </button>
      ) : null}
    </article>
  );
}

function DirectoryForm({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  const disabled = !model.canCreate || model.state === 'disabled' || model.state === 'offline';
  const reason = !model.canCreate
    ? 'Seu perfil nao possui permissao de criacao.'
    : model.state === 'offline'
      ? 'Acoes de escrita ficam indisponiveis sem confirmacao do servidor.'
      : model.state === 'disabled'
        ? 'Formulario bloqueado para demonstrar estado disabled.'
        : undefined;

  return (
    <aside
      className="directory-form-pane"
      id="directory-form"
      aria-labelledby="directory-form-title"
    >
      <header>
        <div>
          <h2 id="directory-form-title">{model.formTitle}</h2>
          <p>{model.formDescription}</p>
        </div>
        {disabled ? (
          <LockKeyhole size={18} aria-hidden="true" />
        ) : (
          <Plus size={18} aria-hidden="true" />
        )}
      </header>
      {reason ? <p className="directory-form-reason">{reason}</p> : null}
      <form className="directory-form">
        {model.fields.map((field) => (
          <DirectoryField disabled={disabled} field={field} key={field.id} />
        ))}
        <Button disabled={disabled} type="button">
          Salvar rascunho
        </Button>
      </form>
    </aside>
  );
}

function DirectoryField({
  disabled,
  field,
}: Readonly<{ disabled: boolean; field: OperationsDirectoryField }>) {
  return (
    <label>
      <span>{field.label}</span>
      {field.type === 'select' ? (
        <select disabled={disabled} defaultValue="">
          <option value="" disabled>
            {field.placeholder}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input disabled={disabled} placeholder={field.placeholder} type={field.type} />
      )}
    </label>
  );
}

function DirectoryEmptyState({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  return (
    <div className="directory-empty-state">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>{model.emptyTitle}</h2>
      <p>{model.emptyDescription}</p>
      {model.canCreate ? (
        <a className="button button-secondary" href="#directory-form">
          {model.primaryActionLabel}
        </a>
      ) : null}
    </div>
  );
}

function DirectoryPermissionDenied({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  return (
    <section className="directory-boundary-state" aria-labelledby="directory-denied-title">
      <LockKeyhole size={26} aria-hidden="true" />
      <div>
        <h2 id="directory-denied-title">Acesso restrito</h2>
        <p>{model.deniedDescription} Fale com o administrador para ajustar permissoes.</p>
      </div>
    </section>
  );
}

function DirectoryErrorState() {
  return (
    <section className="directory-boundary-state" aria-labelledby="directory-error-title">
      <AlertTriangle size={26} aria-hidden="true" />
      <div>
        <h2 id="directory-error-title">Nao foi possivel carregar os registros</h2>
        <p>
          O estado do sistema nao foi alterado. Codigo CORE_VALIDATION_ERROR. Request
          local-directory-error.
        </p>
        <button className="button button-secondary" type="button">
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    </section>
  );
}

function DirectoryLoadingState() {
  return (
    <section className="directory-loading-state" aria-label="Carregando diretorio operacional">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </section>
  );
}
