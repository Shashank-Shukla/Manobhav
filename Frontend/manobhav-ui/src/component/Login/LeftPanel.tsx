import { Smile } from 'lucide-react';
import { AbstractShape } from '../../shared/primitives/AbstractShape';

export function LeftPanel() {
  return (
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
  );
}
