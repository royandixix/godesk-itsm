"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { getMe } from "@/features/auth/api";
import { apiFetch } from "@/lib/api/client";
import type { Category, DataResponse } from "@/lib/types/ticket";

type Status = "DRAFT" | "PUBLISHED";
type Article = {
  id: number; category_id: number | null; category_name: string;
  author_id: number; author_name: string; slug: string;
  title: string; summary: string; content: string;
  status: Status; published_at: string | null; created_at: string; updated_at: string;
};
type ArticleForm = {
  title: string; summary: string; content: string; category_id: string; status: Status;
};
const blank: ArticleForm = { title: "", summary: "", content: "", category_id: "", status: "DRAFT" };

export default function KnowledgePage() {
  const { language } = useLanguage();
  const id = language === "id";
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selected, setSelected] = useState<Article | null>(null);
  const [editor, setEditor] = useState<Article | "new" | null>(null);
  const [form, setForm] = useState<ArticleForm>(blank);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const me = await getMe();
      const manage = ["SUPER_ADMIN", "MANAGER", "AGENT"].includes(me.data.role);
      setCanManage(manage);
      const [list, cats] = await Promise.all([
        apiFetch<DataResponse<Article[]>>("/knowledge"),
        apiFetch<DataResponse<Category[]>>("/categories"),
      ]);
      setArticles(list.data);
      setCategories(cats.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil artikel");
    } finally { setBusy(false); }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const shown = useMemo(() => articles.filter((a) => {
    const matched = `${a.title} ${a.summary} ${a.content} ${a.category_name}`.toLowerCase().includes(search.toLowerCase());
    return matched && (status === "ALL" || a.status === status) &&
      (categoryFilter === "ALL" || String(a.category_id) === categoryFilter);
  }), [articles, search, status, categoryFilter]);

  function openEditor(article: Article | "new") {
    setEditor(article);
    setSelected(null);
    setError("");
    setSuccess("");
    setForm(article === "new" ? blank : {
      title: article.title, summary: article.summary, content: article.content,
      category_id: article.category_id ? String(article.category_id) : "", status: article.status,
    });
  }

  async function save() {
    if (!canManage || !editor || saving) return;
    if (form.title.trim().length < 5 || form.content.trim().length < 10) {
      setError(id ? "Judul minimal 5 karakter dan isi minimal 10 karakter." : "Title needs 5 characters and content needs 10.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), summary: form.summary.trim(), content: form.content.trim(),
        category_id: form.category_id ? Number(form.category_id) : null, status: form.status,
        ...(editor !== "new" && !form.category_id ? { clear_category: true } : {}),
      };
      await apiFetch(editor === "new" ? "/knowledge" : `/knowledge/${editor.id}`, {
        method: editor === "new" ? "POST" : "PATCH", body: JSON.stringify(payload),
      });
      setEditor(null);
      setSelected(null);
      setSuccess(id ? "Artikel berhasil disimpan." : "Article saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan artikel");
    } finally { setSaving(false); }
  }

  async function openArticle(a: Article) {
    try {
      const result = await apiFetch<DataResponse<Article>>(`/knowledge/${a.id}`);
      setSelected(result.data);
      setEditor(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka artikel");
    }
  }

  async function remove(a: Article) {
    if (!canManage || saving || !window.confirm(
      id ? `Hapus artikel "${a.title}" secara permanen?` : `Permanently delete "${a.title}"?`
    )) return;
    setSaving(true);
    try {
      await apiFetch(`/knowledge/${a.id}`, { method: "DELETE" });
      setSelected(null);
      setSuccess(id ? "Artikel dihapus." : "Article deleted.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menghapus artikel"); }
    finally { setSaving(false); }
  }

  const surface = "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
  const btn = "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200";
  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return <AppShell>
    <main className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-white"><BookOpen className="size-6 text-indigo-500" /> {id ? "Pusat Pengetahuan" : "Knowledge Base"}</h1><p className="mt-2 text-sm text-slate-500">{id ? "Artikel panduan dan solusi untuk pengguna GoDesk." : "Help articles and troubleshooting guides for GoDesk."}</p></div>
        {canManage && <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => openEditor("new")}><Plus className="size-4" /> {id ? "Tulis Artikel" : "New Article"}</button>}
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">{success}</div>}
      <section className={`${surface} space-y-4 p-5`}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative md:col-span-2"><Search className="absolute left-3 top-2.5 size-4 text-slate-500" /><input aria-label="Search articles" className={`${input} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={id ? "Cari artikel..." : "Search articles..."} /></label>
          <select aria-label="Filter category" className={input} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="ALL">{id ? "Semua Kategori" : "All Categories"}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <div className="flex gap-2"><select aria-label="Filter status" className={input} value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">{id ? "Semua Status" : "All Statuses"}</option>{canManage && <option value="DRAFT">Draft</option>}<option value="PUBLISHED">Published</option></select><button className={btn} title="Refresh" onClick={() => void load()}><RefreshCw className="size-4" /></button></div>
        </div>
        {busy ? <p className="text-sm text-slate-500">Loading...</p> : shown.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{id ? "Belum ada artikel." : "No articles yet."}</p> : <div className="grid gap-4 md:grid-cols-2">{shown.map((a) => <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={a.id}>
          <div className="mb-2 flex flex-wrap items-center gap-2"><span className={a.status === "PUBLISHED" ? "text-xs text-emerald-500" : "text-xs text-amber-500"}>{a.status}</span><span className="text-xs text-slate-500">{a.category_name || (id ? "Tanpa Kategori" : "Uncategorized")}</span></div>
          <h2 className="font-semibold text-slate-950 dark:text-white">{a.title}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-500">{a.summary || a.content}</p><p className="mt-3 text-xs text-slate-500">{a.author_name}</p>
          <div className="mt-4 flex flex-wrap gap-2"><button className={btn} onClick={() => void openArticle(a)}>{id ? "Baca" : "Read"}</button>{canManage && <><button className={btn} title="Edit" onClick={() => openEditor(a)}><Pencil className="size-4" /></button><button className={btn} title="Delete" disabled={saving} onClick={() => void remove(a)}><Trash2 className="size-4" /></button></>}</div>
        </article>)}</div>}
      </section>
      {selected && <section className={`${surface} space-y-4 p-6`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-indigo-500">{selected.category_name} · {selected.status}</p><h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{selected.title}</h2><p className="mt-2 text-sm text-slate-500">{selected.summary}</p></div><button className={btn} onClick={() => setSelected(null)}>{id ? "Tutup" : "Close"}</button></div><div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-200">{selected.content}</div><p className="text-xs text-slate-500">{selected.author_name}</p></section>}
      {editor && canManage && <section className={`${surface} space-y-4 p-5`}><h2 className="font-semibold text-slate-950 dark:text-white">{editor === "new" ? (id ? "Artikel Baru" : "New Article") : (id ? "Edit Artikel" : "Edit Article")}</h2>
        <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Judul" : "Title"}</span><input className={input} maxLength={200} value={form.title} onChange={(e) => setForm((p) => ({...p, title: e.target.value}))} /></label>
        <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Ringkasan" : "Summary"}</span><textarea className={input} maxLength={500} rows={2} value={form.summary} onChange={(e) => setForm((p) => ({...p, summary: e.target.value}))} /></label>
        <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Isi Artikel" : "Article Content"}</span><textarea className={input} maxLength={50000} rows={10} value={form.content} onChange={(e) => setForm((p) => ({...p, content: e.target.value}))} /></label>
        <div className="grid gap-3 md:grid-cols-2"><label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Kategori" : "Category"}</span><select className={input} value={form.category_id} onChange={(e) => setForm((p) => ({...p, category_id: e.target.value}))}><option value="">{id ? "Tanpa Kategori" : "No Category"}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>Status</span><select className={input} value={form.status} onChange={(e) => setForm((p) => ({...p, status: e.target.value as Status}))}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label></div>
        <div className="flex gap-3"><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : (id ? "Simpan" : "Save")}</button><button className={btn} onClick={() => setEditor(null)}>{id ? "Batal" : "Cancel"}</button></div>
      </section>}
    </main>
  </AppShell>;
}
