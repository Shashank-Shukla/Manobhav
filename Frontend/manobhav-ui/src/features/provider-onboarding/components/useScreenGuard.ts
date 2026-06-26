import { useEffect } from 'react';

/**
 * Attaches document-level listeners that deter casual copying/inspection of a sensitive screen:
 * right-click is suppressed and the common DevTools shortcuts are swallowed.
 *
 * This is a UX deterrent only, NOT real protection — DevTools cannot be truly blocked client-side
 * (e.g. it can be opened from the browser menu). Never rely on this for security.
 */
export function useScreenGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBlockedShortcut(event)) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}

/** F12, Ctrl/Cmd+Shift+I/J/C (DevTools panels), and Ctrl/Cmd+U (view source). */
function isBlockedShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'F12') {
    return true;
  }

  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier) {
    return false;
  }

  const key = event.key.toUpperCase();
  if (event.shiftKey && (key === 'I' || key === 'J' || key === 'C')) {
    return true;
  }

  return key === 'U';
}
