'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarPlus, CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@barberos/ui';
import type { AgendaNewAppointmentModel, AgendaOccupiedSlot } from '../lib/agenda-data';
import { PhoneInput, RelatedSelect, isValidBrazilMobilePhone } from './form-controls';

type CustomerMode = 'existing' | 'quick';
type SubmitState =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; code: string; message: string; requestId: string };

type ApiResponse<T> = {
  data?: T;
  error?: { code?: string; message?: string; requestId?: string };
  requestId?: string;
};

type CreatedCustomer = {
  id: string;
  name: string;
};

export function NewAppointmentFlow({ model }: Readonly<{ model: AgendaNewAppointmentModel }>) {
  const router = useRouter();
  const [customerMode, setCustomerMode] = React.useState<CustomerMode>('existing');
  const [customerId, setCustomerId] = React.useState(model.customers[0]?.id ?? '');
  const [quickCustomerName, setQuickCustomerName] = React.useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = React.useState('');
  const initialServiceId = model.services[0]?.id ?? '';
  const [servicePickerId, setServicePickerId] = React.useState(initialServiceId);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>(
    initialServiceId ? [initialServiceId] : [],
  );
  const [professionalId, setProfessionalId] = React.useState(model.defaultProfessionalId);
  const [dateIso, setDateIso] = React.useState(model.dateIso);
  const [timeLabel, setTimeLabel] = React.useState(model.defaultTimeLabel);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitState, setSubmitState] = React.useState<SubmitState>({ type: 'idle' });

  const selectedCustomer = model.customers.find((customer) => customer.id === customerId);
  const selectedServices = selectedServiceIds
    .map((id) => model.services.find((service) => service.id === id))
    .filter((service): service is (typeof model.services)[number] => Boolean(service));
  const totalDurationMinutes = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );
  const selectedProfessional = model.professionals.find(
    (professional) => professional.id === professionalId,
  );
  const conflict = findConflict(model, model.occupiedSlots, professionalId, dateIso, timeLabel);
  const customerOptions = model.customers.map((customer) => ({
    id: customer.id,
    label: customer.name,
    description: customer.phone,
  }));
  const serviceOptions = model.services.map((service) => ({
    id: service.id,
    label: service.name,
    description: service.durationMinutes + ' min',
  }));
  const professionalOptions = model.professionals.map((professional) => ({
    id: professional.id,
    label: professional.name,
  }));

  if (!model.isOpen) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateSubmission();
    if (validationError) {
      setSubmitState(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitState({ type: 'idle' });

    try {
      const resolvedCustomer =
        customerMode === 'quick'
          ? await createCustomer({
              branchId: model.branchId,
              name: quickCustomerName.trim(),
              phone: quickCustomerPhone,
            })
          : selectedCustomer;

      if (!resolvedCustomer) {
        throw toLocalError('CORE_VALIDATION_ERROR', 'Selecione um cliente cadastrado.');
      }

      await postJson('/api/v1/appointments', {
        branchId: model.branchId,
        customerId: resolvedCustomer.id,
        professionalId,
        startsAt: `${dateIso}T${timeLabel}:00-03:00`,
        services: selectedServiceIds.map((serviceId) => ({ serviceId })),
        status: 'CONFIRMED',
        source: 'MANUAL',
      });

      setSubmitState({
        type: 'success',
        message: `Agendamento criado para ${resolvedCustomer.name} com ${selectedProfessional?.name ?? 'profissional'} as ${timeLabel}.`,
      });
      router.refresh();
    } catch (error) {
      setSubmitState(normalizeSubmitError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateSubmission(): SubmitState | null {
    if (!model.canCreateAppointment) {
      return toLocalError(
        'CORE_PERMISSION_DENIED',
        'Seu perfil não pode criar agendamentos nesta unidade.',
      );
    }

    if (customerMode === 'existing' && !selectedCustomer) {
      return toLocalError('CORE_VALIDATION_ERROR', 'Selecione um cliente cadastrado.');
    }

    if (customerMode === 'quick' && !model.canCreateCustomer) {
      return toLocalError(
        'CORE_PERMISSION_DENIED',
        'Seu perfil não pode criar clientes rapidamente.',
      );
    }

    if (customerMode === 'quick' && (!quickCustomerName.trim() || !quickCustomerPhone.trim())) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Informe nome e telefone para criar o cliente rápido.',
      );
    }

    if (customerMode === 'quick' && quickCustomerName.trim().length < 3) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Informe o nome completo do cliente com pelo menos 3 caracteres.',
      );
    }

    if (customerMode === 'quick' && !isValidBrazilMobilePhone(quickCustomerPhone)) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Informe um celular valido com DDD, no formato (11) 99999-9999.',
      );
    }

    if (!selectedServiceIds.length || !selectedProfessional) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Selecione ao menos um serviço, profissional e horário.',
      );
    }

    if (conflict) {
      return toLocalError(
        'APPOINTMENT_CONFLICT',
        `Horario ocupado por ${conflict.customerName}. Escolha outro horário ou profissional.`,
      );
    }

    return null;
  }

  return (
    <section className="new-appointment-flow" aria-labelledby="new-appointment-title">
      <header className="new-appointment-header">
        <div>
          <p className="eyebrow">Criacao operacional</p>
          <h2 id="new-appointment-title">Novo agendamento</h2>
          <p>Cliente, serviço, profissional, data e horário em um fluxo rápido.</p>
        </div>
        <CalendarPlus size={22} aria-hidden="true" />
      </header>

      <form className="new-appointment-form" onSubmit={handleSubmit}>
        <fieldset className="new-appointment-mode" aria-label="Tipo de cliente">
          <label>
            <input
              checked={customerMode === 'existing'}
              name="customerMode"
              onChange={() => setCustomerMode('existing')}
              type="radio"
              value="existing"
            />
            Cliente existente
          </label>
          <label aria-disabled={!model.canCreateCustomer}>
            <input
              checked={customerMode === 'quick'}
              disabled={!model.canCreateCustomer}
              name="customerMode"
              onChange={() => setCustomerMode('quick')}
              type="radio"
              value="quick"
            />
            Novo cliente
          </label>
        </fieldset>

        {customerMode === 'existing' ? (
          <label>
            <span>Cliente</span>
            <RelatedSelect
              emptyLabel="Nenhum cliente cadastrado"
              onChange={setCustomerId}
              options={customerOptions}
              placeholder="Selecione um cliente"
              required
              searchPlaceholder="Buscar cliente"
              value={customerId}
            />
          </label>
        ) : (
          <div className="new-appointment-inline-fields">
            <label>
              <span>Nome do cliente</span>
              <input
                maxLength={120}
                minLength={3}
                onChange={(event) => setQuickCustomerName(event.target.value)}
                placeholder="Nome completo"
                value={quickCustomerName}
              />
            </label>
            <label>
              <span>Telefone</span>
              <PhoneInput
                onValueChange={setQuickCustomerPhone}
                placeholder="(11) 99999-9999"
                required
                value={quickCustomerPhone}
              />
            </label>
          </div>
        )}

        <div className="new-appointment-inline-fields">
          <div className="new-appointment-services-field">
            <label>
              <span>Serviços</span>
              <RelatedSelect
                emptyLabel="Nenhum serviço cadastrado"
                onChange={setServicePickerId}
                options={serviceOptions}
                placeholder="Selecione um serviço"
                required={!selectedServiceIds.length}
                searchPlaceholder="Buscar serviço"
                value={servicePickerId}
              />
            </label>
            <Button
              disabled={!servicePickerId || selectedServiceIds.includes(servicePickerId)}
              onClick={() => {
                if (!servicePickerId || selectedServiceIds.includes(servicePickerId)) return;
                setSelectedServiceIds((current) => [...current, servicePickerId]);
              }}
              type="button"
              variant="secondary"
            >
              Adicionar serviço
            </Button>
            <div className="new-appointment-service-list" aria-label="Serviços selecionados">
              {selectedServices.length ? (
                selectedServices.map((service) => (
                  <span key={service.id}>
                    {service.name} · {service.durationMinutes} min
                    <button
                      aria-label={'Remover ' + service.name}
                      onClick={() =>
                        setSelectedServiceIds((current) =>
                          current.filter((serviceId) => serviceId !== service.id),
                        )
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span>Nenhum serviço selecionado</span>
              )}
            </div>
            <p className="new-appointment-duration">Duração total: {totalDurationMinutes} min</p>
          </div>
          <label>
            <span>Profissional</span>
            <RelatedSelect
              emptyLabel="Nenhum profissional cadastrado"
              onChange={setProfessionalId}
              options={professionalOptions}
              placeholder="Selecione um profissional"
              required
              searchPlaceholder="Buscar profissional"
              value={professionalId}
            />
          </label>
        </div>

        <div className="new-appointment-inline-fields compact">
          <label>
            <span>Data</span>
            <input
              type="date"
              value={dateIso}
              onChange={(event) => setDateIso(event.target.value)}
            />
          </label>
          <label>
            <span>Horario</span>
            <select value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)}>
              {model.timeOptions.map((time) => {
                const occupied = findConflict(
                  model,
                  model.occupiedSlots,
                  professionalId,
                  dateIso,
                  time.value,
                );
                return (
                  <option key={time.value} value={time.value}>
                    {time.label}
                    {occupied ? ` - ocupado por ${occupied.customerName}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        {conflict ? (
          <div className="new-appointment-feedback warning" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              {conflict.kind === 'block'
                ? conflict.customerName
                : `Horario ocupado por ${conflict.customerName}.`}
            </span>
          </div>
        ) : null}

        {submitState.type === 'success' ? (
          <div className="new-appointment-feedback success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{submitState.message}</span>
          </div>
        ) : null}

        {submitState.type === 'error' ? (
          <div className="new-appointment-feedback danger" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{submitState.message}</span>
          </div>
        ) : null}

        <div className="new-appointment-footer">
          <span>
            <UserPlus size={15} aria-hidden="true" />
            Cliente rápido {model.canCreateCustomer ? 'habilitado' : 'bloqueado'}
          </span>
          <Button disabled={!model.canCreateAppointment || isSubmitting} type="submit">
            {isSubmitting ? 'Criando...' : 'Criar agendamento'}
          </Button>
        </div>
      </form>
    </section>
  );
}

async function createCustomer(input: {
  branchId: string;
  name: string;
  phone: string;
}): Promise<CreatedCustomer> {
  const customer = await postJson<CreatedCustomer>('/api/v1/customers', {
    branchId: input.branchId,
    name: input.name,
    phone: input.phone,
    source: 'AGENDA',
    consents: { whatsapp: true, marketing: false },
  });
  return customer;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || !payload.data) {
    throw {
      code: payload.error?.code ?? 'CORE_VALIDATION_ERROR',
      message: payload.error?.message ?? 'Não foi possível concluir a operação.',
      requestId: payload.error?.requestId ?? payload.requestId ?? 'request-unavailable',
    };
  }

  return payload.data;
}

function normalizeSubmitError(error: unknown): SubmitState {
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; message?: unknown; requestId?: unknown };
    return {
      type: 'error',
      code: typeof record.code === 'string' ? record.code : 'CORE_VALIDATION_ERROR',
      message:
        typeof record.message === 'string'
          ? record.message
          : 'Não foi possível criar o agendamento.',
      requestId: typeof record.requestId === 'string' ? record.requestId : 'request-unavailable',
    };
  }

  return toLocalError('CORE_VALIDATION_ERROR', 'Não foi possível criar o agendamento.');
}

function toLocalError(code: string, message: string): SubmitState {
  return {
    type: 'error',
    code,
    message,
    requestId: 'local-validation-error',
  };
}

function findConflict(
  model: AgendaNewAppointmentModel,
  occupiedSlots: readonly AgendaOccupiedSlot[],
  professionalId: string,
  dateIso: string,
  timeLabel: string,
) {
  if (dateIso !== model.dateIso) return undefined;
  return occupiedSlots.find(
    (slot) => slot.professionalId === professionalId && slot.timeLabel === timeLabel,
  );
}
