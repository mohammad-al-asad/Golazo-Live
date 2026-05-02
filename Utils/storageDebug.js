import AsyncStorage from '@react-native-async-storage/async-storage';

// Returns list of keys and approximate size (bytes) for debugging
export async function listStorageKeys() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    const result = pairs.map(([k, v]) => ({ key: k, size: v ? v.length : 0 }));
    return result;
  } catch (e) {
    console.warn('[storageDebug] Failed to list keys:', e);
    return [];
  }
}

export async function getStorageSummary() {
  const list = await listStorageKeys();
  const total = list.reduce((s, i) => s + i.size, 0);
  return { count: list.length, totalBytes: total, keys: list };
}
