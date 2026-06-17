import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutPage } from '../pages/AboutPage';
import { AppointmentPage } from '../pages/AppointmentPage';
import { DashboardAdminPage } from '../pages/dashboard/DashboardAdminPage';
import { DisclaimerPage } from '../pages/DisclaimerPage';
import { FAQPage } from '../pages/FAQPage';
import { HomePage } from '../pages/HomePage';
import { JourneyPage } from '../pages/JourneyPage';
import { LoginPage } from '../pages/LoginPage';
import { ProvidersPage } from '../pages/ProvidersPage';
import { renderWithRouter } from './renderWithRouter';

vi.mock('@jitsi/react-sdk', () => ({
  JitsiMeeting: () => <div data-testid="jitsi-meeting" />,
}));

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const routeApiMocks = [
  {
    matches: (url: string) => url.includes('/api/public/landing'),
    response: () => apiJson({ featuredExperts: [] }),
  },
  {
    matches: (url: string) => url.includes('/api/public/intake-forms/active'),
    response: () => apiJson({
      id: 'form-1',
      submissionKind: 'PatientIntake',
      version: 1,
      name: 'Patient Intake',
      sections: [
        {
          id: 'section-1',
          sectionKey: 'therapy-goals',
          title: 'Therapy Goals',
          displayOrder: 1,
          questions: [
            {
              id: 'q-1',
              questionKey: 'mood-week',
              prompt: 'How would you describe your mood over the past week?',
              inputType: 'Text',
              isRequired: true,
              sensitivity: 'Personal',
              displayOrder: 1,
              options: [],
            },
            {
              id: 'q-2',
              questionKey: 'sleep-fatigue',
              prompt: 'Are you experiencing sleep difficulties or fatigue?',
              inputType: 'Text',
              isRequired: false,
              sensitivity: 'Personal',
              displayOrder: 2,
              options: [],
            },
          ],
        },
      ],
    }),
  },
  {
    matches: (url: string) => url.endsWith('/api/intake/submissions'),
    response: () => apiJson({
      id: 'submission-1',
      submissionKind: 'PatientIntake',
      status: 'Draft',
      currentStep: 'mood-week',
      formDefinitionId: 'form-1',
      formVersion: 1,
      visitorSessionId: null,
      userId: null,
    }, 201),
  },
  {
    matches: (url: string) => url.includes('/api/intake/submissions/submission-1/answers/'),
    response: () => apiJson({
      id: 'submission-1',
      submissionKind: 'PatientIntake',
      status: 'Draft',
      currentStep: 'mood-week',
      formDefinitionId: 'form-1',
      formVersion: 1,
      visitorSessionId: null,
      userId: null,
    }),
  },
  {
    matches: (url: string) => url.endsWith('/api/intake/submissions/submission-1/submit-partial'),
    response: () => apiJson({
      id: 'submission-1',
      submissionKind: 'PatientIntake',
      status: 'PartiallySubmitted',
      currentStep: 'mood-week',
      formDefinitionId: 'form-1',
      formVersion: 1,
      visitorSessionId: null,
      userId: null,
    }),
  },
  {
    matches: (url: string) => url.includes('/api/public/providers/provider-1/slots'),
    response: () => apiJson([
      {
        id: 'slot-1',
        providerProfileId: 'provider-1',
        startsAtUtc: '2026-06-05T09:00:00.000Z',
        endsAtUtc: '2026-06-05T10:00:00.000Z',
        status: 'Available',
      },
    ]),
  },
  {
    matches: (url: string) => url.includes('/api/public/providers'),
    response: () => apiJson([
      {
        id: 'provider-1',
        name: 'Clinical Specialist',
        summary: 'Compassionate clinician',
        longDescription: 'Compassionate clinician with API-backed availability.',
        specializations: ['Anxiety'],
        avatarColor: '#9CAF88',
        sessions: 12,
        rating: 4.6,
        nextDates: [{ display: 'Jun 5', iso: '2026-06-05' }],
      },
    ]),
  },
  {
    matches: (url: string) => url.endsWith('/api/booking/holds'),
    response: () => apiJson({
      id: 'hold-1',
      providerProfileId: 'provider-1',
      slotId: 'slot-1',
      visitorSessionId: null,
      userId: null,
      intakeSubmissionId: 'submission-1',
      status: 'Active',
      expiresAtUtc: '2026-06-05T09:15:00.000Z',
    }, 201),
  },
  {
    matches: (url: string) => url.endsWith('/api/booking/holds/hold-1/finalize'),
    response: () => apiJson({
      id: 'appointment-1',
      bookingHoldId: 'hold-1',
      patientUserId: 'patient-1',
      providerProfileId: 'provider-1',
      slotId: 'slot-1',
      intakeSubmissionId: 'submission-1',
      startsAtUtc: '2026-06-05T09:00:00.000Z',
      endsAtUtc: '2026-06-05T10:00:00.000Z',
      status: 'Scheduled',
      paymentStatus: 'NotRequired',
    }, 201),
  },
  {
    matches: (url: string) => url.endsWith('/api/admin/dashboard'),
    response: () => apiJson({
      insightMetrics: [
        {
          id: 'sessions-today',
          label: 'Sessions today',
          value: '1',
          delta: 'live',
          helper: 'Protected API data',
          tone: 'sage',
        },
      ],
      opsQueues: [],
      quickActions: [],
      providers: [],
      bookings: [],
      slots: [],
    }),
  },
  {
    matches: (url: string) => url.endsWith('/api/visitors'),
    response: () => apiJson({ visitorId: '00000000-0000-0000-0000-000000000001', fullCaptureEnabled: true, retentionDays: 90 }, 201),
  },
  {
    matches: (url: string) => url.endsWith('/api/visitors/session'),
    response: () => apiJson({ visitorId: '00000000-0000-0000-0000-000000000001', fullCaptureEnabled: true, retentionDays: 90 }, 201),
  },
  {
    matches: (url: string) => url.includes('/api/visitors/') && url.includes('/events'),
    response: () => new Response(null, { status: 202 }),
  },
];

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => getRouteApiMockResponse(String(input))),
  );
});

