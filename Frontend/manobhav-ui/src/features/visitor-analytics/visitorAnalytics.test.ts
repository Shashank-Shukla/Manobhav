import { describe, expect, it } from 'vitest';
import { assertSafeAnalyticsProperties, canStartFullCapture, readVisitorAnalyticsConfig } from './visitorAnalytics';

describe('visitor analytics controls', () => {
  it('does not enable full capture without legal approval', () => {
    const config = readVisitorAnalyticsConfig({
      VITE_PUBLIC_API_BASE_URL: 'https://api.example.com',
      VITE_PUBLIC_ENABLE_VISITOR_ANALYTICS: 'true',
      VITE_PUBLIC_ENABLE_FULL_VISITOR_CAPTURE: 'true',
      VITE_PUBLIC_ANALYTICS_LEGAL_APPROVED: 'false',
    });

    expect(canStartFullCapture(config)).toBe(false);
  });

  it('rejects prohibited sensitive analytics property keys', () => {
    expect(() => assertSafeAnalyticsProperties({ authToken: 'not-allowed' })).toThrow(/authToken/i);
    expect(() => assertSafeAnalyticsProperties({ answerLength: '12' })).not.toThrow();
  });
});
