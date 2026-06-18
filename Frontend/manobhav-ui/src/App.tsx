import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { NavBar } from './shared/layout/NavBar';
import { Footer } from './shared/layout/Footer';
import { SimpleFooter } from './shared/layout/SimpleFooter';
import { AdminRouteGuard } from './shared/auth/AdminRouteGuard';
import { AuthRouteGuard } from './shared/auth/AuthRouteGuard';
import { getStoredAuthSession } from './shared/auth/cognitoAuth';
import { useVisitorAnalytics } from './features/visitor-analytics';
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage || m.default })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage || m.default })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage || m.default })));
const JourneyPage = lazy(() => import('./pages/JourneyPage').then((m) => ({ default: m.JourneyPage || m.default })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage || m.default })));
const FAQPage = lazy(() => import('./pages/FAQPage').then((m) => ({ default: m.FAQPage || m.default })));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage').then((m) => ({ default: m.DisclaimerPage || m.default })));
const ProvidersPage = lazy(() => import('./pages/ProvidersPage').then((m) => ({ default: m.ProvidersPage || m.default })));
const AppointmentPage = lazy(() => import('./pages/AppointmentPage').then((m) => ({ default: m.AppointmentPage || m.default })));
const OnboardingProviderPage = lazy(() => import('./pages/onboarding/OnboardingProviderPage').then((m) => ({ default: m.OnboardingProviderPage || m.default })));
const OnboardingPatientPage = lazy(() => import('./pages/onboarding/OnboardingPatientPage').then((m) => ({ default: m.OnboardingPatientPage || m.default })));
const DashboardProviderPage = lazy(() => import('./pages/dashboard/DashboardProviderPage').then((m) => ({ default: m.DashboardProviderPage || m.default })));
const DashboardPatientPage = lazy(() => import('./pages/dashboard/DashboardPatientPage').then((m) => ({ default: m.DashboardPatientPage || m.default })));
const DashboardAdminPage = lazy(() => import('./pages/dashboard/DashboardAdminPage').then((m) => ({ default: m.DashboardAdminPage || m.default })));
import { ErrorPageGeneric } from './shared/error/ErrorPageGeneric';
import { ErrorPage50x } from './shared/error/ErrorPage50x';
import { ErrorPage40x } from './shared/error/ErrorPage40x';
import { ErrorBoundary } from './shared/error/ErrorBoundary';
import { theme } from './utils/theme';
import { Button } from './shared/primitives/Button';

const MoodSearchBar = lazy(() => import('./shared/interactive/MoodSearchBar'));

type ThemeMode = 'light' | 'dark';
type FlowStep = 'home' | 'journey' | 'providers';

const viewportLockedPaths = new Set(['/providers', '/about', '/disclaimer', '/login']);
const standaloneFooterHiddenPaths = new Set([
  '/about',
  '/dashboard/patient',
  '/dashboard/provider',
  '/disclaimer',
  '/login',
  '/onboarding/patient',
  '/onboarding/provider',
  '/appointment',
  '/providers',
]);

