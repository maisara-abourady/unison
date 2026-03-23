// Tests for token storage — focuses on corrupted token validation.

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key); }),
}));

import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, deleteToken, isTokenExpired } from '../src/utils/token-storage';

describe('token storage', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  describe('getToken', () => {
    it('returns StoredToken for valid stored JSON', async () => {
      const token = { accessToken: 'abc', refreshToken: 'def', expiresAt: Date.now() + 3600000 };
      mockStore.set('test-key', JSON.stringify(token));

      const result = await getToken('test-key');
      expect(result).toEqual(token);
    });

    it('returns null for malformed JSON', async () => {
      mockStore.set('test-key', '{broken"');

      const result = await getToken('test-key');
      expect(result).toBeNull();
    });

    it('returns null for structurally invalid JSON (missing accessToken)', async () => {
      mockStore.set('test-key', JSON.stringify({ refreshToken: 'x', expiresAt: 123 }));

      const result = await getToken('test-key');
      expect(result).toBeNull();
    });

    it('returns null for missing expiresAt', async () => {
      mockStore.set('test-key', JSON.stringify({ accessToken: 'abc' }));

      const result = await getToken('test-key');
      expect(result).toBeNull();
    });

    it('returns null when no value stored', async () => {
      const result = await getToken('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('setToken', () => {
    it('stores JSON string via SecureStore', async () => {
      const token = { accessToken: 'abc', expiresAt: 999 };
      await setToken('my-key', token);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('my-key', JSON.stringify(token));
      expect(mockStore.get('my-key')).toBe(JSON.stringify(token));
    });
  });

  describe('deleteToken', () => {
    it('calls deleteItemAsync', async () => {
      mockStore.set('del-key', 'value');
      await deleteToken('del-key');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('del-key');
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for future timestamp', () => {
      const token = { accessToken: 'a', expiresAt: Date.now() + 300_000 };
      expect(isTokenExpired(token)).toBe(false);
    });

    it('returns true for past timestamp', () => {
      const token = { accessToken: 'a', expiresAt: Date.now() - 300_000 };
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns true for timestamp within 60s buffer', () => {
      const token = { accessToken: 'a', expiresAt: Date.now() + 30_000 };
      expect(isTokenExpired(token)).toBe(true);
    });
  });
});
