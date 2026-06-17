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

  it('opens create account from the mode query and preserves provider onboarding return target', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login?mode=sign-up&returnTo=%2Fonboarding%2Fprovider']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^google$/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({
      identityProvider: 'Google',
      returnTo: '/onboarding/provider',
    });
  });

  it('defaults Google login to the patient dashboard when no return target is provided', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/dashboard/patient' });
  });

  it('falls back to the patient dashboard for unsafe return targets', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login?returnTo=https%3A%2F%2Fevil.example']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/dashboard/patient' });
  });

  it('centers the desktop back button on the auth container top-left corner', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage onBack={vi.fn()} />
      </MemoryRouter>,
    );

    const backButton = screen.getByRole('button', { name: /back to home/i });

    expect(backButton.parentElement).toHaveClass('relative', 'w-full', 'max-w-5xl');
    expect(backButton.nextElementSibling).toHaveClass('relative', 'grid', 'w-full');
    expect(backButton).toHaveClass(
      'absolute',
      'left-0',
      'top-0',
      '-translate-x-1/2',
      '-translate-y-1/2',
      'hidden',
      'md:inline-flex',
    );
    expect(backButton).toHaveClass('shadow-xl');
    expect(backButton).not.toHaveClass('bottom-full');
    expect(backButton).not.toHaveClass('ml-2');
  });
});
