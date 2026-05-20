import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swairua.lend',
  appName: 'JECRI BUREAU',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowedUrl: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://192.168.1.*',
      'https://*',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#0f172a',
      showSpinner: true,
      spinnerColor: '#dc2626',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
