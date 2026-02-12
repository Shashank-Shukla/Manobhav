import { Suspense, lazy, useEffect, useState } from 'react';
import { NavBar } from './shared/layout/NavBar';
import { Footer } from './shared/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { JourneyPage } from './pages/JourneyPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { AppointmentPage } from './pages/AppointmentPage';
import { OnboardingProviderPage } from './pages/onboarding/OnboardingProviderPage';
import { OnboardingPatientPage } from './pages/onboarding/OnboardingPatientPage';
import { DashboardProviderPage } from './pages/dashboard/DashboardProviderPage';
import { DashboardPatientPage } from './pages/dashboard/DashboardPatientPage';
import { DashboardAdminPage } from './pages/dashboard/DashboardAdminPage';
import { ErrorPageGeneric } from './components/Error/ErrorPageGeneric';
import { ErrorPage50x } from './components/Error/ErrorPage50x';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { theme } from './utils/theme';

const MoodSearchBar = lazy(() => import('./shared/interactive/MoodSearchBar'));

export type View =
  | 'home'
  | 'login'
  | 'journey'
  | 'providers'
  | 'appointment'
  | 'onboarding'
  | 'onboarding-provider'
  | 'onboarding-patient'
  | 'dashboard'
  | 'dashboard-provider'
  | 'dashboard-patient'
  | 'dashboard-admin';
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
  const goAppointment = () => setCurrentView('appointment');
  const goOnboarding = () => setCurrentView('onboarding');

  const mainClass =
    currentView === 'journey' ||
    currentView === 'providers' ||
    currentView === 'appointment' ||
    currentView.startsWith('onboarding') ||
    currentView.startsWith('dashboard')
      ? 'min-h-screen'
      : 'min-h-screen pt-6';

  return (
    <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
      <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />

      {currentView !== 'journey' && currentView !== 'appointment' && (
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
            <ProvidersPage onBackHome={goHome} onBook={goAppointment} />
          </ErrorBoundary>
        )}
        {currentView === 'appointment' && (
          <ErrorBoundary
            context="route-appointment"
            fallback={<ErrorPageGeneric onHome={goHome} />}
          >
            <AppointmentPage />
          </ErrorBoundary>
        )}
        {currentView === 'onboarding' && (
          <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
            <h1 className="text-3xl font-bold">Choose your onboarding</h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" onClick={() => setCurrentView('onboarding-provider')}>
                Provider / Therapist
              </Button>
              <Button variant="secondary" onClick={() => setCurrentView('onboarding-patient')}>
                Patient / User
              </Button>
            </div>
          </div>
        )}
        {currentView === 'onboarding-provider' && (
          <OnboardingProviderPage onBack={goOnboarding} />
        )}
        {currentView === 'onboarding-patient' && (
          <OnboardingPatientPage onBack={goOnboarding} />
        )}
        {currentView === 'dashboard' && (
          <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
            <h1 className="text-3xl font-bold">Dashboard area</h1>
            <p className="text-gray-600">Select the dashboard you want to explore.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" onClick={() => setCurrentView('dashboard-provider')}>
                Provider dashboard
              </Button>
              <Button variant="secondary" onClick={() => setCurrentView('dashboard-patient')}>
                Patient dashboard
              </Button>
              <Button variant="outline" onClick={() => setCurrentView('dashboard-admin')}>
                Admin dashboard
              </Button>
            </div>
          </div>
        )}
        {currentView === 'dashboard-provider' && <DashboardProviderPage />}
        {currentView === 'dashboard-patient' && <DashboardPatientPage />}
        {currentView === 'dashboard-admin' && <DashboardAdminPage />}
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
