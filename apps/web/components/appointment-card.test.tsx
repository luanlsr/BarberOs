import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { AppointmentCard } from './appointment-card';
import { AppointmentDetailSurface } from './appointment-detail-surface';
import { buildAgendaViewModel } from '../lib/agenda-data';
import { developmentSession } from '../lib/dev-session';

describe('appointment agenda components', () => {
  test('renders appointment card with essential operational information', () => {
    const model = buildAgendaViewModel({
      session: developmentSession,
      appointmentId: 'dev-appointment-0900',
    });
    const appointment = model.selectedAppointmentDetail?.appointment;

    expect(appointment).toBeDefined();

    const html = renderToStaticMarkup(
      <AppointmentCard
        appointment={appointment!}
        detailHref="/agenda?appointmentId=dev-appointment-0900"
      />,
    );

    expect(html).toContain('09:00');
    expect(html).toContain('Marcos Vinicius');
    expect(html).toContain('Corte + barba');
    expect(html).toContain('Carlos Mendes');
    expect(html).toContain('Confirmado');
    expect(html).toContain('Ver detalhes');
  });

  test('renders detail surface without denied actions', () => {
    const model = buildAgendaViewModel({
      session: {
        ...developmentSession,
        permissions: ['appointments.read', 'customers.read'],
        entitlements: ['core.operations'],
      },
      appointmentId: 'dev-appointment-1530',
    });

    const html = renderToStaticMarkup(
      <AppointmentDetailSurface detail={model.selectedAppointmentDetail} />,
    );

    expect(html).toContain('Joao Pedro');
    expect(html).toContain('Historico');
    expect(html).toContain('Contato');
    expect(html).not.toContain('Cancelar');
    expect(html).not.toContain('Reagendar');
    expect(html).not.toContain('Check-in');
  });
});
