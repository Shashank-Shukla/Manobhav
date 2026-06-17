import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useAuthSession } from '../auth/useAuthSession';
import type { AuthSession } from '../auth/cognitoAuth';
import { Logo } from '../Logo';
import { Button } from '../primitives/Button';

type NavBarProps = {
  onNavigate: (path: string) => void;
  themeMode: 'light' | 'dark';
  variant?: 'glass' | 'flat';
};

type NavItem = {
  label: string;
  path: string;
};

export function NavBar({ onNavigate, themeMode, variant = 'glass' }: NavBarProps) {
  const location = useLocation();
  const { session } = useAuthSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = getNavItems(location.pathname);
  const isAuthenticated = session?.isAuthenticated === true;

  return (
    <>
      <nav
        className={getNavClassName(variant, scrolled)}
      >
        <div
          className="relative flex items-center justify-between px-6 py-3 shadow-lg border transition-all duration-300 w-full max-w-[1200px] gap-4"
          style={getNavStyle(variant, themeMode)}
        >
          <Logo onClick={() => onNavigate('/')} />

          <DesktopNavLinks items={navItems} onNavigate={onNavigate} />

          <div className="hidden md:flex items-center gap-4">
            <AuthNavAction isAuthenticated={isAuthenticated} onNavigate={onNavigate} session={session} variant="desktop" />
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
            <MobileMenuIcon mobileOpen={mobileOpen} />
          </button>
        </div>
      </nav>

      <MobileNavMenu
        isAuthenticated={isAuthenticated}
        isOpen={mobileOpen}
        items={navItems}
        onClose={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        session={session}
      />
    </>
  );
}

function DesktopNavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate: (path: string) => void }) {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center gap-4">
      {items.map((item) => (
        <NavAnchor key={item.label} iconSize={14} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function MobileNavMenu({
  isAuthenticated,
  isOpen,
  items,
  onClose,
  onNavigate,
  session,
}: {
  isAuthenticated: boolean;
  isOpen: boolean;
  items: NavItem[];
  onClose: () => void;
  onNavigate: (path: string) => void;
  session: AuthSession | null;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-32 px-6 md:hidden animate-in fade-in slide-in-from-top-10 duration-300">
      <div className="flex flex-col space-y-6 text-center">
        {items.map((item) => (
          <NavAnchor key={item.label} iconSize={18} item={item} onClose={onClose} onNavigate={onNavigate} />
        ))}
        <AuthNavAction
          isAuthenticated={isAuthenticated}
          onClose={onClose}
          onNavigate={onNavigate}
          session={session}
          variant="mobile"
        />
      </div>
    </div>
  );
}

function AuthNavAction({
  isAuthenticated,
  onClose,
  onNavigate,
  session,
  variant,
}: {
  isAuthenticated: boolean;
  onClose?: () => void;
  onNavigate: (path: string) => void;
  session: AuthSession | null;
  variant: 'desktop' | 'mobile';
}) {
  const path = isAuthenticated ? getDashboardPath(session) : '/login';
  const handleClick = () => navigateFromMobile(path, onNavigate, onClose);

  if (!isAuthenticated) {
    return (
      <Button variant={variant === 'mobile' ? 'primary' : 'nav'} onClick={handleClick}>
        Login
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Open profile"
      className={getProfileButtonClassName(variant)}
      onClick={handleClick}
    >
      <span
        aria-hidden="true"
        className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white shadow-sm"
      >
        U
      </span>
    </button>
  );
}

function NavAnchor({
  iconSize,
  item,
  onClose,
  onNavigate,
}: {
  iconSize: number;
  item: NavItem;
  onClose?: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <a
      href={item.path}
      onClick={(event) => handleNavClick(event, item.path, onNavigate, onClose)}
      className="text-sm font-medium text-gray-600 hover:text-[#9CAF88] transition-colors relative group flex items-center justify-center gap-1 md:justify-start"
    >
      {item.label}
      <TalkToUsIcon iconSize={iconSize} label={item.label} />
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#9CAF88] transition-all duration-300 group-hover:w-full" />
    </a>
  );
}

function TalkToUsIcon({ iconSize, label }: { iconSize: number; label: string }) {
  if (label !== 'Talk to Us') {
    return null;
  }

  return <ArrowUpRight size={iconSize} className="text-[#9CAF88]" />;
}

function MobileMenuIcon({ mobileOpen }: { mobileOpen: boolean }) {
  return mobileOpen ? <X size={24} /> : <Menu size={24} />;
}

function getNavItems(pathname: string): NavItem[] {
  return [
    getAboutNavItem(pathname),
    { label: 'FAQ', path: '/faq' },
    { label: 'Talk to Us', path: '/providers' },
  ];
}

function getAboutNavItem(pathname: string): NavItem {
  return pathname === '/about' ? { label: 'Home', path: '/' } : { label: 'About', path: '/about' };
}

function handleNavClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  path: string,
  onNavigate: (path: string) => void,
  onClose?: () => void,
): void {
  event.preventDefault();
  onClose?.();
  onNavigate(path);
}

function navigateFromMobile(path: string, onNavigate: (path: string) => void, onClose?: () => void): void {
  onClose?.();
  onNavigate(path);
}

function getDashboardPath(session: AuthSession | null): string {
  return hasProviderDashboardRole(session) ? '/dashboard/provider' : '/dashboard/patient';
}

function hasProviderDashboardRole(session: AuthSession | null): boolean {
  return Boolean(
    session?.groups.some((group) => {
      const normalized = group.trim().toLowerCase();
      return normalized === 'provider' || normalized === 'providerapplicant';
    }),
  );
}

function getProfileButtonClassName(variant: 'desktop' | 'mobile'): string {
  const base =
    'inline-flex shrink-0 items-center justify-center rounded-full border border-white/70 bg-white p-1 shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]/40';

  return variant === 'mobile' ? `${base} mx-auto h-12 w-12` : `${base} h-10 w-10`;
}

function getNavClassName(variant: 'glass' | 'flat', scrolled: boolean): string {
  if (variant === 'flat') {
    return 'relative w-full z-30 flex justify-center top-0 left-0 right-0';
  }

  return `fixed left-0 right-0 z-50 flex justify-center transition-all duration-500 ${scrolled ? 'top-2' : 'top-6'}`;
}

function getNavStyle(variant: 'glass' | 'flat', themeMode: 'light' | 'dark') {
  if (variant === 'flat') {
    return {
      background: '#ffffff',
      borderColor: '#E5E7EB',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: '100%',
      borderRadius: 0,
    };
  }

  return getGlassNavStyle(themeMode);
}

function getGlassNavStyle(themeMode: 'light' | 'dark') {
  return {
    background: getGlassBackground(themeMode),
    borderColor: themeMode === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.5)',
    boxShadow: themeMode === 'dark' ? '0 20px 60px rgba(0,0,0,0.25)' : '0 20px 60px rgba(0,0,0,0.06)',
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    width: 'clamp(340px, 95%, 1200px)',
    maxWidth: '75%',
    borderRadius: '9999px',
  };
}

function getGlassBackground(themeMode: 'light' | 'dark'): string {
  return themeMode === 'dark'
    ? 'linear-gradient(120deg, rgba(30,41,59,0.82), rgba(17,24,39,0.78))'
    : 'linear-gradient(120deg, rgba(230,237,232,0.85), rgba(255,255,255,0.75))';
}
