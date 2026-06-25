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
  const [navExpanded, setNavExpanded] = useState(false);

  if (state.status !== 'ready') {
    return <ProviderDashboardStatus status={state.status} />;
  }

  return (
    <div
      className={`grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-300 ${
        navExpanded
          ? 'lg:grid-cols-[15rem_minmax(0,1fr)_23rem]'
          : 'lg:grid-cols-[5rem_minmax(0,1fr)_23rem]'
      }`}
      style={{ backgroundColor: theme.colors.smokeWhite, fontFamily: theme.font }}
    >
      <ProviderDashboardSidebar onExpandedChange={setNavExpanded} />
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
