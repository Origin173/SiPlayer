import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'siplayer.sessionToken';
let cachedToken: string | null | undefined;

function webSessionStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.sessionStorage === 'undefined') return null;
  return globalThis.sessionStorage;
}

export async function getSessionToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    const storage = webSessionStorage();
    cachedToken = storage ? storage.getItem(SESSION_TOKEN_KEY) : await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setSessionToken(token: string): Promise<void> {
  const storage = webSessionStorage();
  if (Platform.OS === 'web') {
    if (!storage) throw new Error('Web session storage is unavailable.');
    storage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  }
  cachedToken = token;
}

export async function clearSessionToken(): Promise<void> {
  try {
    const storage = webSessionStorage();
    if (storage) storage.removeItem(SESSION_TOKEN_KEY);
    else if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } finally {
    cachedToken = null;
  }
}
