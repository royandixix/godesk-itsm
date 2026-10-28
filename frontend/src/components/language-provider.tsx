"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  translations,
  type Language,
} from "@/i18n/translations";
export type TranslationFunction = (key: string) => string;
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: TranslationFunction;
};
const LanguageContext =
  createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "godesk-language";
const LANGUAGE_EVENT = "godesk-language-change";

function getLanguage(): Language {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "id" ? "id" : "en";
}

function getServerLanguage(): Language {
  return "en";
}

function subscribeLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_EVENT, onChange);
  };
}

function resolveTranslation(
  language: Language,
  key: string,
): string {
  const parts = key.split(".");
  let value: unknown = translations[language];
  for (const part of parts) {
    if (
      typeof value !== "object" ||
      value === null ||
      !(part in value)
    ) {
      return key;
    }
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string"
    ? value
    : key;
}
export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    getServerLanguage,
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, []);

  const toggleLanguage =
    useCallback(() => {
      setLanguage(
        language === "en"
          ? "id"
          : "en",
      );
    }, [language, setLanguage]);
  const t = useCallback(
    (key: string) =>
      resolveTranslation(
        language,
        key,
      ),
    [language],
  );
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [
      language,
      setLanguage,
      toggleLanguage,
      t,
    ],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context =
    useContext(LanguageContext);
  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider",
    );
  }
  return context;
}
