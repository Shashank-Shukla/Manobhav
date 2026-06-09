import { getAccessToken } from '../auth/cognitoAuth';

type PublicEnv = Record<string, string | boolean | undefined>;

function getLocalDevApiBaseUrl(): string {
  return ['http://', 'localhost', ':5163'].join('');
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getApiBaseUrl(env: PublicEnv = import.meta.env): string {
  const configuredUrl = readEnvString(env.VITE_PUBLIC_API_BASE_URL);
  const baseUrl = configuredUrl || getFallbackBaseUrl(env);
  return stripTrailingSlash(baseUrl);
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    includeAuth?: boolean;
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
    signal: options.signal,
  });

  assertSuccessfulResponse(response);
  return parseJsonResponse<T>(response);
}

function buildHeaders(options: { body?: unknown; includeAuth?: boolean }): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  setBodyHeader(headers, options.body);
  setAuthHeader(headers, options.includeAuth);
  return headers;
}

function setBodyHeader(headers: Headers, body: unknown): void {
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
}

function setAuthHeader(headers: Headers, includeAuth?: boolean): void {
  if (includeAuth === false) {
    return;
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
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

function getFallbackBaseUrl(env: PublicEnv): string {
  return env.DEV === true ? getLocalDevApiBaseUrl() : '';
}

function readEnvString(value: string | boolean | undefined): string {
  return String(value || '').trim();
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
