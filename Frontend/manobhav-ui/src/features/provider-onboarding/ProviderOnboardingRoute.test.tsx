import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingProviderPage } from './ProviderOnboardingRoute';
import type { ProviderApplication } from './providerOnboardingApi';

const application: ProviderApplication = {
  id: 'application-1',
  userId: 'user-1',
  status: 'Draft',
  currentStep: 'basic-profile',
  createdAtUtc: '2026-06-16T00:00:00.000Z',
  updatedAtUtc: null,
  submittedAtUtc: null,
};

const taxonomy = {
  specializations: [
    { key: 'anxiety', label: 'Anxiety' },
    { key: 'burnout', label: 'Burnout' },
  ],
  therapyApproaches: [
    { key: 'cbt', label: 'CBT' },
    { key: 'mindfulness', label: 'Mindfulness' },
  ],
  languages: [
    { key: 'english', label: 'English' },
    { key: 'hindi', label: 'Hindi' },
  ],
};

const taxonomyCacheKey = 'manobhav-provider-onboarding-taxonomy';
const draftStoragePrefix = 'manobhav-provider-onboarding-draft';
const draftStorageKey = `${draftStoragePrefix}:application-1`;
let applicationResponse: ProviderApplication;
let saveHandler: (sectionKey: string, body: unknown) => Response;

