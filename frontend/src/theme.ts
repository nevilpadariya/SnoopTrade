// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00D09C', // Vibrant green for primary actions
    },
    secondary: {
      main: '#1A1A1A', // Deep blue for secondary elements
    },
    background: {
      default: '#F5F5F5', // Light gray background
      paper: '#FFFFFF', // White for paper components
    },
    text: {
      primary: '#333333', // Dark gray for primary text
      secondary: '#666666', // Medium gray for secondary text
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif', // Clean sans-serif font
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      color: '#1A1A1A',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      color: '#1A1A1A',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.75rem',
      color: '#1A1A1A',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.5rem',
      color: '#1A1A1A',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.25rem',
      color: '#1A1A1A',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1rem',
      color: '#1A1A1A',
    },
    body1: {
      fontSize: '1rem',
      color: '#333333',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#666666',
    },
    button: {
      textTransform: 'none', // Preserve case in button text
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Rounded corners for buttons
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#00D09C',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#00B386',
          },
        },
        containedSecondary: {
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#333333',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '16px',
          borderRadius: '8px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          boxShadow: 'none',
          borderBottom: '1px solid #E0E0E0',
        },
      },
    },
  },
});

export default theme;
