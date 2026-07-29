import { createContext, useContext, useMemo } from "react";
import { translations, type TranslationKey, type Lang } from "./translations";

interface I18nContextType {
  lang: Lang;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  t: (key: TranslationKey) => translations.zh[key] ?? key,
});

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo<I18nContextType>(() => ({
    lang,
    t: (key: TranslationKey) => translations[lang][key] ?? translations.zh[key] ?? key,
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  return ctx;
}
