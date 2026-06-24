import { getLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager, Platform, useColorScheme } from 'react-native';

import { useDatabase } from '@/db';
import { settingsRepository } from '@/db/repositories';
import i18n, { isRtlLanguage, type AppLanguage } from '@/i18n';
import { SchemeContext, type ResolvedScheme } from '@/theme/scheme-context';

export type LanguageSetting = 'system' | AppLanguage;
export type ThemeSetting = 'system' | ResolvedScheme;

const KEY_LANGUAGE = 'language';
const KEY_THEME = 'theme';

interface SettingsValue {
  language: LanguageSetting;
  theme: ThemeSetting;
  setLanguage: (l: LanguageSetting) => void;
  setTheme: (t: ThemeSetting) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function useSettings(): SettingsValue {
  const v = useContext(SettingsContext);
  if (!v) throw new Error('useSettings must be used within <SettingsProvider>');
  return v;
}

function deviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'fa' ? 'fa' : 'en';
}

function resolveLanguage(setting: LanguageSetting): AppLanguage {
  return setting === 'system' ? deviceLanguage() : setting;
}

/** Apply text direction for a language (web: document.dir; native: I18nManager). */
function applyDirection(lng: AppLanguage): void {
  const rtl = isRtlLanguage(lng);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    }
  } else {
    I18nManager.allowRTL(rtl);
    if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl); // takes effect on reload
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  const system = useColorScheme();
  const [language, setLanguageState] = useState<LanguageSetting>('system');
  const [theme, setThemeState] = useState<ThemeSetting>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsRepository.getAll(db).then((s) => {
      if (cancelled) return;
      const lang = (s[KEY_LANGUAGE] as LanguageSetting) ?? 'system';
      const th = (s[KEY_THEME] as ThemeSetting) ?? 'system';
      setLanguageState(lang);
      setThemeState(th);
      const resolved = resolveLanguage(lang);
      i18n.changeLanguage(resolved);
      applyDirection(resolved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setLanguage = useCallback(
    (l: LanguageSetting) => {
      setLanguageState(l);
      settingsRepository.set(db, KEY_LANGUAGE, l);
      const resolved = resolveLanguage(l);
      i18n.changeLanguage(resolved);
      applyDirection(resolved);
    },
    [db],
  );

  const setTheme = useCallback(
    (t: ThemeSetting) => {
      setThemeState(t);
      settingsRepository.set(db, KEY_THEME, t);
    },
    [db],
  );

  const resolvedScheme: ResolvedScheme =
    theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;

  const value = useMemo(
    () => ({ language, theme, setLanguage, setTheme }),
    [language, theme, setLanguage, setTheme],
  );

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={value}>
      <SchemeContext.Provider value={resolvedScheme}>
        {children}
      </SchemeContext.Provider>
    </SettingsContext.Provider>
  );
}
