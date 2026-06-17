import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestEmailOtp, startCognitoLogin, verifyEmailOtp } from '../../../shared/auth/cognitoAuth';
import { LoginForm } from './LoginForm';

vi.mock('../../../shared/auth/cognitoAuth', () => ({
  requestEmailOtp: vi.fn(),
  startCognitoLogin: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(requestEmailOtp).mockReset();
    vi.mocked(startCognitoLogin).mockReset();
    vi.mocked(verifyEmailOtp).mockReset();
    vi.mocked(requestEmailOtp).mockResolvedValue(undefined);
    vi.mocked(verifyEmailOtp).mockResolvedValue({ isAuthenticated: true, expiresAtUtc: null, groups: [] });
  });

  it('preserves the return target when starting Google login', async () => {
    const user = userEvent.setup();

    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/appointment' });
  });

  it('opens an email OTP input without starting Cognito hosted UI', async () => {
    const user = userEvent.setup();

    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /continue with email otp/i }));

    expect(startCognitoLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveFocus();
  });

  it('requests a sign-in OTP on Enter and advances to OTP verification', async () => {
    const user = userEvent.setup();

    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /continue with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com{Enter}');

    expect(requestEmailOtp).toHaveBeenCalledWith({ email: 'person@example.com', flow: 'sign-in' });
    expect(screen.getByRole('textbox', { name: /one-time code/i })).toHaveFocus();
    expect(startCognitoLogin).not.toHaveBeenCalled();
  });

  it('verifies the sign-in OTP and navigates to the requested next step', async () => {
    const user = userEvent.setup();

    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /continue with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com{Enter}');
    await user.type(screen.getByRole('textbox', { name: /one-time code/i }), '123456{Enter}');

    expect(verifyEmailOtp).toHaveBeenCalledWith({ email: 'person@example.com', flow: 'sign-in', otp: '123456' });
    expect(screen.getByText(/next step reached/i)).toBeInTheDocument();
  });
});

function renderLoginForm(returnTo = '/appointment') {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginForm onShowSignUp={vi.fn()} returnTo={returnTo} />} />
        <Route path={returnTo} element={<div>Next step reached</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
