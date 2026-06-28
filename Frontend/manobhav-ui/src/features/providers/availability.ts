import type { ProviderDateOption, WeeklyAvailabilitySlot } from './types';

/**
 * Pure, React-free helpers that turn a provider's recurring weekly schedule into the concrete,
 * local-time dates the directory needs: the "next available" date chips and the set of weekdays the
 * booking calendar should leave enabled. Keeping these pure makes the date math straightforward to
 * unit test and free of timezone surprises (everything is computed in the visitor's local time).
 */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Distinct weekdays (0=Sunday..6=Saturday) the provider works, ascending. */
export function getAvailableDaysOfWeek(weekly: WeeklyAvailabilitySlot[]): number[] {
  const days = new Set<number>();
  for (const slot of weekly) {
    if (Number.isInteger(slot.dayOfWeek) && slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6) {
      days.add(slot.dayOfWeek);
    }
  }
  return [...days].sort((left, right) => left - right);
}

function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplay(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * The next `count` calendar dates (in local time) whose weekday the provider works, starting today.
 * The look-ahead is capped at a year so a malformed schedule can never spin forever.
 */
export function computeNextDates(
  weekly: WeeklyAvailabilitySlot[],
  count = 10,
  from: Date = new Date(),
): ProviderDateOption[] {
  const availableDays = new Set(getAvailableDaysOfWeek(weekly));
  if (availableDays.size === 0 || count <= 0) {
    return [];
  }

  const results: ProviderDateOption[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let scanned = 0; scanned <= 366 && results.length < count; scanned += 1) {
    if (availableDays.has(cursor.getDay())) {
      results.push({ display: toDisplay(cursor), iso: toLocalIso(cursor) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}
