// Shared expo-secure-store mock using an in-memory Map.

export function createSecureStoreMock() {
  const store = new Map<string, string>();

  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  };
}
