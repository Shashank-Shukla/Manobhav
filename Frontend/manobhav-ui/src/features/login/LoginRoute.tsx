import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '../../shared/error/ErrorBoundary';
import { useAuthSession } from '../../shared/auth/useAuthSession';
import { LeftPanel } from './components/LeftPanel';
import { LoginForm } from './components/LoginForm';
import { SignUpForm } from './components/SignUpForm';

type LoginPageProps = {
  onBack: () => void;
  returnTo?: string;
};

type LoginMode = 'sign-in' | 'sign-up';

export function LoginPage({ onBack, returnTo }: LoginPageProps) {
  const [searchParams] = useSearchParams();
  const { session } = useAuthSession();
  const [mode, setMode] = useState<LoginMode>(() => (searchParams.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in'));
  const isSignUp = mode === 'sign-up';
  const authReturnTo = sanitizeReturnTo(returnTo ?? searchParams.get('returnTo'));

  // Already signed in (e.g. an authenticated user clicking "Careers")? Skip the login form and send
  // them straight where they were headed instead of asking them to sign in again.
  if (session?.isAuthenticated) {
    return <Navigate replace to={authReturnTo} />;
  }

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-28 animate-in slide-in-from-right-10 duration-500">
      <div className="flex h-full max-h-full w-full items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-5xl">
          <button
            type="button"
            aria-label="Back to home"
            onClick={onBack}
            className="absolute left-0 top-0 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-white/75 text-gray-600 shadow-xl shadow-slate-900/15 backdrop-blur-md transition hover:bg-white hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]/40 md:inline-flex"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="relative grid max-h-[calc(100vh-11rem)] w-full min-h-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl md:grid-cols-2 md:rounded-[3rem]">
            <ErrorBoundary context="login-left" fallback={null}>
              <LeftPanel mode={mode} className={isSignUp ? 'md:order-2' : ''} />
            </ErrorBoundary>
            <ErrorBoundary context="login-form" fallback={null}>
              {isSignUp ? (
                <SignUpForm onShowSignIn={() => setMode('sign-in')} returnTo={authReturnTo} />
              ) : (
                <LoginForm onShowSignUp={() => setMode('sign-up')} returnTo={authReturnTo} />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

function sanitizeReturnTo(value: string | null | undefined): string {
  const fallback = '/dashboard';
  if (!value?.startsWith('/')) {
    return fallback;
  }

  if (value.startsWith('//')) {
    return fallback;
  }

  return value;
}
