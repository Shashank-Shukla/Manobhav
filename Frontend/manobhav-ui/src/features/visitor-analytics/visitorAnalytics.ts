type PublicEnv = Record<string, string | boolean | undefined>;

const LOCAL_DEV_API_BASE_URL = 'http://localhost:5163';

export type VisitorAnalyticsConfig = {
  apiBaseUrl: string;
  enabled: boolean;
  fullCaptureEnabled: boolean;
  legalApproved: boolean;
  capturePreciseLocation: boolean;
};

const PROHIBITED_KEY_FRAGMENTS = [
  'authorization',
  'authheader',
  'card',
  'clinicalnote',
  'cookie',
  'cvv',
  'medicalrecord',
  'password',
  'payment',
  'secret',
  'sessionnote',
  'token',
];

export function readVisitorAnalyticsConfig(env: PublicEnv = import.meta.env): VisitorAnalyticsConfig {
  const configuredApiBaseUrl = stripTrailingSlash(String(env.VITE_PUBLIC_API_BASE_URL || '').trim());
  return {
    apiBaseUrl: configuredApiBaseUrl || (env.DEV === true ? LOCAL_DEV_API_BASE_URL : ''),
    enabled: env.VITE_PUBLIC_ENABLE_VISITOR_ANALYTICS !== 'false',
    fullCaptureEnabled: env.VITE_PUBLIC_ENABLE_FULL_VISITOR_CAPTURE === 'true',
    legalApproved: env.VITE_PUBLIC_ANALYTICS_LEGAL_APPROVED === 'true',
    capturePreciseLocation: env.VITE_PUBLIC_ANALYTICS_PRECISE_LOCATION === 'true',
  };
}

export function canStartFullCapture(config: VisitorAnalyticsConfig): boolean {
  return Boolean(config.apiBaseUrl && config.enabled && config.fullCaptureEnabled && config.legalApproved);
}

export function assertSafeAnalyticsProperties(properties: Record<string, string | number | boolean | null | undefined>): void {
  for (const key of Object.keys(properties)) {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (PROHIBITED_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
      throw new Error(`Analytics property '${key}' is not allowed.`);
    }
  }
}

export function collectDeviceInfo(): string {
  return JSON.stringify({
    language: navigator.language,
    platform: navigator.platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
  });
}

export function collectNetworkInfo(): string {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  }).connection;
  if (!connection) return '';

  return JSON.stringify({
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  });
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
