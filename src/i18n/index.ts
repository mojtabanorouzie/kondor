import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { fa } from './locales/fa';

export type AppLanguage = 'en' | 'fa';
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'fa'];
export const RTL_LANGUAGES: AppLanguage[] = ['fa'];

export const resources = {
  en: { translation: en },
  fa: { translation: fa },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

export function isRtlLanguage(lng: string): boolean {
  return RTL_LANGUAGES.includes(lng as AppLanguage);
}

export default i18n;
