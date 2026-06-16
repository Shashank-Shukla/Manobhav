import { Smile } from 'lucide-react';
import { AbstractShape } from '../../../shared/primitives/AbstractShape';

type LeftPanelProps = {
  mode?: 'sign-in' | 'sign-up';
  className?: string;
};

const panelCopy = {
  'sign-in': {
    title: 'Welcome Back',
    body: 'Your journey to mindfulness continues here. Log in to access your dashboard.',
  },
  'sign-up': {
    title: 'Begin With Care',
    body: 'Create your Manobhav account and continue into the next step when your sign-in method is verified.',
  },
};

export function LeftPanel({ mode = 'sign-in', className = '' }: LeftPanelProps) {
  const copy = panelCopy[mode];

  return (
    <div className={`relative hidden min-h-0 overflow-hidden bg-[#E6EDE8] p-12 md:flex md:items-center md:justify-center ${className}`}>
      <AbstractShape color="#9CAF88" className="top-10 left-10 w-64 h-64 animate-blob opacity-20" />
      <AbstractShape color="#D6A2AD" className="bottom-10 right-10 w-48 h-48 animate-blob animation-delay-2000 opacity-20" />

      <div className="relative z-10 text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-[#9CAF88]">
            <Smile size={48} strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-[#7A8C6A] mb-4">{copy.title}</h2>
        <p className="text-[#7A8C6A]/80 max-w-xs mx-auto">
          {copy.body}
        </p>
      </div>
    </div>
  );
}
