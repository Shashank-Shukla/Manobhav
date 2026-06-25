import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderDashboardRoute } from '.';
import type { ProviderDashboard } from './providerDashboardApi';

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const activeDashboard: ProviderDashboard = {
  provider: {
    name: 'Dr. Asha Rao',
    shortName: 'Dr. Asha',
    title: 'Clinical Psychologist',
    avatarInitials: 'AR',
    avatarColor: '#9CAF88',
    status: 'Provider',
    profilePublished: true,
  },
  metrics: { sessionsTotal: 18, sessionsThisWeek: 4, upcomingCount: 7 },
  todayAppointments: [
    { id: 'appt-1', patientName: 'Meera Iyer', startsAtUtc: '2026-06-18T10:00:00.000Z', endsAtUtc: '2026-06-18T11:00:00.000Z' },
    { id: 'appt-2', patientName: 'Rohan Kapoor', startsAtUtc: '2026-06-18T13:30:00.000Z', endsAtUtc: '2026-06-18T14:30:00.000Z' },
  ],
  upcomingAppointments: [
    { id: 'next-1', patientName: 'Kabir Shah', startsAtUtc: '2026-06-19T09:30:00.000Z' },
  ],
  weekCalendar: [
    { dateUtc: '2026-06-15T00:00:00.000Z', appointmentCount: 1, isToday: false },
    { dateUtc: '2026-06-18T00:00:00.000Z', appointmentCount: 3, isToday: true },
  ],
  notifications: { unreadCount: 3 },
};

const newProviderDashboard: ProviderDashboard = {
  provider: {
    name: 'Sam Verma',
    shortName: 'Sam',
    title: null,
    avatarInitials: 'SV',
    avatarColor: '#B0CED6',
    status: 'ProviderApplicant',
    profilePublished: false,
  },
  metrics: { sessionsTotal: 0, sessionsThisWeek: 0, upcomingCount: 0 },
  todayAppointments: [],
  upcomingAppointments: [],
  weekCalendar: [],
  notifications: { unreadCount: 0 },
};

function stubDashboard(response: () => Response) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/api/provider/dashboard')) {
      return response();
    }
    return apiJson({ title: 'Not found' }, 404);
  }));
}

function renderProviderDashboard(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ProviderDashboardRoute />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  stubDashboard(() => apiJson(activeDashboard));
});

describe('ProviderDashboardRoute data wiring', () => {
  it('fetches GET /api/provider/dashboard once on mount', async () => {
    renderProviderDashboard();

    await screen.findByText('Dr. Asha Rao');
    const dashboardCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/api/provider/dashboard'));
    expect(dashboardCalls).toHaveLength(1);
  });

  it('renders icon-only navigation pointing at the single /dashboard surface', async () => {
    renderProviderDashboard();

    const navigation = await screen.findByRole('navigation', { name: /provider dashboard navigation/i });
    const navLinks = within(navigation)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-label') !== 'Manobhav provider home');
    const navTargets = navLinks.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')]);

    expect(navTargets).toEqual([
      ['Dashboard overview', '/dashboard'],
      ['Weekly report', '/dashboard#weekly-report'],
      ['My appointments', '/dashboard#my-appointments'],
      ['This week calendar', '/dashboard#provider-calendar'],
      ["Today's appointments", '/dashboard#todays-appointments'],
    ]);
  });

  it('renders real provider identity, metrics, and the View profile link', async () => {
    renderProviderDashboard();

    const profileBlock = await screen.findByRole('group', { name: /provider profile/i });
    expect(within(profileBlock).getByText('Dr. Asha Rao')).toBeInTheDocument();
    expect(within(profileBlock).getByRole('link', { name: /view profile/i })).toHaveAttribute('href', '/dashboard#dashboard-overview');
    expect(within(profileBlock).getByRole('img', { name: /Dr. Asha Rao avatar/i })).toBeInTheDocument();

    const snapshot = screen.getByRole('region', { name: /dashboard activity/i });
    const totalCard = within(snapshot).getByText('Total sessions').closest('article') as HTMLElement;
    expect(within(totalCard).getByText('18')).toBeInTheDocument();
    const upcomingCard = within(snapshot).getByText('Upcoming').closest('article') as HTMLElement;
    expect(within(upcomingCard).getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome back, dr\. asha/i })).toBeInTheDocument();
  });

  it('renders the notification badge and today appointments with formatted times', async () => {
    renderProviderDashboard();

    const notifications = await screen.findByRole('status', { name: /notifications, 3 unread/i });
    expect(within(notifications).getByText('3')).toBeInTheDocument();

    const todays = screen.getByRole('region', { name: /today's appointments/i });
    expect(within(todays).getByText('Meera Iyer')).toBeInTheDocument();
    expect(within(todays).getByText('Rohan Kapoor')).toBeInTheDocument();
    expect(within(todays).getAllByText('Session').length).toBeGreaterThan(0);
    expect(within(todays).queryByText(/Video session|Clinic visit|Anxiety follow-up/i)).not.toBeInTheDocument();
  });

  it('marks the contract today as the selected calendar day', async () => {
    renderProviderDashboard();

    const today = await screen.findByRole('listitem', { name: /today, /i });
    expect(today).toHaveAttribute('aria-current', 'date');
  });

  it('shows an error state when the dashboard request fails', async () => {
    stubDashboard(() => apiJson({ title: 'Server error' }, 500));
    renderProviderDashboard();

    expect(await screen.findByText(/couldn't load your dashboard/i)).toBeInTheDocument();
  });
});

describe('ProviderDashboardRoute empty and applicant states', () => {
  beforeEach(() => {
    stubDashboard(() => apiJson(newProviderDashboard));
  });

  it('greets a newly-hired provider with friendly empty states and a review banner', async () => {
    renderProviderDashboard();

    expect(await screen.findByRole('heading', { name: /welcome back, sam/i })).toBeInTheDocument();
    expect(screen.getByText(/under review/i)).toBeInTheDocument();
    expect(screen.getAllByText(/your week is open/i).length).toBeGreaterThan(0);

    const profileBlock = screen.getByRole('group', { name: /provider profile/i });
    expect(within(profileBlock).getByText('Sam Verma')).toBeInTheDocument();

    const todays = screen.getByRole('region', { name: /today's appointments/i });
    expect(within(todays).getByText(/0 sessions/i)).toBeInTheDocument();
    expect(within(todays).getByText(/no appointments scheduled yet/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByLabelText(/notifications, 0 unread/i)).toBeInTheDocument());
    const notifications = screen.getByRole('status', { name: /notifications, 0 unread/i });
    expect(within(notifications).queryByText('0')).not.toBeInTheDocument();
  });

  it('renders zero metrics for a provider with no sessions', async () => {
    renderProviderDashboard();

    const snapshot = await screen.findByRole('region', { name: /dashboard activity/i });
    expect(within(snapshot).getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });
});
