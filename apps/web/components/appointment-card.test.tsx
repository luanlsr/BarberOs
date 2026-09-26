import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { AppointmentStatus, SessionContext } from '@barberos/contracts';
import { AppointmentCard } from './appointment-card';
import { AppointmentDetailSurface } from './appointment-detail-surface';
import { buildAgendaViewModel, type AgendaDataSource } from '../lib/agenda-data';
import { developmentSession } from '../lib/dev-session';

const agendaData: AgendaDataSource = {
  professionals: [
    {
      id: 'professional-carlos',
      name: 'Carlos Mendes',
      roleLabel: 'Barbeiro senior',
      branchIds: ['dev-branch'],
    },
    {
      id: 'professional-joao',
      name: 'Joao Pereira',
      roleLabel: 'Barbeiro',
      branchIds: ['dev-branch'],
    },
  ],
  services: [],
  customers: [],
  appointments: [
    appointmentRecord(
      'appointment-0900',
      'customer-marcos',
      'Marcos Vinicius',
      '(11) 98800-1100',
      'professional-carlos',
      'Carlos Mendes',
      ['Corte + barba'],
      '09:00',
      '10:15',
      'CONFIRMED',
      9500,
    ),
    appointmentRecord(
      'appointment-1530',
      'customer-joao',
      'João Pedro',
      '(11) 94400-5544',
      'professional-joao',
      'Joao Pereira',
      ['Combo completo'],
      '15:30',
      '17:00',
      'CONFIRMED',
      13000,
    ),
  ],
};

function appointmentRecord(
  id: string,
  customerId: string,
  customerName: string,
  customerPhone: string,
  professionalId: string,
  professionalName: string,
  serviceNames: readonly string[],
  start: string,
  end: string,
  status: AppointmentStatus,
  totalCents: number,
): AgendaDataSource['appointments'][number] {
  return {
    id,
    branchId: 'dev-branch',
    customerId,
    customerName,
    customerPhone,
    professionalId,
    professionalName,
    serviceNames,
    startsAt: `2026-09-05T${start}:00-03:00`,
    endsAt: `2026-09-05T${end}:00-03:00`,
    status,
    sourceLabel: 'Manual',
    totalCents,
  };
}

function buildAgenda(session: SessionContext, appointmentId: string) {
  return buildAgendaViewModel({
    data: agendaData,
    session,
    appointmentId,
  });
}

describe('appointment agenda components', () => {
  test('renders appointment card with essential operational information', () => {
    const model = buildAgenda(developmentSession, 'appointment-0900');
    const appointment = model.selectedAppointmentDetail?.appointment;

    expect(appointment).toBeDefined();

    const html = renderToStaticMarkup(
      <AppointmentCard
        appointment={appointment!}
        detailHref="/agenda?appointmentId=appointment-0900"
      />,
    );

    expect(html).toContain('09:00');
    expect(html).toContain('Marcos Vinicius');
    expect(html).toContain('Corte + barba');
    expect(html).toContain('Carlos Mendes');
    expect(html).toContain('Confirmado');
    expect(html).toContain('Ver detalhes');
  });

  test('renders permitted check-in as a button on the detail surface', () => {
    const model = buildAgenda(developmentSession, 'appointment-1530');

    const html = renderToStaticMarkup(
      <AppointmentDetailSurface detail={model.selectedAppointmentDetail} />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('Check-in');
    expect(html).toContain('Iniciar atendimento e abrir a Comanda.');
  });

  test('renders detail surface without denied actions', () => {
    const model = buildAgenda(
      {
        ...developmentSession,
        permissions: ['appointments.read', 'customers.read'],
        entitlements: ['core.operations'],
      },
      'appointment-1530',
    );

    const html = renderToStaticMarkup(
      <AppointmentDetailSurface detail={model.selectedAppointmentDetail} />,
    );

    expect(html).toContain('João Pedro');
    expect(html).toContain('Histórico');
    expect(html).toContain('Contato');
    expect(html).not.toContain('Cancelar');
    expect(html).not.toContain('Reagendar');
    expect(html).not.toContain('Check-in');
  });
});
