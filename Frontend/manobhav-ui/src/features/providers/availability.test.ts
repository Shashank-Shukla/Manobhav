import { describe, expect, it } from 'vitest';
import { computeNextDates, getAvailableDaysOfWeek } from './availability';
import type { WeeklyAvailabilitySlot } from './types';

const MON_AND_TUE: WeeklyAvailabilitySlot[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
  // A second window on Monday must not duplicate the weekday.
  { dayOfWeek: 1, startTime: '18:00', endTime: '20:00' },
];

describe('getAvailableDaysOfWeek', () => {
  it('returns distinct weekdays in ascending order', () => {
    expect(getAvailableDaysOfWeek(MON_AND_TUE)).toEqual([1, 2]);
  });

  it('ignores out-of-range weekdays', () => {
    expect(getAvailableDaysOfWeek([{ dayOfWeek: 9, startTime: '09:00', endTime: '10:00' }])).toEqual([]);
  });
});

describe('computeNextDates', () => {
  it('returns only dates on the provider\'s available weekdays, starting today', () => {
    // 2026-06-29 is a Monday.
    const from = new Date(2026, 5, 29);
    const dates = computeNextDates(MON_AND_TUE, 4, from);

    expect(dates.map((date) => date.iso)).toEqual(['2026-06-29', '2026-06-30', '2026-07-06', '2026-07-07']);
    expect(dates[0].display).toBe('Jun 29');
  });

  it('includes today when today is an available weekday', () => {
    const from = new Date(2026, 5, 30); // Tuesday
    const [first] = computeNextDates(MON_AND_TUE, 1, from);
    expect(first.iso).toBe('2026-06-30');
  });

  it('returns an empty list when there is no availability', () => {
    expect(computeNextDates([], 10, new Date(2026, 5, 29))).toEqual([]);
  });
});
