import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

import { cleanup } from '@testing-library/react';
import { resetRuntimeConfigForTests, setRuntimeConfigForTests } from '../shared/config/runtimeConfig';

beforeEach(() => {
  setRuntimeConfigForTests({
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
      enabled: true,
      fullCaptureEnabled: true,
      legalApproved: true,
      capturePreciseLocation: false,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  resetRuntimeConfigForTests();
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

window.IntersectionObserver = IntersectionObserverMock;
