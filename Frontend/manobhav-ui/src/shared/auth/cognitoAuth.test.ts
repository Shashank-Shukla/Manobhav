import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  completeCognitoRedirect,
  getStoredAuthSession,
  isAdminSession,
  readAuthConfig,
  requestEmailOtp,
  verifyEmailOtp,
} from './cognitoAuth';

describe('cognito auth helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('requires the configured admin group for admin sessions', () => {
    expect(isAdminSession({ isAuthenticated: true, expiresAtUtc: null, groups: ['Admin'] }, 'Admin')).toBe(true);
    expect(isAdminSession({ isAuthenticated: true, expiresAtUtc: null, groups: ['Visitor'] }, 'Admin')).toBe(false);
  });

  it('reads Cognito public settings from loaded runtime config', () => {
    expect(readAuthConfig()).toMatchObject({
      domain: 'https://cognito.example.com',
      clientId: 'client-id',
      redirectUri: 'https://app.example.com/callback',
      logoutUri: 'https://app.example.com',
      scopes: 'openid email phone profile',
      adminGroup: 'Admin',
    });
  });

  it('builds the Cognito authorize URL from runtime config', () => {
    const authorizeUrl = buildAuthorizeUrl(readAuthConfig(), 'state-1', 'challenge-1', 'Google');

    expect(authorizeUrl.origin).toBe('https://cognito.example.com');
    expect(authorizeUrl.pathname).toBe('/oauth2/authorize');
    expect(authorizeUrl.searchParams.get('client_id')).toBe('client-id');
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
    expect(authorizeUrl.searchParams.get('scope')).toBe('openid email phone profile');
    expect(authorizeUrl.searchParams.get('identity_provider')).toBe('Google');
    expect(authorizeUrl.searchParams.get('state')).toBe('state-1');
    expect(authorizeUrl.searchParams.get('code_challenge')).toBe('challenge-1');
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

  it('falls back to the patient dashboard when the callback has no stored return target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: [] }),
      ),
    );
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard/patient');
  });

  it('maps the stored dashboard chooser return target to the patient dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: [] }),
      ),
    );
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');
    window.sessionStorage.setItem('manobhav-auth-return-to', '/dashboard');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard/patient');
  });

  it('preserves provider onboarding as the stored post-login return target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: [] }),
      ),
    );
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');
    window.sessionStorage.setItem('manobhav-auth-return-to', '/onboarding/provider');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/onboarding/provider');
  });

  it('falls back to the patient dashboard when the stored return target is unsafe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: [] }),
      ),
    );
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');
    window.sessionStorage.setItem('manobhav-auth-return-to', 'https://evil.example/onboarding/provider');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard/patient');
  });

  it('requests an email OTP through the backend auth API', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await requestEmailOtp({ email: 'person@example.com', flow: 'sign-in' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined];
    expect(String(url)).toBe('https://api.example.com/api/auth/email-otp/request');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'person@example.com',
      flow: 'sign-in',
    });
  });

  it('verifies an email OTP through the backend and caches the authenticated session', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: ['Patient'] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const session = await verifyEmailOtp({ email: 'person@example.com', flow: 'sign-up', otp: '123456' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined];
    expect(String(url)).toBe('https://api.example.com/api/auth/email-otp/verify');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'person@example.com',
      flow: 'sign-up',
      otp: '123456',
    });
    expect(session).toEqual({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: ['Patient'] });
    expect(getStoredAuthSession()).toEqual(session);
  });
});
