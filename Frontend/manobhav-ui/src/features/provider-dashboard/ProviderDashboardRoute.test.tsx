import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProviderDashboardRoute } from '.';

function renderProviderDashboard(initialEntry = '/dashboard/provider') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ProviderDashboardRoute />
    </MemoryRouter>,
  );
}

describe('ProviderDashboardRoute layout', () => {
  it('renders icon-only navigation, the main dashboard, and the right rail landmarks', () => {
    renderProviderDashboard();

    const navigation = screen.getByRole('navigation', { name: /provider dashboard navigation/i });
    expect(within(navigation).getByLabelText(/dashboard overview/i)).toBeInTheDocument();
    expect(within(navigation).getByLabelText(/weekly report/i)).toBeInTheDocument();
    expect(within(navigation).getByLabelText(/my appointments/i)).toBeInTheDocument();
    expect(within(navigation).getByLabelText(/this week calendar/i)).toBeInTheDocument();
    expect(within(navigation).getByLabelText(/today's appointments/i)).toBeInTheDocument();
    expect(within(navigation).queryByText(/overview|patients|messages|appointments/i)).not.toBeInTheDocument();

    expect(screen.getByRole('main', { name: /provider dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /dashboard activity/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /provider schedule/i })).toBeInTheDocument();
  });

  it('links provider navigation items only to rendered dashboard sections', () => {
    renderProviderDashboard();

    const navigation = screen.getByRole('navigation', { name: /provider dashboard navigation/i });
    const navLinks = within(navigation)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-label') !== 'Manobhav provider home');
    const navTargets = navLinks.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')]);

    expect(navTargets).toEqual([
      ['Dashboard overview', '/dashboard/provider'],
      ['Weekly report', '/dashboard/provider#weekly-report'],
      ['My appointments', '/dashboard/provider#my-appointments'],
      ['This week calendar', '/dashboard/provider#provider-calendar'],
      ["Today's appointments", '/dashboard/provider#todays-appointments'],
    ]);

    for (const [, href] of navTargets) {
      const hash = href?.split('#')[1];

      if (hash) {
        expect(document.getElementById(hash)).toBeInTheDocument();
      }
    }
  });

  it('marks the matching provider dashboard hash link as current', () => {
    renderProviderDashboard('/dashboard/provider#my-appointments');

    const navigation = screen.getByRole('navigation', { name: /provider dashboard navigation/i });

    expect(within(navigation).getByRole('link', { name: /my appointments/i })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', { name: /dashboard overview/i })).not.toHaveAttribute('aria-current');
  });

  it('renders notification badge, provider name, View profile, and avatar block', () => {
    renderProviderDashboard();

    const notifications = screen.getByRole('status', { name: /notifications, 3 unread/i });
    expect(notifications).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    expect(within(notifications).getByText('3')).toBeInTheDocument();

    const profileBlock = screen.getByRole('group', { name: /provider profile/i });
    expect(within(profileBlock).getByText('Dr. Asha Rao')).toBeInTheDocument();
    const viewProfileLink = within(profileBlock).getByRole('link', { name: /view profile/i });
    expect(viewProfileLink).toHaveAttribute('href', '/dashboard/provider#dashboard-overview');
    expect(document.getElementById('dashboard-overview')).toBeInTheDocument();
    expect(within(profileBlock).getByRole('img', { name: /Dr. Asha Rao avatar/i })).toBeInTheDocument();
  });

  it('marks today as the selected calendar day', () => {
    renderProviderDashboard();

    expect(screen.queryByRole('button', { name: /today/i })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /today, thursday, jun 18/i })).toHaveAttribute('aria-current', 'date');
  });

  it("renders today's appointments from deterministic provider dashboard data", () => {
    renderProviderDashboard();

    const appointments = screen.getByRole('region', { name: /today's appointments/i });
    expect(within(appointments).getByText('Meera Iyer')).toBeInTheDocument();
    expect(within(appointments).getByText('Rohan Kapoor')).toBeInTheDocument();
    expect(within(appointments).getByText('Ananya Sen')).toBeInTheDocument();
    expect(within(appointments).getByText('10:00 AM')).toBeInTheDocument();
    expect(within(appointments).getByText('1:30 PM')).toBeInTheDocument();
  });

  it('does not render backlog settings, search, or add patient controls', () => {
    renderProviderDashboard();

    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /search appointment|search patient/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search appointment|search patient/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add patient/i })).not.toBeInTheDocument();
  });
});
