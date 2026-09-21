export type EstimateUnit = 'minutes' | 'hours' | 'days';

// A day is one 8-hour working day, not 24 hours — matches how "I have
// a day for this" is actually meant when triaging a task backlog.
const MINUTES_PER_UNIT: Record<EstimateUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 480,
};

const MINUTES_PER_DAY = MINUTES_PER_UNIT.days;

export function toMinutes(value: number, unit: EstimateUnit): number {
  return Math.round(value * MINUTES_PER_UNIT[unit]);
}

export function fromMinutes(minutes: number, unit: EstimateUnit): number {
  return minutes / MINUTES_PER_UNIT[unit];
}

export function formatEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (minutes < MINUTES_PER_DAY) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }

  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / 60);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}
