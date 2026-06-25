import { useEffect, useState } from 'react';
import { ADMIN_ROSTER_PAGE_SIZE } from '../adminDashboardApi';
import type { AdminPagedResult } from '../types';

export type RosterStatus = 'loading' | 'ready' | 'error';

type RosterFetcher<T> = (page: number, search: string, signal?: AbortSignal) => Promise<AdminPagedResult<T>>;

/**
 * Server-paginated roster reader. `page` is zero-based to match MUI's TablePagination; the API layer
 * converts to the backend's one-based page. A search change resets the cursor to the first page
 * (handled during render so it does not trigger a cascading effect update).
 */
export function useRosterPage<T>(fetcher: RosterFetcher<T>, search: string) {
  const [page, setPage] = useState(0);
  const [trackedSearch, setTrackedSearch] = useState(search);
  const [data, setData] = useState<AdminPagedResult<T>>({
    items: [],
    page: 1,
    pageSize: ADMIN_ROSTER_PAGE_SIZE,
    total: 0,
  });
  const [status, setStatus] = useState<RosterStatus>('loading');

  if (search !== trackedSearch) {
    setTrackedSearch(search);
    setPage(0);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetcher(page, search, controller.signal)
      .then((response) => {
        setData(response);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStatus('error');
          void error;
        }
      });

    return () => controller.abort();
  }, [fetcher, page, search]);

  return { page, setPage, data, status };
}
