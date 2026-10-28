"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Headphones,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useLanguage } from "@/components/language-provider";
import { getMe, logout } from "@/features/auth/api";
import { confirmLogout } from "@/lib/sweet-alert";
import type { User } from "@/lib/types/auth";

type Theme = "light" | "dark";
const THEME_KEY = "godesk-theme";
const THEME_EVENT = "godesk-theme-change";

function getTheme(): Theme {
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerTheme(): Theme {
  return "dark";
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function subscribeHydration() {
  return () => {};
}

function getClientHydration() {
  return true;
}

function getServerHydration() {
  return false;
}

type IconType = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

type NavigationItem = {
  label: string;
  icon: IconType;
  href?: string;
  submenu?: boolean;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

interface AppShellProps {
  children: ReactNode;
}

function Avatar({ user, dark }: { user: User; dark: boolean }) {
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        dark ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      {initials || "GD"}
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, toggleLanguage, t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useSyncExternalStore(
    subscribeHydration,
    getClientHydration,
    getServerHydration,
  );
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isDark = theme === "dark";

  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";

  const sidebarGroups = useMemo<NavigationGroup[]>(
    () => [
      {
        title: t("shell.groups.general"),
        items: [
          {
            label: t("shell.menu.dashboard"),
            icon: LayoutDashboard,
            href: "/dashboard",
          },
          {
            label: t("shell.menu.tickets"),
            icon: TicketCheck,
            href: "/tickets",
          },
          {
            label: t("shell.menu.customers"),
            icon: Users,
            href: "/customers",
          },
          {
            label: t("shell.menu.agents"),
            icon: Headphones,
            href: "/agents",
          },
          {
            label: t("shell.menu.categories"),
            icon: Boxes,
          },
        ],
      },
      {
        title: t("shell.groups.pages"),
        items: [
          {
            label: t("shell.menu.knowledgeBase"),
            icon: BookOpen,
            submenu: true,
          },
          ...(canManage
            ? [
                {
                  label: t("shell.menu.sla"),
                  icon: ShieldCheck,
                  href: "/sla",
                },
                {
                  label: t("shell.menu.reports"),
                  icon: BarChart3,
                  href: "/reports",
                },
              ]
            : []),
        ],
      },
      {
        title: t("shell.groups.other"),
        items: [
          {
            label: t("shell.menu.settings"),
            icon: Settings,
            submenu: true,
          },
          {
            label: t("shell.menu.helpCenter"),
            icon: CircleHelp,
          },
        ],
      },
    ],
    [t, canManage],
  );

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await getMe();

        if (active) {
          setUser(response.data);
        }
      } catch {
        if (active) {
          router.replace("/login");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = theme;
    document.body.style.backgroundColor = isDark ? "#020617" : "#ffffff";
  }, [mounted, isDark, theme]);

  function toggleTheme() {
    const nextTheme: Theme = isDark ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  async function handleLogout() {
    if (loggingOut) return;

    const confirmed = await confirmLogout();
    if (!confirmed) return;

    setLoggingOut(true);

    try {
      await logout();
      setProfileOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function isActive(href?: string) {
    if (!href) return false;

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (!mounted || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div className="text-center">
          <div className="mx-auto size-9 animate-spin rounded-full border-[3px] border-slate-800 border-t-white" />
          <p className="mt-4 text-xs font-medium text-slate-400">
            {t("shell.loading")}
          </p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#020617] text-slate-100" : "bg-white text-slate-950"
      }`}
    >
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[230px] flex-col border-r transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDark ? "border-slate-800 bg-[#020617]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3"
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl ${
                isDark
                  ? "bg-slate-100 text-slate-950"
                  : "bg-slate-900 text-white"
              }`}
            >
              <Command className="size-[18px]" strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-sm font-bold">GoDesk</h1>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {t("shell.brandSubtitle")}
              </p>
            </div>
          </Link>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800/10 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {sidebarGroups.map((group) => (
            <section key={group.title} className="mb-6">
              <p className="mb-2 px-2.5 text-[11px] font-semibold text-slate-500">
                {group.title}
              </p>

              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  const className = `group flex h-[38px] w-full items-center justify-between rounded-lg px-2.5 text-left text-[13px] font-medium transition ${
                    active
                      ? isDark
                        ? "bg-slate-800 font-semibold text-white"
                        : "bg-slate-100 font-semibold text-slate-950"
                      : isDark
                        ? "text-slate-300 hover:bg-slate-900 hover:text-white"
                        : "text-slate-700 hover:bg-slate-100"
                  }`;

                  const content = (
                    <>
                      <span className="flex items-center gap-3">
                        <Icon
                          className="size-4 text-slate-500"
                          strokeWidth={1.8}
                        />
                        <span>{item.label}</span>
                      </span>

                      {item.submenu && (
                        <ChevronRight className="size-4 text-slate-500" />
                      )}
                    </>
                  );

                  if (item.href) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={className}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={className}
                      aria-label={item.label}
                    >
                      {content}
                    </button>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div
          className={`shrink-0 border-t p-3 ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((old) => !old)}
            aria-expanded={profileOpen}
            className={`flex w-full items-center gap-3 rounded-lg p-2 ${
              isDark ? "hover:bg-slate-900" : "hover:bg-slate-100"
            }`}
          >
            <Avatar user={user} dark={isDark} />

            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold">{user.name}</p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                {user.email}
              </p>
            </div>

            <ChevronDown
              className={`size-4 text-slate-500 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
              className="mt-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {loggingOut
                ? language === "id"
                  ? "Keluar..."
                  : "Signing out..."
                : t("shell.logout")}
            </button>
          )}
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[230px]">
        <header
          className={`sticky top-0 z-30 flex h-[72px] items-center border-b px-4 backdrop-blur-xl sm:px-6 ${
            isDark
              ? "border-slate-800 bg-[#020617]/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            className="mr-4 flex size-9 items-center justify-center rounded-lg border border-slate-700 lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/dashboard"
              className={`text-[13px] ${
                isActive("/dashboard")
                  ? "font-bold"
                  : "font-medium text-slate-500 hover:text-indigo-500"
              }`}
            >
              {t("shell.header.overview")}
            </Link>

            <Link
              href="/customers"
              className={`text-[13px] ${
                isActive("/customers")
                  ? "font-bold"
                  : "font-medium text-slate-500 hover:text-indigo-500"
              }`}
            >
              {t("shell.header.customers")}
            </Link>

            <Link
              href="/tickets"
              className={`text-[13px] ${
                isActive("/tickets")
                  ? "font-bold"
                  : "font-medium text-slate-500 hover:text-indigo-500"
              }`}
            >
              {t("shell.header.tickets")}
            </Link>

            {canManage && (
              <Link
                href="/reports"
                className={`text-[13px] ${
                  isActive("/reports")
                    ? "font-bold"
                    : "font-medium text-slate-500 hover:text-indigo-500"
                }`}
              >
                {t("shell.menu.reports")}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div
              className={`hidden h-9 w-[235px] items-center rounded-lg border px-3 lg:flex ${
                isDark
                  ? "border-slate-800 bg-[#0b1120]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Search className="mr-2 size-4 text-slate-500" />
              <input
                type="search"
                placeholder={t("shell.header.search")}
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-500">
                ⌘ K
              </kbd>
            </div>

            <button
              type="button"
              onClick={toggleLanguage}
              title={t("shell.languageTooltip")}
              className={`flex h-9 items-center gap-2 rounded-lg px-2.5 ${
                isDark
                  ? "text-slate-300 hover:bg-slate-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Languages className="size-4" />
              <span className="text-[11px] font-bold">
                {language === "en" ? "EN" : "ID"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`relative flex h-[34px] w-[62px] items-center rounded-full border p-[3px] ${
                isDark
                  ? "border-slate-700 bg-slate-900"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <Sun
                className={`absolute left-2 size-4 ${
                  isDark ? "opacity-30" : "text-amber-500"
                }`}
              />
              <Moon
                className={`absolute right-2 size-4 ${
                  isDark ? "text-white" : "opacity-30"
                }`}
              />
              <span
                className={`relative z-10 size-[26px] rounded-full shadow-sm transition-transform duration-300 ${
                  isDark
                    ? "translate-x-7 bg-slate-100"
                    : "translate-x-0 bg-white"
                }`}
              />
            </button>

            <NotificationBell isDark={isDark} />

            <button
              type="button"
              aria-label="Settings"
              className="flex size-9 items-center justify-center rounded-lg text-slate-500"
            >
              <Settings className="size-4" />
            </button>

            <Avatar user={user} dark={isDark} />
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
