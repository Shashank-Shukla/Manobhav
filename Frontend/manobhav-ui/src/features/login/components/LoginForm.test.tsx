import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startCognitoLogin } from '../../../shared/auth/cognitoAuth';
import { LoginForm } from './LoginForm';

vi.mock('../../../shared/auth/cognitoAuth', () => ({
  startCognitoLogin: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(startCognitoLogin).mockReset();
  });

  it('preserves the return target when starting Google login', async () => {
    const user = userEvent.setup();

    render(<LoginForm onShowSignUp={vi.fn()} returnTo="/appointment" />);

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/appointment' });
  });
});
