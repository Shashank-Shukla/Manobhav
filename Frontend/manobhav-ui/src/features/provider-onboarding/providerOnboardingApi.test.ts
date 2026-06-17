import { describe, expect, it, vi } from 'vitest';
import { startOrResumeProviderApplication, type ProviderApplication } from './providerOnboardingApi';

const application: ProviderApplication = {
  id: 'application-1',
  userId: 'user-1',
  status: 'Draft',
  currentStep: 'basic-profile',
  createdAtUtc: '2026-06-16T00:00:00.000Z',
  updatedAtUtc: null,
  submittedAtUtc: null,
};

describe('provider onboarding API contract', () => {
  it('resumes an existing provider application through the safe me endpoint', async () => {
    const fetchMock = vi.fn(async () => Response.json(application));
    vi.stubGlobal('fetch', fetchMock);

    const response = await startOrResumeProviderApplication();

    expect(response).toEqual(application);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/provider-onboarding/applications/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('creates a provider application only when no existing application is found', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ title: 'Not found' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json(application, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await startOrResumeProviderApplication();

    expect(response).toEqual(application);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/provider-onboarding/applications/me');
    expect(fetchMock.mock.calls[1]).toEqual([
      'https://api.example.com/api/provider-onboarding/applications',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    ]);
  });

  it('creates a new provider application when the latest application was rejected', async () => {
    const replacementApplication = { ...application, id: 'application-2', status: 'Draft' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ...application, status: 'Rejected' }))
      .mockResolvedValueOnce(Response.json(replacementApplication, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await startOrResumeProviderApplication();

    expect(response).toEqual(replacementApplication);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/api/provider-onboarding/applications');
  });
});
