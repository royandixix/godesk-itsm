"use client";

import Link from "next/link";

import {
  useState,
} from "react";

import {
  ArrowLeft,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import AppShell from "@/components/app-shell";

import {
  useLanguage,
} from "@/components/language-provider";

import TicketForm, {
  type TicketFormValues,
} from "@/features/tickets/components/ticket-form";

import {
  createTicket,
} from "@/features/tickets/api";

import {
  ApiError,
} from "@/lib/api/client";

export default function NewTicketPage() {
  const router =
    useRouter();

  const {
    t,
  } =
    useLanguage();

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function handleCreate(
    values:
      TicketFormValues,
  ) {
    try {
      setSubmitting(
        true,
      );

      setError("");

      const response =
        await createTicket(
          values,
        );

      router.push(
        `/tickets/${response.data.id}`,
      );
    } catch (err) {
      if (
        err instanceof
        ApiError
      ) {
        if (
          err.status ===
          401
        ) {
          router.replace(
            "/login",
          );

          return;
        }

        if (
          err.status ===
          403
        ) {
          setError(
            t(
              "errors.forbidden",
            ),
          );

          return;
        }
      }

      setError(
        t(
          "newTicket.createFailed",
        ),
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          href="/tickets"
          className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold text-slate-500 transition hover:text-slate-950 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />

          {t(
            "newTicket.back",
          )}
        </Link>

        <div className="mb-7">
          <h1 className="text-[26px] font-bold tracking-[-0.04em] text-slate-950 dark:text-white">
            {t(
              "newTicket.title",
            )}
          </h1>

          <p className="mt-1 text-[12px] font-medium text-slate-500">
            {t(
              "newTicket.subtitle",
            )}
          </p>
        </div>

        <TicketForm
          mode="create"
          cancelHref="/tickets"
          submitting={
            submitting
          }
          serverError={
            error
          }
          onSubmit={
            handleCreate
          }
        />
      </div>
    </AppShell>
  );
}