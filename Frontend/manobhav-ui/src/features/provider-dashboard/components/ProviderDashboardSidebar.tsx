import { CalendarCheck, CalendarDays, Clock, FileText, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../../../utils/theme';

const navItems = [
  { label: 'Dashboard overview', href: '/dashboard/provider', icon: LayoutDashboard },
  { label: 'Weekly report', href: '/dashboard/provider#weekly-report', icon: FileText },
  { label: 'My appointments', href: '/dashboard/provider#my-appointments', icon: CalendarCheck },
  { label: 'This week calendar', href: '/dashboard/provider#provider-calendar', icon: CalendarDays },
  { label: "Today's appointments", href: '/dashboard/provider#todays-appointments', icon: Clock },
];

export function ProviderDashboardSidebar() {
  const location = useLocation();

  return (
    <nav
      aria-label="Provider dashboard navigation"
      className="flex min-w-0 items-center gap-2 overflow-x-auto border-b px-3 py-3 lg:h-full lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
      style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
    >
      <Link
        aria-label="Manobhav provider home"
        className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg border"
        style={{ backgroundColor: theme.colors.sage.light, borderColor: theme.colors.sage.light }}
        title="Manobhav provider home"
        to="/dashboard/provider"
      >
        <img alt="" className="h-full w-full object-cover" src="/Manobhav_Logo.png" />
      </Link>

      <div className="flex min-w-max items-center gap-2 lg:mt-5 lg:min-w-0 lg:flex-col">
        {navItems.map((item) => {
          const Icon = item.icon;
          const itemHash = item.href.includes('#') ? `#${item.href.split('#')[1]}` : '';
          const isActive = itemHash ? location.hash === itemHash : location.hash === '';

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border transition hover:-translate-y-0.5 hover:shadow-sm"
              key={item.label}
              style={{
                backgroundColor: isActive ? theme.colors.sage.light : theme.colors.white,
                borderColor: isActive ? theme.colors.sage.DEFAULT : theme.colors.grey.DEFAULT,
                color: isActive ? theme.colors.sage.dark : theme.colors.grey.text,
              }}
              title={item.label}
              to={item.href}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={2.25} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
