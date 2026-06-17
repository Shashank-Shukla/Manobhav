import { getRuntimeConfig } from '../config/runtimeConfig';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  return getRuntimeConfig().apiBaseUrl;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError('API base URL is not configured.', 0);
  }

  let response = await sendApiRequest(baseUrl, path, options);
  if (await shouldRetryWithServerCsrfToken(response, options)) {
    const csrfToken = await fetchServerCsrfToken(baseUrl, options.signal);
    response = await sendApiRequest(baseUrl, path, options, csrfToken);
  }

  assertSuccessfulResponse(response);
  return parseJsonResponse<T>(response);
}

async function sendApiRequest(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  },
  csrfToken?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options, csrfToken),
    body: getRequestBody(options.body),
    // Auth, CSRF, and visitor state are cookie-backed for all API requests.
    credentials: 'include',
    signal: options.signal,
  });
}

function buildHeaders(options: { method?: string; body?: unknown }, csrfToken?: string): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  setBodyHeader(headers, options.body);
  setCsrfHeader(headers, options.method, csrfToken);
  return headers;
}

function setBodyHeader(headers: Headers, body: unknown): void {
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
}

function setCsrfHeader(headers: Headers, method?: string, csrfToken?: string): void {
  if (!isUnsafeMethod(method)) {
    return;
  }

  const token = csrfToken || readCookie('mbv_csrf');
  if (token) {
    headers.set('X-CSRF-Token', token);
  }
}

function isUnsafeMethod(method?: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes((method ?? 'GET').toUpperCase());
}

function readCookie(name: string): string {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? '';
}

function getRequestBody(body: unknown): BodyInit | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

async function shouldRetryWithServerCsrfToken(
  response: Response,
  options: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<boolean> {
  if (!isUnsafeMethod(options.method) || response.status !== 400 || readCookie('mbv_csrf')) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as { title?: string };
    return body.title === 'CSRF token validation failed.';
  } catch {
    return false;
  }
}

async function fetchServerCsrfToken(baseUrl: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/csrf-token`, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });
  assertSuccessfulResponse(response);
  const body = (await response.json()) as { csrfToken?: string };
  return body.csrfToken ?? '';
}

function assertSuccessfulResponse(response: Response): void {
  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}.`, response.status);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
