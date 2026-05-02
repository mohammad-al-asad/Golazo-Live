import { Platform, ToastAndroid } from 'react-native';
let listeners = [];
export function showToast(message) {
  if (Platform.OS === 'android' && ToastAndroid?.show) {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
  listeners.forEach(l => l(message));
}
export function subscribeToast(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f=>f!==fn); }; }
