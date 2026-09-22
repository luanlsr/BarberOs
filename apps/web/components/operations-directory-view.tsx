'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button, IconButton, StatusBadge } from '@barberos/ui';
import type { Customer, Professional, Service } from '@barberos/contracts';
import type {
  OperationsDirectoryArea,
  OperationsDirectoryField,
  OperationsDirectoryItem,
  OperationsDirectoryModel,
} from '../lib/operations-directory-data';
import { PhoneInput, isValidBrazilMobilePhone } from './form-controls';

type DraftValues = Record<string, string>;
type DialogMode = 'create' | 'edit';
type ToastTone = 'success' | 'warning' | 'danger';
type ToastState = { id: number; message: string; tone: ToastTone } | null;
type DirectoryDialogState = {
  mode: DialogMode;
  item?: OperationsDirectoryItem;
  values: DraftValues;
} | null;
type ApiRecord = Customer | Professional | Service;

export function OperationsDirectoryView({ model }: Readonly<{ model: OperationsDirectoryModel }>) {
  const shouldFetchServerRecords = model.state === 'default' && model.canRead;
  const [items, setItems] = React.useState(() =>
    shouldFetchServerRecords ? [] : [...model.items],
  );
  const [loadingServerRecords, setLoadingServerRecords] = React.useState(shouldFetchServerRecords);
  const [query, setQuery] = React.useState('');
  const [dialog, setDialog] = React.useState<DirectoryDialogState>(null);
  const [detailsItem, setDetailsItem] = React.useState<OperationsDirectoryItem | null>(null);
  const [confirming, setConfirming] = React.useState<OperationsDirectoryItem | null>(null);
  const [toast, setToast] = React.useState<ToastState>(null);
  const [busy, setBusy] = React.useState(false);
  const [, setServerSynced] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setQuery('');
    setDialog(null);
    setDetailsItem(null);
    setConfirming(null);
    setServerSynced(false);

    if (model.state !== 'default' || !model.canRead) {
      setItems([...model.items]);
      setLoadingServerRecords(false);
      return undefined;
    }

    setItems([]);
    setLoadingServerRecords(true);

    fetchDirectoryRecords(model)
      .then((records) => {
        if (cancelled || !records) return;
        setItems(records.map((record) => apiRecordToItem(model.area, record)));
        setServerSynced(true);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([...model.items]);
        setServerSynced(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingServerRecords(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const disabled =
    busy || !model.canCreate || model.state === 'disabled' || model.state === 'offline';
  const visibleItems = React.useMemo(() => filterItems(items, query), [items, query]);

  function showToast(message: string, tone: ToastTone = 'success') {
    setToast({ id: Date.now(), message, tone });
  }

  function openCreateDialog() {
    setDialog({ mode: 'create', values: defaultDraft(model.fields) });
  }

  function openEditDialog(item: OperationsDirectoryItem) {
    setDialog({ mode: 'edit', item, values: draftFromItem(item, model.fields) });
  }

  async function saveDialog(values: DraftValues) {
    if (!dialog) return;
    const fallbackItem = itemFromDraft(model, values, dialog.item);
    setBusy(true);
    try {
      const savedRecord = await persistDirectoryRecord(model, dialog.mode, values, dialog.item?.id);
      const nextItem = apiRecordToItem(model.area, savedRecord);
      upsertItem(nextItem, dialog.mode);
      setServerSynced(true);
      showToast(dialog.mode === 'create' ? 'Registro criado no servidor.' : 'Alterações salvas.');
    } catch {
      upsertItem(fallbackItem, dialog.mode);
      setServerSynced(false);
      showToast('Servidor indisponível; alteracao mantida nesta sessão.', 'warning');
    } finally {
      setBusy(false);
      setDialog(null);
      setDetailsItem(null);
    }
  }

  async function archiveItem(item: OperationsDirectoryItem) {
    setBusy(true);
    try {
      await archiveDirectoryRecord(model, item.id);
      setServerSynced(true);
      showToast(`${item.title} foi arquivado.`);
    } catch {
      setServerSynced(false);
      showToast(`${item.title} foi arquivado apenas nesta sessão.`, 'warning');
    } finally {
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setConfirming(null);
      setBusy(false);
    }
  }

  function upsertItem(nextItem: OperationsDirectoryItem, mode: DialogMode) {
    if (mode === 'create') {
      setItems((current) => [nextItem, ...current]);
      return;
    }
    setItems((current) => current.map((item) => (item.id === nextItem.id ? nextItem : item)));
  }

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
            <Button disabled={disabled} onClick={openCreateDialog} type="button">
              <Plus size={16} aria-hidden="true" />
              {model.primaryActionLabel}
            </Button>
          ) : null}
          <Link className="button button-secondary" href="/agenda">
            Ver agenda
          </Link>
        </div>
      </header>

      {model.state === 'permission-denied' ? (
        <DirectoryPermissionDenied model={model} />
      ) : model.state === 'error' ? (
        <DirectoryErrorState />
      ) : model.state === 'loading' || loadingServerRecords ? (
        <DirectoryLoadingState />
      ) : (
        <section className="directory-list-pane" aria-labelledby="directory-list-title">
          <div className="directory-toolbar">
            <div>
              <h2 id="directory-list-title">Registros</h2>
              <span>
                {visibleItems.length} de {items.length} registros visiveis
              </span>
            </div>
            <label className="directory-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Buscar</span>
              <input
                placeholder={model.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {disabled ? <DirectoryWriteReason model={model} busy={busy} /> : null}

          {visibleItems.length ? (
            <DirectoryTable
              busy={busy}
              canUpdate={model.canUpdate && model.state !== 'offline'}
              items={visibleItems}
              model={model}
              onArchive={(item) => setConfirming(item)}
              onDetails={(item) => setDetailsItem(item)}
              onEdit={openEditDialog}
            />
          ) : (
            <DirectoryEmptyState
              disabled={disabled}
              model={model}
              onCreate={openCreateDialog}
              query={query}
            />
          )}
        </section>
      )}

      {dialog ? (
        <DirectoryDialog
          dialog={dialog}
          disabled={disabled}
          fields={model.fields}
          model={model}
          onClose={() => setDialog(null)}
          onSave={saveDialog}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          busy={busy}
          item={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => archiveItem(confirming)}
        />
      ) : null}

      {detailsItem ? (
        <DirectoryDetailsDialog item={detailsItem} onClose={() => setDetailsItem(null)} />
      ) : null}

      <ToastRegion toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function DirectoryWriteReason({
  busy,
  model,
}: Readonly<{ busy: boolean; model: OperationsDirectoryModel }>) {
  const reason = busy
    ? 'Salvando alteracao operacional.'
    : !model.canCreate
      ? 'Seu perfil não possui permissão de criação.'
      : model.state === 'offline'
        ? 'Ações de escrita ficam indisponíveis sem confirmacao do servidor.'
        : model.state === 'disabled'
          ? 'Formulario bloqueado para demonstrar estado disabled.'
          : null;

  if (!reason) return null;
  return (
    <div className="directory-inline-warning" role="status">
      <LockKeyhole size={16} aria-hidden="true" />
      {reason}
    </div>
  );
}

function DirectoryTable({
  busy,
  canUpdate,
  items,
  model,
  onArchive,
  onDetails,
  onEdit,
}: Readonly<{
  busy: boolean;
  canUpdate: boolean;
  items: readonly OperationsDirectoryItem[];
  model: OperationsDirectoryModel;
  onArchive: (item: OperationsDirectoryItem) => void;
  onDetails: (item: OperationsDirectoryItem) => void;
  onEdit: (item: OperationsDirectoryItem) => void;
}>) {
  const columns = tableColumnsForArea(model.area);
  return (
    <div className="directory-table-wrap">
      <div
        className="directory-table"
        role="table"
        aria-label={`${model.title}: registros operacionais`}
      >
        <div className="directory-table-header" role="row">
          {columns.map((column) => (
            <span key={column.key} role="columnheader">
              {column.label}
            </span>
          ))}
          <span role="columnheader">Status</span>
          <span role="columnheader">Ações</span>
        </div>
        {items.map((item) => (
          <div className="directory-table-row" role="row" key={item.id}>
            {columns.map((column) => (
              <div className="directory-table-cell" role="cell" key={column.key}>
                <span>{column.label}</span>
                {column.key === 'primary' ? (
                  <strong>{item.title}</strong>
                ) : column.key === 'subtitle' ? (
                  <span>{item.subtitle}</span>
                ) : (
                  <span>{metricValue(item, column.metricLabel)}</span>
                )}
              </div>
            ))}
            <div className="directory-table-cell directory-status-cell" role="cell">
              <span>Status</span>
              <StatusBadge variant={item.statusTone}>{item.statusLabel}</StatusBadge>
            </div>
            <div className="directory-table-actions" role="cell">
              <button
                className="icon-button"
                type="button"
                title="Ver detalhes"
                aria-label={`Ver detalhes de ${item.title}`}
                onClick={() => onDetails(item)}
              >
                <Search size={16} aria-hidden="true" />
              </button>
              {canUpdate ? (
                <>
                  <button
                    className="icon-button"
                    disabled={busy}
                    type="button"
                    title="Editar"
                    aria-label={`Editar ${item.title}`}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button danger"
                    disabled={busy}
                    type="button"
                    title="Arquivar"
                    aria-label={`Arquivar ${item.title}`}
                    onClick={() => onArchive(item)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryDetailsDialog({
  item,
  onClose,
}: Readonly<{ item: OperationsDirectoryItem; onClose: () => void }>) {
  const titleId = React.useId();

  return (
    <div className="app-dialog-backdrop" role="presentation">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog directory-detail-dialog"
        role="dialog"
      >
        <header className="app-dialog-header">
          <div>
            <p className="eyebrow">Detalhes</p>
            <h2 id={titleId}>{item.title}</h2>
            <p>{item.subtitle}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <dl className="directory-detail-list">
          <div>
            <dt>Status</dt>
            <dd>
              <StatusBadge variant={item.statusTone}>{item.statusLabel}</StatusBadge>
            </dd>
          </div>
          {item.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
          <div>
            <dt>Marcadores</dt>
            <dd>{item.tags.length ? item.tags.join(' · ') : '-'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
function DirectoryDialog({
  dialog,
  disabled,
  fields,
  model,
  onClose,
  onSave,
}: Readonly<{
  dialog: NonNullable<DirectoryDialogState>;
  disabled: boolean;
  fields: readonly OperationsDirectoryField[];
  model: OperationsDirectoryModel;
  onClose: () => void;
  onSave: (values: DraftValues) => void;
}>) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [values, setValues] = React.useState(dialog.values);
  const isEditing = dialog.mode === 'edit';
  const validationErrors = validateDirectoryDraft(model.area, fields, values);
  const isValid = Object.keys(validationErrors).length === 0;

  function updateField(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || disabled) return;
    onSave(values);
  }

  return (
    <div className="app-dialog-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog directory-dialog"
        role="dialog"
      >
        <header className="app-dialog-header">
          <div>
            <p className="eyebrow">{isEditing ? 'Editar registro' : 'Novo registro'}</p>
            <h2 id={titleId}>{isEditing ? dialog.item?.title : model.primaryActionLabel}</h2>
            <p id={descriptionId}>{model.formDescription}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>

        <form className="directory-dialog-form" onSubmit={submit}>
          <div className="directory-form-grid">
            {fields.map((field) => (
              <DirectoryField
                disabled={disabled}
                field={field}
                error={validationErrors[field.id]}
                key={field.id}
                value={values[field.id] ?? ''}
                onChange={(value) => updateField(field.id, value)}
              />
            ))}
          </div>
          <div className="app-dialog-actions">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button disabled={disabled || !isValid} type="submit">
              {isEditing ? 'Salvar alterações' : model.primaryActionLabel}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DirectoryField({
  disabled,
  error,
  field,
  onChange,
  value,
}: Readonly<{
  disabled: boolean;
  error?: string;
  field: OperationsDirectoryField;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label>
      <span>{field.label}</span>
      {field.type === 'select' ? (
        <select
          aria-invalid={Boolean(error)}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'tel' ? (
        <PhoneInput
          aria-invalid={Boolean(error)}
          disabled={disabled}
          placeholder={field.placeholder}
          value={value}
          onValueChange={onChange}
        />
      ) : (
        <input
          aria-invalid={Boolean(error)}
          disabled={disabled}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          max={field.max}
          maxLength={field.maxLength}
          min={field.min}
          minLength={field.minLength}
          placeholder={field.placeholder}
          type={field.type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <small className="form-field-error">{error}</small> : null}
    </label>
  );
}

function DirectoryEmptyState({
  disabled,
  model,
  onCreate,
  query,
}: Readonly<{
  disabled: boolean;
  model: OperationsDirectoryModel;
  onCreate: () => void;
  query: string;
}>) {
  const hasQuery = Boolean(query.trim());
  return (
    <div className="directory-empty-state">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>{hasQuery ? 'Nenhum resultado encontrado' : model.emptyTitle}</h2>
      <p>
        {hasQuery
          ? 'Ajuste a busca ou limpe o filtro para voltar aos registros visiveis.'
          : model.emptyDescription}
      </p>
      {model.canCreate ? (
        <Button disabled={disabled} onClick={onCreate} type="button" variant="secondary">
          {model.primaryActionLabel}
        </Button>
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
        <p>{model.deniedDescription} Fale com o administrador para ajustar permissões.</p>
      </div>
    </section>
  );
}

function DirectoryErrorState() {
  return (
    <section className="directory-boundary-state" aria-labelledby="directory-error-title">
      <AlertTriangle size={26} aria-hidden="true" />
      <div>
        <h2 id="directory-error-title">Não foi possível carregar os registros</h2>
        <p>O estado do sistema não foi alterado. Tente novamente em instantes.</p>
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

function ConfirmDialog({
  busy,
  item,
  onCancel,
  onConfirm,
}: Readonly<{
  busy: boolean;
  item: OperationsDirectoryItem;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <div className="app-dialog-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-dialog app-confirm-dialog"
        role="dialog"
      >
        <header className="app-dialog-header compact">
          <div>
            <p className="eyebrow">Confirmacao</p>
            <h2 id={titleId}>Arquivar {item.title}?</h2>
            <p id={descriptionId}>
              O registro sai da lista operacional, mas o histórico permanece auditável quando houver
              persistencia no servidor.
            </p>
          </div>
        </header>
        <div className="app-dialog-actions">
          <Button disabled={busy} variant="secondary" onClick={onCancel} type="button">
            Manter registro
          </Button>
          <button
            className="button button-danger"
            disabled={busy}
            type="button"
            onClick={onConfirm}
          >
            <Trash2 size={15} aria-hidden="true" />
            Arquivar
          </button>
        </div>
      </section>
    </div>
  );
}

function ToastRegion({ onDismiss, toast }: Readonly<{ onDismiss: () => void; toast: ToastState }>) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast ? (
        <div className={`app-toast ${toast.tone}`} role="status">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>{toast.message}</span>
          <button type="button" onClick={onDismiss} aria-label="Fechar notificação">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function requiredFieldsForArea(
  area: OperationsDirectoryArea,
  fields: readonly OperationsDirectoryField[],
) {
  const requiredIds =
    area === 'servicos'
      ? ['name', 'category', 'duration', 'price']
      : fields.slice(0, 2).map((field) => field.id);
  return fields.filter((field) => requiredIds.includes(field.id));
}
function validateDirectoryDraft(
  area: OperationsDirectoryArea,
  fields: readonly OperationsDirectoryField[],
  values: DraftValues,
) {
  const errors: DraftValues = {};
  const requiredFields = requiredFieldsForArea(area, fields);

  for (const field of requiredFields) {
    if (!values[field.id]?.trim()) errors[field.id] = `${field.label} e obrigatorio.`;
  }

  for (const field of fields) {
    const value = values[field.id]?.trim() ?? '';
    if (!value) continue;

    if (field.type === 'tel' && !isValidBrazilMobilePhone(value)) {
      errors[field.id] = 'Informe um celular brasileiro valido com DDD.';
    }

    if (field.type === 'email' && !isValidEmail(value)) {
      errors[field.id] = 'Informe um email valido.';
    }

    if (field.maxLength && value.length > field.maxLength) {
      errors[field.id] = `Use no maximo ${field.maxLength} caracteres.`;
    }

    if (field.minLength && value.length < field.minLength) {
      errors[field.id] = `Use pelo menos ${field.minLength} caracteres.`;
    }

    if (field.type === 'number') {
      const numericValue = Number(value.replace(',', '.'));
      if (!Number.isFinite(numericValue)) errors[field.id] = 'Informe um numero valido.';
      if (field.min !== undefined && numericValue < field.min) {
        errors[field.id] = `Valor mínimo: ${field.min}.`;
      }
      if (field.max !== undefined && numericValue > field.max) {
        errors[field.id] = `Valor maximo: ${field.max}.`;
      }
    }
  }

  return errors;
}

function isValidEmail(value: string) {
  if (value.length > 160) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function fetchDirectoryRecords(model: OperationsDirectoryModel) {
  const response = await fetch(directoryEndpoint(model.area), { headers: requestHeaders() });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: ApiRecord[] };
  return payload.data ?? null;
}

async function persistDirectoryRecord(
  model: OperationsDirectoryModel,
  mode: DialogMode,
  values: DraftValues,
  itemId?: string,
) {
  const response = await fetch(directoryEndpoint(model.area), {
    method: mode === 'create' ? 'POST' : 'PATCH',
    headers: requestHeaders(),
    body: JSON.stringify(buildCommandPayload(model, values, itemId)),
  });
  if (!response.ok) throw new Error('Directory persistence failed.');
  const payload = (await response.json()) as { data?: ApiRecord };
  if (!payload.data) throw new Error('Directory response missing data.');
  return payload.data;
}

async function archiveDirectoryRecord(model: OperationsDirectoryModel, itemId: string) {
  const response = await fetch(directoryEndpoint(model.area), {
    method: 'DELETE',
    headers: requestHeaders(),
    body: JSON.stringify({ id: itemId }),
  });
  if (!response.ok) throw new Error('Directory archive failed.');
}

function directoryEndpoint(area: OperationsDirectoryArea) {
  if (area === 'clientes') return '/api/v1/customers';
  if (area === 'equipe') return '/api/v1/professionals';
  return '/api/v1/services';
}

function requestHeaders() {
  return {
    'content-type': 'application/json',
    'x-request-id': `directory-${Date.now()}`,
  };
}

function buildCommandPayload(
  model: OperationsDirectoryModel,
  values: DraftValues,
  itemId?: string,
) {
  if (model.area === 'clientes') {
    return compactPayload({
      id: itemId,
      branchId: model.branchId,
      name: values.name,
      phone: values.phone,
      email: values.email,
      source: values.source,
    });
  }
  if (model.area === 'equipe') {
    return compactPayload({
      id: itemId,
      branchIds: [model.branchId],
      displayName: values.displayName,
      roleLabel: values.roleLabel || 'Profissional',
      phone: values.phone,
    });
  }
  return compactPayload({
    id: itemId,
    name: values.name,
    category: values.category,
    durationMinutes: toInteger(values.duration),
    priceCents: toMoneyCents(values.price),
    enabledProfessionalIds: [],
  });
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) =>
        value !== undefined && value !== '' && !(Array.isArray(value) && !value.length),
    ),
  );
}

function apiRecordToItem(
  area: OperationsDirectoryArea,
  record: ApiRecord,
): OperationsDirectoryItem {
  if (area === 'clientes') {
    const customer = record as Customer;
    return {
      id: customer.id,
      title: customer.name,
      subtitle: customer.phone,
      statusLabel:
        customer.status === 'AT_RISK' ? 'Em risco' : customer.status === 'NEW' ? 'Novo' : 'Ativo',
      statusTone:
        customer.status === 'AT_RISK'
          ? 'warning'
          : customer.status === 'ARCHIVED'
            ? 'neutral'
            : 'success',
      metrics: [
        { label: 'Telefone', value: customer.phone },
        { label: 'Email', value: customer.email ?? '-' },
        { label: 'Origem', value: customer.source ?? '-' },
      ],
      tags: [
        customer.preferredProfessionalId ? 'Profissional preferido' : 'Sem preferencia',
        customer.consents.whatsapp ? 'WhatsApp ok' : 'WhatsApp pendente',
      ],
    };
  }
  if (area === 'equipe') {
    const professional = record as Professional;
    return {
      id: professional.id,
      title: professional.displayName,
      subtitle: professional.roleLabel,
      statusLabel: professional.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
      statusTone: professional.status === 'ACTIVE' ? 'success' : 'neutral',
      metrics: [
        { label: 'Papel', value: professional.roleLabel },
        { label: 'Filiais', value: String(professional.branchIds.length) },
        { label: 'Telefone', value: professional.phone ?? '-' },
      ],
      tags: [professional.email ?? 'Sem email', professional.status],
    };
  }
  const service = record as Service;
  return {
    id: service.id,
    title: service.name,
    subtitle: service.category,
    statusLabel: service.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
    statusTone: service.status === 'ACTIVE' ? 'success' : 'neutral',
    metrics: [
      { label: 'Duração', value: `${service.durationMinutes} min` },
      { label: 'Preço', value: formatCurrency(service.priceCents) },
      { label: 'Profissionais', value: String(service.enabledProfessionalIds.length) },
    ],
    tags: [
      service.estimatedCostCents
        ? `Custo ${formatCurrency(service.estimatedCostCents)}`
        : 'Sem custo estimado',
      service.status,
    ],
  };
}

function defaultDraft(fields: readonly OperationsDirectoryField[]) {
  return Object.fromEntries(fields.map((field) => [field.id, '']));
}

function draftFromItem(item: OperationsDirectoryItem, fields: readonly OperationsDirectoryField[]) {
  const draft = defaultDraft(fields);
  for (const field of fields) draft[field.id] = fieldValueFromItem(field, item);
  return draft;
}

function fieldValueFromItem(field: OperationsDirectoryField, item: OperationsDirectoryItem) {
  const metricValue = item.metrics.find((metric) => sameToken(metric.label, field.label))?.value;
  if (field.id === 'name' || field.id === 'displayName') return item.title;
  if (field.id === 'phone' || field.id === 'roleLabel' || field.id === 'category')
    return item.subtitle;
  if (field.id === 'email') return item.tags.find((tag) => tag.includes('@')) ?? '';
  if (field.id === 'source' || field.id === 'branch') return field.options?.[0] ?? '';
  if (field.id === 'duration') return metricValue?.replace(/\D/g, '') ?? '';
  if (field.id === 'price') return metricValue?.replace(/\D/g, '') ?? '';
  return metricValue ?? '';
}

function itemFromDraft(
  model: OperationsDirectoryModel,
  values: DraftValues,
  existing?: OperationsDirectoryItem,
): OperationsDirectoryItem {
  const title = values.name || values.displayName || existing?.title || 'Novo registro';
  const subtitle =
    values.phone ||
    values.roleLabel ||
    values.category ||
    values.email ||
    existing?.subtitle ||
    model.branchName;
  const metrics = model.fields.slice(0, 3).map((field) => ({
    label: field.label,
    value: formatFieldValue(field, values[field.id] ?? ''),
  }));
  const tags = model.fields
    .slice(1)
    .map((field) => values[field.id]?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);

  return {
    id: existing?.id ?? `${model.area}-${Date.now()}`,
    title,
    subtitle,
    statusLabel: existing?.statusLabel ?? 'Ativo',
    statusTone: existing?.statusTone ?? 'success',
    metrics,
    tags: tags.length ? tags : ['Cadastro rápido'],
  };
}

function formatFieldValue(field: OperationsDirectoryField, value: string) {
  if (!value.trim()) return '-';
  if (field.id === 'price') return formatCurrency(toMoneyCents(value));
  if (field.id === 'duration') return `${toInteger(value)} min`;
  return value;
}

function filterItems(items: readonly OperationsDirectoryItem[], query: string) {
  const normalized = normalize(query);
  if (!normalized) return items;
  return items.filter((item) =>
    normalize([item.title, item.subtitle, item.statusLabel, ...item.tags].join(' ')).includes(
      normalized,
    ),
  );
}

function toInteger(value: string) {
  return Math.max(0, Number.parseInt(value.replace(/\D/g, ''), 10) || 0);
}

function toMoneyCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return Math.round((Number.parseFloat(normalized) || 0) * 100);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type DirectoryTableColumn = {
  key: 'primary' | 'subtitle' | 'metric';
  label: string;
  metricLabel?: string;
};

function tableColumnsForArea(area: OperationsDirectoryArea): readonly DirectoryTableColumn[] {
  if (area === 'clientes') {
    return [
      { key: 'primary', label: 'Cliente' },
      { key: 'subtitle', label: 'Telefone' },
      { key: 'metric', label: 'Email', metricLabel: 'Email' },
      { key: 'metric', label: 'Origem', metricLabel: 'Origem' },
    ];
  }
  if (area === 'equipe') {
    return [
      { key: 'primary', label: 'Usuário' },
      { key: 'subtitle', label: 'Papel' },
      { key: 'metric', label: 'Filiais', metricLabel: 'Filiais' },
      { key: 'metric', label: 'Telefone', metricLabel: 'Telefone' },
    ];
  }
  return [
    { key: 'primary', label: 'Serviço' },
    { key: 'subtitle', label: 'Catégoria' },
    { key: 'metric', label: 'Duração', metricLabel: 'Duração' },
    { key: 'metric', label: 'Preço', metricLabel: 'Preço' },
  ];
}

function metricValue(item: OperationsDirectoryItem, metricLabel?: string) {
  if (!metricLabel) return '-';
  const normalizedLabel = normalize(metricLabel);
  return item.metrics.find((metric) => normalize(metric.label) === normalizedLabel)?.value ?? '-';
}
function sameToken(left: string, right: string) {
  return normalize(left) === normalize(right);
}
