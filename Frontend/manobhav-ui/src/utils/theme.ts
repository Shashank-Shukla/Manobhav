import { createTheme } from '@mui/material/styles';
import '@mui/x-date-pickers/themeAugmentation';

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

export const muiCalendarTheme = createTheme({
  palette: {
    primary: { main: theme.colors.sage.DEFAULT },
    secondary: { main: theme.colors.dustyRose.DEFAULT },
    background: { default: '#ffffff' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiPickersToolbar: {
      styleOverrides: {
        root: {
          backgroundColor: theme.colors.sage.DEFAULT,
          color: '#ffffff',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: theme.colors.sage.DEFAULT,
            color: '#ffffff',
          },
          '&.Mui-selected:hover': {
            backgroundColor: theme.colors.sage.dark,
          },
          '&:hover': {
            backgroundColor: theme.colors.sage.light,
          },
          '&.Mui-disabled': {
            color: theme.colors.grey.dark,
          },
        },
        today: {
          border: `1px solid ${theme.colors.sage.DEFAULT}`,
        },
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: {
          color: theme.colors.sage.dark,
        },
      },
    },
    MuiPickersLayout: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.9)',
        },
      },
    },
  },
});

export type Theme = typeof theme;
