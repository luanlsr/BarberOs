import { describe, expect, test } from 'vitest';
import type { AppointmentStatus, SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { buildAgendaViewModel, type AgendaDataSource } from './agenda-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

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
    {
      id: 'professional-rafael',
      name: 'Rafael Lima',
      roleLabel: 'Especialista em barba',
      branchIds: ['dev-branch'],
    },
    {
      id: 'professional-north-ana',
      name: 'Ana Costa',
      roleLabel: 'Barbeira',
      branchIds: ['dev-branch-north'],
    },
  ],
  services: [
    { id: 'service-cut', name: 'Corte classico', durationMinutes: 45, priceCents: 6000 },
    { id: 'service-beard', name: 'Barba', durationMinutes: 30, priceCents: 4000 },
    { id: 'service-combo', name: 'Corte + barba', durationMinutes: 75, priceCents: 9500 },
    { id: 'service-premium', name: 'Combo completo', durationMinutes: 90, priceCents: 13000 },
  ],
  customers: [
    { id: 'customer-marcos', name: 'Marcos Vinicius', phone: '(11) 98800-1100' },
    { id: 'customer-rafael', name: 'Rafael Alves', phone: '(11) 97700-2211' },
    { id: 'customer-bruno', name: 'Bruno Martins', phone: '(11) 96600-3322' },
    { id: 'customer-thiago', name: 'Thiago Martins', phone: '(11) 95500-4433' },
    { id: 'customer-joao', name: 'Joao Pedro', phone: '(11) 94400-5544' },
    { id: 'customer-felipe', name: 'Felipe Nunes', phone: '(11) 93300-6655' },
  ],
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
      'appointment-1000',
      'customer-rafael',
      'Rafael Alves',
      '(11) 97700-2211',
      'professional-joao',
      'Joao Pereira',
      ['Corte classico'],
      '10:00',
      '10:45',
      'PENDING',
      6000,
      'WhatsApp',
      'Cliente pediu encaixe se houver atraso anterior.',
    ),
    appointmentRecord(
      'appointment-1130',
      'customer-bruno',
      'Bruno Martins',
      '(11) 96600-3322',
      'professional-rafael',
      'Rafael Lima',
      ['Barba'],
      '11:30',
      '12:00',
      'CHECKED_IN',
      4000,
      'Recepcao',
    ),
    appointmentRecord(
      'appointment-1400',
      'customer-thiago',
      'Thiago Martins',
      '(11) 95500-4433',
      'professional-carlos',
      'Carlos Mendes',
      ['Corte classico'],
      '14:00',
      '14:45',
      'CONFIRMED',
      6000,
      'Online',
    ),
    appointmentRecord(
      'appointment-1530',
      'customer-joao',
      'Joao Pedro',
      '(11) 94400-5544',
      'professional-joao',
      'Joao Pereira',
      ['Combo completo'],
      '15:30',
      '17:00',
      'CONFIRMED',
      13000,
    ),
    appointmentRecord(
      'appointment-1730',
      'customer-felipe',
      'Felipe Nunes',
      '(11) 93300-6655',
      'professional-rafael',
      'Rafael Lima',
      ['Corte + barba'],
      '17:30',
      '18:45',
      'IN_SERVICE',
      9500,
      'Recepcao',
    ),
    appointmentRecord(
      'appointment-other-branch',
      'customer-marcos',
      'Marcos Vinicius',
      '(11) 98800-1100',
      'professional-north-ana',
      'Ana Costa',
      ['Corte classico'],
      '09:00',
      '09:45',
      'CONFIRMED',
      6000,
      'Manual',
      undefined,
      'dev-branch-north',
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
  sourceLabel = 'Manual',
  notes?: string,
  branchId = 'dev-branch',
): AgendaDataSource['appointments'][number] {
  return {
    id,
    branchId,
    customerId,
    customerName,
    customerPhone,
    professionalId,
    professionalName,
    serviceNames,
    startsAt: `2026-09-05T${start}:00-03:00`,
    endsAt: `2026-09-05T${end}:00-03:00`,
    status,
    sourceLabel,
    totalCents,
    notes,
  };
}

function buildAgenda(overrides: Parameters<typeof buildAgendaViewModel>[0]) {
  return buildAgendaViewModel({ data: agendaData, ...overrides });
}

