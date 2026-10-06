import type { ScheduleBlock } from '@barberos/contracts';

export type StoreOpeningHours = {
  branchId: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  timezone: string;
};

export type StoreScheduleBlock = {
  id: string;
  branchId: string;
  dateIso: string;
  professionalId: string | null;
  startTime: string;
  endTime: string;
  reason: string;
};

export type StoreOperationsSettings = {
  openingHours: StoreOpeningHours;
  blocks: readonly StoreScheduleBlock[];
};

const defaultOpeningHours: Omit<StoreOpeningHours, 'branchId'> = {
  startTime: '08:00',
  endTime: '18:00',
  slotMinutes: 30,
  timezone: 'America/Sao_Paulo',
};

export function getStoreOperationsSettingsStorageKey(branchId: string) {
  return 'barberos:store-operations-settings:' + branchId;
}

export function getStoreOperationsSettings(branchId: string): StoreOperationsSettings {
  return {
    openingHours: {
      ...defaultOpeningHours,
      branchId,
    },
    blocks: [],
  };
}

export function toStoreScheduleBlock(block: ScheduleBlock): StoreScheduleBlock {
  return {
    id: block.id,
    branchId: block.branchId,
    dateIso: toSaoPauloDateIso(block.startsAt),
    professionalId: block.professionalId ?? null,
    startTime: toSaoPauloTimeLabel(block.startsAt),
    endTime: toSaoPauloTimeLabel(block.endsAt),
    reason: block.reason ?? scheduleBlockTypeLabels[block.type] ?? 'Bloqueio de agenda',
  };
}

export function buildOperationalTimeOptions(openingHours: StoreOpeningHours) {
  const options: { value: string; label: string }[] = [];
  const start = toMinutes(openingHours.startTime);
  const end = toMinutes(openingHours.endTime);

  for (let minutes = start; minutes <= end; minutes += openingHours.slotMinutes) {
    options.push({ value: fromMinutes(minutes), label: fromMinutes(minutes) });
  }

  return options;
}

export function toFullCalendarSlotTime(timeLabel: string) {
  return `${timeLabel}:00`;
}

export function toFullCalendarSlotMaxTime(openingHours: StoreOpeningHours) {
  return `${fromMinutes(toMinutes(openingHours.endTime) + openingHours.slotMinutes)}:00`;
}

export function formatOpeningHoursLabel(openingHours: StoreOpeningHours) {
  return `${openingHours.startTime} as ${openingHours.endTime}`;
}

export function timeRangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) {
  return toMinutes(leftStart) < toMinutes(rightEnd) && toMinutes(rightStart) < toMinutes(leftEnd);
}

function toMinutes(timeLabel: string) {
  const [hour = 0, minute = 0] = timeLabel.split(':').map(Number);
  return hour * 60 + minute;
}

function fromMinutes(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toSaoPauloDateIso(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toSaoPauloTimeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

const scheduleBlockTypeLabels: Record<ScheduleBlock['type'], string> = {
  BREAK: 'Intervalo',
  DAY_OFF: 'Folga',
  VACATION: 'Férias',
  MAINTENANCE: 'Manutenção',
  MANUAL: 'Bloqueio de agenda',
};