export default function App() {
  const [themeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark');
    localStorage.setItem('manobhav-theme', 'light');
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen text-[color:var(--text-color)] selection:bg-[#D6A2AD] selection:text-white">
        <div className="fixed inset-0 bg-[var(--bg-gradient)] -z-50" />
        <AppShell themeMode={themeMode} />
        <style>{`:root { font-family: ${theme.font}; }`}</style>
      </div>
    </BrowserRouter>
  );
}

function AppShell({ themeMode }: { themeMode: ThemeMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FlowStep>('home');
  useVisitorAnalytics(location.pathname);
  const layout = getRouteLayout(location.pathname, flow);

  const handleBook = () => {
    if (!getStoredAuthSession()) {
      navigate(`/login?returnTo=${encodeURIComponent('/appointment')}`);
    } else {
      navigate('/appointment');
    }
  };

  return (
    <>
      <div className={layout.containerClassName}>
        {!layout.hideNav && <NavBar onNavigate={navigate} themeMode={themeMode} variant={layout.navVariant} />}

        <div className={`flex flex-1 flex-col ${layout.viewportLocked ? 'min-h-0 overflow-hidden' : ''}`}>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">Loading...</div>}>
            <AppRoutes
              flow={flow}
              hideFooter={layout.hideFooter}
              navigate={navigate}
              onBook={handleBook}
              setFlow={setFlow}
            />
          </Suspense>
        </div>

        {shouldShowStandaloneFooter(location.pathname, layout.hideFooter) && <Footer />}
      </div>
    </>
  );
}

function AppRoutes({
  flow,
  hideFooter,
  navigate,
  onBook,
  setFlow,
}: {
  flow: FlowStep;
  hideFooter: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  onBook: () => void;
  setFlow: (flow: FlowStep) => void;
}) {
  return (
    <Routes>
      <Route path="/" element={<HomeFlowRoute flow={flow} hideFooter={hideFooter} navigate={navigate} setFlow={setFlow} />} />
      <Route path="/login" element={<LoginRouteElement navigate={navigate} />} />
      <Route path="/callback" element={<AuthCallbackRouteElement navigate={navigate} />} />
      <Route path="/journey" element={<JourneyRouteElement navigate={navigate} />} />
      <Route path="/about" element={<BoundedRoute context="route-about" navigate={navigate}><AboutPage /></BoundedRoute>} />
      <Route path="/faq" element={<BoundedRoute context="route-faq" navigate={navigate}><FAQPage /></BoundedRoute>} />
      <Route path="/disclaimer" element={<BoundedRoute context="route-disclaimer" navigate={navigate}><DisclaimerPage /></BoundedRoute>} />
      <Route path="/providers" element={<ProvidersRouteElement navigate={navigate} onBook={onBook} />} />
      <Route path="/appointment" element={<AuthenticatedBoundedRoute context="route-appointment" navigate={navigate} returnTo="/appointment"><AppointmentPage /></AuthenticatedBoundedRoute>} />
      <Route path="/onboarding" element={<OnboardingChooser onProvider={() => navigate('/onboarding/provider')} onPatient={() => navigate('/onboarding/patient')} />} />
      <Route path="/onboarding/provider" element={<AuthenticatedBoundedRoute context="route-provider-onboarding" navigate={navigate} returnTo="/onboarding/provider"><OnboardingProviderPage onBack={() => navigate('/onboarding')} /></AuthenticatedBoundedRoute>} />
      <Route path="/onboarding/patient" element={<AuthenticatedBoundedRoute context="route-patient-onboarding" navigate={navigate} returnTo="/onboarding/patient"><OnboardingPatientPage onBack={() => navigate('/onboarding')} /></AuthenticatedBoundedRoute>} />
      <Route path="/dashboard" element={<DashboardRouteElement navigate={navigate} />} />
      <Route path="/dashboard/provider" element={<AuthenticatedBoundedRoute context="route-provider-dashboard" navigate={navigate} returnTo="/dashboard/provider"><DashboardProviderPage /></AuthenticatedBoundedRoute>} />
      <Route path="/dashboard/patient" element={<AuthenticatedBoundedRoute context="route-patient-dashboard" navigate={navigate} returnTo="/dashboard/patient"><DashboardPatientPage /></AuthenticatedBoundedRoute>} />
      <Route path="/dashboard/admin" element={<AdminDashboardRouteElement />} />
      <Route path="/dashboard/admin/:module" element={<AdminDashboardRouteElement />} />
      <Route path="/dashboard/admin/:module/:applicationId" element={<AdminDashboardRouteElement />} />
      <Route path="*" element={<ErrorPage40x onHome={() => navigate('/')} />} />
    </Routes>
  );
}

function HomeFlowRoute({
  flow,
  hideFooter,
  navigate,
  setFlow,
}: {
  flow: FlowStep;
  hideFooter: boolean;
  navigate: (path: string) => void;
  setFlow: (flow: FlowStep) => void;
}) {
  return (
    <ErrorBoundary context="route-home" fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
      <HomeFlowContent flow={flow} hideFooter={hideFooter} navigate={navigate} setFlow={setFlow} />
    </ErrorBoundary>
  );
}

function HomeFlowContent({
  flow,
  hideFooter,
  navigate,
  setFlow,
}: {
  flow: FlowStep;
  hideFooter: boolean;
  navigate: (path: string) => void;
  setFlow: (flow: FlowStep) => void;
}) {
  if (flow === 'journey') {
    return <JourneyPage onBackHome={() => setFlow('home')} onFinish={() => navigate('/providers')} />;
  }

  return (
    <>
      <HomePage onStartJourney={() => setFlow('journey')} />
      <Suspense fallback={null}>
        <MoodSearchBar onReachHuman={() => setFlow('journey')} />
      </Suspense>
      {!hideFooter && <Footer />}
    </>
  );
}

function LoginRouteElement({ navigate }: { navigate: (path: string) => void }) {
  return (
    <ErrorBoundary context="route-login" fallback={<ErrorPage50x onHome={() => navigate('/')} />}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <LoginPage onBack={() => navigate('/')} />
      </div>
    </ErrorBoundary>
  );
}

function AuthCallbackRouteElement({ navigate }: { navigate: (path: string) => void }) {
  return (
    <ErrorBoundary context="route-auth-callback" fallback={<ErrorPage50x onHome={() => navigate('/')} />}>
      <AuthCallbackPage />
    </ErrorBoundary>
  );
}

function JourneyRouteElement({ navigate }: { navigate: (path: string) => void }) {
  return (
    <BoundedRoute context="route-journey" navigate={navigate}>
      <JourneyPage onBackHome={() => navigate('/')} onFinish={() => navigate('/providers')} />
    </BoundedRoute>
  );
}

function ProvidersRouteElement({ navigate, onBook }: { navigate: (path: string) => void; onBook: () => void }) {
  return (
    <BoundedRoute context="route-providers" navigate={navigate}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ProvidersPage onBackHome={() => navigate('/')} onBook={onBook} />
        <SimpleFooter />
      </div>
    </BoundedRoute>
  );
}

function DashboardRouteElement({ navigate }: { navigate: (path: string) => void }) {
  return (
    <DashboardChooser
      onProvider={() => navigate('/dashboard/provider')}
      onPatient={() => navigate('/dashboard/patient')}
      onAdmin={() => navigate('/dashboard/admin')}
    />
  );
}

function AdminDashboardRouteElement() {
  return (
    <AdminRouteGuard>
      <DashboardAdminPage />
    </AdminRouteGuard>
  );
}

function BoundedRoute({
  children,
  context,
  navigate,
}: {
  children: React.ReactNode;
  context: string;
  navigate: (path: string) => void;
}) {
  return (
    <ErrorBoundary context={context} fallback={<ErrorPageGeneric onHome={() => navigate('/')} />}>
      {children}
    </ErrorBoundary>
  );
}

function AuthenticatedBoundedRoute({
  children,
  context,
  navigate,
  returnTo,
}: {
  children: React.ReactNode;
  context: string;
  navigate: (path: string) => void;
  returnTo: string;
}) {
  return (
    <BoundedRoute context={context} navigate={navigate}>
      <AuthRouteGuard returnTo={returnTo}>{children}</AuthRouteGuard>
    </BoundedRoute>
  );
}

function getRouteLayout(pathname: string, flow: FlowStep) {
  const isAdminRoute = pathname.startsWith('/dashboard/admin');
  const viewportLocked = viewportLockedPaths.has(pathname) || isAdminRoute;
  const hideNav = shouldHideNav(pathname, flow, isAdminRoute);
  return {
    containerClassName: viewportLocked ? 'flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden' : 'flex min-h-screen flex-col',
    hideFooter: shouldHideFooter(pathname, hideNav),
    hideNav,
    navVariant: getNavVariant(pathname),
    viewportLocked,
  };
}

function shouldHideNav(pathname: string, flow: FlowStep, isAdminRoute: boolean): boolean {
  if (isAdminRoute) return true;
  if (pathname === '/dashboard/provider') return true;
  if (pathname === '/journey') return true;
  if (pathname === '/appointment') return true;
  return pathname === '/' && flow === 'journey';
}

function shouldHideFooter(pathname: string, hideNav: boolean): boolean {
  return hideNav || pathname === '/appointment';
}

function shouldShowStandaloneFooter(pathname: string, hideFooter: boolean): boolean {
  return !hideFooter && pathname !== '/' && !standaloneFooterHiddenPaths.has(pathname);
}

function getNavVariant(pathname: string): 'flat' | 'glass' {
  return pathname === '/providers' ? 'flat' : 'glass';
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
