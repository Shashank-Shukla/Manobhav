import { useEffect, useRef, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  FileText,
  LayoutDashboard,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { theme } from '../../../utils/theme';

const navItems = [
  { label: 'Dashboard overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Weekly report', href: '/dashboard#weekly-report', icon: FileText },
  { label: 'My appointments', href: '/dashboard#my-appointments', icon: CalendarCheck },
  { label: 'This week calendar', href: '/dashboard#provider-calendar', icon: CalendarDays },
  { label: "Today's appointments", href: '/dashboard#todays-appointments', icon: Clock },
];

const HOVER_EXPAND_DELAY_MS = 1000;

type ProviderDashboardSidebarProps = {
  onExpandedChange?: (expanded: boolean) => void;
};

export function ProviderDashboardSidebar({ onExpandedChange }: ProviderDashboardSidebarProps) {
  const location = useLocation();
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = pinned || hovering;

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

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
    <nav
      aria-label="Provider dashboard navigation"
      className="relative flex min-w-0 items-center gap-2 overflow-x-auto border-b px-3 py-3 lg:h-full lg:flex-col lg:items-stretch lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ backgroundColor: theme.colors.white, borderColor: theme.colors.grey.DEFAULT }}
    >
      <Link
        aria-label="Manobhav provider home"
        className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full shadow-sm lg:self-start"
        style={{ backgroundColor: theme.colors.sage.DEFAULT }}
        title="Manobhav provider home"
        to="/dashboard"
      >
        <img alt="Manobhav" className="h-full w-full object-cover" src="/Manobhav_Logo.png" />
      </Link>

      <button
        type="button"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-pressed={pinned}
        className="absolute left-[3.75rem] top-[4.25rem] z-10 hidden h-7 w-7 translate-x-[-50%] items-center justify-center rounded-full border bg-white shadow-md transition hover:shadow-lg lg:flex"
        onClick={() => setPinned((current) => !current)}
        style={{ borderColor: theme.colors.sage.DEFAULT, color: theme.colors.sage.dark }}
      >
        {expanded ? <ChevronsLeft aria-hidden="true" size={16} /> : <ChevronsRight aria-hidden="true" size={16} />}
      </button>

      <div className="flex min-w-max items-center gap-2 lg:mt-8 lg:min-w-0 lg:flex-col lg:items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const itemHash = item.href.includes('#') ? `#${item.href.split('#')[1]}` : '';
          const isActive = itemHash ? location.hash === itemHash : location.hash === '';

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
  );
}
