import { ApiError, apiRequest } from '../api/apiClient';
import { getRuntimeConfig } from '../config/runtimeConfig';

export type AuthSession = {
  isAuthenticated: boolean;
  expiresAtUtc: string | null;
  groups: string[];
  email?: string | null;
  name?: string | null;
};

export type EmailOtpFlow = 'sign-in' | 'sign-up';

export type EmailOtpAuthResponse = {
  challengeId: string;
  email: string;
  flow: EmailOtpFlow;
  expiresAtUtc: string;
  resendAvailableAtUtc: string | null;
  retryAfterSeconds: number | null;
  sendsRemainingThisHour: number | null;
};

export type VerifyEmailOtpResponse =
  | {
      status: 'authenticated';
      session: AuthSession;
      challenge?: never;
      message?: string;
    }
  | {
      status: 'sign-in-otp-required';
      session?: never;
      challenge: EmailOtpAuthResponse;
      message?: string;
    };

type CognitoAuthConfig = {
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  scopes: string;
  adminGroup: string;
};

const STATE_KEY = 'manobhav-auth-state';
const VERIFIER_KEY = 'manobhav-auth-code-verifier';
const RETURN_TO_KEY = 'manobhav-auth-return-to';
const DEFAULT_POST_LOGIN_RETURN_TO = '/dashboard';

let cachedSession: AuthSession | null = null;
const sessionListeners = new Set<() => void>();

// Single source of truth for the session: mutating it here notifies every `useAuthSession`
// consumer (NavBar, route guards, dashboards) so they never get stuck out of sync — e.g. the
// NavBar showing "Login" after a guard has already loaded the authenticated session.
function setCachedSession(next: AuthSession | null): AuthSession | null {
  cachedSession = next;
  for (const listener of sessionListeners) {
    listener();
  }
  return cachedSession;
}

export function readAuthConfig(): CognitoAuthConfig {
  const config = getRuntimeConfig().auth;
  return {
    domain: stripTrailingSlash(config.cognitoDomain),
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    logoutUri: config.logoutUri,
    scopes: config.scopes,
    adminGroup: config.adminGroup,
  };
}

export function getStoredAuthSession(): AuthSession | null {
  return cachedSession;
}

/** Subscribe to session changes so all hook instances stay in sync (used by useSyncExternalStore). */
export function subscribeAuthSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function isAdminSession(session: AuthSession | null, adminGroup = readAuthConfig().adminGroup): boolean {
  return isActiveSession(session) && session.groups.some((group) => group === adminGroup);
}

/**
 * Dashboard entry path. There is a single role-routed `/dashboard` surface that
 * renders the Admin, Provider, or Patient dashboard in place based on the
 * session groups, so every caller (NavBar profile menu, post-login) lands on
 * the same URL and the role decision lives in `RoleDashboard`.
 */
export function resolveDashboardPath(session: AuthSession | null): string {
  void session;
  return '/dashboard';
}

/**
 * True when the session belongs to a provider or provider applicant. Used by the
 * `/dashboard` role router to pick the provider dashboard.
 */
export function hasProviderRole(session: AuthSession | null): boolean {
  return Boolean(
    session?.groups.some((group) => {
      const normalized = group.trim().toLowerCase();
      return normalized === 'provider' || normalized === 'providerapplicant';
    }),
  );
}

export async function fetchAuthSession(signal?: AbortSignal): Promise<AuthSession | null> {
  try {
    return setCachedSession(normalizeSession(await apiRequest<AuthSession>('/api/auth/session', { signal })));
  } catch (err) {
    if (isAnonymousSessionError(err)) {
      return setCachedSession(null);
    }
    throw err;
  }
}

/**
 * Re-reads the canonical session from the backend, replacing the cached copy. Use this after an
 * action that changes the user's role server-side (e.g. submitting a provider application grants the
 * `ProviderApplicant` role) so the next role-routing decision reflects the new role immediately.
 */
export async function refreshAuthSession(signal?: AbortSignal): Promise<AuthSession | null> {
  setCachedSession(null);
  return fetchAuthSession(signal);
}

export async function startCognitoLogin(options: { identityProvider?: string; returnTo?: string } = {}): Promise<void> {
  const config = readAuthConfig();
  assertConfigured(config);

  const state = createRandomString();
  const verifier = createRandomString(64);
  const challenge = await createCodeChallenge(verifier);
  window.sessionStorage.setItem(STATE_KEY, state);
  window.sessionStorage.setItem(VERIFIER_KEY, verifier);
  if (options.returnTo) {
    window.sessionStorage.setItem(RETURN_TO_KEY, options.returnTo);
  }

  window.location.assign(buildAuthorizeUrl(config, state, challenge, options.identityProvider).toString());
}

