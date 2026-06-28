import { useEffect, useState } from 'react';
import { theme } from '../../utils/theme';
import { ProviderDashboardAside } from './components/ProviderDashboardAside';
import { ProviderDashboardMain } from './components/ProviderDashboardMain';
import { ProviderDashboardSidebar } from './components/ProviderDashboardSidebar';
import { getProviderDashboard, type ProviderDashboard } from './providerDashboardApi';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ProviderDashboard };

export function DashboardProviderPage() {
  const state = useProviderDashboard();

  if (state.status !== 'ready') {
    return <ProviderDashboardStatus status={state.status} />;
  }

  // The sidebar column is a fixed 5rem; expanding the sidebar overlays the content rather than
  // resizing the grid, so opening/closing it never reflows the whole dashboard (that grid-track
  // animation was the lag). Only the sidebar element animates, which stays smooth.
  return (
    <div
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[5rem_minmax(0,1fr)_23rem]"
      style={{ backgroundColor: theme.colors.smokeWhite, fontFamily: theme.font }}
    >
      <ProviderDashboardSidebar />
      <ProviderDashboardMain data={state.data} />
      <ProviderDashboardAside data={state.data} />
    </div>
  );
}

function useProviderDashboard(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getProviderDashboard(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' });
          void error;
        }
      });

    return () => controller.abort();
  }, []);

  return state;
}

function ProviderDashboardStatus({ status }: { status: 'loading' | 'error' }) {
  const message = status === 'loading'
    ? 'Loading your dashboard…'
    : "We couldn't load your dashboard. Please refresh to try again.";

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 text-center text-sm font-semibold"
      role="status"
      style={{ backgroundColor: theme.colors.smokeWhite, color: theme.colors.grey.text, fontFamily: theme.font }}
    >
      {message}
    </div>
  );
}

export default DashboardProviderPage;
