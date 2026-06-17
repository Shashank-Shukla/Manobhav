import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBootstrapApiBaseUrl } from '../config/runtimeConfig';
import { apiRequest, getApiBaseUrl } from './apiClient';

describe('api client configuration', () => {
  afterEach(() => {
    document.cookie = 'mbv_csrf=; Max-Age=0; path=/';
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses the loaded runtime API base URL', () => {
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('keeps build-time env handling limited to the runtime config bootstrap URL', () => {
    expect(getBootstrapApiBaseUrl({ VITE_PUBLIC_API_BASE_URL: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    );
    expect(getBootstrapApiBaseUrl({ DEV: true, VITE_PUBLIC_API_BASE_URL: '' })).toBe('http://localhost:5163');
    expect(getBootstrapApiBaseUrl({ DEV: false, VITE_PUBLIC_API_BASE_URL: '' })).toBe('');
  });

  it('sends credentials so backend-owned visitor cookies are included', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest<{ ok: boolean }>('/api/public/landing');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/landing'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('does not expose an auth opt-out because cookie credentials are always included', () => {
    type ApiRequestOptions = NonNullable<Parameters<typeof apiRequest>[1]>;
    // @ts-expect-error includeAuth is intentionally unsupported.
    const options: ApiRequestOptions = { includeAuth: false };

    expect(options).toEqual({ includeAuth: false });
  });

  it('does not send browser-readable bearer tokens from storage', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    window.sessionStorage.setItem(
      'manobhav-auth-session',
      JSON.stringify({ accessToken: 'browser-token', expiresAt: Date.now() + 60000, groups: ['Admin'] }),
    );

    await apiRequest<{ ok: boolean }>('/api/admin/dashboard');

    const init = (fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined])[1];
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });

  it('sends csrf token from cookie on unsafe requests', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'mbv_csrf=csrf-token; path=/';

    await apiRequest<{ ok: boolean }>('/api/admin/dashboard', { method: 'POST', body: { action: 'save' } });

    const init = (fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined])[1];
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('csrf-token');
  });
});
