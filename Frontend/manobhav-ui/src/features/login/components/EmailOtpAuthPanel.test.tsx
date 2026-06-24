import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/apiClient';
import { requestEmailOtp, verifyEmailOtp } from '../../../shared/auth/cognitoAuth';
import { EmailOtpAuthPanel } from './EmailOtpAuthPanel';

vi.mock('../../../shared/auth/cognitoAuth', () => ({
  requestEmailOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

const firstChallenge = {
  challengeId: 'challenge-1',
  email: 'person@example.com',
  flow: 'sign-up' as const,
  expiresAtUtc: '2026-06-18T12:05:00Z',
  resendAvailableAtUtc: '2026-06-18T12:01:00Z',
  retryAfterSeconds: 60,
  sendsRemainingThisHour: 4,
};

describe('EmailOtpAuthPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-18T12:00:00Z'));
    vi.mocked(requestEmailOtp).mockReset();
    vi.mocked(verifyEmailOtp).mockReset();
    vi.mocked(requestEmailOtp).mockResolvedValue(firstChallenge);
    vi.mocked(verifyEmailOtp).mockResolvedValue({
      status: 'authenticated',
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the initial OTP CTA as submit and opens email entry without requesting a code', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPanel();

    const choiceButton = screen.getByRole('button', { name: /register with email otp/i });

    expect(choiceButton).toHaveAttribute('type', 'submit');

    await user.click(choiceButton);

    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveFocus();
    expect(requestEmailOtp).not.toHaveBeenCalled();
  });

  it('requests an OTP from the in-input icon button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPanel();

    await user.click(screen.getByRole('button', { name: /register with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), ' person@example.com ');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    expect(requestEmailOtp).toHaveBeenCalledWith({ email: 'person@example.com', flow: 'sign-up' });
    expect(screen.getByRole('textbox', { name: /one-time code/i })).toHaveFocus();
  });

  it('shows a friendly redirect message on duplicate sign-up (409)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const apiMessage = "We believe you've already registered with us, you might want to try Signing in.";
    vi.mocked(requestEmailOtp).mockRejectedValue(
      new ApiError(apiMessage, 409, { title: apiMessage, status: 409 }),
    );
    renderPanel();

    await user.click(screen.getByRole('button', { name: /register with email otp/i }));
    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    expect(await screen.findByText(/already registered.*sign in/i)).toBeInTheDocument();
  });

  it('disables resend until the server resend time elapses without layout shift', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(requestEmailOtp).mockResolvedValue({
      ...firstChallenge,
      resendAvailableAtUtc: '2026-06-18T12:00:05Z',
      retryAfterSeconds: 2,
    });
    renderPanel();

    await requestFirstOtp(user);

    const resendSlot = screen.getByTestId('email-otp-resend-slot');
    const initialWidth = resendSlot.getBoundingClientRect().width;
    expect(within(resendSlot).getByRole('button', { name: /resend code/i })).toBeDisabled();
    expect(within(resendSlot).getByText(/resend in 00:05/i)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => expect(within(resendSlot).getByRole('button', { name: /resend code/i })).toBeEnabled());
    expect(resendSlot.getBoundingClientRect().width).toBe(initialWidth);
  });

  it('switches a completed sign-up proof to the backend-provided sign-in challenge', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onAuthenticated = vi.fn();
    vi.mocked(verifyEmailOtp)
      .mockResolvedValueOnce({
        status: 'sign-in-otp-required',
        message: 'Account created. Enter the sign-in code we just sent.',
        challenge: {
          ...firstChallenge,
          challengeId: 'challenge-2',
          flow: 'sign-in',
          resendAvailableAtUtc: '2026-06-18T12:02:00Z',
          sendsRemainingThisHour: 3,
        },
      })
      .mockResolvedValueOnce({
        status: 'authenticated',
        session: { isAuthenticated: true, expiresAtUtc: null, groups: ['Patient'] },
      });
    renderPanel({ onAuthenticated });

    await requestFirstOtp(user);
    await user.type(screen.getByRole('textbox', { name: /one-time code/i }), '111111{Enter}');

    expect(await screen.findByText('Account created. Enter the sign-in code we just sent.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /one-time code/i })).toHaveValue('');

    await user.type(screen.getByRole('textbox', { name: /one-time code/i }), '222222{Enter}');

    expect(verifyEmailOtp).toHaveBeenNthCalledWith(1, {
      email: 'person@example.com',
      flow: 'sign-up',
      challengeId: 'challenge-1',
      otp: '111111',
    });
    expect(verifyEmailOtp).toHaveBeenNthCalledWith(2, {
      email: 'person@example.com',
      flow: 'sign-in',
      challengeId: 'challenge-2',
      otp: '222222',
    });
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('change email resets challenge state, code, and backend messages', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(verifyEmailOtp).mockResolvedValueOnce({
      status: 'sign-in-otp-required',
      message: 'Account created. Enter the sign-in code we just sent.',
      challenge: {
        ...firstChallenge,
        challengeId: 'challenge-2',
        flow: 'sign-in',
      },
    });
    renderPanel();

    await requestFirstOtp(user);
    await user.type(screen.getByRole('textbox', { name: /one-time code/i }), '111111{Enter}');
    expect(await screen.findByText('Account created. Enter the sign-in code we just sent.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /change email/i }));

    expect(screen.getByRole('textbox', { name: /email address/i })).toHaveValue('');
    expect(screen.queryByText('Account created. Enter the sign-in code we just sent.')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /one-time code/i })).not.toBeInTheDocument();
  });
});

async function requestFirstOtp(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /register with email otp/i }));
  await user.type(screen.getByRole('textbox', { name: /email address/i }), 'person@example.com');
  await user.click(screen.getByRole('button', { name: /send verification code/i }));
}

function renderPanel(options: { onAuthenticated?: () => void } = {}) {
  return render(
    <EmailOtpAuthPanel
      choiceLabel="Register with email OTP"
      initialFlow="sign-up"
      onAuthenticated={options.onAuthenticated ?? vi.fn()}
    />,
  );
}
