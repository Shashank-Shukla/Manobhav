import { Suspense, lazy, useEffect, useState } from 'react';
import { NavBar } from './shared/layout/NavBar';
import { Footer } from './shared/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { JourneyPage } from './pages/JourneyPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { ErrorPageGeneric } from './components/Error/ErrorPageGeneric';
import { ErrorPage50x } from './components/Error/ErrorPage50x';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { theme } from './utils/theme';

const MoodSearchBar = lazy(() => import('./shared/interactive/MoodSearchBar'));

export type View = 'home' | 'login' | 'journey' | 'providers';
type ThemeMode = 'light' | 'dark';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('manobhav-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light'; // default to light mode
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('manobhav-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));

  const goHome = () => setCurrentView('home');
  const goJourney = () => setCurrentView('journey');
  const goProviders = () => setCurrentView('providers');

  const mainClass = currentView === 'journey' || currentView === 'providers' ? 'min-h-screen' : 'min-h-screen pt-6';

  return (
    <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
      <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />

      {currentView !== 'journey' && (
        <NavBar onNavigate={setCurrentView} themeMode={themeMode} onToggleTheme={toggleTheme} />
      )}

      <main className={mainClass}>
        {currentView === 'home' && (
          <ErrorBoundary
            context="route-home"
            fallback={<ErrorPageGeneric onHome={goHome} />}
          >
            <HomePage onStartJourney={goJourney} />
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
        {currentView === 'journey' && (
          <ErrorBoundary
            context="route-journey"
            fallback={<ErrorPageGeneric onHome={goHome} />}
          >
            <JourneyPage onBackHome={goHome} onFinish={goProviders} />
          </ErrorBoundary>
        )}
        {currentView === 'providers' && (
          <ErrorBoundary
            context="route-providers"
            fallback={<ErrorPageGeneric onHome={goHome} />}
          >
            <ProvidersPage onBackHome={goHome} />
          </ErrorBoundary>
        )}
      </main>

      {currentView === 'home' && (
        <>
          <Suspense fallback={null}>
            <MoodSearchBar onReachHuman={goJourney} />
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
