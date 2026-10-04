'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { Button } from '@barberos/ui';
import {
  availableTimeOptionsForProfessional,
  getSaoPauloTodayIso,
  isFutureAppointmentStart,
} from '../lib/agenda-availability';
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
  const todayIso = getSaoPauloTodayIso();
  const initialDateIso = maxDateIso(model.dateIso, todayIso);
  const [customerMode, setCustomerMode] = React.useState<CustomerMode>('existing');
  const [customerId, setCustomerId] = React.useState(model.customers[0]?.id ?? '');
  const [quickCustomerName, setQuickCustomerName] = React.useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = React.useState('');
  const [professionalId, setProfessionalId] = React.useState(model.defaultProfessionalId);
  const initialServiceId = firstServiceIdForProfessional(model, model.defaultProfessionalId);
  const [servicePickerId, setServicePickerId] = React.useState(initialServiceId);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>(
    initialServiceId ? [initialServiceId] : [],
  );
  const initialDurationMinutes = serviceDurationForIds(
    model,
    initialServiceId ? [initialServiceId] : [],
  );
  const [dateIso, setDateIso] = React.useState(initialDateIso);
  const [timeLabel, setTimeLabel] = React.useState(() =>
    firstAvailableTimeLabel({
      dateIso: initialDateIso,
      durationMinutes: initialDurationMinutes,
      model,
      preferredTimeLabel: model.defaultTimeLabel,
      professionalId: model.defaultProfessionalId,
    }),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitState, setSubmitState] = React.useState<SubmitState>({ type: 'idle' });

  const availableServices = model.services.filter((service) =>
    isServiceEnabledForProfessional(service, professionalId),
  );
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
  const availableTimeOptions = availableTimeOptionsForProfessional({
    appointments: model.appointments,
    dateIso,
    durationMinutes: totalDurationMinutes,
    occupiedSlots: model.occupiedSlots,
    openingHours: model.openingHours,
    professionalId,
    timeOptions: model.timeOptions,
  });
  const conflict = findConflict(model, model.occupiedSlots, professionalId, dateIso, timeLabel);
  const customerOptions = model.customers.map((customer) => ({
    id: customer.id,
    label: customer.name,
    description: customer.phone,
  }));
  const availableServiceOptions = availableServices.map((service) => ({
    id: service.id,
    label: service.name,
    description: service.durationMinutes + ' min',
  }));
  const professionalOptions = model.professionals.map((professional) => ({
    id: professional.id,
    label: professional.name,
  }));

  React.useEffect(() => {
    if (!availableTimeOptions.length) {
      if (timeLabel) setTimeLabel('');
      return;
    }
    if (!availableTimeOptions.some((time) => time.value === timeLabel)) {
      setTimeLabel(availableTimeOptions[0]?.value ?? '');
    }
  }, [availableTimeOptions, timeLabel]);

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
      return toLocalError('CORE_VALIDATION_ERROR', 'Selecione profissional, serviço e horário.');
    }

    if (
      !timeLabel ||
      !isFutureAppointmentStart(dateIso, timeLabel) ||
      !availableTimeOptions.some((time) => time.value === timeLabel)
    ) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Selecione um horário disponível para este profissional e serviço.',
      );
    }

    if (
      selectedServices.length !== selectedServiceIds.length ||
      selectedServices.some((service) => !isServiceEnabledForProfessional(service, professionalId))
    ) {
      return toLocalError(
        'CORE_VALIDATION_ERROR',
        'Selecione apenas serviços habilitados para este profissional.',
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
          <p>Cliente, profissional, serviços, data e horário em um fluxo rápido.</p>
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
          <label>
            <span>Profissional</span>
            <RelatedSelect
              emptyLabel="Nenhum profissional cadastrado"
              onChange={(nextProfessionalId) => {
                setProfessionalId(nextProfessionalId);
                const nextServiceId = firstServiceIdForProfessional(model, nextProfessionalId);
                setServicePickerId(nextServiceId);
                setSelectedServiceIds(nextServiceId ? [nextServiceId] : []);
                setTimeLabel(
                  firstAvailableTimeLabel({
                    dateIso,
                    durationMinutes: serviceDurationForIds(
                      model,
                      nextServiceId ? [nextServiceId] : [],
                    ),
                    model,
                    preferredTimeLabel: timeLabel,
                    professionalId: nextProfessionalId,
                  }),
                );
              }}
              options={professionalOptions}
              placeholder="Selecione um profissional"
              required
              searchPlaceholder="Buscar profissional"
              value={professionalId}
            />
          </label>
          <div className="new-appointment-services-field">
            <label>
              <span>Serviços</span>
              <RelatedSelect
                disabled={!professionalId || !availableServices.length}
                emptyLabel={
                  professionalId
                    ? 'Nenhum serviço habilitado para este profissional'
                    : 'Selecione um profissional primeiro'
                }
                onChange={setServicePickerId}
                options={availableServiceOptions}
                placeholder={
                  professionalId ? 'Selecione um serviço' : 'Selecione um profissional primeiro'
                }
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
        </div>

        <div className="new-appointment-inline-fields compact">
          <label>
            <span>Data</span>
            <AppointmentDatePicker
              minDateIso={todayIso}
              onChange={(nextDateIso) => {
                const nextValidDateIso = maxDateIso(nextDateIso, todayIso);
                setDateIso(nextValidDateIso);
                setTimeLabel((current) =>
                  firstAvailableTimeLabel({
                    dateIso: nextValidDateIso,
                    durationMinutes: totalDurationMinutes,
                    model,
                    preferredTimeLabel: current,
                    professionalId,
                  }),
                );
              }}
              value={dateIso}
            />
          </label>
          <label>
            <span>Horario</span>
            <select
              disabled={!availableTimeOptions.length}
              value={timeLabel}
              onChange={(event) => setTimeLabel(event.target.value)}
            >
              {availableTimeOptions.map((time) => {
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

        {!availableTimeOptions.length ? (
          <div className="new-appointment-feedback warning" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>Não há horários disponíveis para este profissional e serviço nesta data.</span>
          </div>
        ) : null}

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
  return occupiedSlots.find(
    (slot) =>
      slot.dateIso === dateIso &&
      slot.professionalId === professionalId &&
      slot.timeLabel === timeLabel,
  );
}

function firstServiceIdForProfessional(model: AgendaNewAppointmentModel, professionalId: string) {
  return (
    model.services.find((service) => isServiceEnabledForProfessional(service, professionalId))
      ?.id ?? ''
  );
}

function isServiceEnabledForProfessional(
  service: AgendaNewAppointmentModel['services'][number],
  professionalId: string,
) {
  if (!professionalId) return false;
  return (
    service.enabledProfessionalIds.length === 0 ||
    service.enabledProfessionalIds.includes(professionalId)
  );
}

function AppointmentDatePicker({
  minDateIso,
  onChange,
  value,
}: Readonly<{
  minDateIso: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  const [open, setOpen] = React.useState(false);
  const [visibleMonthIso, setVisibleMonthIso] = React.useState(() => value.slice(0, 7));
  const titleId = React.useId();
  const weeks = React.useMemo(() => buildCalendarWeeks(visibleMonthIso), [visibleMonthIso]);
  const monthLabel = formatMonthLabel(visibleMonthIso);

  React.useEffect(() => {
    setVisibleMonthIso(value.slice(0, 7));
  }, [value]);

  function selectDate(nextDateIso: string) {
    if (nextDateIso < minDateIso) return;
    onChange(nextDateIso);
    setOpen(false);
  }

  return (
    <div className="appointment-date-picker">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="appointment-date-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CalendarDays size={16} aria-hidden="true" />
        <span>{formatDateButtonLabel(value)}</span>
      </button>
      {open ? (
        <div aria-labelledby={titleId} className="appointment-date-calendar" role="dialog">
          <header>
            <button
              aria-label="Mês anterior"
              disabled={previousMonthIso(visibleMonthIso) < minDateIso.slice(0, 7)}
              onClick={() => setVisibleMonthIso((current) => previousMonthIso(current))}
              type="button"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <strong id={titleId}>{monthLabel}</strong>
            <button
              aria-label="Próximo mês"
              onClick={() => setVisibleMonthIso((current) => nextMonthIso(current))}
              type="button"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </header>
          <div className="appointment-date-weekdays" aria-hidden="true">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((weekday, index) => (
              <span key={weekday + index}>{weekday}</span>
            ))}
          </div>
          <div className="appointment-date-days">
            {weeks.flat().map((day, index) =>
              day ? (
                <button
                  aria-pressed={day.dateIso === value}
                  className={day.dateIso === value ? 'selected' : undefined}
                  disabled={day.dateIso < minDateIso}
                  key={day.dateIso}
                  onClick={() => selectDate(day.dateIso)}
                  type="button"
                >
                  {day.label}
                </button>
              ) : (
                <span aria-hidden="true" key={`empty-${visibleMonthIso}-${index}`} />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function firstAvailableTimeLabel({
  dateIso,
  durationMinutes,
  model,
  preferredTimeLabel,
  professionalId,
}: {
  dateIso: string;
  durationMinutes: number;
  model: AgendaNewAppointmentModel;
  preferredTimeLabel?: string;
  professionalId: string;
}) {
  const options = availableTimeOptionsForProfessional({
    appointments: model.appointments,
    dateIso,
    durationMinutes,
    occupiedSlots: model.occupiedSlots,
    openingHours: model.openingHours,
    professionalId,
    timeOptions: model.timeOptions,
  });
  const preferred = options.find((time) => time.value === preferredTimeLabel);
  return preferred?.value ?? options[0]?.value ?? '';
}

function maxDateIso(left: string, right: string) {
  return left >= right ? left : right;
}

function serviceDurationForIds(model: AgendaNewAppointmentModel, serviceIds: readonly string[]) {
  return serviceIds.reduce((total, serviceId) => {
    const service = model.services.find((candidate) => candidate.id === serviceId);
    return total + (service?.durationMinutes ?? 0);
  }, 0);
}

function buildCalendarWeeks(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ dateIso: string; label: string } | null> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateIso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: String(day),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<{ dateIso: string; label: string } | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function previousMonthIso(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthIso(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateButtonLabel(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
