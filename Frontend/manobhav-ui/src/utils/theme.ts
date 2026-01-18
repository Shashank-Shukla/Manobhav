export const theme = {
  colors: {
    sage: {
      light: '#E6EDE8',
      DEFAULT: '#9CAF88',
      dark: '#7A8C6A',
    },
    dustyRose: {
      light: '#F7E6E8',
      DEFAULT: '#D6A2AD',
      dark: '#B57F8B',
    },
    powderBlue: {
      light: '#EBF5F7',
      DEFAULT: '#B0CED6',
      dark: '#8BAAB3',
    },
    grey: {
      light: '#F9FAFB',
      DEFAULT: '#E5E7EB',
      dark: '#9CA3AF',
      text: '#4B5563',
    },
    smokeWhite: '#F5F5F5',
    white: '#FFFFFF',
    textMain: '#2D3748',
  },
  font: 'Poppins, sans-serif',
} as const;

export type Theme = typeof theme;
