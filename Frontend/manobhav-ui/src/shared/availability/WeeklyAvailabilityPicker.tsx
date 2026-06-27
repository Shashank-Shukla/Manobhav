import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { AvailabilitySlot } from './types';
import {
  DISPLAY_DAYS,
  cellKey,
  cellKeysToSlots,
  generateTimeRows,
  setCell,
  slotsToCellKeys,
  summarizeDay,
  toggleCell,
} from './availability';

interface WeeklyAvailabilityPickerProps {
  value: AvailabilitySlot[];
  onChange: (next: AvailabilitySlot[]) => void;
  error?: string;
  disabled?: boolean;
}

const SAGE = '#9CAF88';
const SAGE_HOVER = '#7A8C6A';

interface DragState {
  active: boolean;
  /** True once the drag has painted at least one cell (origin included). */
  painted: boolean;
  /** When painting, every entered cell is forced to this on/off value. */
  paintOn: boolean;
  /** The cell the pointer went down on, painted on the first mid-drag enter. */
  originKey: string | null;
}

export function WeeklyAvailabilityPicker({
  value,
  onChange,
  error,
  disabled = false,
}: WeeklyAvailabilityPickerProps) {
  const rows = useMemo(() => generateTimeRows(), []);
  const selected = useMemo(() => slotsToCellKeys(value, rows), [value, rows]);
  const drag = useRef<DragState>({ active: false, painted: false, paintOn: false, originKey: null });
  // Set when a drag painted cells; consumed by the trailing click (which fires
  // after pointerup) to suppress a double-toggle, then cleared on next down.
  const suppressNextClick = useRef(false);

  const commit = (nextCells: Set<string>) => {
    onChange(cellKeysToSlots(nextCells, rows));
  };

  // A plain click toggles a single cell, but only if the pointer did not paint
  // (a drag already committed its cells). This keeps click-to-toggle working on
  // its own — tests and keyboard activation rely on it — without double-toggling
  // after a drag gesture that ends with a synthetic click on the origin cell.
  const handleClick = (key: string) => {
    if (disabled) {
      return;
    }
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    commit(toggleCell(selected, key));
  };

  // Pointer-down only arms drag painting; it records the origin but does not
  // commit, so a simple click is handled solely by the trailing click event.
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    suppressNextClick.current = false;
    drag.current = { active: true, painted: false, paintOn: !selected.has(key), originKey: key };
  };

  const handlePointerEnter = (key: string) => {
    const state = drag.current;
    if (disabled || !state.active) {
      return;
    }
    // First mid-drag enter also paints the origin so a pure drag covers it.
    let next = selected;
    if (!state.painted && state.originKey) {
      next = setCell(next, state.originKey, state.paintOn);
    }
    state.painted = true;
    suppressNextClick.current = true;
    commit(setCell(next, key, state.paintOn));
  };

  const endDrag = () => {
    drag.current = { active: false, painted: false, paintOn: false, originKey: null };
  };

  return (
    <div className="w-full select-none" onPointerUp={endDrag} onPointerLeave={endDrag}>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => !disabled && onChange([])}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear all
        </button>
      </div>

      <div className="max-h-[26rem] overflow-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-gray-50 p-2 text-left font-medium text-gray-500">Time</th>
              {DISPLAY_DAYS.map((day) => (
                <th key={day.dayOfWeek} className="sticky top-0 z-10 bg-gray-50 p-2 font-medium text-gray-600">
                  <span className="hidden sm:inline">{day.label}</span>
                  <span className="sm:hidden">{day.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.index}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap bg-white p-1 pr-2 text-right font-normal text-gray-400"
                >
                  {row.start}
                </th>
                {DISPLAY_DAYS.map((day) => {
                  const key = cellKey(day.dayOfWeek, row.index);
                  const isOn = selected.has(key);
                  return (
                    <td key={key} className="p-0.5">
                      <button
                        type="button"
                        aria-pressed={isOn}
                        aria-label={`${day.label} ${row.start} to ${row.end}`}
                        disabled={disabled}
                        onClick={() => handleClick(key)}
                        onPointerDown={(event) => handlePointerDown(event, key)}
                        onPointerEnter={() => handlePointerEnter(key)}
                        className={getCellClassName(isOn, disabled)}
                        style={isOn ? { backgroundColor: SAGE } : undefined}
                        onMouseOver={(event) => applyHover(event, isOn, disabled, true)}
                        onMouseOut={(event) => applyHover(event, isOn, disabled, false)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

      <DaySummaries value={value} />
    </div>
  );
}

function getCellClassName(isOn: boolean, disabled: boolean): string {
  const base = 'h-6 w-full min-w-[2rem] rounded border transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed opacity-50 ${isOn ? 'border-transparent' : 'border-gray-200 bg-gray-50'}`;
  }
  if (isOn) {
    return `${base} cursor-pointer border-transparent text-white`;
  }
  return `${base} cursor-pointer border-gray-200 bg-white hover:bg-gray-100`;
}

function applyHover(
  event: { currentTarget: HTMLButtonElement },
  isOn: boolean,
  disabled: boolean,
  entering: boolean,
): void {
  if (disabled || !isOn) {
    return;
  }
  event.currentTarget.style.backgroundColor = entering ? SAGE_HOVER : SAGE;
}

function DaySummaries({ value }: { value: AvailabilitySlot[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {DISPLAY_DAYS.map((day) => {
        const ranges = summarizeDay(value, day.dayOfWeek);
        return (
          <li key={day.dayOfWeek} className="flex gap-2 text-xs text-gray-600">
            <span className="w-20 shrink-0 font-medium text-gray-700">{day.label}</span>
            <span className="text-gray-500">{ranges.length > 0 ? ranges.join(', ') : 'Unavailable'}</span>
          </li>
        );
      })}
    </ul>
  );
}