describe('provider onboarding route', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    applicationResponse = application;
    saveHandler = (_sectionKey, body) => Response.json({ ...applicationResponse, currentStep: getBodyCurrentStep(body) });
    vi.stubGlobal('fetch', vi.fn(handleProviderOnboardingFetch));
  });

  it('renders form content without the provider onboarding header or back button', async () => {
    renderProviderPage();

    expect(await screen.findByRole('heading', { name: /your profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /provider onboarding/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^back$/i })).not.toBeInTheDocument();
  });

  it('keeps provider onboarding content below fixed navbar space and avoids stretching the details panel', async () => {
    renderProviderPage();

    expect(await screen.findByTestId('provider-onboarding-layout')).toHaveClass('pt-28');
    expect(screen.getByTestId('provider-onboarding-layout')).toHaveClass('items-start');
    expect(screen.getByTestId('provider-onboarding-panel')).toHaveClass('self-start');
  });

  it('validates required fields before saving and keeps future sections disabled', async () => {
    const user = userEvent.setup();

    renderProviderPage();

    const legalName = await screen.findByLabelText(/legal name/i);

    expect(screen.getByRole('button', { name: /bio and approach/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /specializations/i })).toBeDisabled();
    expect(legalName).toBeRequired();

    await user.click(screen.getByRole('button', { name: /save and continue/i }));

    expect(await screen.findByText(/legal name is required/i)).toBeInTheDocument();
    expect(legalName).toHaveAttribute('aria-invalid', 'true');
    expect(findFetchCall('/api/provider-onboarding/applications/application-1/sections/basic-profile')).toBeUndefined();
  });

  it('saves the current section, marks it complete, activates the next section, and allows backtracking', async () => {
    const user = userEvent.setup();

    renderProviderPage();

    await user.type(await screen.findByLabelText(/legal name/i), 'Dr. Asha Rao');
    await user.type(screen.getByLabelText(/display name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: /save and continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bio and approach/i })).toBeInTheDocument();
    });

    const saveCall = findFetchCall('/api/provider-onboarding/applications/application-1/sections/basic-profile');
    expect(JSON.parse(String((saveCall?.[1] as RequestInit).body))).toEqual({
      basicIdentity: {
        legalName: 'Dr. Asha Rao',
        displayName: 'Asha Rao',
        email: 'asha@example.com',
        phone: '',
        location: '',
      },
      currentStep: 'bio',
    });
    expect(screen.getByRole('button', { name: /your profile/i })).toHaveClass('bg-[#EEF4EA]');
    expect(screen.getByRole('button', { name: /your profile/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /specializations/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /your profile/i }));

    expect(screen.getByDisplayValue('Dr. Asha Rao')).toBeInTheDocument();
  });

  it('hydrates saved section data when backend returns the real sections dictionary', async () => {
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
    applicationResponse = {
      ...application,
      currentStep: 'bio',
      sections: {
        basicIdentity: {
          legalName: 'Dr. Saved Provider',
          displayName: 'Saved Provider',
          email: 'saved@example.com',
          phone: '9999999999',
          location: 'Mumbai',
        },
        bioAndApproach: {
          shortBio: 'Grounded support for high-stress seasons.',
          longBio: 'Longer saved profile.',
          approach: 'Collaborative care.',
          languages: ['english', 'hindi'],
        },
        specializations: {
          focusAreas: ['anxiety'],
          ageGroups: ['Adults'],
          therapyGoals: ['Stress'],
        },
        therapyApproaches: {
          modalities: ['cbt'],
          deliveryModes: ['Online'],
        },
        sessionDetails: {
          availabilitySummary: 'Weekdays',
          capacityPerWeek: 12,
        },
        credentials: {
          items: [{
            credentialType: 'License',
            title: 'Clinical Psychologist',
            institution: 'RCI',
            licenseNumber: 'A123',
            year: 2020,
          }],
        },
        payout: {
          payoutMode: 'Bank',
          accountHolderName: 'Saved Provider',
          notes: 'Verified later',
        },
      },
    };

    renderProviderPage();

    expect(await screen.findByDisplayValue('Grounded support for high-stress seasons.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hindi' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps unsaved provider edits in memory without writing provider form data to browser storage', async () => {
    const user = userEvent.setup();
    const view = renderProviderPage();

    await user.type(await screen.findByLabelText(/legal name/i), 'Dr. Memory Only');

    expect(screen.getByDisplayValue('Dr. Memory Only')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();

    view.unmount();

    renderProviderPage();

    expect(await screen.findByLabelText(/legal name/i)).toHaveValue('');
    expect(screen.queryByDisplayValue('Dr. Memory Only')).not.toBeInTheDocument();
  });

  it('purges legacy provider browser-storage drafts on load while preserving taxonomy cache', async () => {
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
    window.localStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Legacy Local')));
    window.localStorage.setItem(`${draftStoragePrefix}:legacy-application`, JSON.stringify(createStoredDrafts('Dr. Other Legacy')));
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Legacy Session')));
    window.sessionStorage.setItem(`${draftStoragePrefix}:legacy-application`, JSON.stringify(createStoredDrafts('Dr. Other Session')));

    renderProviderPage();

    expect(await screen.findByRole('heading', { name: /your profile/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.localStorage.getItem(`${draftStoragePrefix}:legacy-application`)).toBeNull();
    expect(window.sessionStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(`${draftStoragePrefix}:legacy-application`)).toBeNull();
    expect(window.localStorage.getItem(taxonomyCacheKey)).toBe(JSON.stringify(taxonomy));
  });

  it('does not let stale local or session drafts override non-empty server hydration', async () => {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Stale Local')));
    window.sessionStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        drafts: createStoredDrafts('Dr. Stale Session'),
        expiresAt: Date.now() + 60_000,
      }),
    );
    applicationResponse = {
      ...application,
      sections: {
        basicIdentity: {
          legalName: 'Dr. Server Provider',
          displayName: 'Server Provider',
          email: 'server@example.com',
          phone: '',
          location: '',
        },
      },
    };

    renderProviderPage();

    expect(await screen.findByDisplayValue('Dr. Server Provider')).toBeInTheDocument();
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(draftStorageKey)).toBeNull();
    expect(screen.queryByDisplayValue('Dr. Stale Local')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Dr. Stale Session')).not.toBeInTheDocument();
  });

  it('purges legacy browser draft data after a successful section save', async () => {
    const user = userEvent.setup();

    renderProviderPage();

    await user.type(await screen.findByLabelText(/legal name/i), 'Dr. Clear Draft');
    await user.type(screen.getByLabelText(/display name/i), 'Clear Draft');
    await user.type(screen.getByLabelText(/email/i), 'clear@example.com');
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
    window.localStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Legacy Save')));
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Legacy Session Save')));

    await user.click(screen.getByRole('button', { name: /save and continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bio and approach/i })).toBeInTheDocument();
    });
    expect(window.sessionStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.localStorage.getItem(taxonomyCacheKey)).toBe(JSON.stringify(taxonomy));
  });

  it('saves selected focus areas and mandatory age groups from the specializations pickers', async () => {
    const user = userEvent.setup();
    applicationResponse = { ...application, currentStep: 'specializations' };

    renderProviderPage();

    // The first focus-area category is active by default, so its sub-options (incl. Anxiety) show as chips.
    const anxietyChip = await screen.findByRole('button', { name: 'Anxiety' });
    expect(screen.queryByRole('textbox', { name: /focus areas/i })).not.toBeInTheDocument();

    await user.click(anxietyChip);
    expect(screen.getByRole('button', { name: 'Anxiety' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Anxiety' }));
    expect(screen.getByRole('button', { name: 'Anxiety' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Anxiety' }));

    // Age groups are now mandatory before the section can be saved.
    await user.click(screen.getByRole('button', { name: 'Under 13 years' }));

    await user.click(screen.getByRole('button', { name: /save and continue/i }));

    await waitFor(() => {
      const saveCall = findFetchCall('/api/provider-onboarding/applications/application-1/sections/specializations');
      expect(JSON.parse(String((saveCall?.[1] as RequestInit).body))).toEqual({
        specializations: {
          focusAreas: ['Anxiety'],
          ageGroups: ['Under 13 years'],
        },
        currentStep: 'modalities',
      });
    });
  });

  it('uses cached taxonomy for language chips without another taxonomy request', async () => {
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
    applicationResponse = { ...application, currentStep: 'bio' };

    renderProviderPage();

    expect(await screen.findByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /languages/i })).toBeInTheDocument();
    expect(findFetchCall('/api/provider-onboarding/taxonomy')).toBeUndefined();
  });

  it('shows friendly API errors and keeps internal upload backlog copy out of credentials', async () => {
    const user = userEvent.setup();
    saveHandler = () =>
      Response.json(
        { title: 'Invalid provider section.', detail: 'Please review the highlighted fields.' },
        { status: 400 },
      );

    renderProviderPage();

    await user.type(await screen.findByLabelText(/legal name/i), 'Dr. Asha Rao');
    await user.type(screen.getByLabelText(/display name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: /save and continue/i }));

    expect(await screen.findByText(/invalid provider section\. please review the highlighted fields\./i)).toBeInTheDocument();
    expect(screen.queryByText(/api request failed with status 400/i)).not.toBeInTheDocument();

    applicationResponse = { ...application, currentStep: 'credentials' };
    renderProviderPage();

    expect(await screen.findByRole('heading', { name: /your credentials/i })).toBeInTheDocument();
    expect(screen.queryByText(/s3/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pre-?sign/i)).not.toBeInTheDocument();
  });

  it('sends provider details for admin review and redirects to the provider dashboard', async () => {
    const user = userEvent.setup();
    applicationResponse = { ...application, currentStep: 'review' };

    renderProviderPage();

    await screen.findByRole('button', { name: /send for admin review/i });
    window.localStorage.setItem(taxonomyCacheKey, JSON.stringify(taxonomy));
    window.localStorage.setItem(draftStorageKey, JSON.stringify(createStoredDrafts('Dr. Legacy Submit')));
    await user.click(await screen.findByRole('button', { name: /send for admin review/i }));

    await waitFor(() => {
      expect(findFetchCall('/api/provider-onboarding/applications/application-1/submit')).toBeTruthy();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
    });
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();
    expect(window.localStorage.getItem(taxonomyCacheKey)).toBe(JSON.stringify(taxonomy));
  });

  it('pre-fills and locks the email field when the backend returns a Cognito email', async () => {
    const user = userEvent.setup();
    applicationResponse = { ...application, email: 'cognito-provider@example.com' };

    renderProviderPage();

    const emailField = await screen.findByLabelText(/email/i);
    expect(emailField).toHaveValue('cognito-provider@example.com');
    expect(emailField).toHaveAttribute('readonly');

    await user.type(emailField, 'tampered@example.com');
    expect(emailField).toHaveValue('cognito-provider@example.com');
  });

  it('keeps the email field editable when the backend returns no Cognito email', async () => {
    const user = userEvent.setup();
    applicationResponse = { ...application, email: null };

    renderProviderPage();

    const emailField = await screen.findByLabelText(/email/i);
    expect(emailField).toHaveValue('');
    expect(emailField).not.toHaveAttribute('readonly');

    await user.type(emailField, 'typed@example.com');
    expect(emailField).toHaveValue('typed@example.com');
  });

  it('redirects to the provider dashboard when the backend returns an already submitted application', async () => {
    applicationResponse = {
      ...application,
      status: 'Submitted',
      currentStep: 'review',
      submittedAtUtc: '2026-06-16T00:01:00.000Z',
    };

    renderProviderPage();

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
    });
  });
});

