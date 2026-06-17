import { getRuntimeConfig } from '../config/runtimeConfig';

export class ApiError extends Error {
  readonly status: number;
  readonly problemDetails?: ProblemDetails;

  constructor(message: string, status: number, problemDetails?: ProblemDetails) {
    super(message);
    this.status = status;
    this.problemDetails = problemDetails;
  }
}

type ProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  [key: string]: unknown;
};

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

  await assertSuccessfulResponse(response);
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
  if (!isUnsafeMethod(options.method) || response.status !== 400) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as ProblemDetails;
    return isCsrfProblem(body);
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
  await assertSuccessfulResponse(response);
  const body = (await response.json()) as { csrfToken?: string };
  return body.csrfToken ?? '';
}

async function assertSuccessfulResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const problemDetails = await parseProblemDetails(response);
    throw new ApiError(getFriendlyErrorMessage(problemDetails), response.status, problemDetails);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function parseProblemDetails(response: Response): Promise<ProblemDetails | undefined> {
  try {
    const body = await response.clone().json();
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    return body as ProblemDetails;
  } catch {
    return undefined;
  }
}

function getFriendlyErrorMessage(problemDetails?: ProblemDetails): string {
  const title = getProblemText(problemDetails?.title);
  const detail = getProblemText(problemDetails?.detail);
  const parts = [title, detail].filter((part, index, values): part is string => Boolean(part) && values.indexOf(part) === index);

  if (parts.length === 0) {
    return "We couldn't complete the request. Please try again.";
  }

  return parts.join(' ');
}

function getProblemText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isCsrfProblem(problemDetails: ProblemDetails): boolean {
  const text = `${problemDetails.title ?? ''} ${problemDetails.detail ?? ''}`.toLowerCase();
  return text.includes('csrf') && text.includes('token');
}
