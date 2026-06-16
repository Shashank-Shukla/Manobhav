import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeCognitoRedirect } from '../../shared/auth/cognitoAuth';
import { apiRequest } from '../../shared/api/apiClient';
import { Button } from '../../shared/primitives/Button';

export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    completeCognitoRedirect()
      .then(async (returnTo) => {
        await apiRequest<void>('/api/visitors/session/conversion', { method: 'POST' }).catch(() => {
          // Visitor linking must not block a successful sign-in redirect.
        });

        if (active) navigate(returnTo, { replace: true });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Sign in failed.');
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6 text-slate-800">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold">{error ? 'Sign in failed' : 'Completing sign in'}</h1>
        <p className="mt-3 text-sm text-gray-600">
          {error || 'Please wait while Manobhav verifies the Cognito response.'}
        </p>
        {error && (
          <Button variant="primary" className="mt-6" onClick={() => navigate('/login', { replace: true })}>
            Back to sign in
          </Button>
        )}
      </section>
    </main>
  );
}

export default AuthCallbackRoute;
