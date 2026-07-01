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

/**
 * True when, on `dayOfWeek`, at least one availability window's end time is still in the future
 * relative to `now` (both in local/IST time — the platform is India-only). Malformed times are
 * treated as still-open so bad data can never hide a day that might actually be bookable.
 */
export function hasRemainingWindow(weekly: WeeklyAvailabilitySlot[], dayOfWeek: number, now: Date): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return weekly.some((slot) => slot.dayOfWeek === dayOfWeek && endTimeMinutes(slot.endTime) > nowMinutes);
}

/** Minutes since midnight for an "HH:mm" end time; unparseable values read as +Infinity (still open). */
function endTimeMinutes(time: string): number {
  const [hours, minutes] = String(time).split(':');
  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return Number.POSITIVE_INFINITY;
  }
  return h * 60 + m;
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

  const todayMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const results: ProviderDateOption[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let scanned = 0; scanned <= 366 && results.length < count; scanned += 1) {
    if (availableDays.has(cursor.getDay())) {
      // Offer today only while it still has a bookable window left. Once every window for today has
      // ended (e.g. it's 9pm and all slots closed hours ago), today has no open times and is dropped.
      const isToday = cursor.getTime() === todayMidnight;
      if (!isToday || hasRemainingWindow(weekly, cursor.getDay(), from)) {
        results.push({ display: toDisplay(cursor), iso: toLocalIso(cursor) });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}
