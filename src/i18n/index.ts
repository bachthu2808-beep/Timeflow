import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'bt28staff.language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
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
