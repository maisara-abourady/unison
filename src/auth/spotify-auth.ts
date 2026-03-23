// Spotify OAuth2 PKCE authentication flow.
import { makeRedirectUri, AuthRequest, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getToken, setToken, deleteToken, isTokenExpired } from '../utils/token-storage';

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_TOKEN_KEY = 'unison.spotify.token';

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const redirectUri = makeRedirectUri({ scheme: 'unison' });

export async function getSpotifyToken(): Promise<string | null> {
  const stored = await getToken(SPOTIFY_TOKEN_KEY);
  if (!stored) return null;

  if (!isTokenExpired(stored)) {
    return stored.accessToken;
  }

  if (stored.refreshToken) {
    const refreshed = await refreshSpotifyToken(stored.refreshToken);
    if (refreshed) return refreshed;
    // Why: refresh failed — clear stored token so auth store reflects disconnected state.
    await deleteToken(SPOTIFY_TOKEN_KEY);
  }

  return null;
}

export async function connectSpotify(): Promise<string | null> {
  const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
  const request = new AuthRequest({
    clientId: CLIENT_ID,
    scopes: ['user-read-private'],
    redirectUri,
    usePKCE: true,
    responseType: ResponseType.Code,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  const tokenResponse = await fetch(discovery.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: result.params.code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: request.codeVerifier ?? '',
    }).toString(),
  });

  const data = await tokenResponse.json();

  if (data.access_token) {
    await setToken(SPOTIFY_TOKEN_KEY, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    });
    return data.access_token;
  }

  return null;
}

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }).toString(),
    });

    const data = await response.json();

    if (data.access_token) {
      await setToken(SPOTIFY_TOKEN_KEY, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      });
      return data.access_token;
    }

    return null;
  } catch (e) {
    console.error('[AUTH_FAILED] Spotify token refresh failed:', e);
    return null;
  }
}

export async function disconnectSpotify(): Promise<void> {
  await deleteToken(SPOTIFY_TOKEN_KEY);
}

export function isSpotifyConfigured(): boolean {
  const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
  return CLIENT_ID.length > 0;
}
