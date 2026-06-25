import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { setRuntimeConfigForTests } from '../../shared/config/runtimeConfig';
import { useVisitorAnalytics } from './useVisitorAnalytics';

const fullCaptureConfig = {
  apiBaseUrl: 'https://api.example.com',
  auth: {
    cognitoDomain: 'https://cognito.example.com',
    clientId: 'client-id',
    redirectUri: 'https://app.example.com/callback',
    logoutUri: 'https://app.example.com',
    scopes: 'openid email phone profile',
    adminGroup: 'Admin',
  },
  visitorAnalytics: {
    enabled: true,
    fullCaptureEnabled: true,
    legalApproved: true,
    capturePreciseLocation: false,
  },
};

describe('useVisitorAnalytics stop-on-conversion', () => {
  beforeEach(() => {
    setRuntimeConfigForTests(fullCaptureConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // NOTE: this test must run before the authenticated test because the module
  // caches the created visitor id; an anonymous render is what populates it.
  it('creates a visitor session for anonymous visitors', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ visitorId: 'visitor-anon', fullCaptureEnabled: true, retentionDays: 365 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVisitorAnalytics('/', false));

    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/visitors/session'),
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });

  it('does not create a session or record events once the visitor is authenticated', async () => {
    const fetchMock = vi.fn(async () => Response.json({ visitorId: 'visitor-auth' }));
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useVisitorAnalytics('/dashboard/patient', true));
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
