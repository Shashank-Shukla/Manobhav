import { Button } from '../../../shared/primitives/Button';
import { startCognitoLogin } from '../../../shared/auth/cognitoAuth';

type SignUpFormProps = {
  onShowSignIn: () => void;
  returnTo?: string;
};

export function SignUpForm({ onShowSignIn, returnTo = '/dashboard' }: SignUpFormProps) {
  const signUp = (identityProvider?: string) => {
    void startCognitoLogin({ identityProvider, returnTo });
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
          onSubmit={(e) => {
            e.preventDefault();
            signUp();
          }}
        >
          <Button type="submit" variant="primary" className="w-full">
            Register with email OTP
          </Button>

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
