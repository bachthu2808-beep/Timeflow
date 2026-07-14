import { Alert, Platform } from 'react-native';

/**
 * Alert.alert() is a no-op stub on web (react-native-web doesn't implement
 * it), so every info/error message built on it silently did nothing there —
 * e.g. "no shop assigned", "out of range", failed-save errors. Use
 * window.alert on web and the native Alert everywhere else.
 */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
