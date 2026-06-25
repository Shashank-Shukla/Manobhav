const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
const ariaFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Local clock time for an appointment, e.g. "10:00 AM". */
export function formatTime(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? timeFormatter.format(parsed) : '';
}

/** Short weekday label for a calendar day, e.g. "Mon". */
export function formatWeekday(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? weekdayFormatter.format(parsed) : '';
}

/** Day-of-month label for a calendar day, e.g. "18". */
export function formatDayOfMonth(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? dayFormatter.format(parsed) : '';
}

/** Accessible description for a calendar day, e.g. "Today, Thursday, Jun 18". */
export function formatCalendarAria(utc: string, isToday: boolean): string {
  const parsed = parseDate(utc);
  if (!parsed) {
    return '';
  }

  const label = ariaFormatter.format(parsed);
  return isToday ? `Today, ${label}` : label;
}
