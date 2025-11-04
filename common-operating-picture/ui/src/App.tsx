import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '@/theme';
import { config } from '@/config';
import { LocalizationProvider as DatePickerLocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { extend } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { AuthProvider } from '@/components/AuthProvider';
import { Router } from '@/components/Router';
import { BannerProvider } from './components/BannerProvider';

// import leaflet styles
import './styles/leaflet.css';

// extend dayjs with utc and timezone plugins
extend(utc);
extend(timezone);

// print the version number
console.log(`Virtru COP v${config.releaseVersion}; ©${new Date().getFullYear()} Virtru Corporation`);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <DatePickerLocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <AuthProvider>
          <BannerProvider>
            <Router />
          </BannerProvider>
        </AuthProvider>
      </DatePickerLocalizationProvider>
    </ThemeProvider>
  );
}
