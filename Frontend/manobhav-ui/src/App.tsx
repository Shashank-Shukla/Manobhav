import { Suspense, lazy, useEffect, useState } from 'react';
import { NavBar } from './shared/layout/NavBar';
import { Footer } from './shared/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ErrorPageGeneric } from './component/Error/ErrorPageGeneric';
import { ErrorPage50x } from './component/Error/ErrorPage50x';
import { ErrorBoundary } from './component/common/ErrorBoundary';
import { theme } from './utils/theme';

const MoodSearchBar = lazy(() => import('./shared/interactive/MoodSearchBar'));

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

  const goHome = () => setCurrentView('home');

  return (
    <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
      <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />

      <NavBar onNavigate={setCurrentView} themeMode={themeMode} onToggleTheme={toggleTheme} />

      <main className="min-h-screen pt-6">
        {currentView === 'home' && (
          <ErrorBoundary
            context="route-home"
            fallback={<ErrorPageGeneric onHome={goHome} />}
          >
            <HomePage />
          </ErrorBoundary>
        )}
        {currentView === 'login' && (
          <ErrorBoundary
            context="route-login"
            fallback={<ErrorPage50x onHome={goHome} />}
          >
            <LoginPage onBack={() => setCurrentView('home')} />
          </ErrorBoundary>
        )}
      </main>

      {currentView === 'home' && (
        <>
          <Suspense fallback={null}>
            <MoodSearchBar />
          </Suspense>
          <Footer />
        </>
      )}
      <style>{`
        :root { font-family: ${theme.font}; }
      `}</style>
    </div>
  );
}
