"use client";

import Link from "next/link";
import { BookOpen, CircleHelp, PlusCircle, TicketCheck } from "lucide-react";
import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";

const questions = [
  {
    id: "Bagaimana cara membuat tiket?",
    en: "How do I create a ticket?",
    answerId: "Buka menu Tiket, klik Buat Tiket, lengkapi kategori, subjek, deskripsi, dan prioritas, kemudian simpan.",
    answerEn: "Open Tickets, select Create Ticket, complete the form, then submit.",
  },
  {
    id: "Bagaimana cara melihat status tiket?",
    en: "How can I check ticket status?",
    answerId: "Buka menu Tiket dan pilih tiket yang ingin dilihat untuk memeriksa status serta aktivitasnya.",
    answerEn: "Open Tickets and select a ticket to review its status and activity.",
  },
  {
    id: "Apa itu SLA?",
    en: "What is SLA?",
    answerId: "SLA adalah target waktu respons dan penyelesaian tiket berdasarkan kebijakan layanan.",
    answerEn: "An SLA defines response and resolution time targets under service policies.",
  },
  {
    id: "Bagaimana cara menghubungi tim bantuan?",
    en: "How do I contact support?",
    answerId: "Buat tiket baru dengan menjelaskan masalah dan lampirkan bukti jika diperlukan.",
    answerEn: "Create a new ticket describing the issue and attach evidence if necessary.",
  },
];

export default function HelpPage() {
  const { language } = useLanguage();
  const id = language === "id";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-950 dark:text-white">
            <CircleHelp className="size-7 text-indigo-500" />
            {id ? "Pusat Bantuan" : "Help Center"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {id
              ? "Panduan penggunaan sistem helpdesk GoDesk."
              : "Guides for using the GoDesk helpdesk system."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/tickets/new" className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-950">
            <PlusCircle className="mb-3 size-6 text-indigo-500" />
            <h2 className="font-semibold text-slate-950 dark:text-white">
              {id ? "Buat Tiket Bantuan" : "Create Support Ticket"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {id ? "Laporkan kendala melalui tiket baru." : "Report an issue through a new ticket."}
            </p>
          </Link>

          <Link href="/tickets" className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-950">
            <TicketCheck className="mb-3 size-6 text-indigo-500" />
            <h2 className="font-semibold text-slate-950 dark:text-white">
              {id ? "Pantau Tiket" : "Track Tickets"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {id ? "Periksa status dan perkembangan tiket." : "Review ticket status and progress."}
            </p>
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
            <BookOpen className="size-5 text-indigo-500" />
            {id ? "Pertanyaan yang Sering Diajukan" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-3">
            {questions.map((q) => (
              <details
                key={q.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">
                  {id ? q.id : q.en}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {id ? q.answerId : q.answerEn}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
