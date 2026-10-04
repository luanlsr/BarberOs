import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { AgendaNewAppointmentModel } from '../lib/agenda-data';
import { NewAppointmentFlow } from './new-appointment-flow';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

type RenderResult = { container: HTMLDivElement; root: Root };

const model: AgendaNewAppointmentModel = {
  isOpen: true,
  dateIso: '2026-09-05',
  defaultTimeLabel: '09:00',
  branchId: 'dev-branch',
  canCreateAppointment: true,
  canCreateCustomer: true,
  defaultProfessionalId: 'professional-carlos',
  customers: [{ id: 'customer-ana', name: 'Ana Paula', phone: '(11) 99999-9999' }],
  professionals: [
    {
      id: 'professional-carlos',
      name: 'Carlos Mendes',
      roleLabel: 'Barbeiro',
      branchIds: ['dev-branch'],
    },
    {
      id: 'professional-rafael',
      name: 'Rafael Lima',
      roleLabel: 'Barbeiro',
      branchIds: ['dev-branch'],
    },
  ],
  services: [
    {
      id: 'service-barba',
      name: 'Barba',
      durationMinutes: 30,
      priceCents: 4000,
      enabledProfessionalIds: ['professional-rafael'],
    },
    {
      id: 'service-corte',
      name: 'Corte masculino',
      durationMinutes: 45,
      priceCents: 6000,
      enabledProfessionalIds: ['professional-carlos'],
    },
    {
      id: 'service-hidratacao',
      name: 'Hidratacao',
      durationMinutes: 25,
      priceCents: 3500,
      enabledProfessionalIds: [],
    },
  ],
  appointments: [],
  openingHours: {
    startTime: '08:00',
    endTime: '18:00',
    slotMinTime: '08:00:00',
    slotMaxTime: '18:30:00',
    slotDuration: '00:30:00',
  },
  timeOptions: [
    { value: '09:00', label: '09:00' },
    { value: '11:00', label: '11:00' },
  ],
  occupiedSlots: [],
};

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  return { container, root };
}

function focusInput(container: HTMLElement, label: string) {
  const input = Array.from(container.querySelectorAll<HTMLInputElement>('input')).find(
    (item) => item.getAttribute('aria-label') === label,
  );
  expect(input).toBeTruthy();
  flushSync(() => {
    input?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  });
}

function clickOption(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((item) =>
    item.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  flushSync(() => button?.click());
}

describe('NewAppointmentFlow', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  test('resets services to options enabled for the selected professional', () => {
    const { container } = render(<NewAppointmentFlow model={model} />);

    expect(container.textContent).toContain('Corte masculino');
    expect(container.textContent).not.toContain('Barba · 30 min');

    focusInput(container, 'Buscar profissional');
    clickOption(container, 'Rafael Lima');

    expect(container.textContent).toContain('Barba · 30 min');
    expect(container.textContent).not.toContain('Corte masculino · 45 min');
  });

  test('opens a calendar picker and hides past time options for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T10:00:00-03:00'));

    const { container } = render(<NewAppointmentFlow model={model} />);

    const dateButton = container.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]');
    expect(dateButton).toBeTruthy();
    flushSync(() => dateButton?.click());

    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Setembro de 2026');
    expect(Array.from(container.querySelectorAll('option')).map((option) => option.value)).toEqual([
      '11:00',
    ]);
  });
});
