import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../../utils/theme';
import { ProviderDashboardAside } from './components/ProviderDashboardAside';
import { ProviderDashboardSidebar } from './components/ProviderDashboardSidebar';
import { ProviderAppointmentsPage } from './components/pages/ProviderAppointmentsPage';
import { ProviderCalendarPage } from './components/pages/ProviderCalendarPage';
import { ProviderOverviewPage } from './components/pages/ProviderOverviewPage';
import { ProviderTodayPage } from './components/pages/ProviderTodayPage';
import { ProviderWeeklyReportPage } from './components/pages/ProviderWeeklyReportPage';
import { getProviderDashboard, type ProviderDashboard } from './providerDashboardApi';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ProviderDashboard };

export function DashboardProviderPage() {
  const { section } = useParams<{ section?: string }>();
  const state = useProviderDashboard();

  if (state.status !== 'ready') {
    return <ProviderDashboardStatus status={state.status} />;
  }

  return (
    <div
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[5rem_minmax(0,1fr)_23rem]"
      style={{ backgroundColor: theme.colors.smokeWhite, fontFamily: theme.font }}
    >
      <ProviderDashboardSidebar />
      <ProviderDashboardSection data={state.data} section={section} />
      <ProviderDashboardAside data={state.data} />
    </div>
  );
}

function ProviderDashboardSection({ data, section }: { data: ProviderDashboard; section?: string }) {
  switch (section) {
    case 'weekly-report':
      return <ProviderWeeklyReportPage data={data} />;
    case 'appointments':
      return <ProviderAppointmentsPage data={data} />;
    case 'calendar':
      return <ProviderCalendarPage data={data} />;
    case 'today':
      return <ProviderTodayPage data={data} />;
    default:
      return <ProviderOverviewPage data={data} />;
  }
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