function renderProviderPage() {
  return render(
    <MemoryRouter initialEntries={['/onboarding/provider']}>
      <OnboardingProviderPage onBack={vi.fn()} />
      <CurrentLocation />
    </MemoryRouter>,
  );
}

function CurrentLocation() {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname}</span>;
}

async function handleProviderOnboardingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url.endsWith('/api/provider-onboarding/applications/me')) {
    return Response.json(applicationResponse);
  }

  if (url.endsWith('/api/provider-onboarding/applications')) {
    return Response.json(applicationResponse, { status: 201 });
  }

  if (url.endsWith('/api/provider-onboarding/taxonomy')) {
    return Response.json(taxonomy);
  }

  if (url.includes('/api/provider-onboarding/applications/application-1/sections/')) {
    const sectionKey = url.split('/').pop() ?? '';
    return saveHandler(sectionKey, JSON.parse(String(init?.body ?? '{}')));
  }

  if (url.endsWith('/api/provider-onboarding/applications/application-1/submit')) {
    return Response.json({ ...applicationResponse, status: 'Submitted', submittedAtUtc: '2026-06-16T00:01:00.000Z' });
  }

  return Response.json({ title: 'Not found' }, { status: 404 });
}

function findFetchCall(path: string) {
  return vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith(path));
}

function getBodyCurrentStep(body: unknown): string | null {
  if (body && typeof body === 'object' && 'currentStep' in body) {
    return String(body.currentStep);
  }

  return null;
}

function createStoredDrafts(legalName: string) {
  return {
    'basic-profile': {
      legalName,
      displayName: legalName,
      email: `${legalName.toLowerCase().replaceAll(/\W+/g, '.')}@example.com`,
      phone: '',
      location: '',
    },
  };
}
