import type { ConfigContext, ExpoConfig } from 'expo/config';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') || undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ORAIA CRM',
  slug: 'oraia-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/oraia-logo.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/oraia-logo.png',
    resizeMode: 'contain',
    backgroundColor: '#0E1323',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.oraiacrm.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/oraia-logo.png',
      backgroundColor: '#0E1323',
    },
    package: 'com.oraiacrm.app',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/oraia-logo.png',
  },
  plugins: [
    './plugins/withMonorepoAndroid.js',
    '@react-native-community/datetimepicker',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0E1323',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow ORAIA CRM to access your photos to attach images to messages.',
        cameraPermission: 'Allow ORAIA CRM to use the camera to attach photos to messages.',
      },
    ],
  ],
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '33e719d6-bce8-416e-9836-97d7bc6311a3',
    },
  },
});
