import { useState } from 'react';
import { ErrorBoundary } from '../../shared/error/ErrorBoundary';
import { LeftPanel } from './components/LeftPanel';
import { LoginForm } from './components/LoginForm';
import { SignUpForm } from './components/SignUpForm';

type LoginPageProps = {
  onBack: () => void;
};

type LoginMode = 'sign-in' | 'sign-up';

export function LoginPage({ onBack }: LoginPageProps) {
  const [mode, setMode] = useState<LoginMode>('sign-in');
  const isSignUp = mode === 'sign-up';

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-28 animate-in slide-in-from-right-10 duration-500">
      <div className="flex h-full max-h-full w-full items-center justify-center overflow-hidden">
        <div className="relative grid max-h-full w-full max-w-5xl min-h-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl md:grid-cols-2 md:rounded-[3rem]">
          <ErrorBoundary context="login-left" fallback={null}>
            <LeftPanel mode={mode} className={isSignUp ? 'md:order-2' : ''} />
          </ErrorBoundary>
          <ErrorBoundary context="login-form" fallback={null}>
            {isSignUp ? (
              <SignUpForm onBack={onBack} onShowSignIn={() => setMode('sign-in')} />
            ) : (
              <LoginForm onBack={onBack} onShowSignUp={() => setMode('sign-up')} />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
