import { createTheme } from '@mui/material/styles';
import '@mui/x-date-pickers/themeAugmentation';
import { theme } from '../../utils/theme';

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
