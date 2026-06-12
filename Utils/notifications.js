import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFootballNews } from './newsApi';
import i18n from '../i18n';
import { addNotificationToStore } from './notificationStore';
import { getLocalDateString } from './dateHelpers';

// Keys
const PERMISSION_KEY = 'notif_permission_asked_v1';
const SCHEDULED_KEY = 'notif_twice_daily_scheduled_v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Add this initializer (idempotent) to set listeners
let listenersInit = false;
export function initNotificationListeners(navigationRef) {
  if (listenersInit) return;
  listenersInit = true;

  Notifications.addNotificationReceivedListener(async (notification) => {
    const { title, body, data } = notification.request.content;
    await addNotificationToStore({
      id: notification.request.identifier,
      title: title || 'Notification',
      body: body || '',
      receivedAt: Date.now(),
      article: data?.article || null,
    });
  });

  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { data } = response.notification.request.content;
    const article = data?.article;
    if (article && navigationRef?.isReady()) {
      // Navigate to news detail
      navigationRef.navigate('Home', {
        screen: 'NewsDetailScreen',
        params: { newsItem: article },
      });
    }
  });
}

async function askPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const asked = await AsyncStorage.getItem(PERMISSION_KEY);
  if (!asked) {
    await AsyncStorage.setItem(PERMISSION_KEY, '1');
    const req = await Notifications.requestPermissionsAsync();
    return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  return false;
}

// Public helper to request notification permission (useful to call from App startup)
export async function ensureNotificationPermission() {
  try {
    return await askPermission();
  } catch (e) {
    console.warn('[notifications] ensureNotificationPermission failed', e);
    return false;
  }
}

function randomTimesInDay(count) {
  // Returns JS Dates later today (local) at random times between 9:00 and 21:00
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const results = [];
  for (let i=0;i<count;i++) {
    const hour = 9 + Math.floor(Math.random()*12); // 9..20
    const minute = Math.floor(Math.random()*60);
    results.push(new Date(year, month, date, hour, minute, 0));
  }
  // Ensure future times; if any earlier than now add 1 day
  return results.map(d => d.getTime() <= now.getTime() ? new Date(d.getTime()+86400000) : d);
}

async function pickRandomNews() {
  try {
    const res = await getFootballNews({ lang: i18n.language, count: 20 });
    if (res?.articles?.length) {
      const a = res.articles[Math.floor(Math.random()*res.articles.length)];
      return {
        title: a.title?.slice(0, 60) || 'Latest Football News',
        body: a.description?.slice(0, 120) || a.body?.slice(0,120) || '',
        data: { article: a },
      };
    }
  } catch {}
  return { title: 'Football Update', body: 'Check out the latest football stories.', data: {} };
}

export async function scheduleTwiceDailyRandomNews() {
  const hasPerm = await askPermission();
  if (!hasPerm) return false;
  const already = await AsyncStorage.getItem(SCHEDULED_KEY);
  if (already) return true; // only schedule once per install (simple approach)

  const times = randomTimesInDay(2);
  for (const when of times) {
    const content = await pickRandomNews();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
      },
      trigger: { date: when },
    });
  }
  await AsyncStorage.setItem(SCHEDULED_KEY, '1');
  return true;
}

export async function rescheduleForTomorrowIfNeeded() {
  // Simple daily check: if past midnight and we scheduled for previous day only once, clear flag so next launch schedules again
  const key = 'notif_last_schedule_day_v1';
  const today = new Date();
  const dayStr = getLocalDateString(today);
  const prev = await AsyncStorage.getItem(key);
  if (prev !== dayStr) {
    // New day: allow re-scheduling
    await AsyncStorage.removeItem(SCHEDULED_KEY);
    await AsyncStorage.setItem(key, dayStr);
  }
}
