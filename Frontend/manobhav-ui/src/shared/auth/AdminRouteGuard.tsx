import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { isAdminSession, logout, readAuthConfig, startCognitoLogin } from './cognitoAuth';
import { useAuthSession } from './useAuthSession';

type AdminRouteGuardProps = {
  children: ReactNode;
};

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const config = readAuthConfig();
  const { session, loading } = useAuthSession();

  if (loading) {
    return <AdminGuardMessage title="Checking admin access" message="Please wait while Manobhav verifies your session." />;
  }

  if (isAdminSession(session, config.adminGroup)) {
    return <>{children}</>;
  }

  return (
    <AdminGuardMessage
      title={getAdminTitle(Boolean(session))}
      message="Your account does not have admin access yet. Please use an admin-approved account or contact Manobhav support."
      actions={<AdminGuardActions isAuthenticated={Boolean(session)} />}
    />
  );
}

function AdminGuardMessage({
  actions,
  message,
  title,
}: {
  actions?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 text-slate-800">
      <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </section>
    </main>
  );
}

function AdminGuardActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return (
      <Button variant="secondary" onClick={() => void logout()}>
        Sign out
      </Button>
    );
  }

  return (
    <Button variant="primary" onClick={() => void startCognitoLogin({ returnTo: '/dashboard' })}>
      Sign in
    </Button>
  );
}

function getAdminTitle(isAuthenticated: boolean): string {
  return isAuthenticated ? 'Admin access required' : 'Admin sign in required';
}
