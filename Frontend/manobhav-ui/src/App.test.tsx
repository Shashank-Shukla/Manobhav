import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const apiJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => apiJson({ visitorId: 'visitor-1', fullCaptureEnabled: true, retentionDays: 90 }, 201)),
  );
});

describe('app shell footer visibility', () => {
  it.each(['/dashboard/patient', '/dashboard/provider', '/onboarding/provider', '/onboarding/patient'])(
    'hides the footer on %s',
    async (path) => {
      window.history.pushState({}, '', path);

      render(<App />);

      await screen.findByText(/sign in required/i);
      expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument();
    },
  );

  it.each(['/', '/faq'])('shows the footer on %s', async (path) => {
    window.history.pushState({}, '', path);

    render(<App />);

    expect(await screen.findByText(/all rights reserved/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('app shell provider dashboard chrome', () => {
  it('hides the public navigation on the provider dashboard route', async () => {
    window.history.pushState({}, '', '/dashboard/provider');

    render(<App />);

    await screen.findByText(/sign in required/i);
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
  });
});
