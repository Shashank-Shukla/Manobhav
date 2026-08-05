import { useEffect, useRef, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../../../utils/theme';

const navItems = [
  { label: 'Dashboard overview', href: '/dashboard/patient', icon: LayoutDashboard },
  { label: 'Upcoming appointments', href: '/dashboard/patient/appointments', icon: CalendarCheck },
  { label: 'Past appointments', href: '/dashboard/patient/past', icon: CalendarDays },
  { label: 'Intake summary', href: '/dashboard/patient/intake', icon: ClipboardList },
  { label: 'Consents', href: '/dashboard/patient/consents', icon: ShieldCheck },
];

const HOVER_EXPAND_DELAY_MS = 250;

export function PatientDashboardSidebar() {
  const location = useLocation();
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = pinned || hovering;

  useEffect(() => () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }
    hoverTimer.current = setTimeout(() => setHovering(true), HOVER_EXPAND_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHovering(false);
  };

  return (
    <div className="relative lg:h-full lg:w-20">
      <nav
        aria-label="Patient dashboard navigation"
        className={`relative flex min-w-0 items-center gap-2 overflow-x-auto border-b px-3 py-3 lg:absolute lg:inset-y-0 lg:left-0 lg:z-30 lg:flex-col lg:items-stretch lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-5 lg:transition-[width] lg:duration-200 lg:ease-out ${
          expanded ? 'lg:w-60 lg:shadow-xl' : 'lg:w-20'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
      >
        <div className="flex items-center gap-2 lg:self-start">
          <Link
            aria-label="Manobhav patient home"
            className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full shadow-sm"
            style={{ backgroundColor: theme.colors.sage.DEFAULT }}
            title="Manobhav patient home"
            to="/dashboard/patient"
          >
            <img alt="Manobhav" className="h-full w-full object-cover" src="/Manobhav_Logo.png" />
          </Link>
          {expanded && (
            <span className="hidden whitespace-nowrap text-xl font-bold tracking-tight text-slate-700 lg:inline">
              Manobhav
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-pressed={pinned}
          className="absolute right-0 top-[4.75rem] z-40 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border bg-white shadow-md transition hover:shadow-lg lg:flex"
          onClick={() => setPinned((current) => !current)}
          style={{ borderColor: theme.colors.sage.DEFAULT, color: theme.colors.sage.dark }}
        >
          {expanded ? <ChevronsLeft aria-hidden="true" size={16} /> : <ChevronsRight aria-hidden="true" size={16} />}
        </button>

        <div className="flex min-w-max items-center gap-2 lg:mt-8 lg:min-w-0 lg:flex-col lg:items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg border transition hover:-translate-y-0.5 hover:shadow-sm ${
                  expanded ? 'lg:w-full lg:justify-start lg:gap-3 lg:px-3' : 'lg:w-11 lg:justify-center'
                }`}
                key={item.label}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${theme.colors.sage.light}, ${theme.colors.powderBlue.light})`
                    : theme.colors.white,
                  borderColor: isActive ? theme.colors.sage.DEFAULT : theme.colors.grey.DEFAULT,
                  color: isActive ? theme.colors.sage.dark : theme.colors.grey.text,
                }}
                title={item.label}
                to={item.href}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={2.25} />
                {expanded && (
                  <span className="hidden truncate text-sm font-semibold lg:inline">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
