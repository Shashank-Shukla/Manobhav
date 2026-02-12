import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

type ThemeMode = 'light' | 'dark';

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('manobhav-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('manobhav-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <BrowserRouter>
      <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
        <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />
        <AppRoutes themeMode={themeMode} onToggleTheme={toggleTheme} />
        <style>{`:root { font-family: ${theme.font}; }`}</style>
      </div>
    </BrowserRouter>
  );
}

function AppRoutes({ themeMode, onToggleTheme }: { themeMode: ThemeMode; onToggleTheme: () => void }) {
  const hideNavPaths = useMemo(() => ['/journey', '/appointment'], []);
  const hideFooterPaths = useMemo(() => ['/journey', '/appointment'], []);
  const locationPath = window.location.pathname;

  return (
    <>
      {!hideNavPaths.includes(locationPath) && (
        <NavBar
          onNavigate={(path) => (window.location.pathname === path ? null : (window.location.href = path))}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary context="route-home" fallback={<ErrorPageGeneric onHome={() => (window.location.href = '/')} />}>
              <HomePage onStartJourney={() => (window.location.href = '/journey')} />
              <Suspense fallback={null}>
                <MoodSearchBar onReachHuman={() => (window.location.href = '/journey')} />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/login"
          element={
            <ErrorBoundary context="route-login" fallback={<ErrorPage50x onHome={() => (window.location.href = '/')} />}>
              <LoginPage onBack={() => (window.location.href = '/')} />
            </ErrorBoundary>
          }
        />
        <Route
          path="/journey"
          element={
            <ErrorBoundary context="route-journey" fallback={<ErrorPageGeneric onHome={() => (window.location.href = '/')} />}>
              <JourneyPage onBackHome={() => (window.location.href = '/')} onFinish={() => (window.location.href = '/providers')} />
            </ErrorBoundary>
          }
        />
        <Route
          path="/providers"
          element={
            <ErrorBoundary context="route-providers" fallback={<ErrorPageGeneric onHome={() => (window.location.href = '/')} />}>
              <ProvidersPage onBackHome={() => (window.location.href = '/')} onBook={() => (window.location.href = '/appointment')} />
            </ErrorBoundary>
          }
        />
        <Route
          path="/appointment"
          element={
            <ErrorBoundary context="route-appointment" fallback={<ErrorPageGeneric onHome={() => (window.location.href = '/')} />}>
              <AppointmentPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/onboarding"
          element={
            <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
              <h1 className="text-3xl font-bold">Choose your onboarding</h1>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" onClick={() => (window.location.href = '/onboarding/provider')}>
                  Provider / Therapist
                </Button>
                <Button variant="secondary" onClick={() => (window.location.href = '/onboarding/patient')}>
                  Patient / User
                </Button>
              </div>
            </div>
          }
        />
        <Route path="/onboarding/provider" element={<OnboardingProviderPage onBack={() => (window.location.href = '/onboarding')} />} />
        <Route path="/onboarding/patient" element={<OnboardingPatientPage onBack={() => (window.location.href = '/onboarding')} />} />

        <Route
          path="/dashboard"
          element={
            <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
              <h1 className="text-3xl font-bold">Dashboard area</h1>
              <p className="text-gray-600">Select the dashboard you want to explore.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" onClick={() => (window.location.href = '/dashboard/provider')}>
                  Provider dashboard
                </Button>
                <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/patient')}>
                  Patient dashboard
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = '/dashboard/admin')}>
                  Admin dashboard
                </Button>
              </div>
            </div>
          }
        />
        <Route path="/dashboard/provider" element={<DashboardProviderPage />} />
        <Route path="/dashboard/patient" element={<DashboardPatientPage />} />
        <Route path="/dashboard/admin" element={<DashboardAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideFooterPaths.includes(locationPath) && <Footer />}
    </>
  );
}
