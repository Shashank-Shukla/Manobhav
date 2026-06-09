import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { getStoredAuthSession, isAdminSession, logout, readAuthConfig, startCognitoLogin } from './cognitoAuth';

type AdminRouteGuardProps = {
  children: ReactNode;
};

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const config = readAuthConfig();
  const session = getStoredAuthSession();

  if (isAdminSession(session, config.adminGroup)) {
    return <>{children}</>;
  }

  const isAuthenticated = Boolean(session);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 text-slate-800">
      <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold">{isAuthenticated ? 'Admin access required' : 'Admin sign in required'}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Admin dashboard access is enforced by Cognito groups and backend API policies. React routing does not grant access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {!isAuthenticated && (
            <Button variant="primary" onClick={() => void startCognitoLogin({ returnTo: '/dashboard/admin' })}>
              Sign in
            </Button>
          )}
          {isAuthenticated && (
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
