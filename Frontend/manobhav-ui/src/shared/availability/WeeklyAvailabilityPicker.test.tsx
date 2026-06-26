import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyAvailabilityPicker } from './WeeklyAvailabilityPicker';
import type { AvailabilitySlot } from './types';

function lastCall(onChange: ReturnType<typeof vi.fn>): AvailabilitySlot[] {
  expect(onChange).toHaveBeenCalled();
  return onChange.mock.calls[onChange.mock.calls.length - 1][0] as AvailabilitySlot[];
}

/**
 * Stateful host that mirrors how a real parent wires the controlled picker:
 * it feeds each onChange result straight back into `value`. The provided spy
 * still observes every emitted value so assertions can use its last call.
 */
function ControlledHost({
  initial = [],
  spy,
}: {
  initial?: AvailabilitySlot[];
  spy: (next: AvailabilitySlot[]) => void;
}) {
  const [value, setValue] = useState<AvailabilitySlot[]>(initial);
  return (
    <WeeklyAvailabilityPicker
      value={value}
      onChange={(next) => {
        spy(next);
        setValue(next);
      }}
    />
  );
}

describe('WeeklyAvailabilityPicker', () => {
  it('coalesces three contiguous cells in a day into one slot', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost spy={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Monday 09:00 to 09:30' }));
    await user.click(screen.getByRole('button', { name: 'Monday 09:30 to 10:00' }));
    await user.click(screen.getByRole('button', { name: 'Monday 10:00 to 10:30' }));

    expect(lastCall(onChange)).toEqual([{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }]);
  });

  it('produces two separate slots for non-contiguous cells', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledHost spy={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Tuesday 09:00 to 09:30' }));
    await user.click(screen.getByRole('button', { name: 'Tuesday 11:00 to 11:30' }));

    expect(lastCall(onChange)).toEqual([
      { dayOfWeek: 2, startTime: '09:00', endTime: '09:30' },
      { dayOfWeek: 2, startTime: '11:00', endTime: '11:30' },
    ]);
  });

  it('marks the right cells aria-pressed when given an initial value', () => {
    const value: AvailabilitySlot[] = [{ dayOfWeek: 3, startTime: '09:00', endTime: '10:00' }];
    render(<WeeklyAvailabilityPicker value={value} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Wednesday 09:00 to 09:30' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wednesday 09:30 to 10:00' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wednesday 10:00 to 10:30' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with an empty array when Clear all is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: AvailabilitySlot[] = [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }];
    render(<WeeklyAvailabilityPicker value={value} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /clear all/i }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('deselects a cell when an already-selected cell is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: AvailabilitySlot[] = [{ dayOfWeek: 5, startTime: '09:00', endTime: '09:30' }];
    render(<WeeklyAvailabilityPicker value={value} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Friday 09:00 to 09:30' }));

    expect(lastCall(onChange)).toEqual([]);
  });
});
