"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Languages, Moon, Sun, UserRound } from "lucide-react";
import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { getMe } from "@/features/auth/api";

type Theme = "light" | "dark";
type Account = { name: string; email: string; role: string };

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("godesk-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("godesk-theme-change", callback);
  };
}

function getTheme(): Theme {
  return window.localStorage.getItem("godesk-theme") === "light"
    ? "light"
    : "dark";
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    (): Theme => "dark"
  );
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;
    getMe()
      .then(({ data }) => {
        if (active) {
          setAccount({
            name: data.name,
            email: data.email,
            role: data.role,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function changeTheme(value: Theme) {
    window.localStorage.setItem("godesk-theme", value);
    window.dispatchEvent(new Event("godesk-theme-change"));
  }

  const id = language === "id";
  const button = (selected: boolean) =>
    `rounded-xl border px-4 py-3 text-sm font-medium transition ${
      selected
        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"
        : "border-slate-200 text-slate-600 hover:border-indigo-400 dark:border-slate-800 dark:text-slate-300"
    }`;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {id ? "Pengaturan" : "Settings"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {id
              ? "Kelola informasi akun dan preferensi tampilan GoDesk."
              : "Manage your account information and display preferences."}
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
            <UserRound className="size-5 text-indigo-500" />
            {id ? "Informasi Akun" : "Account Information"}
          </h2>
          {account ? (
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{id ? "Nama" : "Name"}</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{account.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{account.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{account.role}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              {id ? "Informasi akun belum tersedia." : "Account information is unavailable."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
            <Sun className="size-5 text-indigo-500" />
            {id ? "Tema Tampilan" : "Appearance"}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button className={button(theme === "light")} onClick={() => changeTheme("light")}>
              <Sun className="mr-2 inline size-4" />
              {id ? "Terang" : "Light"}
            </button>
            <button className={button(theme === "dark")} onClick={() => changeTheme("dark")}>
              <Moon className="mr-2 inline size-4" />
              {id ? "Gelap" : "Dark"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
            <Languages className="size-5 text-indigo-500" />
            {id ? "Bahasa" : "Language"}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button className={button(language === "id")} onClick={() => setLanguage("id")}>
              Indonesia
            </button>
            <button className={button(language === "en")} onClick={() => setLanguage("en")}>
              English
            </button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
