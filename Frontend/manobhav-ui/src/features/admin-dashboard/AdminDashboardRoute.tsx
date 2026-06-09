import { useMemo, useState, type ReactElement } from 'react';
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

const adminModuleViews: Record<AdminModule, (search: string) => ReactElement> = {
  today: () => <TodayOpsView />,
  patients: (search) => <PatientsView search={search} />,
  providers: (search) => <ProvidersView search={search} />,
  bookings: (search) => <BookingsView search={search} />,
  hiring: (search) => <HiringView search={search} />,
  salary: (search) => <SalaryView search={search} />,
  insights: () => <InsightsView />,
  'clinical-records': (search) => <ClinicalRecordsView search={search} />,
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
  return adminModuleViews[module]?.(search) ?? <UnknownModuleView />;
}
