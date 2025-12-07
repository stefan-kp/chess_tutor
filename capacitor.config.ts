import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaproblem.chesstutor',
  appName: 'Chess Tutor',
  webDir: 'out', // Next.js static export output directory

  server: {
    // Use HTTPS scheme for Android to avoid cleartext issues
    androidScheme: 'https',
  },

  // iOS configuration
  ios: {
    contentInset: 'automatic',
  },

  // Android configuration
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
