import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  completeCognitoRedirect,
  getStoredAuthSession,
  isAdminSession,
  readAuthConfig,
  requestEmailOtp,
  resolveDashboardPath,
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

  it('resolves every authenticated role to the single /dashboard entry', () => {
    expect(resolveDashboardPath({ isAuthenticated: true, expiresAtUtc: null, groups: ['Admin'] })).toBe('/dashboard');
    expect(resolveDashboardPath({ isAuthenticated: true, expiresAtUtc: null, groups: ['Provider'] })).toBe('/dashboard');
    expect(resolveDashboardPath({ isAuthenticated: true, expiresAtUtc: null, groups: ['ProviderApplicant'] })).toBe('/dashboard');
    expect(resolveDashboardPath({ isAuthenticated: true, expiresAtUtc: null, groups: [] })).toBe('/dashboard');
    expect(resolveDashboardPath(null)).toBe('/dashboard');
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
    window.sessionStorage.setItem('manobhav-auth-return-to', '/dashboard');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard');
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

  it('routes to the dashboard role-router when the callback has no stored return target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: [] }),
      ),
    );
    window.sessionStorage.setItem('manobhav-auth-state', 'state-1');
    window.sessionStorage.setItem('manobhav-auth-code-verifier', 'verifier-1');

    const returnTo = await completeCognitoRedirect('https://app.example.com/callback?code=auth-code&state=state-1');

    expect(returnTo).toBe('/dashboard');
  });

  it('allows the dashboard role-router as the stored return target', async () => {
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

    expect(returnTo).toBe('/dashboard');
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

  it('routes to the dashboard role-router when the stored return target is unsafe', async () => {
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

    expect(returnTo).toBe('/dashboard');
  });

  it('requests an email OTP through the backend auth API and returns challenge metadata', async () => {
    const challenge = {
      challengeId: 'challenge-1',
      email: 'person@example.com',
      flow: 'sign-in',
      expiresAtUtc: '2026-06-18T12:05:00Z',
      resendAvailableAtUtc: '2026-06-18T12:01:00Z',
      retryAfterSeconds: 60,
      sendsRemainingThisHour: 4,
    };
    const fetchMock = vi.fn(async () => Response.json(challenge));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestEmailOtp({ email: 'person@example.com', flow: 'sign-in' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined];
    expect(String(url)).toBe('https://api.example.com/api/auth/email-otp/request');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'person@example.com',
      flow: 'sign-in',
    });
    expect(result).toEqual(challenge);
  });

  it('verifies an email OTP through the backend and caches an authenticated session', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        status: 'authenticated',
        session: { isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: ['Patient'] },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyEmailOtp({
      email: 'person@example.com',
      flow: 'sign-up',
      challengeId: 'challenge-1',
      otp: '123456',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined];
    expect(String(url)).toBe('https://api.example.com/api/auth/email-otp/verify');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'person@example.com',
      flow: 'sign-up',
      challengeId: 'challenge-1',
      otp: '123456',
    });
    expect(result).toEqual({
      status: 'authenticated',
      session: { isAuthenticated: true, expiresAtUtc: '2026-06-16T12:00:00Z', groups: ['Patient'] },
    });
    expect(getStoredAuthSession()).toEqual(result.session);
  });

  it('returns a follow-up sign-in challenge without treating the user as authenticated', async () => {
    const response = {
      status: 'sign-in-otp-required',
      message: 'Account created. Enter the sign-in code we just sent.',
      challenge: {
        challengeId: 'challenge-2',
        email: 'person@example.com',
        flow: 'sign-in',
        expiresAtUtc: '2026-06-18T12:10:00Z',
        resendAvailableAtUtc: '2026-06-18T12:06:00Z',
        retryAfterSeconds: 60,
        sendsRemainingThisHour: 3,
      },
    };
    const fetchMock = vi.fn(async () => Response.json(response));
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyEmailOtp({
      email: 'person@example.com',
      flow: 'sign-up',
      challengeId: 'challenge-1',
      otp: '123456',
    });

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
