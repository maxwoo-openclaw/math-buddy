import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { en } from '../locales/en';
import { zhTW } from '../locales/zhTW';

export type Locale = 'en' | 'zhTW';
type Translations = typeof en;

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const translations: Record<Locale, Translations> = { en, zhTW };

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: en,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    if (stored === 'en' || stored === 'zhTW') return stored;
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
