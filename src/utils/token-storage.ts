// Secure token storage using expo-secure-store.
import * as SecureStore from 'expo-secure-store';

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/** Type guard to validate parsed token data. */
function isStoredToken(obj: unknown): obj is StoredToken {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as StoredToken).accessToken === 'string' &&
    typeof (obj as StoredToken).expiresAt === 'number'
  );
}

export async function getToken(key: string): Promise<StoredToken | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Why: validate structure to guard against corrupted stored data.
    if (!isStoredToken(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setToken(key: string, token: StoredToken): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(token));
}

export async function deleteToken(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export function isTokenExpired(token: StoredToken): boolean {
  // Why: 1 minute buffer to account for clock skew and network latency.
  return Date.now() >= token.expiresAt - 60_000;
}
