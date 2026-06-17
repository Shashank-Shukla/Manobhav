import { useEffect, useRef } from 'react';
import {
  assertSafeAnalyticsProperties,
  canStartFullCapture,
  collectDeviceInfo,
  collectNetworkInfo,
  readVisitorAnalyticsConfig,
} from './visitorAnalytics';

type CreateVisitorResponse = {
  visitorId: string;
  fullCaptureEnabled: boolean;
  retentionDays: number;
};

export const VISITOR_ID_KEY = 'manobhav-visitor-id';
let pendingVisitorPromise: Promise<string | null> | null = null;
let currentVisitorId: string | null = null;

export function useVisitorAnalytics(pathname: string) {
  const visitorIdRef = useRef<string | null>(currentVisitorId);
  const lastPathRef = useRef('');

  useEffect(() => {
    if (visitorIdRef.current) {
      return;
    }

    const controller = new AbortController();
    ensureVisitorSession(controller.signal)
      .then((visitorId) => {
        if (!visitorId) {
          return;
        }

        visitorIdRef.current = visitorId;
        const config = readVisitorAnalyticsConfig();
        if (config.capturePreciseLocation && canStartFullCapture(config) && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            void recordVisitorEvent({
              eventType: 'visitor.location.captured',
              route: pathname,
              targetKey: 'browser-geolocation',
              properties: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
            });
          });
        }
      })
      .catch((error: unknown) => {
        reportAnalyticsFailure('Visitor registration failed.', error);
      });

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    const config = readVisitorAnalyticsConfig();
    const visitorId = visitorIdRef.current;
    if (!visitorId || !canStartFullCapture(config) || lastPathRef.current === pathname) {
      return;
    }

    lastPathRef.current = pathname;
    void recordVisitorEvent({
      eventType: 'route.viewed',
      route: pathname,
      targetKey: pathname,
      properties: { pathLength: pathname.length },
    }).catch((error: unknown) => reportAnalyticsFailure('Route analytics failed.', error));
  }, [pathname]);
}

export function getStoredVisitorId(): string | null {
  return null;
}

export async function ensureVisitorSession(signal?: AbortSignal): Promise<string | null> {
  if (currentVisitorId) {
    return currentVisitorId;
  }

  const config = readVisitorAnalyticsConfig();
  if (!config.enabled || !config.apiBaseUrl) {
    return null;
  }

  pendingVisitorPromise ??= createVisitorSession(config.apiBaseUrl, signal).finally(() => {
    pendingVisitorPromise = null;
  });

  return pendingVisitorPromise;
}

export async function recordVisitorEvent(input: {
  eventType: string;
  route: string;
  targetKey?: string;
  properties: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}): Promise<void> {
  const config = readVisitorAnalyticsConfig();
  if (!canStartFullCapture(config)) {
    return;
  }

  const visitorId = await ensureVisitorSession(input.signal);
  if (!visitorId) {
    return;
  }

  const properties = toStringProperties(input.properties);
  try {
    assertSafeAnalyticsProperties(properties);
    const response = await fetch(`${config.apiBaseUrl}/api/visitors/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventType: input.eventType,
        route: input.route,
        targetKey: input.targetKey,
        properties,
        clientTimestampUtc: new Date().toISOString(),
      }),
      signal: input.signal,
    });

    if (!response.ok) {
      reportAnalyticsFailure('Visitor event failed.', new Error(`status ${response.status}`));
    }
  } catch (error: unknown) {
    reportAnalyticsFailure('Visitor event failed.', error);
  }
}

async function createVisitorSession(apiBaseUrl: string, signal?: AbortSignal): Promise<string | null> {
  const payload = {
    landingPath: window.location.pathname,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceInfo: collectDeviceInfo(),
    networkInfo: collectNetworkInfo(),
    utmSource: new URLSearchParams(window.location.search).get('utm_source'),
    utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
    utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
  };

  const response = await fetch(`${apiBaseUrl}/api/visitors/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Visitor registration failed with status ${response.status}.`);
  }

  const result = (await response.json()) as CreateVisitorResponse;
  currentVisitorId = result.visitorId;
  return result.visitorId;
}

function toStringProperties(properties: Record<string, string | number | boolean | null | undefined>): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, value === undefined || value === null ? null : String(value)]),
  );
}

function reportAnalyticsFailure(message: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(message, error instanceof Error ? error.message : error);
  }
}
