"use client";

import {
  Languages,
} from "lucide-react";

import {
  motion,
} from "motion/react";

import {
  useLanguage,
} from "@/components/language-provider";

export function LanguageSwitcher({
  dark,
}: {
  dark: boolean;
}) {
  const {
    language,
    toggleLanguage,
  } = useLanguage();

  return (
    <motion.button
      type="button"
      whileTap={{
        scale: 0.94,
      }}
      onClick={
        toggleLanguage
      }
      title={
        language === "en"
          ? "Ubah ke Bahasa Indonesia"
          : "Switch to English"
      }
      className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition-colors ${
        dark
          ? "text-slate-300 hover:bg-slate-900 hover:text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Languages
        className="size-[16px]"
        strokeWidth={1.8}
      />

      <motion.span
        key={language}
        initial={{
          opacity: 0,
          y: 4,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.2,
        }}
      >
        {language === "en"
          ? "EN"
          : "ID"}
      </motion.span>
    </motion.button>
  );
}