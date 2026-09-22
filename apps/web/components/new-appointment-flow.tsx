'use client';

import * as React from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@barberos/ui';
import type { AgendaNewAppointmentModel, AgendaOccupiedSlot } from '../lib/agenda-data';
import { PhoneInput, isValidBrazilMobilePhone } from './form-controls';

type CustomerMode = 'existing' | 'quick';
type SubmitState =
  | { type: 'idle' }
  | { type: 'success'; message: string; createdSlot?: AgendaOccupiedSlot }
  | { type: 'error'; code: string; message: string; requestId: string };

export function NewAppointmentFlow({ model }: Readonly<{ model: AgendaNewAppointmentModel }>) {
  const [customerMode, setCustomerMode] = React.useState<CustomerMode>('existing');
  const [customerId, setCustomerId] = React.useState(model.customers[0]?.id ?? '');
  const [quickCustomerName, setQuickCustomerName] = React.useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = React.useState('');
  const [serviceId, setServiceId] = React.useState(model.services[0]?.id ?? '');
  const [professionalId, setProfessionalId] = React.useState(model.defaultProfessionalId);
  const [dateIso, setDateIso] = React.useState(model.dateIso);
  const [timeLabel, setTimeLabel] = React.useState(model.defaultTimeLabel);
  const [createdSlots, setCreatedSlots] = React.useState<AgendaOccupiedSlot[]>([]);
  const [submitState, setSubmitState] = React.useState<SubmitState>({ type: 'idle' });

  const selectedCustomer = model.customers.find((customer) => customer.id === customerId);
  const selectedService = model.services.find((service) => service.id === serviceId);
  const selectedProfessional = model.professionals.find(
    (professional) => professional.id === professionalId,
  );
  const occupiedSlots = React.useMemo(
    () => [...model.occupiedSlots, ...createdSlots],
    [model.occupiedSlots, createdSlots],
  );
  const conflict = findConflict(model, occupiedSlots, professionalId, dateIso, timeLabel);

  if (!model.isOpen) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!model.canCreateAppointment) {
      setSubmitState({
        type: 'error',
        code: 'CORE_PERMISSION_DENIED',
        message: 'Seu perfil não pode criar agendamentos nesta unidade.',
        requestId: 'local-permission-denied',
      });
      return;
    }

    if (customerMode === 'quick' && !model.canCreateCustomer) {
      setSubmitState({
        type: 'error',
        code: 'CORE_PERMISSION_DENIED',
        message: 'Seu perfil não pode criar clientes rapidamente.',
        requestId: 'local-customer-permission-denied',
      });
      return;
    }

    if (customerMode === 'quick' && (!quickCustomerName.trim() || !quickCustomerPhone.trim())) {
      setSubmitState({
        type: 'error',
        code: 'CORE_VALIDATION_ERROR',
        message: 'Informe nome e telefone para criar o cliente rápido.',
        requestId: 'local-validation-error',
      });
      return;
    }

    if (customerMode === 'quick' && quickCustomerName.trim().length < 3) {
      setSubmitState({
        type: 'error',
        code: 'CORE_VALIDATION_ERROR',
        message: 'Informe o nome completo do cliente com pelo menos 3 caracteres.',
        requestId: 'local-validation-error',
      });
      return;
    }

    if (customerMode === 'quick' && !isValidBrazilMobilePhone(quickCustomerPhone)) {
      setSubmitState({
        type: 'error',
        code: 'CORE_VALIDATION_ERROR',
        message: 'Informe um celular valido com DDD, no formato (11) 99999-9999.',
        requestId: 'local-phone-validation-error',
      });
      return;
    }

    if (!selectedService || !selectedProfessional) {
      setSubmitState({
        type: 'error',
        code: 'CORE_VALIDATION_ERROR',
        message: 'Selecione serviço, profissional e horário.',
        requestId: 'local-selection-error',
      });
      return;
    }

    if (conflict) {
      setSubmitState({
        type: 'error',
        code: 'APPOINTMENT_CONFLICT',
        message: `Horario ocupado por ${conflict.customerName}. Escolha outro horário ou profissional.`,
        requestId: `local-conflict-${professionalId}-${timeLabel}`,
      });
      return;
    }

    const customerName =
      customerMode === 'quick' ? quickCustomerName.trim() : selectedCustomer?.name;
    const createdSlot = {
      professionalId,
      timeLabel,
      customerName: customerName ?? 'cliente',
    };
    setCreatedSlots((current) => [...current, createdSlot]);
    setSubmitState({
      type: 'success',
      message: `Agendamento criado para ${customerName ?? 'cliente'} com ${selectedProfessional.name} as ${timeLabel}.`,
      createdSlot,
    });
  }

  function handleCancelCreatedAppointment(slot: AgendaOccupiedSlot) {
    setCreatedSlots((current) =>
      current.filter(
        (item) =>
          item.professionalId !== slot.professionalId ||
          item.timeLabel !== slot.timeLabel ||
          item.customerName !== slot.customerName,
      ),
    );
    setSubmitState({
      type: 'success',
      message: `Agendamento cancelado. Horario ${slot.timeLabel} liberado.`,
    });
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
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {model.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
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
            <span>Serviço</span>
            <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              {model.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.durationMinutes} min
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Profissional</span>
            <select
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              {model.professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
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
                  occupiedSlots,
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
            <span>Horario ocupado por {conflict.customerName}.</span>
          </div>
        ) : null}

        {submitState.type === 'success' ? (
          <div className="new-appointment-feedback success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{submitState.message}</span>
            {submitState.createdSlot ? (
              <Button
                onClick={() => {
                  if (submitState.createdSlot)
                    handleCancelCreatedAppointment(submitState.createdSlot);
                }}
                type="button"
                variant="secondary"
              >
                Cancelar agendamento
              </Button>
            ) : null}
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
          <Button disabled={!model.canCreateAppointment} type="submit">
            Criar agendamento
          </Button>
        </div>
      </form>
    </section>
  );
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
