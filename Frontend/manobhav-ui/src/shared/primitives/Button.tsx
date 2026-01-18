import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { theme } from '../../utils/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'nav' | 'outline';

type ButtonProps = {
  variant?: ButtonVariant;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const baseStyle =
  'inline-flex items-center justify-center px-6 py-3 rounded-full transition-all duration-300 transform active:scale-95 font-medium shadow-sm cursor-pointer';

const variants: Record<ButtonVariant, string> = {
  primary: 'text-white hover:shadow-md hover:-translate-y-0.5',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-50',
  nav: 'bg-slate-800 text-white hover:bg-slate-700 px-5 py-2 text-sm',
  outline: 'bg-transparent border-2 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white',
};

export function Button({
  variant = 'primary',
  children,
  onClick,
  icon: Icon,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const customStyle = variant === 'primary' ? { backgroundColor: theme.colors.sage.DEFAULT } : undefined;

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={customStyle}
      {...rest}
    >
      {children}
      {Icon && <Icon className="ml-2 w-4 h-4" />}
    </button>
  );
}
