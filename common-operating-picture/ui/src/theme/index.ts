import { createTheme } from '@mui/material/styles';
import { typography } from './typography';

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#1b2635',
      paper: '#233044',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
    },
  },
  typography,
  components: {
    MuiAppBar: {
      defaultProps: {
        style: {
          backgroundColor: '#1b2635',
          boxShadow: 'none',
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        inputProps: {
          style: {
            color: 'white',
          },
        },
      },
      styleOverrides: {
        notchedOutline: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        inputProps: {
          style: {
            color: 'white',
          },
        },
      },
    },
    MuiInputLabel: {
      defaultProps: {
        style: {
          color: 'white',
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fill: 'white',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.25)',
        },
      },
    },
  },
});
