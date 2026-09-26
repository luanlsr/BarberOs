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

const defaultBlocks: readonly StoreScheduleBlock[] = [
  {
    id: 'dev-block-lunch',
    branchId: 'dev-branch',
    dateIso: '2026-09-05',
    professionalId: null,
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Almoço da equipe',
  },
  {
    id: 'dev-block-training',
    branchId: 'dev-branch',
    dateIso: '2026-09-05',
    professionalId: 'dev-professional-rafael',
    startTime: '16:00',
    endTime: '16:30',
    reason: 'Bloqueio administrativo',
  },
];

export function getStoreOperationsSettingsStorageKey(branchId: string) {
  return 'barberos:store-operations-settings:' + branchId;
}

export function getStoreOperationsSettings(branchId: string): StoreOperationsSettings {
  return {
    openingHours: {
      ...defaultOpeningHours,
      branchId,
    },
    blocks: defaultBlocks.filter((block) => block.branchId === branchId),
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
