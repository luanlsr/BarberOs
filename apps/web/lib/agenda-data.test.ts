import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { buildAgendaViewModel } from './agenda-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('agenda data loading layer', () => {
  test('builds the branch-scoped agenda view model for the active workspace', () => {
    const model = buildAgendaViewModel({ session: developmentSession, date: '2026-09-05' });

    expect(model.branchId).toBe('dev-branch');
    expect(model.professionals).toHaveLength(3);
    expect(model.appointments).toHaveLength(6);
    expect(model.timeline.find((slot) => slot.timeLabel === '09:00')?.appointments).toHaveLength(1);
    expect(
      model.professionalColumns.find((column) => column.professional.name === 'Carlos Mendes')
        ?.appointments,
    ).toHaveLength(2);
    expect(model.kpis.find((kpi) => kpi.label === 'Receita prevista')?.value).toBe('R$ 480');
  });

  test('filters appointments by professional without exposing other columns', () => {
    const model = buildAgendaViewModel({
      session: developmentSession,
      professionalId: 'dev-professional-joao',
    });

    expect(model.selectedProfessionalLabel).toBe('Joao Pereira');
    expect(model.appointments.map((appointment) => appointment.professionalName)).toEqual([
      'Joao Pereira',
      'Joao Pereira',
    ]);
  });

  test('returns permission denied state when the session lacks agenda access', () => {
    const model = buildAgendaViewModel({
      session: sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    });

    expect(model.hasReadPermission).toBe(false);
    expect(model.canCreateAppointment).toBe(false);
    expect(model.appointments).toEqual([]);
    expect(model.selectedAppointmentDetail).toBeUndefined();
    expect(model.emptyMessage).toContain('permissao');
  });

  test('limits professional role to its own operational column', () => {
    const model = buildAgendaViewModel({ session: sessionWith({ role: 'PROFESSIONAL' }) });

    expect(model.professionals).toHaveLength(1);
    expect(model.professionalColumns).toHaveLength(1);
  });

  test('selects appointment detail with status history and permitted actions', () => {
    const model = buildAgendaViewModel({
      session: developmentSession,
      appointmentId: 'dev-appointment-1530',
    });

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
    const readOnlyModel = buildAgendaViewModel({
      session: sessionWith({
        permissions: ['appointments.read', 'customers.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'dev-appointment-1530',
    });

    expect(readOnlyModel.selectedAppointmentDetail?.actions.map((action) => action.id)).toEqual([
      'contact',
    ]);

    const agendaOnlyModel = buildAgendaViewModel({
      session: sessionWith({
        permissions: ['appointments.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'dev-appointment-1530',
    });

    expect(agendaOnlyModel.selectedAppointmentDetail?.actions).toEqual([]);
  });
  test('only exposes check-in for eligible statuses and complete permissions', () => {
    const checkedInModel = buildAgendaViewModel({
      session: developmentSession,
      appointmentId: 'dev-appointment-1130',
    });

    expect(checkedInModel.selectedAppointmentDetail?.appointment.status).toBe('CHECKED_IN');
    expect(checkedInModel.selectedAppointmentDetail?.appointment.checkInAction).toBeUndefined();
    expect(
      checkedInModel.selectedAppointmentDetail?.actions.map((action) => action.id),
    ).not.toContain('check-in');

    const legacyUpdateOnlyModel = buildAgendaViewModel({
      session: sessionWith({
        permissions: ['appointments.read', 'appointments.update', 'orders.create', 'orders.read'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'dev-appointment-1530',
    });

    expect(
      legacyUpdateOnlyModel.selectedAppointmentDetail?.appointment.checkInAction,
    ).toBeUndefined();
    expect(
      legacyUpdateOnlyModel.selectedAppointmentDetail?.actions.map((action) => action.id),
    ).not.toContain('check-in');

    const missingOrdersModel = buildAgendaViewModel({
      session: sessionWith({
        permissions: ['appointments.read', 'appointments.check_in'],
        entitlements: ['core.operations'],
      }),
      appointmentId: 'dev-appointment-1530',
    });

    expect(missingOrdersModel.selectedAppointmentDetail?.appointment.checkInAction).toBeUndefined();
  });
  test('builds new appointment flow data with occupied slot feedback inputs', () => {
    const model = buildAgendaViewModel({ session: developmentSession, mode: 'new' });

    expect(model.newAppointment.isOpen).toBe(true);
    expect(model.newAppointment.canCreateAppointment).toBe(true);
    expect(model.newAppointment.canCreateCustomer).toBe(true);
    expect(model.newAppointment.customers.map((customer) => customer.name)).toContain(
      'Marcos Vinicius',
    );
    expect(model.newAppointment.timeOptions.map((time) => time.value)).toContain('12:00');
    expect(model.newAppointment.occupiedSlots).toContainEqual({
      professionalId: 'dev-professional-carlos',
      timeLabel: '09:00',
      customerName: 'Marcos Vinicius',
    });
  });
});
