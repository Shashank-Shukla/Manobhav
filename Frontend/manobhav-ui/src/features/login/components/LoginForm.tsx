import { Button } from '../../../shared/primitives/Button';
import { startCognitoLogin } from '../../../shared/auth/cognitoAuth';

type LoginFormProps = {
  onShowSignUp: () => void;
  returnTo?: string;
};

export function LoginForm({ onShowSignUp, returnTo = '/dashboard' }: LoginFormProps) {
  const signIn = (identityProvider?: string) => {
    void startCognitoLogin({ identityProvider, returnTo });
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto p-6 md:p-10 lg:p-16">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h1>
          <p className="text-gray-500">Choose a verified sign-in method to continue.</p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
        >
          <Button type="submit" variant="primary" className="w-full">
            Continue with email OTP
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">Or continue with</span>
            </div>
          </div>

          <div>
            <Button type="button" variant="secondary" className="w-full text-sm" onClick={() => signIn('Google')}>
              Google
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          New here? Let's get you{' '}
          <button type="button" onClick={onShowSignUp} className="font-semibold text-[#7A8C6A] underline-offset-4 hover:underline">
            Registered
          </button>
        </p>
      </div>
    </div>
  );
}
