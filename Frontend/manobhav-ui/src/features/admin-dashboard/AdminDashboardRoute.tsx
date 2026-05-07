import { useMemo, useState } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { adminModules, isAdminModule } from './data';
import { AdminShell } from './components/AdminShell';
import {
  BookingsView,
  ClinicalRecordsView,
  HiringView,
  InsightsView,
  PatientsView,
  ProvidersView,
  SalaryView,
  TodayOpsView,
  UnknownModuleView,
} from './views';
import type { AdminModule } from './types';

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
  const activeModule = isAdminModule(module) ? module : module ? undefined : 'today';
  const moduleConfig = useMemo(
    () => adminModules.find((item) => item.id === (activeModule ?? 'today')) ?? adminModules[0],
    [activeModule],
  );

  return (
    <AdminShell
      activeModule={(activeModule ?? 'today') as AdminModule}
      moduleTitle={moduleConfig.label}
      moduleHelper={moduleConfig.helper}
      search={search}
      onSearchChange={setSearch}
    >
      {activeModule ? <AdminModuleContent module={activeModule} search={search} /> : <UnknownModuleView />}
    </AdminShell>
  );
}

function AdminModuleContent({ module, search }: { module: AdminModule; search: string }) {
  switch (module) {
    case 'today':
      return <TodayOpsView />;
    case 'patients':
      return <PatientsView search={search} />;
    case 'providers':
      return <ProvidersView search={search} />;
    case 'bookings':
      return <BookingsView search={search} />;
    case 'hiring':
      return <HiringView search={search} />;
    case 'salary':
      return <SalaryView search={search} />;
    case 'insights':
      return <InsightsView />;
    case 'clinical-records':
      return <ClinicalRecordsView search={search} />;
    default:
      return <UnknownModuleView />;
  }
}
