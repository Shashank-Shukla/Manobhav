import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startCognitoLogin } from './cognitoAuth';
import { AuthRouteGuard } from './AuthRouteGuard';
import { useAuthSession } from './useAuthSession';

vi.mock('./cognitoAuth', () => ({
  startCognitoLogin: vi.fn(),
}));

vi.mock('./useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

describe('AuthRouteGuard', () => {
  beforeEach(() => {
    vi.mocked(startCognitoLogin).mockReset();
    vi.mocked(useAuthSession).mockReturnValue({ session: null, loading: false });
  });

  it('asks unauthenticated visitors to sign in without implementation details', async () => {
    const user = userEvent.setup();

    render(
      <AuthRouteGuard returnTo="/onboarding/provider">
        <div>Protected provider step</div>
      </AuthRouteGuard>,
    );

    expect(screen.getByRole('heading', { name: /sign in required/i })).toBeInTheDocument();
    expect(screen.getByText(/please sign in to continue/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/api|status|400|cognito/i);

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ returnTo: '/onboarding/provider' });
  });
});
