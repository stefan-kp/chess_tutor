import { SupportedLanguage, translations, Translations } from './translations';

export function useTranslation(language: SupportedLanguage): Translations {
    return translations[language] || translations.en;
}

export function getTranslation(language: SupportedLanguage, key: string): string {
    const t = useTranslation(language);
    const keys = key.split('.');
    let value: any = t;

    for (const k of keys) {
        value = value?.[k];
    }

    return value || key;
}
