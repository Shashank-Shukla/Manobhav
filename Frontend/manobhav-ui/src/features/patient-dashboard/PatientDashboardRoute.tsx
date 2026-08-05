import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../../utils/theme';
import { PatientDashboardAside } from './components/PatientDashboardAside';
import { PatientDashboardSidebar } from './components/PatientDashboardSidebar';
import { PatientAppointmentsPage } from './components/pages/PatientAppointmentsPage';
import { PatientConsentsPage } from './components/pages/PatientConsentsPage';
import { PatientIntakePage } from './components/pages/PatientIntakePage';
import { PatientOverviewPage } from './components/pages/PatientOverviewPage';
import { PatientPastAppointmentsPage } from './components/pages/PatientPastAppointmentsPage';
import { getPatientDashboard, type PatientDashboard } from './patientApi';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: PatientDashboard };

export function PatientDashboardRoute() {
  const { section } = useParams<{ section?: string }>();
  const state = usePatientDashboard();

  if (state.status !== 'ready') {
    return <PatientDashboardStatus status={state.status} />;
  }

  return (
    <div
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[5rem_minmax(0,1fr)_23rem]"
      style={{ backgroundColor: theme.colors.smokeWhite, fontFamily: theme.font }}
    >
      <PatientDashboardSidebar />
      <PatientDashboardSection data={state.data} section={section} />
      <PatientDashboardAside data={state.data} />
    </div>
  );
}

function PatientDashboardSection({ data, section }: { data: PatientDashboard; section?: string }) {
  switch (section) {
    case 'appointments':
      return <PatientAppointmentsPage data={data} />;
    case 'past':
      return <PatientPastAppointmentsPage data={data} />;
    case 'intake':
      return <PatientIntakePage data={data} />;
    case 'consents':
      return <PatientConsentsPage data={data} />;
    default:
      return <PatientOverviewPage data={data} />;
  }
}

function usePatientDashboard(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getPatientDashboard(controller.signal)
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

function PatientDashboardStatus({ status }: { status: 'loading' | 'error' }) {
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

export default PatientDashboardRoute;
