import { ButtonHTMLAttributes } from 'react';
import { Button } from '../../shared/primitives/Button';
import { Text } from '../../shared/primitives/Text';
import { AbstractShape } from '../../shared/primitives/AbstractShape';

type ErrorScreenProps = {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  };
  accentColor?: string;
  illustration?: string;
};

export function ErrorScreenBase({ title, message, action, accentColor = '#9CAF88', illustration }: ErrorScreenProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl p-10 flex flex-col items-center gap-6 text-center max-w-3xl mx-auto">
      <AbstractShape color={accentColor} className="top-[-40px] left-[-60px] w-72 h-72 opacity-10" />
      <AbstractShape color="#D6A2AD" className="bottom-[-60px] right-[-40px] w-80 h-80 opacity-10 animation-delay-2000" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        {illustration ? (
          <img src={illustration} alt="" className="w-40 h-40 object-contain" loading="lazy" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-[#E6EDE8] flex items-center justify-center text-4xl">☺</div>
        )}
        <Text variant="h2" className="text-slate-800">
          {title}
        </Text>
        <Text variant="body" className="text-gray-600 max-w-xl">
          {message}
        </Text>
        {action && (
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
