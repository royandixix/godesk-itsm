"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/features/auth/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordValid = password.length >= 8 && password.length <= 72;

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (name.trim().length < 3) {
      setError("Nama lengkap minimal 3 karakter.");
      return;
    }

    if (!passwordValid) {
      setError("Password harus terdiri dari 8 sampai 72 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registrasi gagal. Silakan coba lagi.",
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
        {/* Logo */}
        <div className="mb-8 sm:mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#171717] text-[13px] font-semibold tracking-[-0.03em] text-white">
              G
            </span>

            <span className="text-[18px] font-semibold tracking-[-0.04em] text-[#222220]">
              GoDesk
            </span>
          </Link>
        </div>

        {/* Heading */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#aaa9a4]">
            Get started
          </p>

          <h1 className="max-w-[470px] text-[36px] font-medium leading-[1.08] tracking-[-0.055em] text-[#232321] sm:text-[42px] md:text-[46px]">
            Create your
            <br />
            GoDesk account
          </h1>

          <p className="mt-4 max-w-[430px] text-[13px] font-normal leading-6 text-[#94948f] sm:text-[14px]">
            Start managing requests and support conversations from one clean
            workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-3">
          {/* Name */}
          <div className="group relative">
            <UserRound
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-[#aaa9a4] transition-colors group-focus-within:text-[#62b9ca]"
              strokeWidth={1.6}
            />

            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
              className="h-[56px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-4 text-[13px] font-normal text-[#292927] shadow-none transition-all placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15 sm:text-[14px]"
            />
          </div>

          {/* Email */}
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
              required
              maxLength={255}
              autoComplete="email"
              className="h-[56px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-4 text-[13px] font-normal text-[#292927] shadow-none transition-all placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15 sm:text-[14px]"
            />
          </div>

          {/* Password */}
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
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
              className="h-[56px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-12 text-[13px] font-normal text-[#292927] shadow-none transition-all placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15 sm:text-[14px]"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#aaa9a4] transition hover:bg-[#f4f4f1] hover:text-[#444440]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-[18px]" strokeWidth={1.6} />
              ) : (
                <Eye className="size-[18px]" strokeWidth={1.6} />
              )}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="group relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-[#aaa9a4] transition-colors group-focus-within:text-[#62b9ca]"
              strokeWidth={1.6}
            />

            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
              className="h-[56px] rounded-[19px] border-[#dededa] bg-white pl-12 pr-12 text-[13px] font-normal text-[#292927] shadow-none transition-all placeholder:text-[#b5b5b0] focus-visible:border-[#78c4d2] focus-visible:ring-[3px] focus-visible:ring-[#82cbd8]/15 sm:text-[14px]"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#aaa9a4] transition hover:bg-[#f4f4f1] hover:text-[#444440]"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-[18px]" strokeWidth={1.6} />
              ) : (
                <Eye className="size-[18px]" strokeWidth={1.6} />
              )}
            </button>
          </div>

          {/* Password status */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 pt-1">
            <div
              className={`flex items-center gap-1.5 text-[11px] ${
                passwordValid ? "text-[#4b8c72]" : "text-[#aaa9a4]"
              }`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-full ${
                  passwordValid ? "bg-[#dff3e9]" : "bg-[#efefec]"
                }`}
              >
                <Check className="size-2.5" strokeWidth={2} />
              </span>
              8–72 characters
            </div>

            <div
              className={`flex items-center gap-1.5 text-[11px] ${
                passwordsMatch ? "text-[#4b8c72]" : "text-[#aaa9a4]"
              }`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-full ${
                  passwordsMatch ? "bg-[#dff3e9]" : "bg-[#efefec]"
                }`}
              >
                <Check className="size-2.5" strokeWidth={2} />
              </span>
              Passwords match
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-600"
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="mt-3 h-[56px] w-full rounded-[19px] bg-[#1faeca] text-[13px] font-semibold text-white shadow-none transition-all hover:bg-[#199bb5] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[14px]"
          >
            {loading ? "Creating account..." : "Create account"}

            {!loading && (
              <ArrowRight className="ml-1 size-4" strokeWidth={1.8} />
            )}
          </Button>
        </form>

        {/* Login */}
        <p className="mt-6 text-center text-[12px] font-normal text-[#8f8f8a]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#48a6b7] transition hover:text-[#287c8b]"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
