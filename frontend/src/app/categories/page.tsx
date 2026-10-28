"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { getMe } from "@/features/auth/api";
import { apiFetch } from "@/lib/api/client";
import type { Category, DataResponse } from "@/lib/types/ticket";

type CategoryPayload = { name: string; description: string };
const blank: CategoryPayload = { name: "", description: "" };

export default function CategoriesPage() {
  const { language } = useLanguage();
  const id = language === "id";
  const [items, setItems] = useState<Category[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editor, setEditor] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<CategoryPayload>(blank);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const me = await getMe();
      const manage = ["SUPER_ADMIN", "MANAGER"].includes(me.data.role);
      setCanManage(manage);
      const data = await apiFetch<DataResponse<Category[]>>(
        manage ? "/categories/all" : "/categories"
      );
      setItems(data.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kategori");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const shown = useMemo(() => items.filter((c) =>
    `${c.name} ${c.slug} ${c.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  function openEditor(category: Category | "new") {
    setEditor(category);
    setForm(category === "new" ? blank : {
      name: category.name, description: category.description ?? ""
    });
    setError("");
    setSuccess("");
  }

  async function save() {
    if (!canManage || !editor || saving) return;
    if (form.name.trim().length < 2) {
      setError(id ? "Nama kategori minimal 2 karakter." : "Category name needs at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(editor === "new" ? "/categories" : `/categories/${editor.id}`, {
        method: editor === "new" ? "POST" : "PATCH",
        body: JSON.stringify(form),
      });
      setEditor(null);
      setSuccess(id ? "Kategori berhasil disimpan." : "Category saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan kategori");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(category: Category) {
    if (!canManage || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/categories/${category.id}/status`, {
        method: "PATCH", body: JSON.stringify({ is_active: !category.is_active }),
      });
      setSuccess(id ? "Status kategori diperbarui." : "Category status updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status");
    } finally { setSaving(false); }
  }

  async function remove(category: Category) {
    if (!canManage || saving || !window.confirm(
      id ? `Hapus kategori "${category.name}"? Kategori yang digunakan tidak bisa dihapus.`
         : `Delete "${category.name}"? Categories in use cannot be deleted.`
    )) return;
    setSaving(true);
    try {
      await apiFetch(`/categories/${category.id}`, { method: "DELETE" });
      setSuccess(id ? "Kategori berhasil dihapus." : "Category deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus kategori");
    } finally { setSaving(false); }
  }

  const surface = "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
  const btn = "rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200";
  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-white">
              <Boxes className="size-6 text-indigo-500" /> {id ? "Manajemen Kategori" : "Category Management"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{id ? "Atur kategori tiket dan status ketersediaannya." : "Manage ticket categories and availability."}</p>
          </div>
          {canManage && <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => openEditor("new")}>
            <Plus className="size-4" /> {id ? "Tambah Kategori" : "New Category"}
          </button>}
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
        {success && <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">{success}</div>}
        <section className={`${surface} p-5`}>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="relative min-w-44 flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <input className={`${input} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={id ? "Cari kategori..." : "Search categories..."} aria-label="Search categories" />
            </label>
            <button className={btn} onClick={() => void load()}><RefreshCw className="inline size-4" /> {id ? "Muat Ulang" : "Refresh"}</button>
          </div>
          {busy ? <p className="text-sm text-slate-500">Loading...</p> : shown.length === 0 ?
            <p className="py-8 text-center text-sm text-slate-500">{id ? "Kategori belum tersedia." : "No categories found."}</p> :
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><th className="pb-3">{id ? "Nama" : "Name"}</th><th className="pb-3">Slug</th><th className="pb-3">{id ? "Deskripsi" : "Description"}</th><th className="pb-3">Status</th>{canManage && <th className="pb-3 text-right">{id ? "Aksi" : "Actions"}</th>}</tr></thead>
                <tbody>{shown.map((c) => <tr key={c.id} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="py-3 text-slate-500">{c.slug}</td>
                  <td className="max-w-[280px] truncate py-3 text-slate-500">{c.description || "—"}</td>
                  <td className="py-3"><span className={c.is_active ? "text-emerald-500" : "text-slate-500"}>{c.is_active ? (id ? "Aktif" : "Active") : (id ? "Nonaktif" : "Inactive")}</span></td>
                  {canManage && <td className="py-3 text-right"><div className="flex justify-end gap-2">
                    <button className={btn} onClick={() => openEditor(c)} title="Edit"><Pencil className="size-4" /></button>
                    <button className={btn} disabled={saving} onClick={() => void toggle(c)}>{c.is_active ? (id ? "Nonaktifkan" : "Disable") : (id ? "Aktifkan" : "Enable")}</button>
                    <button className={btn} disabled={saving} onClick={() => void remove(c)} title="Delete"><Trash2 className="size-4" /></button>
                  </div></td>}
                </tr>)}</tbody>
              </table>
            </div>}
        </section>
        {editor && canManage && <section className={`${surface} space-y-4 p-5`}>
          <h2 className="font-semibold text-slate-950 dark:text-white">{editor === "new" ? (id ? "Tambah Kategori" : "Add Category") : (id ? "Edit Kategori" : "Edit Category")}</h2>
          <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Nama kategori" : "Category name"}</span><input className={input} maxLength={100} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200"><span>{id ? "Deskripsi" : "Description"}</span><textarea className={input} maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
          <div className="flex gap-3"><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : (id ? "Simpan" : "Save")}</button><button className={btn} onClick={() => setEditor(null)}>{id ? "Batal" : "Cancel"}</button></div>
        </section>}
      </main>
    </AppShell>
  );
}
