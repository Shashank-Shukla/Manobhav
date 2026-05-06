import { theme } from '../../utils/theme';
import type { StatusTone } from './types';

export const adminTheme = {
  shellBg: '#F5F7F4',
  panelBg: '#FFFFFF',
  softPanel: 'rgba(255, 255, 255, 0.78)',
  border: 'rgba(156, 175, 136, 0.22)',
  text: theme.colors.textMain,
  muted: theme.colors.grey.text,
  sage: theme.colors.sage,
  rose: theme.colors.dustyRose,
  blue: theme.colors.powderBlue,
  grey: theme.colors.grey,
  font: theme.font,
} as const;

export const toneStyles: Record<
  StatusTone,
  {
    bg: string;
    color: string;
    border: string;
    accent: string;
  }
> = {
  sage: {
    bg: theme.colors.sage.light,
    color: theme.colors.sage.dark,
    border: 'rgba(156, 175, 136, 0.34)',
    accent: theme.colors.sage.DEFAULT,
  },
  rose: {
    bg: theme.colors.dustyRose.light,
    color: theme.colors.dustyRose.dark,
    border: 'rgba(214, 162, 173, 0.34)',
    accent: theme.colors.dustyRose.DEFAULT,
  },
  blue: {
    bg: theme.colors.powderBlue.light,
    color: theme.colors.powderBlue.dark,
    border: 'rgba(176, 206, 214, 0.42)',
    accent: theme.colors.powderBlue.DEFAULT,
  },
  amber: {
    bg: '#F8F0D8',
    color: '#8A6D24',
    border: 'rgba(218, 189, 105, 0.34)',
    accent: '#D9C76C',
  },
  grey: {
    bg: theme.colors.grey.light,
    color: theme.colors.grey.text,
    border: 'rgba(156, 163, 175, 0.3)',
    accent: theme.colors.grey.dark,
  },
  red: {
    bg: '#FCE8E8',
    color: '#A74747',
    border: 'rgba(190, 75, 75, 0.28)',
    accent: '#C76B6B',
  },
};

export function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}