export async function requestEmailOtp(input: { email: string; flow: EmailOtpFlow }): Promise<EmailOtpAuthResponse> {
  return apiRequest<EmailOtpAuthResponse>('/api/auth/email-otp/request', {
    method: 'POST',
    body: {
      email: input.email,
      flow: input.flow,
    },
  });
}

export async function verifyEmailOtp(input: {
  email: string;
  flow: EmailOtpFlow;
  challengeId: string;
  otp: string;
}): Promise<VerifyEmailOtpResponse> {
  const response = await apiRequest<VerifyEmailOtpResponse>('/api/auth/email-otp/verify', {
      method: 'POST',
      body: {
        email: input.email,
        flow: input.flow,
        challengeId: input.challengeId,
        otp: input.otp,
      },
    });

  if (response.status === 'authenticated') {
    const session = normalizeSession(response.session);
    setCachedSession(session);
    return { ...response, session };
  }

  return response;
}

export async function completeCognitoRedirect(url = window.location.href): Promise<string> {
  const config = readAuthConfig();
  assertConfigured(config);

  const callback = readCallbackParams(url);
  setCachedSession(normalizeSession(await createBackendSession(callback, config.redirectUri)));
  clearTransientAuthState();
  return readAndClearReturnTo();
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  setCachedSession(null);
  redirectToCognitoLogout(readAuthConfig());
}

function createBackendSession(
  callback: { code: string; verifier: string },
  redirectUri: string,
): Promise<AuthSession> {
  return apiRequest<AuthSession>('/api/auth/callback', {
    method: 'POST',
    body: {
      code: callback.code,
      codeVerifier: callback.verifier,
      redirectUri,
    },
  });
}

export function buildAuthorizeUrl(
  config: CognitoAuthConfig,
  state: string,
  challenge: string,
  identityProvider?: string,
): URL {
  const url = new URL(`${config.domain}/oauth2/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);
  if (identityProvider) {
    url.searchParams.set('identity_provider', identityProvider);
  }
  return url;
}

function redirectToCognitoLogout(config: CognitoAuthConfig): void {
  if (!config.domain || !config.clientId || !config.logoutUri) {
    return;
  }

  const url = new URL(`${config.domain}/logout`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('logout_uri', config.logoutUri);
  window.location.assign(url.toString());
}

function assertConfigured(config: CognitoAuthConfig): void {
  if (!config.domain || !config.clientId || !config.redirectUri) {
    throw new Error('Cognito public configuration is incomplete.');
  }
}

function normalizeSession(session: AuthSession): AuthSession {
  return {
    isAuthenticated: session.isAuthenticated === true,
    expiresAtUtc: session.expiresAtUtc ?? null,
    groups: Array.isArray(session.groups) ? session.groups : [],
    email: session.email,
    name: session.name,
  };
}

function isActiveSession(session: AuthSession | null): session is AuthSession {
  return session?.isAuthenticated === true && !isExpired(session.expiresAtUtc);
}

function isExpired(expiresAtUtc: string | null): boolean {
  return Boolean(expiresAtUtc && Date.parse(expiresAtUtc) <= Date.now());
}

function isAnonymousSessionError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

function readCallbackParams(url: string): { code: string; verifier: string } {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);

  assertValidCallbackState(code, state, verifier);
  return { code, verifier: verifier as string };
}

function assertValidCallbackState(code: string | null, state: string | null, verifier: string | null): asserts code is string {
  const expectedState = window.sessionStorage.getItem(STATE_KEY);
  if (isInvalidCallbackState(code, state, expectedState, verifier)) {
    throw new Error('Invalid Cognito callback state.');
  }
}

function isInvalidCallbackState(
  code: string | null,
  state: string | null,
  expectedState: string | null,
  verifier: string | null,
): boolean {
  return !code || !state || !expectedState || !verifier || state !== expectedState;
}

function clearTransientAuthState(): void {
  window.sessionStorage.removeItem(STATE_KEY);
  window.sessionStorage.removeItem(VERIFIER_KEY);
}

function readAndClearReturnTo(): string {
  const returnTo = window.sessionStorage.getItem(RETURN_TO_KEY);
  window.sessionStorage.removeItem(RETURN_TO_KEY);
  return normalizePostLoginReturnTo(returnTo);
}

function normalizePostLoginReturnTo(returnTo: string | null): string {
  if (!isSafePostLoginReturnTo(returnTo)) {
    return DEFAULT_POST_LOGIN_RETURN_TO;
  }

  return returnTo;
}

function isSafePostLoginReturnTo(returnTo: string | null): returnTo is string {
  return Boolean(returnTo?.startsWith('/') && !returnTo.startsWith('//'));
}

function createRandomString(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
