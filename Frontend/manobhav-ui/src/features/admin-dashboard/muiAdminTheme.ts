import { createTheme } from '@mui/material/styles';
import { adminTheme } from './adminTheme';

/**
 * MUI components inside the admin dashboard render within a ChakraProvider. Both libraries read the
 * same Emotion ThemeContext, so without an explicit MUI theme the MUI components pick up Chakra's
 * theme object (which has no `typography`/`palette`) and crash. Wrapping every MUI subtree in a
 * ThemeProvider with this theme keeps them isolated and on-brand (Poppins + sage primary).
 */
export const muiAdminTheme = createTheme({
  typography: { fontFamily: adminTheme.font },
  palette: {
    primary: { main: adminTheme.sage.DEFAULT },
  },
});
