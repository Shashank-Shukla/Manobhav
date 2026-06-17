import { getRuntimeConfig } from '../../shared/config/runtimeConfig';

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

const PROHIBITED_EXACT_KEYS = [
  'answer',
  'answertext',
  'answervalue',
  'fieldvalue',
  'freetext',
  'inputvalue',
  'rawanswer',
  'response',
];

export function readVisitorAnalyticsConfig(): VisitorAnalyticsConfig {
  const config = getRuntimeConfig();
  return {
    apiBaseUrl: config.apiBaseUrl,
    enabled: config.visitorAnalytics.enabled,
    fullCaptureEnabled: config.visitorAnalytics.fullCaptureEnabled,
    legalApproved: config.visitorAnalytics.legalApproved,
    capturePreciseLocation: config.visitorAnalytics.capturePreciseLocation,
  };
}

export function canStartFullCapture(config: VisitorAnalyticsConfig): boolean {
  return Boolean(config.apiBaseUrl && config.enabled && config.fullCaptureEnabled && config.legalApproved);
}

export function assertSafeAnalyticsProperties(properties: Record<string, string | number | boolean | null | undefined>): void {
  for (const key of Object.keys(properties)) {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (PROHIBITED_EXACT_KEYS.includes(normalized) || PROHIBITED_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
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
