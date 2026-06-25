import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminModules, isAdminModule } from './data';
import { emptyAdminDashboardData, getAdminDashboardData } from './adminDashboardApi';
import { AdminShell } from './components/AdminShell';
import {
  BookingsView,
  ClinicalRecordsView,
  HiringView,
  InsightsView,
  PatientsView,
  ProviderApplicationsView,
  ProvidersView,
  SalaryView,
  TodayOpsView,
  UnknownModuleView,
} from './views';
import type { AdminDashboardData, AdminModule } from './types';

const adminModuleViews: Record<AdminModule, (search: string, data: AdminDashboardData, params: AdminModuleViewParams) => ReactElement> = {
  today: (_search, data, params) => <TodayOpsView data={data} onOpenProviderApplications={params.onOpenProviderApplications} />,
  patients: (search) => <PatientsView search={search} />,
  providers: (search) => <ProvidersView search={search} />,
  'provider-applications': (search, _data, params) => (
    <ProviderApplicationsView applicationId={params.applicationId} search={search} />
  ),
  bookings: (search, data) => <BookingsView bookings={data.bookings} search={search} slots={data.slots} />,
  hiring: (search) => <HiringView search={search} />,
  salary: (search) => <SalaryView search={search} />,
  insights: () => <InsightsView />,
  'clinical-records': (search) => <ClinicalRecordsView search={search} />,
};

type AdminModuleViewParams = {
  applicationId?: string;
  onOpenProviderApplications: () => void;
};

export function AdminDashboardRoute() {
  return (
    <ChakraProvider>
      <AdminDashboardContent />
    </ChakraProvider>
  );
}

function AdminDashboardContent() {
  const { module } = useParams();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<AdminDashboardData>(emptyAdminDashboardData);
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const activeModule = isAdminModule(module) ? module : module ? undefined : 'today';
  const moduleConfig = useMemo(
    () => adminModules.find((item) => item.id === (activeModule ?? 'today')) ?? adminModules[0],
    [activeModule],
  );

  useEffect(() => {
    const controller = new AbortController();
    getAdminDashboardData(controller.signal)
      .then((response) => {
        setData(response);
        setDataStatus('ready');
      })
      .catch(() => {
        setData(emptyAdminDashboardData);
        setDataStatus('error');
      });

    return () => controller.abort();
  }, []);

  return (
    <AdminShell
      activeModule={(activeModule ?? 'today') as AdminModule}
      moduleTitle={moduleConfig.label}
      moduleHelper={moduleConfig.helper}
      search={search}
      onSearchChange={setSearch}
    >
      <AdminDataStatus status={dataStatus} />
      {activeModule ? <AdminModuleContent data={data} module={activeModule} search={search} /> : <UnknownModuleView />}
    </AdminShell>
  );
}

function AdminModuleContent({ data, module, search }: { data: AdminDashboardData; module: AdminModule; search: string }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  return adminModuleViews[module]?.(search, data, {
    applicationId,
    onOpenProviderApplications: () => navigate('/dashboard/admin/provider-applications'),
  }) ?? <UnknownModuleView />;
}

function AdminDataStatus({ status }: { status: 'loading' | 'ready' | 'error' }) {
  if (status === 'ready') {
    return null;
  }

  const message = status === 'loading'
    ? 'Loading protected admin data...'
    : 'Unable to load protected admin data.';
  const className = status === 'loading'
    ? 'mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800'
    : 'mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800';
  return <div className={className}>{message}</div>;
}
