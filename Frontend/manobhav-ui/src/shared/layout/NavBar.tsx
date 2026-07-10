import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, LogOut, Menu, X } from 'lucide-react';
import { useAuthSession } from '../auth/useAuthSession';
import { logout, resolveDashboardPath, type AuthSession } from '../auth/cognitoAuth';
import { Logo } from '../Logo';
import { Button } from '../primitives/Button';
import { theme } from '../../utils/theme';

type NavAccent = 'sage' | 'dustyRose' | 'powderBlue';

type NavBarProps = {
  onNavigate: (path: string) => void;
  themeMode: 'light' | 'dark';
  variant?: 'glass' | 'flat';
  accent?: NavAccent;
};

type NavItem = {
  label: string;
  path: string;
};

type ThemeCssProperties = CSSProperties & {
  '--profile-button-focus-ring'?: string;
  '--profile-menu-item-active-bg'?: string;
  '--profile-menu-item-active-color'?: string;
  '--nav-accent'?: string;
};

type CloseProfileMenuOptions = {
  restoreFocus?: boolean;
};

export function NavBar({ onNavigate, themeMode, variant = 'glass', accent = 'sage' }: NavBarProps) {
  const location = useLocation();
  const { session } = useAuthSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accentColor = theme.colors[accent].DEFAULT;

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
          style={{ ...getNavStyle(variant, themeMode), ['--nav-accent']: accentColor } as ThemeCssProperties}
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
        accentColor={accentColor}
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
  accentColor,
  isAuthenticated,
  isOpen,
  items,
  onClose,
  onNavigate,
  session,
}: {
  accentColor: string;
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
    <div
      className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-32 px-6 md:hidden animate-in fade-in slide-in-from-top-10 duration-300"
      style={{ ['--nav-accent']: accentColor } as ThemeCssProperties}
    >
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const path = isAuthenticated ? resolveDashboardPath(session) : '/login';
  const handleClick = () => navigateFromMobile(path, onNavigate, onClose);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handleMouseDown = (event: globalThis.MouseEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [profileMenuOpen]);

  if (!isAuthenticated) {
    return (
      <Button variant={variant === 'mobile' ? 'primary' : 'nav'} onClick={handleClick}>
        Login
      </Button>
    );
  }

  return (
    <div ref={profileMenuRef} className={getProfileMenuWrapperClassName(variant)}>
      <button
        type="button"
        ref={profileButtonRef}
        aria-label="Open profile menu"
        aria-expanded={profileMenuOpen}
        aria-haspopup="menu"
        className={getProfileButtonClassName(variant)}
        style={getProfileButtonStyle()}
        onClick={() => setProfileMenuOpen((open) => !open)}
      >
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold shadow-sm"
          style={getProfileAvatarStyle()}
        >
          {getSessionInitial(session)}
        </span>
      </button>
      {profileMenuOpen && (
        <ProfileMenu
          dashboardPath={path}
          onClose={onClose}
          onNavigate={onNavigate}
          onRequestClose={(options) => {
            setProfileMenuOpen(false);
            if (options?.restoreFocus) {
              profileButtonRef.current?.focus();
            }
          }}
          variant={variant}
        />
      )}
    </div>
  );
}

function ProfileMenu({
  dashboardPath,
  onClose,
  onNavigate,
  onRequestClose,
  variant,
}: {
  dashboardPath: string;
  onClose?: () => void;
  onNavigate: (path: string) => void;
  onRequestClose: (options?: CloseProfileMenuOptions) => void;
  variant: 'desktop' | 'mobile';
}) {
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleNavigate = (path: string) => {
    onRequestClose();
    navigateFromMobile(path, onNavigate, onClose);
  };

  const menuItems: ProfileMenuItemModel[] = [
    { label: 'Dashboard', onClick: () => handleNavigate(dashboardPath) },
    {
      label: 'Sign out',
      tone: 'danger',
      icon: <LogOut size={16} aria-hidden="true" />,
      onClick: () => {
        onRequestClose();
        onClose?.();
        void logout();
      },
    },
  ];

  const focusMenuItem = (index: number) => {
    menuItemRefs.current[index]?.focus();
  };

  const handleMenuItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem((index + 1) % menuItems.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem((index - 1 + menuItems.length) % menuItems.length);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(menuItems.length - 1);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onRequestClose({ restoreFocus: true });
    }
  };

  return (
    <div role="menu" className={getProfileMenuClassName(variant)} style={getProfileMenuStyle()}>
      {menuItems.map((item, index) => (
        <ProfileMenuItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          onClick={item.onClick}
          onKeyDown={(event) => handleMenuItemKeyDown(event, index)}
          tone={item.tone}
          itemRef={(element) => {
            menuItemRefs.current[index] = element;
          }}
        />
      ))}
    </div>
  );
}

