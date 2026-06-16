import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingProviderPage } from './ProviderOnboardingRoute';

const application = {
  id: 'application-1',
  userId: 'user-1',
  status: 'Draft',
  currentStep: 'basic-profile',
  createdAtUtc: '2026-06-16T00:00:00.000Z',
  updatedAtUtc: null,
  submittedAtUtc: null,
};

describe('provider onboarding route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(handleProviderOnboardingFetch));
  });

  it('saves basic identity through typed fields', async () => {
    const user = userEvent.setup();

    render(<OnboardingProviderPage onBack={vi.fn()} />);

    await user.type(await screen.findByLabelText(/legal name/i), 'Dr. Asha Rao');
    await user.type(screen.getByLabelText(/display name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/email/i), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: /save section/i }));

    await waitFor(() => {
      const saveCall = findFetchCall('/api/provider-onboarding/applications/application-1/sections/basic-profile');
      expect(saveCall).toBeTruthy();
      expect(JSON.parse(String((saveCall?.[1] as RequestInit).body))).toEqual({
        basicIdentity: {
          legalName: 'Dr. Asha Rao',
          displayName: 'Asha Rao',
          email: 'asha@example.com',
          phone: '',
          location: '',
        },
        currentStep: 'basic-profile',
      });
    });
  });

  it('shows save failures and can submit for review after navigating to review', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(async () => Response.json(application));
    vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify({ title: 'Invalid provider section.' }), { status: 400 }));
    vi.mocked(fetch).mockImplementationOnce(async () => Response.json({ ...application, status: 'Submitted', submittedAtUtc: '2026-06-16T00:01:00.000Z' }));

    render(<OnboardingProviderPage onBack={vi.fn()} />);

    await screen.findByLabelText(/legal name/i);
    await user.click(screen.getByRole('button', { name: /save section/i }));
    expect(await screen.findByText(/api request failed with status 400/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /review and submit/i }));
    await user.click(screen.getByRole('button', { name: /submit for review/i }));

    expect(await screen.findByRole('button', { name: /submitted/i })).toBeDisabled();
  });
});

async function handleProviderOnboardingFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  if (url.endsWith('/api/provider-onboarding/applications')) {
    return Response.json(application, { status: 201 });
  }

  if (url.includes('/api/provider-onboarding/applications/application-1/sections/')) {
    return Response.json(application);
  }

  if (url.endsWith('/api/provider-onboarding/applications/application-1/submit')) {
    return Response.json({ ...application, status: 'Submitted', submittedAtUtc: '2026-06-16T00:01:00.000Z' });
  }

  return new Response(JSON.stringify({ title: 'Not found' }), { status: 404 });
}

function findFetchCall(path: string) {
  return vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith(path));
}
