import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'bt28staff.language';

function detectDeviceLanguage(): SupportedLanguage {
  const deviceTag = Localization.getLocales()[0]?.languageCode;
  return deviceTag === 'vi' ? 'vi' : 'en';
}

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function loadSavedLanguage(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'vi') {
    await i18next.changeLanguage(saved);
  }
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  await i18next.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export default i18next;