type ProfileMenuItemModel = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
};

function ProfileMenuItem({
  icon,
  itemRef,
  label,
  onClick,
  onKeyDown,
  tone = 'default',
}: {
  icon?: React.ReactNode;
  itemRef: (element: HTMLButtonElement | null) => void;
  label: string;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      ref={itemRef}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-[var(--profile-menu-item-active-bg)] hover:text-[var(--profile-menu-item-active-color)] focus:bg-[var(--profile-menu-item-active-bg)] focus:text-[var(--profile-menu-item-active-color)] focus:outline-none"
      style={getProfileMenuItemStyle(tone)}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {icon}
      {label}
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
      className="text-sm font-medium text-gray-600 hover:text-[color:var(--nav-accent,#9CAF88)] transition-colors relative group flex items-center justify-center gap-1 md:justify-start"
    >
      {item.label}
      <TalkToUsIcon iconSize={iconSize} label={item.label} />
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[color:var(--nav-accent,#9CAF88)] transition-all duration-300 group-hover:w-full" />
    </a>
  );
}

function TalkToUsIcon({ iconSize, label }: { iconSize: number; label: string }) {
  if (label !== 'Contact us') {
    return null;
  }

  return <ArrowUpRight size={iconSize} className="text-[color:var(--nav-accent,#9CAF88)]" />;
}

function MobileMenuIcon({ mobileOpen }: { mobileOpen: boolean }) {
  return mobileOpen ? <X size={24} /> : <Menu size={24} />;
}

function getNavItems(pathname: string): NavItem[] {
  return [
    getAboutNavItem(pathname),
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact us', path: '/contact' },
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

function getProfileButtonClassName(variant: 'desktop' | 'mobile'): string {
  const base =
    'inline-flex shrink-0 items-center justify-center rounded-full border p-1 shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--profile-button-focus-ring)]';

  return variant === 'mobile' ? `${base} mx-auto h-12 w-12` : `${base} h-10 w-10`;
}

function getProfileButtonStyle(): ThemeCssProperties {
  return {
    '--profile-button-focus-ring': theme.colors.sage.DEFAULT,
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  };
}

function getProfileAvatarStyle(): CSSProperties {
  return {
    backgroundColor: theme.colors.textMain,
    color: theme.colors.white,
  };
}

function getProfileMenuWrapperClassName(variant: 'desktop' | 'mobile'): string {
  return variant === 'mobile' ? 'relative mx-auto flex flex-col items-center' : 'relative';
}

function getProfileMenuClassName(variant: 'desktop' | 'mobile'): string {
  const base =
    'z-50 mt-3 min-w-40 rounded-lg border p-2 shadow-xl';

  return variant === 'mobile' ? `${base} static` : `${base} absolute right-0 top-full`;
}

function getProfileMenuStyle(): CSSProperties {
  return {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.grey.DEFAULT,
  };
}

function getProfileMenuItemStyle(tone: 'default' | 'danger'): ThemeCssProperties {
  if (tone === 'danger') {
    return {
      '--profile-menu-item-active-bg': theme.colors.dustyRose.light,
      '--profile-menu-item-active-color': theme.colors.dustyRose.dark,
      color: theme.colors.dustyRose.dark,
    };
  }

  return {
    '--profile-menu-item-active-bg': theme.colors.sage.light,
    '--profile-menu-item-active-color': theme.colors.textMain,
    color: theme.colors.textMain,
  };
}

function getSessionInitial(session: AuthSession | null): string {
  const source = session?.name?.trim() || session?.email?.trim() || '';
  const firstChar = source.charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(firstChar) ? firstChar : 'U';
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
