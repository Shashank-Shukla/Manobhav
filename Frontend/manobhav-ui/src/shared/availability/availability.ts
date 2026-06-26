import type { AvailabilitySlot } from './types';

/**
 * Pure, React-free helpers for the weekly availability picker.
 * The grid is modelled as a set of "cell keys" of the form `${dayOfWeek}:${rowIndex}`,
 * where `rowIndex` indexes into the generated time rows.
 */

export interface DayDescriptor {
  /** Canonical dayOfWeek value: 0=Sunday … 6=Saturday. */
  dayOfWeek: number;
  /** Full label, e.g. "Monday". */
  label: string;
  /** Short label for compact headers, e.g. "Mon". */
  short: string;
}

const DAY_DESCRIPTORS: readonly DayDescriptor[] = [
  { dayOfWeek: 0, label: 'Sunday', short: 'Sun' },
  { dayOfWeek: 1, label: 'Monday', short: 'Mon' },
  { dayOfWeek: 2, label: 'Tuesday', short: 'Tue' },
  { dayOfWeek: 3, label: 'Wednesday', short: 'Wed' },
  { dayOfWeek: 4, label: 'Thursday', short: 'Thu' },
  { dayOfWeek: 5, label: 'Friday', short: 'Fri' },
  { dayOfWeek: 6, label: 'Saturday', short: 'Sat' },
];

/** Display order: Monday → Sunday, while preserving canonical dayOfWeek values. */
export const DISPLAY_DAYS: readonly DayDescriptor[] = [
  DAY_DESCRIPTORS[1],
  DAY_DESCRIPTORS[2],
  DAY_DESCRIPTORS[3],
  DAY_DESCRIPTORS[4],
  DAY_DESCRIPTORS[5],
  DAY_DESCRIPTORS[6],
  DAY_DESCRIPTORS[0],
];

export const DEFAULT_START_TIME = '06:00';
export const DEFAULT_END_TIME = '22:00';
export const SLOT_MINUTES = 30;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export function getDayLabel(dayOfWeek: number): string {
  const descriptor = DAY_DESCRIPTORS.find((day) => day.dayOfWeek === dayOfWeek);
  return descriptor ? descriptor.label : `Day ${dayOfWeek}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** "HH:mm" → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return hours * MINUTES_PER_HOUR + minutes;
}

/** Minutes since midnight → "HH:mm" (clamped within a single day). */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, totalMinutes));
  const hours = Math.floor(clamped / MINUTES_PER_HOUR);
  const minutes = clamped % MINUTES_PER_HOUR;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export interface TimeRow {
  /** Index of the row within the generated range. */
  index: number;
  /** Inclusive start of the 30-minute window, e.g. "09:00". */
  start: string;
  /** Exclusive end of the 30-minute window, e.g. "09:30". */
  end: string;
}

/**
 * Generate 30-minute rows from `start` (inclusive) up to `end` (exclusive of the
 * final window's end, i.e. the last row ends exactly at `end`).
 */
export function generateTimeRows(
  start: string = DEFAULT_START_TIME,
  end: string = DEFAULT_END_TIME,
  stepMinutes: number = SLOT_MINUTES,
): TimeRow[] {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const rows: TimeRow[] = [];

  let index = 0;
  for (let cursor = startMinutes; cursor + stepMinutes <= endMinutes; cursor += stepMinutes) {
    rows.push({
      index,
      start: minutesToTime(cursor),
      end: minutesToTime(cursor + stepMinutes),
    });
    index += 1;
  }

  return rows;
}

export function cellKey(dayOfWeek: number, rowIndex: number): string {
  return `${dayOfWeek}:${rowIndex}`;
}

/**
 * Convert slots into the set of selected cell keys, given the time rows in use.
 * A slot selects every row whose window falls within [startTime, endTime).
 */
export function slotsToCellKeys(slots: AvailabilitySlot[], rows: TimeRow[] = generateTimeRows()): Set<string> {
  const cells = new Set<string>();

  for (const slot of slots) {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);

    for (const row of rows) {
      const rowStart = timeToMinutes(row.start);
      const rowEnd = timeToMinutes(row.end);
      if (rowStart >= slotStart && rowEnd <= slotEnd) {
        cells.add(cellKey(slot.dayOfWeek, row.index));
      }
    }
  }

  return cells;
}

function parseCellKey(key: string): { dayOfWeek: number; rowIndex: number } | null {
  const [dayPart, rowPart] = key.split(':');
  const dayOfWeek = Number.parseInt(dayPart, 10);
  const rowIndex = Number.parseInt(rowPart, 10);
  if (Number.isNaN(dayOfWeek) || Number.isNaN(rowIndex)) {
    return null;
  }
  return { dayOfWeek, rowIndex };
}

/**
 * Convert selected cell keys back into slots, coalescing contiguous rows within
 * the same day into a single slot and emitting separate slots across gaps.
 */
export function cellKeysToSlots(cells: Set<string>, rows: TimeRow[] = generateTimeRows()): AvailabilitySlot[] {
  const rowsByDay = new Map<number, number[]>();

  for (const key of cells) {
    const parsed = parseCellKey(key);
    if (!parsed || !rows[parsed.rowIndex]) {
      continue;
    }
    const list = rowsByDay.get(parsed.dayOfWeek) ?? [];
    list.push(parsed.rowIndex);
    rowsByDay.set(parsed.dayOfWeek, list);
  }

  const slots: AvailabilitySlot[] = [];
  const orderedDays = [...rowsByDay.keys()].sort((a, b) => a - b);

  for (const dayOfWeek of orderedDays) {
    const sortedRows = (rowsByDay.get(dayOfWeek) ?? []).sort((a, b) => a - b);
    let runStart = sortedRows[0];
    let runEnd = sortedRows[0];

    for (let i = 1; i <= sortedRows.length; i += 1) {
      const current = sortedRows[i];
      if (current === runEnd + 1) {
        runEnd = current;
        continue;
      }
      slots.push({
        dayOfWeek,
        startTime: rows[runStart].start,
        endTime: rows[runEnd].end,
      });
      runStart = current;
      runEnd = current;
    }
  }

  return slots;
}

export function formatRange(slot: AvailabilitySlot): string {
  return `${slot.startTime}–${slot.endTime}`;
}

/** Return the formatted ranges selected for a given day, in chronological order. */
export function summarizeDay(slots: AvailabilitySlot[], dayOfWeek: number): string[] {
  return slots
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    .map(formatRange);
}

/** Toggle a single cell key in a copy of the set, returning the new set. */
export function toggleCell(cells: Set<string>, key: string): Set<string> {
  const next = new Set(cells);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}

/** Force a cell key on or off in a copy of the set (used for drag painting). */
export function setCell(cells: Set<string>, key: string, on: boolean): Set<string> {
  const next = new Set(cells);
  if (on) {
    next.add(key);
  } else {
    next.delete(key);
  }
  return next;
}
