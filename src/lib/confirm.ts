import { Alert, Platform } from 'react-native';

/**
 * Alert.alert() is a no-op stub on web (react-native-web doesn't implement
 * it), so any confirm-before-action flow silently does nothing there. Use
 * window.confirm on web and the native Alert everywhere else.
 */
export function confirm(title: string, message: string, cancelLabel: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
