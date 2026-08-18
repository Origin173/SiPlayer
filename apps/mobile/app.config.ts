import type { ExpoConfig } from 'expo/config';

const gatewayUrl = process.env.EXPO_PUBLIC_GATEWAY_URL ?? 'http://127.0.0.1:8787';

const config: ExpoConfig = {
  name: 'SiPlayer',
  slug: 'siplayer',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  scheme: 'siplayer',
  plugins: [
    'expo-dev-client',
    'expo-router',
    [
      'expo-audio',
      {
        enableBackgroundPlayback: true,
        enableBackgroundRecording: false,
        recordAudioAndroid: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.origin173.siplayer',
  },
  android: {
    package: 'com.origin173.siplayer',
  },
  extra: {
    gatewayUrl,
  },
};

export default config;
