import { useEffect, useState } from 'react';
import { NavBar } from './components/layout/NavBar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MoodSearchBar } from './components/interactive/MoodSearchBar';
import { theme } from './utils/theme';

export type View = 'home' | 'login';
type ThemeMode = 'light' | 'dark';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('manobhav-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('manobhav-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
      <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />

      <NavBar onNavigate={setCurrentView} themeMode={themeMode} onToggleTheme={toggleTheme} />

      <main className="min-h-screen pt-6">
        {currentView === 'home' && <HomePage />}
        {currentView === 'login' && <LoginPage onBack={() => setCurrentView('home')} />}
      </main>

      {currentView === 'home' && (
        <>
          <MoodSearchBar />
          <Footer />
        </>
      )}
      <style>{`
        :root { font-family: ${theme.font}; }
      `}</style>
    </div>
  );
}
