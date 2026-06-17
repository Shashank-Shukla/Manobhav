import { useState, type FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/primitives/Button';
import * as cognitoAuth from '../../../shared/auth/cognitoAuth';

type SignUpFormProps = {
  onShowSignIn: () => void;
  returnTo?: string;
};

type EmailOtpStep = 'choice' | 'email' | 'otp';

export function SignUpForm({ onShowSignIn, returnTo = '/dashboard' }: SignUpFormProps) {
  const navigate = useNavigate();
  const [emailOtpStep, setEmailOtpStep] = useState<EmailOtpStep>('choice');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  const signUp = (identityProvider?: string) => {
    void cognitoAuth.startCognitoLogin({ identityProvider, returnTo });
  };

  const handleEmailOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (emailOtpStep === 'choice') {
      setEmailOtpStep('email');
      return;
    }

    if (emailOtpStep === 'email') {
      await requestOtp();
      return;
    }

    await verifyOtp();
  };

  const requestOtp = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setIsSubmittingOtp(true);
    try {
      await cognitoAuth.requestEmailOtp({ email: normalizedEmail, flow: 'sign-up' });
      setEmail(normalizedEmail);
      setOtp('');
      setEmailOtpStep('otp');
    } catch {
      setError('Unable to send OTP. Please try again.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const normalizedOtp = otp.trim();
    if (!normalizedOtp) {
      setError('OTP is required.');
      return;
    }

    setIsSubmittingOtp(true);
    try {
      await cognitoAuth.verifyEmailOtp({ email, flow: 'sign-up', otp: normalizedOtp });
      setIsSubmittingOtp(false);
      navigate(returnTo, { replace: true });
    } catch {
      setError('Unable to verify OTP. Please try again.');
      setIsSubmittingOtp(false);
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto p-6 md:order-1 md:p-10 lg:p-16">
      <div>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500">Register with a verified identity method.</p>
        </div>

        <form
          className="space-y-6"
          noValidate
          onSubmit={handleEmailOtpSubmit}
        >
          <EmailOtpArea
            email={email}
            error={error}
            isSubmitting={isSubmittingOtp}
            onEmailChange={setEmail}
            onOtpChange={setOtp}
            otp={otp}
            step={emailOtpStep}
          />

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">Or register with</span>
            </div>
          </div>

          <div>
            <Button type="button" variant="secondary" className="w-full text-sm" onClick={() => signUp('Google')}>
              Google
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already registered?{' '}
          <button type="button" onClick={onShowSignIn} className="font-semibold text-[#7A8C6A] underline-offset-4 hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function EmailOtpArea({
  email,
  error,
  isSubmitting,
  onEmailChange,
  onOtpChange,
  otp,
  step,
}: {
  email: string;
  error: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  otp: string;
  step: EmailOtpStep;
}) {
  if (step === 'choice') {
    return (
      <Button type="submit" variant="primary" className="w-full">
        Register with email OTP
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
        onChange={onEmailChange}
        type="email"
        value={email}
      />
    );
  }

  return (
    <AuthTextField
      autoComplete="one-time-code"
      autoFocus
      disabled={isSubmitting}
      error={error}
      helperText={error || `Code sent to ${email}`}
      label="One-time code"
      onChange={onOtpChange}
      value={otp}
    />
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
