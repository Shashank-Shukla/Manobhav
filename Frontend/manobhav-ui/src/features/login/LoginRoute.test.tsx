import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startCognitoLogin } from '../../shared/auth/cognitoAuth';
import { LoginPage } from './LoginRoute';

vi.mock('../../shared/auth/cognitoAuth', () => ({
  startCognitoLogin: vi.fn(),
}));

describe('LoginRoute', () => {
  beforeEach(() => {
    vi.mocked(startCognitoLogin).mockReset();
  });

  it('uses the sanitized return target from the login query string', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login?returnTo=%2Fappointment']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/appointment' });
  });

  it('falls back to the dashboard for unsafe return targets', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login?returnTo=https%3A%2F%2Fevil.example']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/dashboard' });
  });
});
