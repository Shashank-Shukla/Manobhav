import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { Button } from '../primitives/Button';

type NavBarProps = {
  onNavigate: (view: 'home' | 'login') => void;
};

export function NavBar({ onNavigate }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'About', target: 'about' },
    { label: 'Insights', target: 'insights' },
    { label: 'Talk to Us', target: 'talk-to-us' },
  ];

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateHomeAndScroll = (id: string) => {
    onNavigate('home');
    setTimeout(() => scrollToId(id), 100);
  };

  return (
    <>
      <nav className={`fixed left-0 right-0 z-50 flex justify-center transition-all duration-500 ${scrolled ? 'top-2' : 'top-6'}`}>
        <div
          className="relative flex items-center justify-between px-6 py-3 shadow-sm border border-white/40 transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            width: 'clamp(340px, 95%, 1200px)',
            maxWidth: '75%',
            borderRadius: '9999px',
          }}
        >
          <Logo onClick={() => onNavigate('home')} />

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={`#${item.target}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigateHomeAndScroll(item.target);
                }}
                className="text-sm font-medium text-gray-600 hover:text-[#9CAF88] transition-colors relative group flex items-center gap-1"
              >
                {item.label}
                {item.label === 'Talk to Us' && <ArrowUpRight size={14} className="text-[#9CAF88]" />}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#9CAF88] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <Button variant="nav" onClick={() => onNavigate('login')}>
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
                href={`#${item.target}`}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileOpen(false);
                  handleNavigateHomeAndScroll(item.target);
                }}
                className="text-xl font-medium text-gray-800 flex items-center justify-center gap-2"
              >
                {item.label}
                {item.label === 'Talk to Us' && <ArrowUpRight size={18} className="text-[#9CAF88]" />}
              </a>
            ))}
            <Button variant="primary" onClick={() => { setMobileOpen(false); onNavigate('login'); }}>
              Login
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
