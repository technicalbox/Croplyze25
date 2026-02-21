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
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
];


export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const addNotification = useNotification();

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
      setLanguage(browserLang);
    }
  }, []);

  const handleSetLanguage = (langCode: string) => {
    haptics.light();
    setLanguage(langCode);
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
    const storedTheme = localStorage.getItem('croplyze-theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('croplyze-theme', theme);
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
