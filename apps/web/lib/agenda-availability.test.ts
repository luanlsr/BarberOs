import { describe, expect, test, vi } from 'vitest';
import type { AgendaAppointment, AgendaOccupiedSlot, AgendaProfessional } from './agenda-data';
import {
  availabilitySummaryByProfessional,
  availableTimeOptionsForProfessional,
} from './agenda-availability';

const openingHours = {
  startTime: '09:00',
  endTime: '12:00',
  slotMinTime: '09:00:00',
  slotMaxTime: '12:30:00',
  slotDuration: '00:30:00',
};

const timeOptions = [
  { value: '09:00', label: '09:00' },
  { value: '09:30', label: '09:30' },
  { value: '10:00', label: '10:00' },
  { value: '10:30', label: '10:30' },
  { value: '11:00', label: '11:00' },
  { value: '11:30', label: '11:30' },
];

const professionals: AgendaProfessional[] = [
  { id: 'professional-a', name: 'Ana Barbeira', roleLabel: 'Barbeira', branchIds: ['branch-1'] },
  { id: 'professional-b', name: 'Bruno Barbeiro', roleLabel: 'Barbeiro', branchIds: ['branch-1'] },
];

describe('agenda availability helpers', () => {
  test('removes slots overlapping appointments and professional/global blocks by duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T08:00:00-03:00'));

    const appointments: AgendaAppointment[] = [
      appointment({
        professionalId: 'professional-a',
        startLabel: '10:00',
        endLabel: '10:30',
      }),
    ];
    const occupiedSlots: AgendaOccupiedSlot[] = [
      {
        professionalId: 'professional-a',
        dateIso: '2026-10-04',
        startLabel: '11:00',
        endLabel: '11:30',
        timeLabel: '11:00',
        customerName: 'bloqueio: reunião',
        kind: 'block',
      },
      {
        professionalId: 'professional-b',
        dateIso: '2026-10-04',
        startLabel: '09:30',
        endLabel: '10:00',
        timeLabel: '09:30',
        customerName: 'bloqueio: manutenção',
        kind: 'block',
      },
    ];

    expect(
      availableTimeOptionsForProfessional({
        appointments,
        dateIso: '2026-10-04',
        durationMinutes: 60,
        occupiedSlots,
        openingHours,
        professionalId: 'professional-a',
        timeOptions,
      }).map((slot) => slot.value),
    ).toEqual(['09:00']);

    expect(
      availabilitySummaryByProfessional({
        appointments,
        dateIso: '2026-10-04',
        durationMinutes: 60,
        occupiedSlots,
        openingHours,
        professionals,
        timeOptions,
      }).map((item) => [item.professional.id, item.slots.map((slot) => slot.value)]),
    ).toEqual([
      ['professional-a', ['09:00']],
      ['professional-b', ['10:00', '10:30', '11:00']],
    ]);

    vi.useRealTimers();
  });
});

function appointment(input: {
  professionalId: string;
  startLabel: string;
  endLabel: string;
}): AgendaAppointment {
  return {
    id: 'appointment-' + input.professionalId,
    branchId: 'branch-1',
    customerName: 'Cliente',
    customerPhone: '(11) 99999-9999',
    professionalId: input.professionalId,
    professionalName: 'Profissional',
    serviceNames: ['Corte'],
    startsAt: `2026-10-04T${input.startLabel}:00-03:00`,
    endsAt: `2026-10-04T${input.endLabel}:00-03:00`,
    startLabel: input.startLabel,
    endLabel: input.endLabel,
    durationLabel: '30 min',
    status: 'CONFIRMED',
    statusLabel: 'Confirmado',
    statusTone: 'success',
    sourceLabel: 'Manual',
    totalLabel: 'R$ 60',
    totalCents: 6000,
  };
}
