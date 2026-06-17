import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBootstrapApiBaseUrl } from '../config/runtimeConfig';
import { ApiError, apiRequest, getApiBaseUrl } from './apiClient';

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

  it('retries unsafe requests with a server-issued csrf token when the cookie is not readable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ title: 'CSRF token validation failed.' }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ csrfToken: 'server-token' }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest<{ ok: boolean }>('/api/provider-onboarding/applications', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/api/auth/csrf-token');
    const retryInit = (fetchMock.mock.calls[2] as unknown as [RequestInfo | URL, RequestInit | undefined])[1];
    expect(new Headers(retryInit?.headers).get('X-CSRF-Token')).toBe('server-token');
  });

  it('retries unsafe requests with a server-issued csrf token when a readable token is stale', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ title: 'CSRF token validation failed.' }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ csrfToken: 'fresh-server-token' }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'mbv_csrf=stale-token; path=/';

    await apiRequest<{ ok: boolean }>('/api/provider-onboarding/applications', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstInit = (fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined])[1];
    expect(new Headers(firstInit?.headers).get('X-CSRF-Token')).toBe('stale-token');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/api/auth/csrf-token');
    const retryInit = (fetchMock.mock.calls[2] as unknown as [RequestInfo | URL, RequestInit | undefined])[1];
    expect(new Headers(retryInit?.headers).get('X-CSRF-Token')).toBe('fresh-server-token');
  });

  it('uses ProblemDetails title and detail for user-facing error messages', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { title: 'Invalid provider section.', detail: 'Please select at least one specialization.' },
        { status: 400 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const failure = await captureApiError(() => apiRequest('/api/provider-onboarding/applications'));

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.status).toBe(400);
    expect(failure.message).toBe('Invalid provider section. Please select at least one specialization.');
    expect(failure.message).not.toMatch(/API request failed with status/i);
  });

  it('does not leak raw status wording when an error response has no readable ProblemDetails body', async () => {
    const fetchMock = vi.fn(async () => new Response('internal error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const failure = await captureApiError(() => apiRequest('/api/provider-onboarding/applications'));

    expect(failure.status).toBe(500);
    expect(failure.message).toBe("We couldn't complete the request. Please try again.");
    expect(failure.message).not.toMatch(/API request failed with status/i);
  });
});

async function captureApiError(action: () => Promise<unknown>): Promise<ApiError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected request to fail.');
}
