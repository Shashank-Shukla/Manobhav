import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeCognitoRedirect, isAdminSession } from './cognitoAuth';

describe('cognito auth helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubEnv('VITE_PUBLIC_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('VITE_PUBLIC_COGNITO_DOMAIN', 'https://cognito.example.com');
    vi.stubEnv('VITE_PUBLIC_COGNITO_CLIENT_ID', 'client-id');
    vi.stubEnv('VITE_PUBLIC_COGNITO_REDIRECT_URI', 'https://app.example.com/callback');
    vi.stubEnv('VITE_PUBLIC_COGNITO_LOGOUT_URI', 'https://app.example.com/');
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requires the configured admin group for admin sessions', () => {
    expect(isAdminSession({ isAuthenticated: true, expiresAtUtc: null, groups: ['Admin'] }, 'Admin')).toBe(true);
    expect(isAdminSession({ isAuthenticated: true, expiresAtUtc: null, groups: ['Visitor'] }, 'Admin')).toBe(false);
  });

  it('posts callback code and pkce verifier to backend without storing tokens in the browser', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: ['Admin'] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');
    window.sessionStorage.setItem('manobhav-auth-return-to', '/dashboard/admin');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard/admin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined];
    expect(String(url)).toBe('https://api.example.com/api/auth/callback');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      code: 'auth-code',
      codeVerifier: 'verifier-1',
      redirectUri: 'https://app.example.com/callback',
    });
    expect(window.sessionStorage.getItem('manobhav-auth-session')).toBeNull();
    expect(window.sessionStorage.getItem('manobhav-auth-code-verifier')).toBeNull();
  });
});
