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
    expect(model.emptyMessage).toContain('permissao');
  });

  test('limits professional role to its own operational column', () => {
    const model = buildAgendaViewModel({ session: sessionWith({ role: 'PROFESSIONAL' }) });

    expect(model.professionals).toHaveLength(1);
    expect(model.professionalColumns).toHaveLength(1);
  });
});
