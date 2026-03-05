'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNotification } from '@/providers/notification-provider';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import ur from './locales/ur.json';
import ta from './locales/ta.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import bn from './locales/bn.json';
import pa from './locales/pa.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import sw from './locales/sw.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import { haptics } from '../haptics';

// --- Theme ---
type Theme = 'dark' | 'light';
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
// --- End Theme ---

const translations: Record<string, any> = {
  en, es, fr, zh, ar, ru, hi, te, ur,
  ta, kn, ml, bn, pa, gu, mr, sw, pt, de,
};

interface TranslationContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  languages: { code: string; name: string; nativeName: string }[];
  currentLanguage: { code: string; name: string; nativeName: string } | undefined;
}
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const languages: TranslationContextType['languages'] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];


export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const addNotification = useNotification();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 1. Restore persisted user choice first (survives refresh, no reload)
    try {
      const saved = localStorage.getItem('croplyze-language');
      if (saved && translations[saved]) {
        setLanguage(saved);
        return;
      }
    } catch { /* localStorage may be blocked in some WebViews */ }
    // 2. Fall back to browser language if no saved choice
    try {
      const browserLang = navigator?.language?.split('-')?.[0] ?? '';
      if (browserLang && translations[browserLang]) {
        setLanguage(browserLang);
      }
    } catch { /* navigator.language may not be available */ }
  }, []);

  const handleSetLanguage = (langCode: string) => {
    haptics.light();
    setLanguage(langCode);
    // Persist choice — restored on next load without reload
    try { localStorage.setItem('croplyze-language', langCode); } catch { /* ignore */ }
    const langDetails = languages.find(l => l.code === langCode);
    addNotification({
      type: 'info',
      title: t('header.languageUpdateTitle'),
      message: `${t('header.languageUpdateDescription')} ${langDetails?.nativeName || langCode}.`,
    });
  }

  const t = (key: string) => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      result = result?.[k];
    }
    if (!result) {
      let enResult = translations['en'];
      for (const k of keys) {
        enResult = enResult?.[k];
      }
      return enResult || key;
    }
    return result || key;
  };

  const currentLanguage = languages.find(l => l.code === language);
  const translationValue = { language, setLanguage: handleSetLanguage, t, languages, currentLanguage };

  // --- Theme Logic ---
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedTheme = localStorage.getItem('croplyze-theme') as Theme | null;
      if (storedTheme) {
        setTheme(storedTheme);
      } else if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    } catch { /* safe fallback for WebView */ }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const root = window.document.documentElement;
      root.setAttribute('data-theme', theme);
      localStorage.setItem('croplyze-theme', theme);
    } catch { /* safe fallback for WebView */ }
  }, [theme]);


  const handleSetTheme = (newTheme: Theme) => {
    haptics.light();
    setTheme(newTheme);
  };

  const themeValue = { theme, setTheme: handleSetTheme };
  // --- End Theme Logic ---

  return (
    <ThemeContext.Provider value={themeValue}>
      <TranslationContext.Provider value={translationValue}>
        {children}
      </TranslationContext.Provider>
    </ThemeContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
