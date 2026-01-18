import type { ReactNode } from 'react';
import { theme } from '../../utils/theme';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'nav';

type TextProps = {
  variant?: TextVariant;
  className?: string;
  color?: string;
  children: ReactNode;
};

const variantClass: Record<TextVariant, string> = {
  h1: 'text-4xl md:text-6xl font-bold tracking-tight',
  h2: 'text-3xl md:text-4xl font-semibold tracking-tight',
  h3: 'text-xl md:text-2xl font-medium',
  body: 'text-base leading-relaxed',
  caption: 'text-sm tracking-wide uppercase font-semibold',
  nav: 'text-sm font-medium hover:text-rose-500 transition-colors duration-300',
};

export function Text({ variant = 'body', className = '', children, color }: TextProps) {
  const Tag = variant.startsWith('h') ? variant : 'p';
  return (
    <Tag className={`${variantClass[variant]} ${className}`} style={{ color: color || theme.colors.textMain }}>
      {children}
    </Tag>
  );
}
