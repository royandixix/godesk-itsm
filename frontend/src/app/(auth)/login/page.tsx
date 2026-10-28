"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { motion } from "motion/react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login({
        email,
        password,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login gagal. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="mb-11">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#171717] text-[13px] font-semibold tracking-[-0.04em] text-white">
              G
            </span>

            <span className="text-[18px] font-medium tracking-[-0.035em] text-[#222220]">
              GoDesk
            </span>
          </Link>
        </div>

        <div>
          <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[#a4a49f]">
            Welcome back
          </p>

          <h1 className="max-w-[450px] text-[38px] font-normal leading-[1.09] tracking-[-0.048em] text-[#232321] sm:text-[44px] md:text-[48px]">
            Welcome back
            <br />
            to GoDesk
          </h1>

          <p className="mt-5 max-w-[430px] text-[14px] leading-6 text-[#94948f]">
            Sign in to manage tickets, conversations and your support workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-3">
          <div className="group relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-[#aaa9a4] transition-colors group-focus-within:text-[#62b9ca]"
              strokeWidth={1.6}
            />

            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
              className="h-[58px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-4 text-[14px] shadow-none outline-none transition-all placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15"
            />
          </div>

          <div className="group relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-[#aaa9a4] transition-colors group-focus-within:text-[#62b9ca]"
              strokeWidth={1.6}
            />

            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="h-[58px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-13 text-[14px] shadow-none placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#aaa9a4] transition hover:bg-[#f4f4f1] hover:text-[#333]"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
            >
              {showPassword ? (
                <EyeOff className="size-[18px]" strokeWidth={1.6} />
              ) : (
                <Eye className="size-[18px]" strokeWidth={1.6} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-[#858580]">
              <input
                type="checkbox"
                className="size-4 rounded border-[#ccccca] accent-[#171717]"
              />
              Remember me
            </label>

            <button
              type="button"
              className="text-[12px] font-medium text-[#64aebb] transition hover:text-[#347d8a]"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-[16px] bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-3 h-[58px] w-full rounded-[19px] bg-[#1faeca] text-[14px] font-medium text-white shadow-none transition-all hover:bg-[#199bb5] active:scale-[0.995]"
          >
            {loading ? "Signing in..." : "Sign in"}

            {!loading && (
              <ArrowRight className="ml-1 size-4" strokeWidth={1.7} />
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] text-[#8f8f8a]">
          New to GoDesk?{" "}
          <Link
            href="/register"
            className="font-medium text-[#48a6b7] transition hover:text-[#287c8b]"
          >
            Create account
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
