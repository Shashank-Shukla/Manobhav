import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthSession } from './shared/auth/useAuthSession';
import type { AuthSession } from './shared/auth/cognitoAuth';

vi.mock('./shared/auth/useAuthSession', () => ({
  useAuthSession: vi.fn(() => ({ session: null, loading: false })),
}));

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function mockSession(session: AuthSession | null): void {
  vi.mocked(useAuthSession).mockReturnValue({ session, loading: false });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.mocked(useAuthSession).mockReturnValue({ session: null, loading: false });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => apiJson({ visitorId: 'visitor-1', fullCaptureEnabled: true, retentionDays: 90 }, 201)),
  );
});

describe('app shell footer visibility', () => {
  it.each(['/onboarding/provider', '/onboarding/patient'])(
    'hides the footer on %s',
    async (path) => {
      window.history.pushState({}, '', path);

      render(<App />);

      await screen.findByText(/sign in required/i);
      expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument();
    },
  );

  it('hides the footer on the role-routed /dashboard entry', async () => {
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    await screen.findByRole('heading', { name: /sign in/i }, { timeout: 5000 });
    expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument();
  });

  it.each(['/', '/faq'])('shows the footer on %s', async (path) => {
    window.history.pushState({}, '', path);

    render(<App />);

    expect(await screen.findByText(/all rights reserved/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('app shell dashboard chrome', () => {
  it('redirects an unauthenticated visitor from /dashboard to the login route', async () => {
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByRole('heading', { name: /sign in/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /provider dashboard navigation/i })).not.toBeInTheDocument();
  });

  it('renders the provider dashboard in place at /dashboard without the public navigation for a provider', async () => {
    window.history.pushState({}, '', '/dashboard');
    mockSession({ isAuthenticated: true, expiresAtUtc: null, groups: ['Provider'] });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/provider/dashboard')) {
        return apiJson({
          provider: {
            name: 'Dr. Asha Rao',
            shortName: 'Dr. Asha',
            title: 'Clinical Psychologist',
            avatarInitials: 'AR',
            avatarColor: '#9CAF88',
            status: 'Provider',
            profilePublished: true,
          },
          metrics: { sessionsTotal: 0, sessionsThisWeek: 0, upcomingCount: 0 },
          todayAppointments: [],
          upcomingAppointments: [],
          weekCalendar: [],
          notifications: { unreadCount: 0 },
        });
      }
      return apiJson({ visitorId: 'visitor-1', fullCaptureEnabled: true, retentionDays: 90 }, 201);
    }));

    render(<App />);

    expect(await screen.findByRole('navigation', { name: /provider dashboard navigation/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument();
  });
});
