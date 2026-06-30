import { useCallback, useRef, useState } from 'react';

/**
 * Multi-row selection model for the admin roster tables.
 *
 * Selection mirrors familiar list-view conventions and is driven entirely by row clicks
 * (no checkboxes/radios):
 *  - Plain click selects only the clicked row and resets the range anchor to it.
 *  - Ctrl/Cmd-click toggles the clicked row without disturbing the rest of the selection.
 *  - Shift-click selects the contiguous range between the anchor and the clicked row,
 *    using the supplied `orderedIds` (current displayed order) for the span.
 *
 * `orderedIds` should be the ids of the rows currently rendered, in display order, so range
 * selection follows what the user sees. The hook does not clear itself on data changes; callers
 * own that lifecycle (e.g. clear on page/search change) via the returned `clear()`.
 */
export type RowSelection = {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  handleRowClick: (id: string, event: RowSelectionEvent) => void;
  clear: () => void;
  count: number;
};

/** Minimal modifier-key surface we read from the triggering event (mouse or keyboard). */
export type RowSelectionEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function useRowSelection(orderedIds: string[]): RowSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // Anchor for shift-range selection; survives re-renders without forcing one.
  const anchorIdRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    setSelectedIds((current) => (current.size === 0 ? current : new Set()));
    anchorIdRef.current = null;
  }, []);

  const handleRowClick = useCallback(
    (id: string, event: RowSelectionEvent) => {
      const isRangeSelect = event.shiftKey;
      const isToggleSelect = event.ctrlKey || event.metaKey;

      if (isRangeSelect && anchorIdRef.current) {
        const anchorIndex = orderedIds.indexOf(anchorIdRef.current);
        const targetIndex = orderedIds.indexOf(id);
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          setSelectedIds(new Set(orderedIds.slice(start, end + 1)));
          // Anchor intentionally stays put so the user can grow/shrink the same range.
          return;
        }
      }

      if (isToggleSelect) {
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        anchorIdRef.current = id;
        return;
      }

      // Plain click: select only this row. Re-clicking the same single row keeps it selected.
      setSelectedIds(new Set([id]));
      anchorIdRef.current = id;
    },
    [orderedIds],
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return { selectedIds, isSelected, handleRowClick, clear, count: selectedIds.size };
}
