import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { Button } from '../../shared/primitives/Button';
import { Input } from '../../shared/primitives/Input';

type LoginFormProps = {
  onBack: () => void;
};

export function LoginForm({ onBack }: LoginFormProps) {
  return (
    <div className="p-8 md:p-16 relative">
      <button onClick={onBack} className="absolute top-8 left-8 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
        <ArrowLeft size={24} />
      </button>

      <div className="mt-12 md:mt-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h1>
          <p className="text-gray-500">Welcome back! Please enter your details.</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <Input type="email" placeholder="Email Address" icon={Mail} />
          <Input type="password" placeholder="Password" icon={Lock} />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-gray-500">
              <input type="checkbox" className="rounded border-gray-300 text-[#9CAF88] focus:ring-[#9CAF88]" />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-[#9CAF88] font-medium hover:underline">
              Forgot password?
            </a>
          </div>

          <Button variant="primary" className="w-full">
            Sign In
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" className="w-full text-sm">
              Google
            </Button>
            <Button variant="secondary" className="w-full text-sm">
              Apple
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="#" className="text-[#9CAF88] font-bold hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
