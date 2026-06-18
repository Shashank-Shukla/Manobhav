import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestEmailOtp, startCognitoLogin, verifyEmailOtp } from '../../../shared/auth/cognitoAuth';
import { SignUpForm } from './SignUpForm';

vi.mock('../../../shared/auth/cognitoAuth', () => ({
  requestEmailOtp: vi.fn(),
  startCognitoLogin: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

const signUpChallenge = {
  challengeId: 'challenge-1',
  email: 'person@example.com',
  flow: 'sign-up' as const,
  expiresAtUtc: '2026-06-18T12:05:00Z',
  resendAvailableAtUtc: '2026-06-18T12:01:00Z',
  retryAfterSeconds: 60,
  sendsRemainingThisHour: 4,
};

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.mocked(requestEmailOtp).mockReset();
    vi.mocked(startCognitoLogin).mockReset();
    vi.mocked(verifyEmailOtp).mockReset();
    vi.mocked(requestEmailOtp).mockResolvedValue(signUpChallenge);
    vi.mocked(verifyEmailOtp).mockResolvedValue({
      status: 'authenticated',
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
    });
  });

  it('preserves the return target when starting Google registration', async () => {
    const user = userEvent.setup();

    renderSignUpForm();

    await user.click(screen.getByRole('button', { name: /google/i }));

    expect(startCognitoLogin).toHaveBeenCalledWith({ identityProvider: 'Google', returnTo: '/appointment' });
  });

  it('renders the Google logo before the Google button label', () => {
    renderSignUpForm();

    const googleButton = screen.getByRole('button', { name: /^google$/i });
    const logo = googleButton.firstElementChild;

    expect(logo?.tagName.toLowerCase()).toBe('svg');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo?.nextElementSibling).toHaveTextContent('Google');
  });

  it('opens an email OTP input without starting Cognito hosted UI', async () => {
    const user = userEvent.setup();

    renderSignUpForm();

    await user.click(screen.getByRole('button', { name: /register with email otp/i }));

    expect(startCognitoLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveFocus();
  });

  it('requests a registration OTP on Enter and advances to OTP verification', async () => {
    const user = userEvent.setup();

    renderSignUpForm();

    await user.click(screen.getByRole('button', { name: /register with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com{Enter}');

    expect(requestEmailOtp).toHaveBeenCalledWith({ email: 'person@example.com', flow: 'sign-up' });
    expect(screen.getByRole('textbox', { name: /one-time code/i })).toHaveFocus();
    expect(startCognitoLogin).not.toHaveBeenCalled();
  });

  it('verifies the registration OTP and navigates to the requested next step', async () => {
    const user = userEvent.setup();

    renderSignUpForm();

    await user.click(screen.getByRole('button', { name: /register with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com{Enter}');
    await user.type(screen.getByRole('textbox', { name: /one-time code/i }), '123456{Enter}');

    expect(verifyEmailOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      flow: 'sign-up',
      challengeId: 'challenge-1',
      otp: '123456',
    });
    expect(screen.getByText(/next step reached/i)).toBeInTheDocument();
  });
});

function renderSignUpForm(returnTo = '/appointment') {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<SignUpForm onShowSignIn={vi.fn()} returnTo={returnTo} />} />
        <Route path={returnTo} element={<div>Next step reached</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
