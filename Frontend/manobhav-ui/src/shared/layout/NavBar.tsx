import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { Button } from '../primitives/Button';

type NavBarProps = {
  onNavigate: (path: string) => void;
  themeMode: 'light' | 'dark';
  variant?: 'glass' | 'flat';
};

export function NavBar({ onNavigate, themeMode, variant = 'glass' }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'About', path: '/about', type: 'route' as const },
    { label: 'Insights', target: 'insights', type: 'scroll' as const },
    { label: 'Talk to Us', path: '/providers', type: 'route' as const },
  ];

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateHomeAndScroll = (id: string) => {
    onNavigate('/');
    setTimeout(() => scrollToId(id), 100);
  };

  return (
    <>
      <nav
        className={
          variant === 'glass'
            ? `fixed left-0 right-0 z-50 flex justify-center transition-all duration-500 ${scrolled ? 'top-2' : 'top-6'}`
            : 'relative w-full z-30 flex justify-center top-0 left-0 right-0'
        }
      >
        <div
          className="relative flex items-center justify-between px-6 py-3 shadow-lg border transition-all duration-300 w-full max-w-[1200px] gap-4"
          style={
            variant === 'glass'
              ? {
                  background:
                    themeMode === 'dark'
                      ? 'linear-gradient(120deg, rgba(30,41,59,0.82), rgba(17,24,39,0.78))'
                      : 'linear-gradient(120deg, rgba(230,237,232,0.85), rgba(255,255,255,0.75))',
                  borderColor: themeMode === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.5)',
                  boxShadow: themeMode === 'dark' ? '0 20px 60px rgba(0,0,0,0.25)' : '0 20px 60px rgba(0,0,0,0.06)',
                  backdropFilter: 'blur(18px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                  width: 'clamp(340px, 95%, 1200px)',
                  maxWidth: '75%',
                  borderRadius: '9999px',
                }
              : {
                  background: '#ffffff',
                  borderColor: '#E5E7EB',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  width: '100%',
                  maxWidth: '100%',
                  borderRadius: 0,
                }
          }
        >
          <Logo onClick={() => onNavigate('/')} />

          <div className="hidden md:flex flex-1 items-center justify-center gap-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.type === 'scroll' ? `#${item.target}` : item.path}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.type === 'route') {
                    onNavigate(item.path);
                  } else {
                    handleNavigateHomeAndScroll(item.target);
                  }
                }}
                className="text-sm font-medium text-gray-600 hover:text-[#9CAF88] transition-colors relative group flex items-center gap-1"
              >
                {item.label}
                {item.label === 'Talk to Us' && <ArrowUpRight size={14} className="text-[#9CAF88]" />}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#9CAF88] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="nav" onClick={() => onNavigate('/login')}>
              Login
            </Button>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-32 px-6 md:hidden animate-in fade-in slide-in-from-top-10 duration-300">
          <div className="flex flex-col space-y-6 text-center">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.type === 'scroll' ? `#${item.target}` : item.path}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileOpen(false);
                  if (item.type === 'route') {
                    onNavigate(item.path);
                  } else {
                    handleNavigateHomeAndScroll(item.target);
                  }
                }}
                className="text-xl font-medium text-gray-800 flex items-center justify-center gap-2"
              >
                {item.label}
                {item.label === 'Talk to Us' && <ArrowUpRight size={18} className="text-[#9CAF88]" />}
              </a>
            ))}
            <Button variant="primary" onClick={() => { setMobileOpen(false); onNavigate('/login'); }}>
              Login
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
