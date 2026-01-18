import { ErrorBoundary } from '../component/common/ErrorBoundary';
import { LeftPanel } from '../component/Login/LeftPanel';
import { LoginForm } from '../component/Login/LoginForm';

type LoginPageProps = {
  onBack: () => void;
};

export function LoginPage({ onBack }: LoginPageProps) {
  return (
    <div className="min-h-screen pt-24 px-6 pb-12 flex items-center justify-center animate-in slide-in-from-right-10 duration-500 relative">
      <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden grid md:grid-cols-2 relative border border-gray-100">
        <ErrorBoundary context="login-left" fallback={null}>
          <LeftPanel />
        </ErrorBoundary>
        <ErrorBoundary context="login-form" fallback={null}>
          <LoginForm onBack={onBack} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
