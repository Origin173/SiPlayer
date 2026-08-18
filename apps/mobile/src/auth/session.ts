import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'siplayer.sessionToken';
let cachedToken: string | null | undefined;

export async function getSessionToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  cachedToken = token;
}

export async function clearSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } finally {
    cachedToken = null;
  }
}
