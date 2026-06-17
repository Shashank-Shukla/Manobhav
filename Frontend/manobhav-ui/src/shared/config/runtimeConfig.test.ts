import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBootstrapApiBaseUrl,
  getRuntimeConfig,
  loadRuntimeConfig,
  resetRuntimeConfigForTests,
  setRuntimeConfigForTests,
} from './runtimeConfig';

describe('runtime config', () => {
  afterEach(() => {
    resetRuntimeConfigForTests();
    vi.restoreAllMocks();
  });

  it('loads public runtime config from the bootstrap API origin once', async () => {
    resetRuntimeConfigForTests();
    const fetchMock = vi.fn(async () => Response.json(createRuntimeConfig()));
    vi.stubGlobal('fetch', fetchMock);

    const config = await loadRuntimeConfig({ VITE_PUBLIC_API_BASE_URL: 'https://api.example.com/' });

    expect(config.auth.cognitoDomain).toBe('https://cognito.example.com');
    expect(getRuntimeConfig().visitorAnalytics.fullCaptureEnabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/public/runtime-config',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('keeps Vite env usage limited to the bootstrap API URL', () => {
    expect(getBootstrapApiBaseUrl({ DEV: false, VITE_PUBLIC_API_BASE_URL: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    );
    expect(getBootstrapApiBaseUrl({ DEV: true, VITE_PUBLIC_API_BASE_URL: '' })).toBe('http://localhost:5163');
  });

  it('supports test-time runtime config injection', () => {
    setRuntimeConfigForTests(createRuntimeConfig());

    expect(getRuntimeConfig().apiBaseUrl).toBe('https://api.example.com');
  });
});

function createRuntimeConfig() {
  return {
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
      fullCaptureEnabled: false,
      legalApproved: false,
      capturePreciseLocation: false,
    },
  };
}
