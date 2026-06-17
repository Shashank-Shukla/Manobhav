import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRouteGuard } from './AdminRouteGuard';
import { useAuthSession } from './useAuthSession';

vi.mock('./cognitoAuth', () => ({
  isAdminSession: (session: { isAuthenticated: boolean; groups: string[] } | null, adminGroup: string) =>
    Boolean(session?.isAuthenticated && session.groups.includes(adminGroup)),
  logout: vi.fn(),
  readAuthConfig: vi.fn(() => ({ adminGroup: 'Admin' })),
  startCognitoLogin: vi.fn(),
}));

vi.mock('./useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

describe('AdminRouteGuard', () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: ['Patient'] },
      loading: false,
    });
  });

  it('shows friendly denied-access copy without auth implementation details', () => {
    render(
      <AdminRouteGuard>
        <div>Admin dashboard</div>
      </AdminRouteGuard>,
    );

    expect(screen.getByRole('heading', { name: /admin access required/i })).toBeInTheDocument();
    expect(screen.getByText(/your account does not have admin access yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/admin dashboard/i)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/\b(cognito|api|react|backend)\b/i);
  });
});
