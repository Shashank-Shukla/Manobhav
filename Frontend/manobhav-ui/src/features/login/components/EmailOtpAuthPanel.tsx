import { useEffect, useState, type KeyboardEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { SendHorizontal } from 'lucide-react';
import { ApiError } from '../../../shared/api/apiClient';
import { Button } from '../../../shared/primitives/Button';
import * as cognitoAuth from '../../../shared/auth/cognitoAuth';

type EmailOtpStep = 'choice' | 'email' | 'otp';

type EmailOtpAuthPanelProps = {
  choiceLabel: string;
  initialFlow: cognitoAuth.EmailOtpFlow;
  onAuthenticated: () => void;
};

type RateLimitState = {
  resendAvailableAtUtc?: string | null;
  retryAfterSeconds?: number | null;
  sendsRemainingThisHour?: number | null;
};

export function EmailOtpAuthPanel({ choiceLabel, initialFlow, onAuthenticated }: EmailOtpAuthPanelProps) {
  const [step, setStep] = useState<EmailOtpStep>('choice');
  const [flow, setFlow] = useState<cognitoAuth.EmailOtpFlow>(initialFlow);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<cognitoAuth.EmailOtpAuthResponse | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendLockedUntilMs, setResendLockedUntilMs] = useState(0);
  const [sendsRemainingThisHour, setSendsRemainingThisHour] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const secondsUntilResend = Math.max(0, Math.ceil((resendLockedUntilMs - nowMs) / 1000));
  const isHourlyLimited = sendsRemainingThisHour === 0;
  const canResend = step === 'otp' && Boolean(challenge) && !isSubmitting && !isHourlyLimited && secondsUntilResend === 0;

  useEffect(() => {
    if (secondsUntilResend <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);

  const beginEmailOtp = () => {
    setStep('email');
    setError('');
    setMessage('');
  };

  const requestOtp = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Email is required.');
      setMessage('');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      // The API decides sign-in vs sign-up from whether the email is already registered and echoes
      // the chosen flow back on the challenge, so an existing email is signed in (not rejected) and
      // a new one is registered — all in this single request.
      const nextChallenge = await cognitoAuth.requestEmailOtp({ email: normalizedEmail, flow });
      applyChallenge(nextChallenge);
      setEmail(nextChallenge.email);
      setOtp('');
      setStep('otp');
    } catch (err) {
      applyApiError(err, 'Unable to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (!challenge || !canResend) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const nextChallenge = await cognitoAuth.requestEmailOtp({ email: challenge.email, flow });
      applyChallenge(nextChallenge);
      setEmail(nextChallenge.email);
      setOtp('');
      setMessage('We sent a new code.');
    } catch (err) {
      applyApiError(err, 'Unable to resend OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!challenge) {
      setError('Request a code before verifying.');
      setMessage('');
      return;
    }

    const normalizedOtp = otp.trim();
    if (!normalizedOtp) {
      setError('OTP is required.');
      setMessage('');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const result = await cognitoAuth.verifyEmailOtp({
        email: challenge.email,
        flow,
        challengeId: challenge.challengeId,
        otp: normalizedOtp,
      });

      if (result.status === 'authenticated') {
        onAuthenticated();
        return;
      }

      applyChallenge(result.challenge);
      setFlow(result.challenge.flow);
      setEmail(result.challenge.email);
      setOtp('');
      setMessage(result.message ?? '');
    } catch (err) {
      applyApiError(err, 'Unable to verify OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeEmail = () => {
    setStep('email');
    setFlow(initialFlow);
    setEmail('');
    setOtp('');
    setChallenge(null);
    setError('');
    setMessage('');
    setResendLockedUntilMs(0);
    setSendsRemainingThisHour(null);
  };

  const handleEmailKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void requestOtp();
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void verifyOtp();
    }
  };

  const applyChallenge = (nextChallenge: cognitoAuth.EmailOtpAuthResponse) => {
    setChallenge(nextChallenge);
    setFlow(nextChallenge.flow);
    setSendsRemainingThisHour(nextChallenge.sendsRemainingThisHour);
    setResendLockedUntilMs(getResendLockedUntilMs(nextChallenge));
    setNowMs(Date.now());
  };

  const applyApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const rateLimit = readRateLimitState(err);
      if (rateLimit) {
        setSendsRemainingThisHour(rateLimit.sendsRemainingThisHour ?? sendsRemainingThisHour);
        setResendLockedUntilMs(getResendLockedUntilMs(rateLimit));
        setNowMs(Date.now());
      }
      setError(err.message);
      setMessage('');
      return;
    }

    setError(fallback);
    setMessage('');
  };

  if (step === 'choice') {
    return (
      <Button type="submit" variant="primary" className="w-full" onClick={beginEmailOtp}>
        {choiceLabel}
      </Button>
    );
  }

  if (step === 'email') {
    return (
      <AuthTextField
        autoComplete="email"
        autoFocus
        disabled={isSubmitting}
        error={error}
        label="Email address"
        onChange={(value) => {
          setEmail(value);
          setError('');
          setMessage('');
        }}
        onKeyDown={handleEmailKeyDown}
        sendButton={
          <IconButton
            aria-label="Send verification code"
            disabled={isSubmitting}
            edge="end"
            onClick={() => void requestOtp()}
            sx={{ color: '#7A8C6A', '&:hover': { backgroundColor: 'rgba(156, 175, 136, 0.16)' } }}
          >
            <SendHorizontal aria-hidden="true" size={20} />
          </IconButton>
        }
        type="email"
        value={email}
      />
    );
  }

  return (
    <div className="space-y-3">
      <AuthTextField
        autoComplete="one-time-code"
        autoFocus
        disabled={isSubmitting}
        error={error}
        helperText={error || message || `Code sent to ${email}`}
        label="One-time code"
        onChange={(value) => {
          setOtp(value);
          setError('');
        }}
        onKeyDown={handleOtpKeyDown}
        sendButton={
          <IconButton
            aria-label="Submit verification code"
            disabled={isSubmitting}
            edge="end"
            onClick={() => void verifyOtp()}
            sx={{ color: '#7A8C6A', '&:hover': { backgroundColor: 'rgba(156, 175, 136, 0.16)' } }}
          >
            <SendHorizontal aria-hidden="true" size={20} />
          </IconButton>
        }
        value={otp}
      />
      <div className="flex min-h-10 items-center justify-between gap-3 text-sm">
        <button
          type="button"
          className="font-semibold text-[#7A8C6A] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
          disabled={isSubmitting}
          onClick={changeEmail}
        >
          Change email
        </button>
        <div data-testid="email-otp-resend-slot" className="flex min-w-36 justify-end">
          <button
            type="button"
            aria-label="Resend code"
            className="min-w-36 rounded-full border border-[#9CAF88] px-4 py-2 text-sm font-semibold text-[#7A8C6A] transition hover:bg-[#F1F6EE] disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
            disabled={!canResend}
            onClick={() => void resendOtp()}
          >
            {getResendLabel(isHourlyLimited, secondsUntilResend)}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthTextField({
  autoComplete,
  autoFocus,
  disabled,
  error,
  helperText,
  label,
  onChange,
  onKeyDown,
  sendButton,
  type = 'text',
  value,
}: {
  autoComplete: string;
  autoFocus?: boolean;
  disabled: boolean;
  error: string;
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  sendButton?: React.ReactNode;
  type?: string;
  value: string;
}) {
  return (
    <TextField
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      disabled={disabled}
      error={Boolean(error)}
      fullWidth
      helperText={helperText ?? error}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      slotProps={{
        input: sendButton
          ? {
              endAdornment: <InputAdornment position="end">{sendButton}</InputAdornment>,
            }
          : undefined,
      }}
      type={type}
      value={value}
      variant="outlined"
      sx={{
        '& .MuiInputLabel-root.Mui-focused': { color: '#7A8C6A' },
        '& .MuiOutlinedInput-root': {
          backgroundColor: '#F9FAFB',
          borderRadius: '16px',
          '&.Mui-focused fieldset': { borderColor: '#9CAF88' },
        },
        '& .MuiFormHelperText-root': { marginLeft: 0 },
      }}
    />
  );
}

function getResendLabel(isHourlyLimited: boolean, secondsUntilResend: number): string {
  if (isHourlyLimited) {
    return 'Hourly limit reached';
  }

  if (secondsUntilResend > 0) {
    return `Resend in ${formatSeconds(secondsUntilResend)}`;
  }

  return 'Resend code';
}

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getResendLockedUntilMs(state: RateLimitState): number {
  const now = Date.now();
  const resendTime = parseUtcMs(state.resendAvailableAtUtc);
  const retryAfterTime = typeof state.retryAfterSeconds === 'number' && state.retryAfterSeconds > 0
    ? now + state.retryAfterSeconds * 1000
    : 0;
  return Math.max(resendTime, retryAfterTime, 0);
}

function parseUtcMs(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function readRateLimitState(error: ApiError): RateLimitState | null {
  const problem = error.problemDetails;
  if (!problem) {
    return null;
  }

  return {
    resendAvailableAtUtc: readProblemExtension<string>(problem, 'resendAvailableAtUtc'),
    retryAfterSeconds: readProblemExtension<number>(problem, 'retryAfterSeconds'),
    sendsRemainingThisHour: readProblemExtension<number>(problem, 'sendsRemainingThisHour'),
  };
}

function readProblemExtension<T>(problem: Record<string, unknown>, key: string): T | undefined {
  const directValue = problem[key];
  if (directValue !== undefined) {
    return directValue as T;
  }

  const extensions = problem.extensions;
  if (extensions && typeof extensions === 'object' && key in extensions) {
    return (extensions as Record<string, unknown>)[key] as T;
  }

  return undefined;
}
