import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { NavBar } from './shared/layout/NavBar';
import { Footer } from './shared/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { JourneyPage } from './pages/JourneyPage';
const ProvidersPage = lazy(() => import('./pages/ProvidersPage').then((m) => ({ default: m.ProvidersPage || m.default })));
const AppointmentPage = lazy(() => import('./pages/AppointmentPage').then((m) => ({ default: m.AppointmentPage || m.default })));
const OnboardingProviderPage = lazy(() => import('./pages/onboarding/OnboardingProviderPage').then((m) => ({ default: m.OnboardingProviderPage || m.default })));
const OnboardingPatientPage = lazy(() => import('./pages/onboarding/OnboardingPatientPage').then((m) => ({ default: m.OnboardingPatientPage || m.default })));
const DashboardProviderPage = lazy(() => import('./pages/dashboard/DashboardProviderPage').then((m) => ({ default: m.DashboardProviderPage || m.default })));
const DashboardPatientPage = lazy(() => import('./pages/dashboard/DashboardPatientPage').then((m) => ({ default: m.DashboardPatientPage || m.default })));
const DashboardAdminPage = lazy(() => import('./pages/dashboard/DashboardAdminPage').then((m) => ({ default: m.DashboardAdminPage || m.default })));
import { ErrorPageGeneric } from './components/Error/ErrorPageGeneric';
import { ErrorPage50x } from './components/Error/ErrorPage50x';
import { ErrorPage40x } from './components/Error/ErrorPage40x';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { theme } from './utils/theme';
import { Button } from './shared/primitives/Button';

const MoodSearchBar = lazy(() => import('./shared/interactive/MoodSearchBar'));

type ThemeMode = 'light' | 'dark';
type FlowStep = 'home' | 'journey' | 'providers';

export default function App() {
  const [themeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark');
    localStorage.setItem('manobhav-theme', 'light');
  }, []);

  return (
    <BrowserRouter>
      <div className="font-[Poppins] min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
        <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />
        <AppShell themeMode={themeMode} />
        <style>{`:root { font-family: ${theme.font}; }`}</style>
        <Analytics />
      </div>
    </BrowserRouter>
  );
}

function AppShell({ themeMode }: { themeMode: ThemeMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FlowStep>('home');
  const isHomeFlow = location.pathname === '/';

  const hideNav =
    location.pathname === '/journey' ||
    location.pathname === '/appointment' ||
    (isHomeFlow && flow === 'journey');

  const hideFooter =
    hideNav || location.pathname === '/appointment';

  const navVariant = location.pathname === '/providers' ? 'flat' : 'glass';

  const handleBook = () => {
    const loggedIn = sessionStorage.getItem('manobhav-logged-in') === 'true';
    if (!loggedIn) {
      navigate('/login');
    } else {
      navigate('/appointment');
    }
  };

  return (
    <>
      {!hideNav && <NavBar onNavigate={navigate} themeMode={themeMode} variant={navVariant} />}

      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary context="route-home" fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
              {flow === 'home' && (
                <>
                  <HomePage onStartJourney={() => setFlow('journey')} />
                  <Suspense fallback={null}>
                    <MoodSearchBar onReachHuman={() => setFlow('journey')} />
                  </Suspense>
                  {!hideFooter && <Footer />}
                </>
              )}
              {flow === 'journey' && (
                <JourneyPage onBackHome={() => setFlow('home')} onFinish={() => navigate('/providers')} />
              )}
            </ErrorBoundary>
          }
        />

        <Route
          path="/login"
          element={
            <ErrorBoundary context="route-login" fallback={<ErrorPage50x onHome={() => navigate('/')} />}>
              <LoginPage onBack={() => navigate('/')} />
              {!hideFooter && <Footer />}
            </ErrorBoundary>
          }
        />

        <Route
          path="/journey"
          element={
            <ErrorBoundary context="route-journey" fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
              <JourneyPage onBackHome={() => navigate('/')} onFinish={() => navigate('/providers')} />
            </ErrorBoundary>
          }
        />

        <Route
          path="/providers"
          element={
            <ErrorBoundary context="route-providers" fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
              <ProvidersPage onBackHome={() => navigate('/')} onBook={handleBook} />
            </ErrorBoundary>
          }
        />

        <Route
          path="/appointment"
          element={
            <ErrorBoundary context="route-appointment" fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
              <AppointmentPage />
            </ErrorBoundary>
          }
        />

        <Route
          path="/onboarding"
          element={
            <OnboardingChooser
              onProvider={() => navigate('/onboarding/provider')}
              onPatient={() => navigate('/onboarding/patient')}
            />
          }
        />
        <Route path="/onboarding/provider" element={<OnboardingProviderPage onBack={() => navigate('/onboarding')} />} />
        <Route path="/onboarding/patient" element={<OnboardingPatientPage onBack={() => navigate('/onboarding')} />} />

        <Route
          path="/dashboard"
          element={
            <DashboardChooser
              onProvider={() => navigate('/dashboard/provider')}
              onPatient={() => navigate('/dashboard/patient')}
              onAdmin={() => navigate('/dashboard/admin')}
            />
          }
        />
        <Route path="/dashboard/provider" element={<DashboardProviderPage />} />
        <Route path="/dashboard/patient" element={<DashboardPatientPage />} />
        <Route path="/dashboard/admin" element={<DashboardAdminPage />} />

        <Route path="*" element={<ErrorPage40x onHome={() => navigate('/')} />} />
      </Routes>

      {!hideFooter &&
        location.pathname !== '/' &&
        location.pathname !== '/providers' &&
        location.pathname !== '/login' &&
        location.pathname !== '/appointment' && <Footer />}
    </>
  );
}

function OnboardingChooser({ onProvider, onPatient }: { onProvider: () => void; onPatient: () => void }) {
  return (
    <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
      <h1 className="text-3xl font-bold">Choose your onboarding</h1>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" onClick={onProvider}>
          Provider / Therapist
        </Button>
        <Button variant="secondary" onClick={onPatient}>
          Patient / User
        </Button>
      </div>
    </div>
  );
}

function DashboardChooser({
  onProvider,
  onPatient,
  onAdmin,
}: {
  onProvider: () => void;
  onPatient: () => void;
  onAdmin: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col gap-6 text-center">
      <h1 className="text-3xl font-bold">Dashboard area</h1>
      <p className="text-gray-600">Select the dashboard you want to explore.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" onClick={onProvider}>
          Provider dashboard
        </Button>
        <Button variant="secondary" onClick={onPatient}>
          Patient dashboard
        </Button>
        <Button variant="outline" onClick={onAdmin}>
          Admin dashboard
        </Button>
      </div>
    </div>
  );
}