describe('agenda data loading layer', () => {
  test('builds the branch-scoped agenda view model for the active workspace', () => {
    const model = buildAgenda({ session: developmentSession, date: '2026-09-05' });

    expect(model.branchId).toBe('dev-branch');
    expect(model.professionals).toHaveLength(3);
    expect(model.appointments).toHaveLength(6);
    expect(model.appointments.map((appointment) => appointment.id)).not.toContain(
      'appointment-other-branch',
    );
    expect(model.timeline.find((slot) => slot.timeLabel === '09:00')?.appointments).toHaveLength(1);
    expect(
      model.professionalColumns.find((column) => column.professional.name === 'Carlos Mendes')
        ?.appointments,
    ).toHaveLength(2);
    expect(model.kpis.find((kpi) => kpi.label === 'Receita prevista')?.value).toBe('R$ 480');
  });

  test('filters appointments by professional without exposing other columns', () => {
    const model = buildAgenda({ session: developmentSession, professionalId: 'professional-joao' });

    expect(model.selectedProfessionalLabel).toBe('Joao Pereira');
    expect(model.appointments.map((appointment) => appointment.professionalName)).toEqual([
      'Joao Pereira',
      'Joao Pereira',
    ]);
  });

  test('returns permission denied state when the session lacks agenda access', () => {
    const model = buildAgenda({
      session: sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    });

    expect(model.hasReadPermission).toBe(false);
    expect(model.canCreateAppointment).toBe(false);
    expect(model.appointments).toEqual([]);
    expect(model.selectedAppointmentDetail).toBeUndefined();
    expect(model.emptyMessage).toContain('permissão');
  });

  test('limits professional role to its own operational column', () => {
    const model = buildAgenda({ session: sessionWith({ role: 'PROFESSIONAL' }) });

    expect(model.professionals).toHaveLength(1);
    expect(model.professionalColumns).toHaveLength(1);
  });

  test('selects appointment detail with status history and permitted actions', () => {
    const model = buildAgenda({ session: developmentSession, appointmentId: 'appointment-1530' });

    expect(model.selectedAppointmentDetail?.appointment.customerName).toBe('Joao Pedro');
    expect(model.selectedAppointmentDetail?.history.map((item) => item.statusLabel)).toEqual([
      'Aguardando',
      'Confirmado',
    ]);
    expect(model.selectedAppointmentDetail?.actions.map((action) => action.id)).toEqual([
      'check-in',
      'contact',
      'reschedule',
      'cancel',
    ]);
  });

  test('filters appointment detail actions by session permissions', () => {
    const readOnlyModel = buildAgenda({
      session: sessionWith({
        permissions: ['appointments.read', 'customers.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'appointment-1530',
    });

    expect(readOnlyModel.selectedAppointmentDetail?.actions.map((action) => action.id)).toEqual([
      'contact',
    ]);

    const agendaOnlyModel = buildAgenda({
      session: sessionWith({
        permissions: ['appointments.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'appointment-1530',
    });

    expect(agendaOnlyModel.selectedAppointmentDetail?.actions).toEqual([]);
  });

  test('only exposes check-in for eligible statuses and complete permissions', () => {
    const checkedInModel = buildAgenda({
      session: developmentSession,
      appointmentId: 'appointment-1130',
    });

    expect(checkedInModel.selectedAppointmentDetail?.appointment.status).toBe('CHECKED_IN');
    expect(checkedInModel.selectedAppointmentDetail?.appointment.checkInAction).toBeUndefined();
    expect(
      checkedInModel.selectedAppointmentDetail?.actions.map((action) => action.id),
    ).not.toContain('check-in');

    const legacyUpdateOnlyModel = buildAgenda({
      session: sessionWith({
        permissions: ['appointments.read', 'appointments.update', 'orders.create', 'orders.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'appointment-1530',
    });

    expect(
      legacyUpdateOnlyModel.selectedAppointmentDetail?.appointment.checkInAction,
    ).toBeUndefined();
    expect(
      legacyUpdateOnlyModel.selectedAppointmentDetail?.actions.map((action) => action.id),
    ).not.toContain('check-in');

    const missingOrdersModel = buildAgenda({
      session: sessionWith({
        permissions: ['appointments.read', 'appointments.check_in'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'appointment-1530',
    });

    expect(missingOrdersModel.selectedAppointmentDetail?.appointment.checkInAction).toBeUndefined();
  });

  test('builds new appointment flow data with occupied slot feedback inputs', () => {
    const model = buildAgenda({ session: developmentSession, mode: 'new' });

    expect(model.newAppointment.isOpen).toBe(true);
    expect(model.newAppointment.canCreateAppointment).toBe(true);
    expect(model.newAppointment.canCreateCustomer).toBe(true);
    expect(model.newAppointment.customers.map((customer) => customer.name)).toContain(
      'Marcos Vinicius',
    );
    expect(model.newAppointment.timeOptions.map((time) => time.value)).toContain('12:00');
    expect(model.newAppointment.occupiedSlots).toContainEqual({
      professionalId: 'professional-carlos',
      timeLabel: '09:00',
      customerName: 'Marcos Vinicius',
    });
  });
});
