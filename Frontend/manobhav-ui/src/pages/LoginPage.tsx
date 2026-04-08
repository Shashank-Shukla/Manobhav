import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { LeftPanel } from '../components/Login/LeftPanel';
import { LoginForm } from '../components/Login/LoginForm';

type LoginPageProps = {
  onBack: () => void;
};

export function LoginPage({ onBack }: LoginPageProps) {
  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-4 pb-4 pt-24 md:px-6 md:pb-6 md:pt-28 animate-in slide-in-from-right-10 duration-500">
      <div className="flex h-full max-h-full w-full items-center justify-center overflow-hidden">
        <div className="relative grid max-h-full w-full max-w-5xl min-h-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl md:grid-cols-2 md:rounded-[3rem]">
          <ErrorBoundary context="login-left" fallback={null}>
            <LeftPanel />
          </ErrorBoundary>
          <ErrorBoundary context="login-form" fallback={null}>
            <LoginForm onBack={onBack} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
