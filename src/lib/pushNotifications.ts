import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for Expo push notifications and saves the token to
 * the signed-in user's profile. Delivery still requires a server-side sender
 * (a Supabase Edge Function calling the Expo push API) — not included here,
 * since that needs to be deployed against your own Supabase project.
 */
export async function registerForPushNotifications(profileId: string): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  const { data } = await Notifications.getExpoPushTokenAsync();
  await supabase.from('profiles').update({ expo_push_token: data }).eq('id', profileId);
}
