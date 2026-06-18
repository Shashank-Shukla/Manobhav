import { theme } from '../../utils/theme';
import { ProviderDashboardAside } from './components/ProviderDashboardAside';
import { ProviderDashboardMain } from './components/ProviderDashboardMain';
import { ProviderDashboardSidebar } from './components/ProviderDashboardSidebar';
import { providerDashboardData } from './providerDashboardData';

export function DashboardProviderPage() {
  return (
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[5rem_minmax(0,1fr)_23rem]"
      style={{ backgroundColor: theme.colors.smokeWhite, fontFamily: theme.font }}
    >
      <ProviderDashboardSidebar />
      <ProviderDashboardMain data={providerDashboardData} />
      <ProviderDashboardAside data={providerDashboardData} />
    </div>
  );
}

export default DashboardProviderPage;
