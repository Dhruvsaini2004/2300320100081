import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a78bfa', // Lavender / Light Violet
    },
    secondary: {
      main: '#f472b6', // Rose Pink
    },
    background: {
      default: '#090714', // Deep space dark purple
      paper: 'rgba(20, 18, 38, 0.75)', // Translucent glassmorphic background
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#a1a1aa',
    },
    success: {
      main: '#10b981', // Emerald green
    },
    warning: {
      main: '#f59e0b', // Amber yellow
    },
    info: {
      main: '#3b82f6', // Bright blue
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '0.975rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
          background: 'linear-gradient(135deg, rgba(24, 22, 48, 0.8) 0%, rgba(14, 12, 30, 0.8) 100%)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'rgba(167, 139, 250, 0.25)',
            boxShadow: '0 12px 40px 0 rgba(167, 139, 250, 0.12)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(9, 7, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.95rem',
          transition: 'all 0.2s',
          '&.Mui-selected': {
            color: '#a78bfa',
          },
        },
      },
    },
  },
});

export default theme;
