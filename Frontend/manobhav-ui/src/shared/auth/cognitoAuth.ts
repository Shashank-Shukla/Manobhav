type PublicEnv = Record<string, string | boolean | undefined>;

export type AuthSession = {
  accessToken: string;
  idToken?: string;
  expiresAt: number;
  groups: string[];
};

type CognitoAuthConfig = {
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  scopes: string;
  adminGroup: string;
};

const SESSION_KEY = 'manobhav-auth-session';
const STATE_KEY = 'manobhav-auth-state';
const VERIFIER_KEY = 'manobhav-auth-code-verifier';

export function readAuthConfig(env: PublicEnv = import.meta.env): CognitoAuthConfig {
  return {
    domain: stripTrailingSlash(readEnvString(env.VITE_PUBLIC_COGNITO_DOMAIN)),
    clientId: readEnvString(env.VITE_PUBLIC_COGNITO_CLIENT_ID),
    redirectUri: readEnvString(env.VITE_PUBLIC_COGNITO_REDIRECT_URI),
    logoutUri: readEnvString(env.VITE_PUBLIC_COGNITO_LOGOUT_URI),
    scopes: readEnvString(env.VITE_PUBLIC_COGNITO_SCOPES, 'openid email profile'),
    adminGroup: readEnvString(env.VITE_PUBLIC_ADMIN_GROUP, 'Admin'),
  };
}

export function getStoredAuthSession(storage: Storage = window.sessionStorage): AuthSession | null {
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;
    return getValidSession(session, storage);
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getAccessToken(): string | null {
  return getStoredAuthSession()?.accessToken ?? null;
}

export function isAdminSession(session: AuthSession | null, adminGroup = readAuthConfig().adminGroup): boolean {
  if (!session || session.expiresAt <= Date.now()) {
    return false;
  }

  return session.groups.some((group) => group === adminGroup);
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
    window.sessionStorage.setItem('manobhav-auth-return-to', options.returnTo);
  }

  window.location.assign(buildAuthorizeUrl(config, state, challenge, options.identityProvider).toString());
}

export async function completeCognitoRedirect(url = window.location.href): Promise<string> {
  const config = readAuthConfig();
  assertConfigured(config);

  const callback = readCallbackParams(url);
  const tokenResponse = await exchangeAuthorizationCode(config, callback);
  storeAuthSession(tokenResponse);
  clearTransientAuthState();
  return readAndClearReturnTo();
}

export function logout(): void {
  const config = readAuthConfig();
  window.sessionStorage.removeItem(SESSION_KEY);
  if (config.domain && config.clientId && config.logoutUri) {
    const url = new URL(`${config.domain}/logout`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('logout_uri', config.logoutUri);
    window.location.assign(url.toString());
  }
}

function buildAuthorizeUrl(config: CognitoAuthConfig, state: string, challenge: string, identityProvider?: string): URL {
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

function assertConfigured(config: CognitoAuthConfig): void {
  if (!config.domain || !config.clientId || !config.redirectUri) {
    throw new Error('Cognito public configuration is incomplete.');
  }
}

function readEnvString(value: string | boolean | undefined, fallback = ''): string {
  return String(value || fallback).trim() || fallback;
}

function getValidSession(session: AuthSession, storage: Storage): AuthSession | null {
  if (!session.accessToken || session.expiresAt <= Date.now()) {
    storage.removeItem(SESSION_KEY);
    return null;
  }

  return session;
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
  if (!code || !state || !expectedState || !verifier) {
    return true;
  }

  return state !== expectedState;
}

async function exchangeAuthorizationCode(
  config: CognitoAuthConfig,
  callback: { code: string; verifier: string },
): Promise<{ access_token: string; id_token?: string; expires_in: number }> {
  const response = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildTokenRequestBody(config, callback),
  });

  if (!response.ok) {
    throw new Error('Cognito token exchange failed.');
  }

  return (await response.json()) as { access_token: string; id_token?: string; expires_in: number };
}

function buildTokenRequestBody(
  config: CognitoAuthConfig,
  callback: { code: string; verifier: string },
): URLSearchParams {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code: callback.code,
    redirect_uri: config.redirectUri,
    code_verifier: callback.verifier,
  });
}

function storeAuthSession(tokenResponse: { access_token: string; id_token?: string; expires_in: number }): void {
  const session: AuthSession = {
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    groups: readJwtGroups(tokenResponse.access_token),
  };

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearTransientAuthState(): void {
  window.sessionStorage.removeItem(STATE_KEY);
  window.sessionStorage.removeItem(VERIFIER_KEY);
}

function readAndClearReturnTo(): string {
  const returnTo = window.sessionStorage.getItem('manobhav-auth-return-to') || '/dashboard';
  window.sessionStorage.removeItem('manobhav-auth-return-to');
  return returnTo;
}

function readJwtGroups(token: string): string[] {
  const payload = decodeJwtPayload(token);
  const groups = payload['cognito:groups'];
  return Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(atob(padded)) as Record<string, unknown>;
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
