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

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    body: getRequestBody(options.body),
    // Auth, CSRF, and visitor state are cookie-backed for all API requests.
    credentials: 'include',
    signal: options.signal,
  });

  assertSuccessfulResponse(response);
  return parseJsonResponse<T>(response);
}

function buildHeaders(options: { method?: string; body?: unknown }): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  setBodyHeader(headers, options.body);
  setCsrfHeader(headers, options.method);
  return headers;
}

function setBodyHeader(headers: Headers, body: unknown): void {
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
}

function setCsrfHeader(headers: Headers, method?: string): void {
  if (!isUnsafeMethod(method)) {
    return;
  }

  const token = readCookie('mbv_csrf');
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
