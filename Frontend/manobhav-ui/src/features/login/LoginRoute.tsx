import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '../../shared/error/ErrorBoundary';
import { LeftPanel } from './components/LeftPanel';
import { LoginForm } from './components/LoginForm';
import { SignUpForm } from './components/SignUpForm';

type LoginPageProps = {
  onBack: () => void;
  returnTo?: string;
};

type LoginMode = 'sign-in' | 'sign-up';

export function LoginPage({ onBack, returnTo }: LoginPageProps) {
  const [mode, setMode] = useState<LoginMode>('sign-in');
  const [searchParams] = useSearchParams();
  const isSignUp = mode === 'sign-up';
  const authReturnTo = sanitizeReturnTo(returnTo ?? searchParams.get('returnTo'));

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-28 animate-in slide-in-from-right-10 duration-500">
      <div className="flex h-full max-h-full w-full items-center justify-center overflow-hidden">
        <div className="w-full max-w-5xl">
          <button
            type="button"
            aria-label="Back to home"
            onClick={onBack}
            className="mb-3 ml-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/75 bg-white/70 text-gray-600 shadow-lg shadow-slate-900/10 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]/40"
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

  return value.startsWith('//') ? fallback : value;
}
