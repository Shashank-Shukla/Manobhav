import { describe, expect, it } from 'vitest';
import { setRuntimeConfigForTests } from '../../shared/config/runtimeConfig';
import { assertSafeAnalyticsProperties, canStartFullCapture, readVisitorAnalyticsConfig } from './visitorAnalytics';

describe('visitor analytics controls', () => {
  it('does not enable full capture without legal approval', () => {
    setRuntimeConfigForTests(createRuntimeConfig({ fullCaptureEnabled: true, legalApproved: false }));

    const config = readVisitorAnalyticsConfig();

    expect(canStartFullCapture(config)).toBe(false);
  });

  it('rejects prohibited sensitive analytics property keys', () => {
    expect(() => assertSafeAnalyticsProperties({ authToken: 'not-allowed' })).toThrow(/authToken/i);
    expect(() => assertSafeAnalyticsProperties({ response: 'raw visitor answer' })).toThrow(/response/i);
    expect(() => assertSafeAnalyticsProperties({ answerLength: '12' })).not.toThrow();
  });
});

function createRuntimeConfig(visitorAnalytics: {
  enabled?: boolean;
  fullCaptureEnabled?: boolean;
  legalApproved?: boolean;
  capturePreciseLocation?: boolean;
}) {
  return {
    apiBaseUrl: 'https://api.example.com',
    auth: {
      cognitoDomain: 'https://cognito.example.com',
      clientId: 'client-id',
      redirectUri: 'https://app.example.com/callback',
      logoutUri: 'https://app.example.com',
      scopes: 'openid email phone profile',
      adminGroup: 'Admin',
    },
    visitorAnalytics: {
      enabled: visitorAnalytics.enabled ?? true,
      fullCaptureEnabled: visitorAnalytics.fullCaptureEnabled ?? false,
      legalApproved: visitorAnalytics.legalApproved ?? false,
      capturePreciseLocation: visitorAnalytics.capturePreciseLocation ?? false,
    },
  };
}
