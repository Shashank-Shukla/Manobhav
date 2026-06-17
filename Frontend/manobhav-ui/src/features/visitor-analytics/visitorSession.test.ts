import { afterEach, describe, expect, it, vi } from 'vitest';
import { readVisitorAnalyticsConfig } from './visitorAnalytics';
import { ensureVisitorSession, recordVisitorEvent, VISITOR_ID_KEY } from './useVisitorAnalytics';

describe('visitor analytics configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('uses loaded runtime config for visitor session creation', () => {
    const config = readVisitorAnalyticsConfig();

    expect(config.enabled).toBe(true);
    expect(config.apiBaseUrl).toBe('https://api.example.com');
    expect(config.fullCaptureEnabled).toBe(true);
  });

  it('uses cookie-backed visitor session endpoints without localStorage ids', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/visitors/session')) {
        return Response.json({ visitorId: 'visitor-1', fullCaptureEnabled: true, retentionDays: 365 });
      }
      if (url.endsWith('/api/visitors/events')) {
        return new Response(null, { status: 202 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await ensureVisitorSession();
    await recordVisitorEvent({
      eventType: 'route.viewed',
      route: '/',
      targetKey: '/',
      properties: { pathLength: 1 },
    });

    expect(window.localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/visitors/session'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/visitors/events'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
