import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { startCognitoLogin } from './cognitoAuth';
import { useAuthSession } from './useAuthSession';

type AuthRouteGuardProps = {
  children: ReactNode;
  returnTo: string;
};

export function AuthRouteGuard({ children, returnTo }: AuthRouteGuardProps) {
  const { session, loading } = useAuthSession();
  if (loading) {
    return <AuthGuardMessage title="Checking sign in" message="Please wait while Manobhav verifies your session." />;
  }

  if (session?.isAuthenticated) {
    return <>{children}</>;
  }

  return <AuthGuardMessage title="Sign in required" message="Please sign in to continue." returnTo={returnTo} />;
}

function AuthGuardMessage({ message, returnTo, title }: { message: string; returnTo?: string; title: string }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 text-slate-800">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
        {returnTo && (
          <Button variant="primary" className="mt-6" onClick={() => void startCognitoLogin({ returnTo })}>
            Sign in
          </Button>
        )}
      </section>
    </main>
  );
}
