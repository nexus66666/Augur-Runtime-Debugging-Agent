import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

type Language = 'en' | 'zh';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// In a Vite environment, we can import the JSON files directly.
// This is simpler and more reliable than the previous fetch-based approach.
import enTranslations from '@/locales/en.json';
import zhTranslations from '@/locales/zh.json';


const translationsData = {
    en: enTranslations,
    zh: zhTranslations,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    const t = useCallback((key: string): string => {
        const langFile = translationsData[language];
        
        const translation = langFile[key as keyof typeof langFile];

        if (translation === undefined) {
            console.warn(`Translation key not found: ${key} in language ${language}`);
            return key;
        }

        return String(translation);
    }, [language]);
    
    const value = useMemo(() => ({
        language,
        setLanguage,
        t
    }), [language, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
