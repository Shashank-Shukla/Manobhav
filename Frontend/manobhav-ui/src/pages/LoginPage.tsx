import { ArrowLeft, Lock, Mail, Smile } from 'lucide-react';
import { AbstractShape } from '../components/primitives/AbstractShape';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';

type LoginPageProps = {
  onBack: () => void;
};

export function LoginPage({ onBack }: LoginPageProps) {
  return (
    <div className="min-h-screen pt-24 px-6 pb-12 flex items-center justify-center animate-in slide-in-from-right-10 duration-500">
      <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden grid md:grid-cols-2 relative border border-gray-100">
        <div className="bg-[#E6EDE8] relative hidden md:flex items-center justify-center p-12 overflow-hidden">
          <AbstractShape color="#9CAF88" className="top-10 left-10 w-64 h-64 animate-blob opacity-20" />
          <AbstractShape color="#D6A2AD" className="bottom-10 right-10 w-48 h-48 animate-blob animation-delay-2000 opacity-20" />

          <div className="relative z-10 text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-[#9CAF88]">
                <Smile size={48} strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[#7A8C6A] mb-4">Welcome Back</h2>
            <p className="text-[#7A8C6A]/80 max-w-xs mx-auto">
              Your journey to mindfulness continues here. Log in to access your dashboard.
            </p>
          </div>
        </div>

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
      </div>
    </div>
  );
}
