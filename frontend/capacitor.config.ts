import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kushlabs.delegate',
  appName: 'Delegate',
  webDir: 'dist',
  server: {
    // Load from the live Render URL so the APK always has the latest version
    url: 'https://delegateapp.onrender.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: true,
      spinnerColor: '#FFD700',
    },
  },
};

export default config;
