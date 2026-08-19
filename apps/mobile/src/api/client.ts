import Constants from 'expo-constants';
import { getSessionToken } from '@/auth/session';
import { ApiClient } from './clientCore';

function resolveGatewayUrl(): string {
  const configuredUrl = Constants.expoConfig?.extra?.gatewayUrl;
  return typeof configuredUrl === 'string' && configuredUrl.length > 0
    ? configuredUrl
    : 'http://127.0.0.1:8787';
}

export { ApiClient, ApiError } from './clientCore';
export type { ApiClientOptions } from './clientCore';

export const apiClient = new ApiClient({ baseUrl: resolveGatewayUrl(), getToken: getSessionToken });
