import type {
  AgendaAppointment,
  AgendaOccupiedSlot,
  AgendaOpeningHours,
  AgendaProfessional,
  AgendaTimeOption,
} from './agenda-data';

const inactiveAppointmentStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

export type AgendaAvailabilitySlot = {
  value: string;
  label: string;
};

export function availableTimeOptionsForProfessional({
  appointments,
  dateIso,
  durationMinutes,
  now = new Date(),
  occupiedSlots,
  openingHours,
  professionalId,
  timeOptions,
}: {
  appointments: readonly AgendaAppointment[];
  dateIso: string;
  durationMinutes: number;
  now?: Date;
  occupiedSlots: readonly AgendaOccupiedSlot[];
  openingHours: AgendaOpeningHours;
  professionalId: string;
  timeOptions: readonly AgendaTimeOption[];
}): AgendaAvailabilitySlot[] {
  if (!professionalId || durationMinutes <= 0) return [];

  return timeOptions
    .filter((time) => isFutureAppointmentStart(dateIso, time.value, now))
    .filter((time) => slotFitsOpeningHours(time.value, durationMinutes, openingHours.endTime))
    .filter(
      (time) =>
        !slotOverlapsBusyInterval({
          appointments,
          dateIso,
          durationMinutes,
          occupiedSlots,
          professionalId,
          timeLabel: time.value,
        }),
    )
    .map((time) => ({ label: time.label, value: time.value }));
}

export function availabilitySummaryByProfessional({
  appointments,
  dateIso,
  durationMinutes,
  now = new Date(),
  occupiedSlots,
  openingHours,
  professionals,
  timeOptions,
}: {
  appointments: readonly AgendaAppointment[];
  dateIso: string;
  durationMinutes: number;
  now?: Date;
  occupiedSlots: readonly AgendaOccupiedSlot[];
  openingHours: AgendaOpeningHours;
  professionals: readonly AgendaProfessional[];
  timeOptions: readonly AgendaTimeOption[];
}) {
  return professionals.map((professional) => ({
    professional,
    slots: availableTimeOptionsForProfessional({
      appointments,
      dateIso,
      durationMinutes,
      now,
      occupiedSlots,
      openingHours,
      professionalId: professional.id,
      timeOptions,
    }),
  }));
}

export function isFutureAppointmentStart(dateIso: string, timeLabel: string, now = new Date()) {
  const todayIso = getSaoPauloTodayIso(now);
  if (dateIso < todayIso) return false;
  if (dateIso > todayIso) return true;
  return timeLabel > getSaoPauloTimeLabel(now);
}

export function getSaoPauloTodayIso(now = new Date()) {
  const parts = getSaoPauloDateTimeParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getSaoPauloTimeLabel(now = new Date()) {
  const parts = getSaoPauloDateTimeParts(now);
  return `${parts.hour}:${parts.minute}`;
}

function slotOverlapsBusyInterval({
  appointments,
  dateIso,
  durationMinutes,
  occupiedSlots,
  professionalId,
  timeLabel,
}: {
  appointments: readonly AgendaAppointment[];
  dateIso: string;
  durationMinutes: number;
  occupiedSlots: readonly AgendaOccupiedSlot[];
  professionalId: string;
  timeLabel: string;
}) {
  const startsAtMinutes = toMinutes(timeLabel);
  const endsAtMinutes = startsAtMinutes + durationMinutes;

  return (
    appointments.some(
      (appointment) =>
        appointment.professionalId === professionalId &&
        appointment.startsAt.slice(0, 10) === dateIso &&
        !inactiveAppointmentStatuses.includes(appointment.status) &&
        rangesOverlap(
          startsAtMinutes,
          endsAtMinutes,
          toMinutes(appointment.startLabel),
          toMinutes(appointment.endLabel),
        ),
    ) ||
    occupiedSlots.some(
      (slot) =>
        slot.professionalId === professionalId &&
        slot.dateIso === dateIso &&
        rangesOverlap(
          startsAtMinutes,
          endsAtMinutes,
          toMinutes(slot.startLabel),
          toMinutes(slot.endLabel),
        ),
    )
  );
}

function slotFitsOpeningHours(timeLabel: string, durationMinutes: number, endTime: string) {
  return toMinutes(timeLabel) + durationMinutes <= toMinutes(endTime);
}

function rangesOverlap(
  leftStartMinutes: number,
  leftEndMinutes: number,
  rightStartMinutes: number,
  rightEndMinutes: number,
) {
  return leftStartMinutes < rightEndMinutes && rightStartMinutes < leftEndMinutes;
}

function toMinutes(timeLabel: string) {
  const [hour = 0, minute = 0] = timeLabel.split(':').map(Number);
  return hour * 60 + minute;
}

function getSaoPauloDateTimeParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<
    'day' | 'hour' | 'minute' | 'month' | 'year',
    string
  >;
}
