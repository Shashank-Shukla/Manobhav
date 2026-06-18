import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    sectionReviews: {},
    sections: {
      basicIdentity: {
        legalName: 'Dr. Asha Rao',
        displayName: 'Asha Rao',
        email: 'asha@example.com',
      },
    },
  },
];

function createApplicationDetailResponse() {
  return {
    ...applicationsResponse[0],
    status: 'Submitted',
    sectionReviews: {} as Record<string, {
      id: string;
      sectionKey: string;
      status: 'Approved' | 'Rejected';
      comment: string | null;
      reviewedAtUtc: string;
    }>,
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
      specializations: {
        focusAreas: ['Anxiety'],
        ageGroups: ['Adults'],
        therapyGoals: ['Stress'],
      },
      therapyApproaches: {
        modalities: ['ACT'],
        deliveryModes: ['Online'],
      },
      sessionDetails: {
        sessionLengthsMinutes: [60],
        availabilitySummary: 'Weekdays',
        capacityPerWeek: 12,
      },
      credentials: {
        items: [{ title: 'Clinical Psychologist', institution: 'RCI' }],
      },
      payout: {
        payoutMode: 'Bank',
        accountHolderName: 'Asha Rao',
        notes: 'Verified later',
      },
    },
  };
}

let applicationDetailResponse = createApplicationDetailResponse();

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
  applicationDetailResponse = createApplicationDetailResponse();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/admin/dashboard')) {
      return apiJson(dashboardResponse);
    }
    if (url.endsWith('/api/admin/provider-applications')) {
      return apiJson(applicationsResponse);
    }
    if (
      url.includes(`/api/admin/provider-applications/${providerApplicationId}/sections/`) &&
      url.endsWith('/review') &&
      method === 'PUT'
    ) {
      const sectionKey = decodeURIComponent(url.split('/sections/')[1]!.split('/review')[0]!);
      const body = JSON.parse(String(init?.body ?? '{}')) as { status: 'Approved' | 'Rejected'; comment?: string };
      applicationDetailResponse = {
        ...applicationDetailResponse,
        sectionReviews: {
          ...applicationDetailResponse.sectionReviews,
          [sectionKey]: {
            id: `review-${sectionKey}`,
            sectionKey,
            status: body.status,
            comment: body.comment ?? null,
            reviewedAtUtc: '2026-06-18T05:00:00.000Z',
          },
        },
      };
      return apiJson(applicationDetailResponse);
    }
    if (url.endsWith(`/api/admin/provider-applications/${providerApplicationId}/approve`) && method === 'POST') {
      applicationDetailResponse = {
        ...applicationDetailResponse,
        status: 'Approved',
      };
      return new Response(null, { status: 204 });
    }
    if (url.endsWith(`/api/admin/provider-applications/${providerApplicationId}/reject`) && method === 'POST') {
      applicationDetailResponse = {
        ...applicationDetailResponse,
        status: 'Rejected',
      };
      return new Response(null, { status: 204 });
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

  it('saves a section review status and comment from the application detail view', async () => {
    const user = userEvent.setup();
    renderAdmin(`/dashboard/admin/provider-applications/${providerApplicationId}`);

    await user.type(await screen.findByRole('textbox', { name: /comment for basic identity/i }), 'Identity verified.');
    await user.click(screen.getByRole('button', { name: /approve basic identity section/i }));

    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      String(url).endsWith(`/api/admin/provider-applications/${providerApplicationId}/sections/basicIdentity/review`) &&
      init?.method === 'PUT' &&
      JSON.parse(String(init.body)).status === 'Approved' &&
      JSON.parse(String(init.body)).comment === 'Identity verified.',
    )).toBe(true));
    expect(await screen.findByText(/Saved comment: Identity verified\./i)).toBeInTheDocument();
  });

  it('disables final approval until all required sections are approved', async () => {
    const user = userEvent.setup();
    renderAdmin(`/dashboard/admin/provider-applications/${providerApplicationId}`);

    expect(await screen.findByRole('button', { name: /^approve application$/i })).toBeDisabled();

    await user.click(await screen.findByRole('button', { name: /approve basic identity section/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^approve application$/i })).toBeDisabled());

    await user.click(screen.getByRole('button', { name: /approve bio and approach section/i }));
    await user.click(screen.getByRole('button', { name: /approve specializations section/i }));
    await user.click(screen.getByRole('button', { name: /approve therapy approaches section/i }));
    await user.click(screen.getByRole('button', { name: /approve session details section/i }));
    await user.click(screen.getByRole('button', { name: /approve credentials section/i }));
    await user.click(screen.getByRole('button', { name: /approve payout section/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^approve application$/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /^approve application$/i }));

    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      String(url).endsWith(`/api/admin/provider-applications/${providerApplicationId}/approve`) &&
      init?.method === 'POST',
    )).toBe(true));
    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
  });

  it('allows final rejection when a section is rejected with a comment', async () => {
    const user = userEvent.setup();
    renderAdmin(`/dashboard/admin/provider-applications/${providerApplicationId}`);

    expect(await screen.findByRole('button', { name: /^reject application$/i })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /comment for bio and approach/i }), 'Approach needs more detail.');
    await user.click(screen.getByRole('button', { name: /reject bio and approach section/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^reject application$/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /^reject application$/i }));

    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      String(url).endsWith(`/api/admin/provider-applications/${providerApplicationId}/reject`) &&
      init?.method === 'POST',
    )).toBe(true));
    await waitFor(() => expect(screen.getByText('Rejected')).toBeInTheDocument());
  });

  it('disables section review controls for terminal applications', async () => {
    applicationDetailResponse = {
      ...createApplicationDetailResponse(),
      status: 'Approved',
    };
    renderAdmin(`/dashboard/admin/provider-applications/${providerApplicationId}`);

    expect(await screen.findByRole('textbox', { name: /comment for basic identity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /approve basic identity section/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject basic identity section/i })).toBeDisabled();
  });

  it('constrains section review comments to the backend limit', async () => {
    renderAdmin(`/dashboard/admin/provider-applications/${providerApplicationId}`);

    expect(await screen.findByRole('textbox', { name: /comment for basic identity/i })).toHaveAttribute('maxlength', '2000');
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

  it('opens the admin account menu from an avatar-only trigger', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const trigger = await screen.findByRole('button', { name: /open admin profile menu/i });

    expect(within(trigger).queryByText(/Super Admin/i)).not.toBeInTheDocument();
    expect(within(trigger).queryByText(/Operations/i)).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/admin settings/i)).toBeInTheDocument();
    expect(screen.getByText(/back to website/i)).toBeInTheDocument();
  });
});