function getRouteApiMockResponse(url: string): Response {
  return routeApiMocks.find((route) => route.matches(url))?.response() ?? apiJson({ title: 'Not found' }, 404);
}

describe('route smoke coverage', () => {
  it('renders the home route and calls the journey callback', async () => {
    const user = userEvent.setup();
    const onStartJourney = vi.fn();

    renderWithRouter(<HomePage onStartJourney={onStartJourney} />);

    expect(screen.getByText(/inner peace/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/our specialists/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/no specialists are configured yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(onStartJourney).toHaveBeenCalledTimes(1);
  });

  it('renders login, faq, disclaimer, and appointment routes', () => {
    renderWithRouter(<LoginPage onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with email otp/i })).toHaveAttribute('type', 'submit');

    renderWithRouter(<FAQPage />);
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();

    renderWithRouter(<DisclaimerPage />, ['/disclaimer']);
    expect(screen.getByText(/important/i)).toBeInTheDocument();

    renderWithRouter(<AppointmentPage />);
    expect(screen.getByTestId('jitsi-meeting')).toBeInTheDocument();
  });
});

describe('public route interactions', () => {
  it('supports journey next and previous controls', async () => {
    const user = userEvent.setup();

    renderWithRouter(<JourneyPage onBackHome={vi.fn()} onFinish={vi.fn()} />);

    expect(await screen.findByText(/describe your mood over the past week/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/describe your mood over the past week/i), 'Steady');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(await screen.findByText(/sleep difficulties or fatigue/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous question/i }));
    expect(screen.getByText(/describe your mood over the past week/i)).toBeInTheDocument();
  });

  it('supports about page keyboard navigation', async () => {
    renderWithRouter(<AboutPage />, ['/about']);
    expect(screen.getByText(/manobhav creates a calm/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(await screen.findByText(/vision and mission/i, {}, { timeout: 1500 })).toBeInTheDocument();
  });

  it('opens and closes disclaimer policy details', async () => {
    const user = userEvent.setup();

    renderWithRouter(<DisclaimerPage />, ['/disclaimer']);

    await user.click(screen.getByRole('button', { name: /open terms & conditions/i }));
    const closeButtons = screen.getAllByRole('button', { name: /close terms & conditions/i });
    expect(closeButtons.length).toBeGreaterThan(0);

    await user.click(closeButtons[0]);
    expect(screen.queryAllByRole('button', { name: /close terms & conditions/i })).toHaveLength(0);
  });
});

describe('operational routes', () => {
  it('filters providers and lazy-loads the date picker when requested', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ProvidersPage onBackHome={vi.fn()} onBook={vi.fn()} />, ['/providers']);

    expect(screen.getByPlaceholderText(/search providers/i)).toBeInTheDocument();
    expect(await screen.findByText(/Clinical Specialist/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search providers/i), 'not-a-provider');
    expect(await screen.findByText(/no providers match this search/i)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search providers/i));
    await user.click(screen.getAllByRole('button', { name: /more dates/i })[0]);
    expect((await screen.findAllByText(/choose a date/i)).length).toBeGreaterThan(0);
  });

  it('creates a booking hold before continuing from provider selection', async () => {
    const user = userEvent.setup();
    const onBook = vi.fn();
    window.sessionStorage.setItem('manobhav-active-intake-submission-id', 'submission-1');

    renderWithRouter(<ProvidersPage onBackHome={vi.fn()} onBook={onBook} />, ['/providers']);

    expect(await screen.findByText(/Clinical Specialist/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Jun 5/i }));
    await user.click(screen.getByRole('button', { name: /book appointment/i }));

    await waitFor(() => expect(onBook).toHaveBeenCalledTimes(1));
    const holdCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith('/api/booking/holds'));
    expect(holdCall?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String((holdCall?.[1] as RequestInit).body))).toEqual({
      providerId: 'provider-1',
      slotId: 'slot-1',
      intakeSubmissionId: 'submission-1',
    });
    expect(window.sessionStorage.getItem('manobhav-booking-hold-id')).toBe('hold-1');
  });

  it('finalizes a stored booking hold on the appointment route', async () => {
    window.sessionStorage.setItem(
      'manobhav-auth-session',
      JSON.stringify({ accessToken: 'header.payload.signature', expiresAt: Date.now() + 60_000, groups: [] }),
    );
    window.sessionStorage.setItem('manobhav-booking-hold-id', 'hold-1');

    renderWithRouter(<AppointmentPage />, ['/appointment']);

    expect(await screen.findByText(/appointment confirmed/i)).toBeInTheDocument();
    const finalizeCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith('/api/booking/holds/hold-1/finalize'));
    expect(finalizeCall?.[1]).toMatchObject({ method: 'POST' });
    expect(window.sessionStorage.getItem('manobhav-booking-hold-id')).toBeNull();
  });

  it('renders routed admin modules through the admin shell', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/patients']}>
        <Routes>
          <Route path="/dashboard/admin/:module" element={<DashboardAdminPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/patient management/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/api/admin/dashboard'))).toBe(true);
    });
  });
});
