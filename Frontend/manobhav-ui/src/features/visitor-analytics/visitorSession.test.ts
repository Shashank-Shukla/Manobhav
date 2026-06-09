import { describe, expect, it } from 'vitest';
import { readVisitorAnalyticsConfig } from './visitorAnalytics';

describe('visitor analytics configuration', () => {
  it('enables visitor session creation by default in local development', () => {
    const config = readVisitorAnalyticsConfig({ DEV: true });

    expect(config.enabled).toBe(true);
    expect(config.apiBaseUrl).toBe('http://localhost:5163');
  });

  it('requires explicit API config in production', () => {
    const config = readVisitorAnalyticsConfig({ DEV: false });

    expect(config.enabled).toBe(true);
    expect(config.apiBaseUrl).toBe('');
  });
});
