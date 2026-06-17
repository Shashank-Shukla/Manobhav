import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardAdminPage } from '../../pages/dashboard/DashboardAdminPage';

const providerApplicationId = '11111111-1111-1111-1111-111111111111';

const dashboardResponse = {
  insightMetrics: [
    {
      id: 'care-followups',
      label: 'Pending applications',
      value: '1',
      delta: 'Review',
      helper: 'Provider onboarding queue',
      tone: 'rose',
    },
  ],
  opsQueues: [
    {
      id: 'provider-review',
      title: 'Provider applications pending',
      meta: '1 submitted applications',
      status: 'Review',
      tone: 'blue',
    },
  ],
  quickActions: [],
  providers: [],
  bookings: [],
  slots: [],
};

const applicationsResponse = [
  {
    id: providerApplicationId,
    userId: '22222222-2222-2222-2222-222222222222',
    status: 'Submitted',
    currentStep: 'review',
    createdAtUtc: '2026-06-18T04:00:00.000Z',
    updatedAtUtc: '2026-06-18T04:05:00.000Z',
    submittedAtUtc: '2026-06-18T04:05:00.000Z',
    sections: {
      basicIdentity: {
        legalName: 'Dr. Asha Rao',
        displayName: 'Asha Rao',
        email: 'asha@example.com',
      },
    },
  },
];

const applicationDetailResponse = {
  ...applicationsResponse[0],
  sections: {
    basicIdentity: {
      legalName: 'Dr. Asha Rao',
      displayName: 'Asha Rao',
      email: 'asha@example.com',
    },
    bioAndApproach: {
      shortBio: 'Trauma informed therapist',
      approach: 'ACT and mindfulness',
    },
    credentials: {
      items: [{ title: 'Clinical Psychologist', institution: 'RCI' }],
    },
  },
};

const notificationsResponse = [
  {
    id: `provider-application-submitted-${providerApplicationId.replaceAll('-', '')}`,
    title: 'Provider application submitted',
    body: 'Dr. Asha Rao submitted an onboarding application.',
    linkPath: `/dashboard/admin/provider-applications/${providerApplicationId}`,
    createdAtUtc: '2026-06-18T04:05:00.000Z',
    readAtUtc: null,
  },
];

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/admin/dashboard')) {
      return apiJson(dashboardResponse);
    }
    if (url.endsWith('/api/admin/provider-applications')) {
      return apiJson(applicationsResponse);
    }
    if (url.endsWith(`/api/admin/provider-applications/${providerApplicationId}`)) {
      return apiJson(applicationDetailResponse);
    }
    if (url.includes('/api/admin/notifications') && method === 'GET') {
      return apiJson(notificationsResponse);
    }
    if (url.includes('/api/admin/notifications/') && url.endsWith('/read') && method === 'POST') {
      return new Response(null, { status: 204 });
    }

    return apiJson({ title: 'Not found' }, 404);
  }));
});

function renderAdmin(initialPath = '/dashboard/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard/admin" element={<DashboardAdminPage />} />
        <Route path="/dashboard/admin/:module" element={<DashboardAdminPage />} />
        <Route path="/dashboard/admin/:module/:applicationId" element={<DashboardAdminPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminDashboardRoute admin application review flow', () => {
  it('navigates from the pending applications Review card to the pending applications list', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await screen.findByText('Pending applications');
    await user.click(await screen.findByRole('button', { name: /review/i }));

    expect(await screen.findByRole('heading', { name: /pending provider applications/i })).toBeInTheDocument();
    expect(await screen.findByText(/Dr. Asha Rao submitted/i)).toBeInTheDocument();
  });

  it('opens a provider application detail view from the pending applications list', async () => {
    const user = userEvent.setup();
    renderAdmin('/dashboard/admin/provider-applications');

    await user.click(await screen.findByRole('link', { name: /open application for Asha Rao/i }));

    expect(await screen.findByRole('heading', { name: /Asha Rao/i })).toBeInTheDocument();
    expect(screen.getAllByText(/asha@example.com/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Clinical Psychologist/i)).toBeInTheDocument();
  });
});

describe('AdminDashboardRoute notifications and branding', () => {
  it('shows unread notification count, opens unread notifications, and marks one read after hover dwell', async () => {
    const user = userEvent.setup();
    renderAdmin();

    expect(await screen.findByLabelText(/notifications, 1 unread/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/notifications, 1 unread/i));

    const notification = await screen.findByText(/Dr. Asha Rao submitted/i);
    vi.useFakeTimers();
    fireEvent.mouseEnter(notification.closest('[role="menuitem"]')!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      String(url).includes('/api/admin/notifications/provider-application-submitted-11111111111111111111111111111111/read') &&
      init?.method === 'POST',
    )).toBe(true);
    expect(screen.queryByLabelText(/notifications, 1 unread/i)).not.toBeInTheDocument();
  });

  it('uses the official Manobhav logo asset in the admin shell', async () => {
    renderAdmin();

    const logo = await screen.findByRole('img', { name: /Manobhav admin/i, hidden: true });
    expect(logo).toHaveAttribute('src', '/Manobhav_Logo.png');
    expect(screen.queryByText(/^M$/)).not.toBeInTheDocument();
  });
});
