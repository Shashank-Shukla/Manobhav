type PublicEnv = Record<string, string | boolean | undefined>;

const LOCAL_DEV_API_BASE_URL = 'http://localhost:5163';

export type RuntimeConfig = {
  apiBaseUrl: string;
  auth: {
    cognitoDomain: string;
    clientId: string;
    redirectUri: string;
    logoutUri: string;
    scopes: string;
    adminGroup: string;
  };
  visitorAnalytics: {
    enabled: boolean;
    fullCaptureEnabled: boolean;
    legalApproved: boolean;
    capturePreciseLocation: boolean;
  };
};

let activeRuntimeConfig: RuntimeConfig | null = null;
let pendingRuntimeConfig: Promise<RuntimeConfig> | null = null;

export async function loadRuntimeConfig(env: PublicEnv = import.meta.env): Promise<RuntimeConfig> {
  if (activeRuntimeConfig) {
    return activeRuntimeConfig;
  }

  pendingRuntimeConfig ??= fetchRuntimeConfig(getBootstrapApiBaseUrl(env)).finally(() => {
    pendingRuntimeConfig = null;
  });
  return pendingRuntimeConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!activeRuntimeConfig) {
    throw new Error('Runtime configuration has not loaded.');
  }

  return activeRuntimeConfig;
}

export function getBootstrapApiBaseUrl(env: PublicEnv = import.meta.env): string {
  const configuredUrl = readEnvString(env.VITE_PUBLIC_API_BASE_URL);
  return stripTrailingSlash(configuredUrl || (env.DEV === true ? LOCAL_DEV_API_BASE_URL : ''));
}

export function setRuntimeConfigForTests(config: RuntimeConfig): void {
  activeRuntimeConfig = normalizeRuntimeConfig(config);
}

export function resetRuntimeConfigForTests(): void {
  activeRuntimeConfig = null;
  pendingRuntimeConfig = null;
}

async function fetchRuntimeConfig(apiBaseUrl: string): Promise<RuntimeConfig> {
  if (!apiBaseUrl) {
    throw new Error('Runtime config bootstrap API base URL is not configured.');
  }

  const response = await fetch(`${apiBaseUrl}/api/public/runtime-config`, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Runtime config request failed with status ${response.status}.`);
  }

  activeRuntimeConfig = normalizeRuntimeConfig((await response.json()) as RuntimeConfig);
  return activeRuntimeConfig;
}

function normalizeRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  return {
    apiBaseUrl: stripTrailingSlash(readEnvString(config.apiBaseUrl)),
    auth: {
      cognitoDomain: stripTrailingSlash(readEnvString(config.auth?.cognitoDomain)),
      clientId: readEnvString(config.auth?.clientId),
      redirectUri: readEnvString(config.auth?.redirectUri),
      logoutUri: readEnvString(config.auth?.logoutUri),
      scopes: readEnvString(config.auth?.scopes, 'openid email profile'),
      adminGroup: readEnvString(config.auth?.adminGroup, 'Admin'),
    },
    visitorAnalytics: {
      enabled: config.visitorAnalytics?.enabled === true,
      fullCaptureEnabled: config.visitorAnalytics?.fullCaptureEnabled === true,
      legalApproved: config.visitorAnalytics?.legalApproved === true,
      capturePreciseLocation: config.visitorAnalytics?.capturePreciseLocation === true,
    },
  };
}

function readEnvString(value: string | boolean | undefined, fallback = ''): string {
  return String(value || fallback).trim() || fallback;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
