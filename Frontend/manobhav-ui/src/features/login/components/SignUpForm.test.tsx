import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startCognitoLogin } from '../../../shared/auth/cognitoAuth';
import { SignUpForm } from './SignUpForm';

vi.mock('../../../shared/auth/cognitoAuth', () => ({
  startCognitoLogin: vi.fn(),
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.mocked(startCognitoLogin).mockReset();
  });

  it('preserves the return target when starting Google registration', async () => {
    const user = userEvent.setup();

    render(<SignUpForm onShowSignIn={vi.fn()} returnTo="/appointment" />);

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/appointment' });
  });
});
