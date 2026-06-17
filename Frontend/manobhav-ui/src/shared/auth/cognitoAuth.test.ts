import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthorizeUrl, completeCognitoRedirect, isAdminSession, readAuthConfig } from './cognitoAuth';

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
});
