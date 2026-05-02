// Simple AsyncStorage-backed store for delivered notifications
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stored_notifications_v1';
/*
 Notification shape we store:
 {
   id: string,
   title: string,
   body: string,
   receivedAt: number (ms),
   article: object | null
 }
*/

export async function getStoredNotifications() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function save(list) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0,200))); } catch {}
}

export async function addNotificationToStore(notif) {
  const list = await getStoredNotifications();
  // Prepend newest
  list.unshift(notif);
  await save(list);
}

export async function clearNotifications() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}