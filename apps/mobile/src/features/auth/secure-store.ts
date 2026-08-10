import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper do refresh token no SecureStore. Chave única, semântica idempotente.
 * No web (RN Web preview) SecureStore não existe — fazemos fallback silencioso
 * para não quebrar preview no browser durante desenvolvimento.
 */
const KEY = 'petzo.refreshToken';

const isAvailable = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export async function saveRefreshToken(token: string): Promise<void> {
  if (!(await isAvailable())) return;
  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getRefreshToken(): Promise<string | null> {
  if (!(await isAvailable())) return null;
  return SecureStore.getItemAsync(KEY);
}

export async function clearRefreshToken(): Promise<void> {
  if (!(await isAvailable())) return;
  await SecureStore.deleteItemAsync(KEY);
}
