"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { useRouter } from "next/navigation";

import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";

import {
  closeAlert,
  showConfirm,
  showError,
  showLoading,
  showSuccess,
} from "@/lib/sweet-alert";

import { ApiError } from "@/lib/api/client";

import type { User, UserRole, UserStatus } from "@/lib/types/auth";

import {
  createAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from "@/features/users/api";

type ManagedRole = "CUSTOMER" | "AGENT";

interface Props {
  role: ManagedRole;
}

interface FormState {
  name: string;
  email: string;
  password: string;
}

const PAGE_SIZE = 10;

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
};

export default function UserManagementPage({ role }: Props) {
  const router = useRouter();

  const { language } = useLanguage();

  const isID = language === "id";

  const isAgent = role === "AGENT";

  const ui = isID
    ? {
        eyebrow: "Manajemen Pengguna",

        title: isAgent ? "Agen" : "Pelanggan",

        description: isAgent
          ? "Kelola akun agen yang bertugas menangani tiket dan permintaan pelanggan."
          : "Kelola akun pelanggan yang menggunakan layanan bantuan GoDesk.",

        total: isAgent ? "Total Agen" : "Total Pelanggan",

        active: "Aktif",

        inactive: "Tidak Aktif",

        search: isAgent
          ? "Cari nama atau email agen..."
          : "Cari nama atau email pelanggan...",

        allStatus: "Semua Status",

        refresh: "Muat Ulang",

        add: "Tambah Agen",

        name: "Nama",

        email: "Email",

        role: "Peran",

        status: "Status",

        joined: "Bergabung",

        action: "Aksi",

        edit: "Edit",

        activate: "Aktifkan",

        deactivate: "Nonaktifkan",

        noData: isAgent ? "Belum ada agen." : "Belum ada pelanggan.",

        noDataDescription: isAgent
          ? "Akun agen yang dibuat akan tampil di halaman ini."
          : "Pelanggan yang mendaftar ke GoDesk akan tampil di halaman ini.",

        noResult: "Data tidak ditemukan.",

        noResultDescription: "Coba ubah kata pencarian atau filter status.",

        showing: "Menampilkan",

        of: "dari",

        previous: "Sebelumnya",

        next: "Berikutnya",

        createTitle: "Tambah Agen Baru",

        editTitle: isAgent ? "Edit Agen" : "Edit Pelanggan",

        formDescription: isAgent
          ? "Lengkapi informasi akun agen di bawah ini."
          : "Perbarui informasi akun pelanggan.",

        password: "Password",

        passwordCreate: "Minimal 8 karakter",

        passwordEdit: "Kosongkan jika password tidak diubah",

        cancel: "Batal",

        save: "Simpan Perubahan",

        create: "Buat Agen",

        loading: "Memuat data pengguna...",

        retry: "Coba Lagi",

        confirmCreate: "Buat akun agen?",

        confirmCreateText: "Akun agen baru akan ditambahkan ke sistem GoDesk.",

        confirmEdit: "Simpan perubahan?",

        confirmEditText:
          "Data pengguna akan diperbarui dan langsung tersimpan.",

        confirmStatus: "Ubah status pengguna?",

        confirmActivate:
          "Akun akan diaktifkan kembali dan pengguna dapat mengakses GoDesk.",

        confirmDeactivate:
          "Akun akan dinonaktifkan dan tidak dapat mengakses GoDesk sampai diaktifkan kembali.",

        processing: "Menyimpan Perubahan",

        processingText: "Mohon tunggu, data sedang diproses oleh GoDesk.",

        createSuccess: "Agen berhasil ditambahkan.",

        updateSuccess: "Data pengguna berhasil diperbarui.",

        statusSuccess: "Status pengguna berhasil diperbarui.",
      }
    : {
        eyebrow: "User Management",

        title: isAgent ? "Agents" : "Customers",

        description: isAgent
          ? "Manage agent accounts responsible for handling customer tickets and requests."
          : "Manage customer accounts using GoDesk support services.",

        total: isAgent ? "Total Agents" : "Total Customers",

        active: "Active",

        inactive: "Inactive",

        search: isAgent
          ? "Search agent name or email..."
          : "Search customer name or email...",

        allStatus: "All Statuses",

        refresh: "Refresh",

        add: "Add Agent",

        name: "Name",

        email: "Email",

        role: "Role",

        status: "Status",

        joined: "Joined",

        action: "Action",

        edit: "Edit",

        activate: "Activate",

        deactivate: "Deactivate",

        noData: isAgent ? "No agents yet." : "No customers yet.",

        noDataDescription: isAgent
          ? "Agent accounts will appear here after they are created."
          : "Customers will appear here after registering for GoDesk.",

        noResult: "No data found.",

        noResultDescription: "Try changing your search or status filter.",

        showing: "Showing",

        of: "of",

        previous: "Previous",

        next: "Next",

        createTitle: "Add New Agent",

        editTitle: isAgent ? "Edit Agent" : "Edit Customer",

        formDescription: isAgent
          ? "Complete the agent account information below."
          : "Update the customer account information.",

        password: "Password",

        passwordCreate: "Minimum 8 characters",

        passwordEdit: "Leave blank to keep current password",

        cancel: "Cancel",

        save: "Save Changes",

        create: "Create Agent",

        loading: "Loading users...",

        retry: "Try Again",

        confirmCreate: "Create agent account?",

        confirmCreateText: "The new agent account will be added to GoDesk.",

        confirmEdit: "Save changes?",

        confirmEditText: "The user information will be updated immediately.",

        confirmStatus: "Change user status?",

        confirmActivate:
          "The account will be activated again and the user can access GoDesk.",

        confirmDeactivate:
          "The account will be deactivated and cannot access GoDesk until reactivated.",

        processing: "Saving Changes",

        processingText: "Please wait while GoDesk processes your request.",

        createSuccess: "Agent successfully added.",

        updateSuccess: "User information successfully updated.",

        statusSuccess: "User status successfully updated.",
      };

  const [users, setUsers] = useState<User[]>([]);

  const [listTotal, setListTotal] = useState(0);

  const [totalUsers, setTotalUsers] = useState(0);

  const [activeTotal, setActiveTotal] = useState(0);

  const [inactiveTotal, setInactiveTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  const [offset, setOffset] = useState(0);

  const [formOpen, setFormOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listResponse, totalResponse, activeResponse, inactiveResponse] =
        await Promise.all([
          getAdminUsers({
            role,
            status: statusFilter,
            search,
            limit: PAGE_SIZE,
            offset,
          }),

          getAdminUsers({
            role,
            limit: 1,
            offset: 0,
          }),

          getAdminUsers({
            role,
            status: "ACTIVE",
            limit: 1,
            offset: 0,
          }),

          getAdminUsers({
            role,
            status: "INACTIVE",
            limit: 1,
            offset: 0,
          }),
        ]);

      setUsers(listResponse.data.items ?? []);

      setListTotal(listResponse.data.total ?? 0);

      setTotalUsers(totalResponse.data.total ?? 0);

      setActiveTotal(activeResponse.data.total ?? 0);

      setInactiveTotal(inactiveResponse.data.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");

        return;
      }

      if (err instanceof ApiError && err.status === 403) {
        setError(
          isID
            ? "Akses ditolak. Halaman ini hanya tersedia untuk Super Admin."
            : "Access denied. This page is only available to Super Admin.",
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : isID
            ? "Data pengguna gagal dimuat."
            : "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
  }, [role, statusFilter, search, offset, isID, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadUsers]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  function submitSearch(event: FormEvent) {
    event.preventDefault();

    setOffset(0);

    setSearch(searchInput.trim());
  }

  function openCreate() {
    setEditingUser(null);

    setForm(EMPTY_FORM);

    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);

    setForm({
      name: user.name,

      email: user.email,

      password: "",
    });

    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setFormOpen(false);

    setEditingUser(null);

    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const name = form.name.trim();

    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      await showError(
        isID ? "Nama dan email wajib diisi." : "Name and email are required.",
      );

      return;
    }

    if (!editingUser && form.password.length < 8) {
      await showError(
        isID
          ? "Password minimal 8 karakter."
          : "Password must contain at least 8 characters.",
      );

      return;
    }

    if (editingUser && form.password && form.password.length < 8) {
      await showError(
        isID
          ? "Password baru minimal 8 karakter."
          : "The new password must contain at least 8 characters.",
      );

      return;
    }

    const confirmed = await showConfirm({
      title: editingUser ? ui.confirmEdit : ui.confirmCreate,

      text: editingUser ? ui.confirmEditText : ui.confirmCreateText,

      confirmText: editingUser ? ui.save : ui.create,

      cancelText: ui.cancel,

      icon: "question",
    });

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    showLoading(ui.processing, ui.processingText);

    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, {
          name,
          email,

          ...(form.password
            ? {
                password: form.password,
              }
            : {}),
        });
      } else {
        await createAdminUser({
          name,
          email,

          password: form.password,

          role: "AGENT",
        });
      }

      closeAlert();

      setFormOpen(false);

      setEditingUser(null);

      setForm(EMPTY_FORM);

      await loadUsers();

      await showSuccess(
        editingUser ? ui.updateSuccess : ui.createSuccess,

        isID ? "Berhasil" : "Success",
      );
    } catch (err) {
      closeAlert();

      await showError(
        err instanceof Error
          ? err.message
          : isID
            ? "Data pengguna gagal disimpan."
            : "Failed to save user information.",

        isID ? "Gagal Menyimpan" : "Save Failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: User) {
    const nextStatus: UserStatus =
      user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmed = await showConfirm({
      title: ui.confirmStatus,

      text: nextStatus === "ACTIVE" ? ui.confirmActivate : ui.confirmDeactivate,

      confirmText: nextStatus === "ACTIVE" ? ui.activate : ui.deactivate,

      cancelText: ui.cancel,

      icon: nextStatus === "ACTIVE" ? "question" : "warning",
    });

    if (!confirmed) {
      return;
    }

    showLoading(ui.processing, ui.processingText);

    try {
      await updateAdminUserStatus(user.id, nextStatus);

      closeAlert();

      await loadUsers();

      await showSuccess(
        ui.statusSuccess,

        isID ? "Berhasil" : "Success",
      );
    } catch (err) {
      closeAlert();

      await showError(
        err instanceof Error
          ? err.message
          : isID
            ? "Status pengguna gagal diperbarui."
            : "Failed to update user status.",
      );
    }
  }

  return (
    <AppShell>
      <div className="px-5 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">
          <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {isAgent ? (
                  <Headphones className="size-3.5" />
                ) : (
                  <Users className="size-3.5" />
                )}

                {ui.eyebrow}
              </div>

              <h1 className="text-[26px] font-bold tracking-tight text-slate-950 dark:text-white">
                {ui.title}
              </h1>

              <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-slate-500">
                {ui.description}
              </p>
            </div>

            {isAgent && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-[12px] font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Plus className="size-4" />

                {ui.add}
              </button>
            )}
          </header>

          <section className="mb-6 grid gap-3 md:grid-cols-3">
            <StatCard
              title={ui.total}
              value={totalUsers}
              icon={isAgent ? Headphones : Users}
            />

            <StatCard title={ui.active} value={activeTotal} icon={UserCheck} />

            <StatCard title={ui.inactive} value={inactiveTotal} icon={UserX} />
          </section>

          {formOpen && (
            <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#020617]">
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-950 dark:text-white">
                    {editingUser ? ui.editTitle : ui.createTitle}
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    {ui.formDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid gap-4 p-5 lg:grid-cols-3"
              >
                <FormField label={ui.name}>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-[#0b1120] dark:text-white dark:focus:border-slate-600"
                    required
                  />
                </FormField>

                <FormField label={ui.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        email: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-[#0b1120] dark:text-white dark:focus:border-slate-600"
                    required
                  />
                </FormField>

                <FormField label={ui.password}>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        password: event.target.value,
                      }))
                    }
                    placeholder={
                      editingUser ? ui.passwordEdit : ui.passwordCreate
                    }
                    minLength={8}
                    required={!editingUser}
                    autoComplete="new-password"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-[#0b1120] dark:text-white dark:focus:border-slate-600"
                  />
                </FormField>

                <div className="flex items-center gap-2 lg:col-span-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-[12px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}

                    {editingUser ? ui.save : ui.create}
                  </button>

                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={submitting}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-4 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    {ui.cancel}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#020617]">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
              <form
                onSubmit={submitSearch}
                className="flex min-w-0 flex-1 gap-2"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />

                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={ui.search}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-400 dark:border-slate-800 dark:bg-[#0b1120] dark:text-white dark:focus:border-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <Search className="size-4" />
                </button>
              </form>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setOffset(0);

                  setStatusFilter(event.target.value as UserStatus | "");
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none dark:border-slate-800 dark:bg-[#0b1120] dark:text-slate-300"
              >
                <option value="">{ui.allStatus}</option>

                <option value="ACTIVE">{ui.active}</option>

                <option value="INACTIVE">{ui.inactive}</option>
              </select>

              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <RefreshCw
                  className={`size-3.5 ${loading ? "animate-spin" : ""}`}
                />

                {ui.refresh}
              </button>
            </div>

            {loading ? (
              <LoadingState text={ui.loading} />
            ) : error ? (
              <ErrorState
                message={error}
                retry={ui.retry}
                onRetry={() => void loadUsers()}
              />
            ) : users.length === 0 ? (
              <EmptyState
                title={search || statusFilter ? ui.noResult : ui.noData}
                description={
                  search || statusFilter
                    ? ui.noResultDescription
                    : ui.noDataDescription
                }
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-[#0b1120]">
                        <TableHead>{ui.name}</TableHead>

                        <TableHead>{ui.role}</TableHead>

                        <TableHead>{ui.status}</TableHead>

                        <TableHead>{ui.joined}</TableHead>

                        <TableHead alignRight>{ui.action}</TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          isID={isID}
                          editLabel={ui.edit}
                          activateLabel={ui.activate}
                          deactivateLabel={ui.deactivate}
                          onEdit={() => openEdit(user)}
                          onToggle={() => void toggleStatus(user)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 md:hidden">
                  {users.map((user) => (
                    <MobileUserCard
                      key={user.id}
                      user={user}
                      isID={isID}
                      editLabel={ui.edit}
                      activateLabel={ui.activate}
                      deactivateLabel={ui.deactivate}
                      onEdit={() => openEdit(user)}
                      onToggle={() => void toggleStatus(user)}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-slate-500">
                    {ui.showing} {offset + 1}–
                    {Math.min(offset + users.length, listTotal)} {ui.of}{" "}
                    {listTotal}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <ChevronLeft className="size-3.5" />

                      {ui.previous}
                    </button>

                    <span className="min-w-16 text-center text-[11px] font-medium text-slate-500">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={offset + PAGE_SIZE >= listTotal}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      {ui.next}

                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#020617]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-[26px] font-bold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-[#0b1120]">
          <Icon className="size-4" />
        </div>
      </div>
    </article>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>

      {children}
    </label>
  );
}

function TableHead({
  children,
  alignRight = false,
}: {
  children: React.ReactNode;
  alignRight?: boolean;
}) {
  return (
    <th
      className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 ${
        alignRight ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function UserRow({
  user,
  isID,
  editLabel,
  activateLabel,
  deactivateLabel,
  onEdit,
  onToggle,
}: {
  user: User;
  isID: boolean;
  editLabel: string;
  activateLabel: string;
  deactivateLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-[#0b1120]/70">
      <td className="px-5 py-4">
        <UserIdentity user={user} />
      </td>

      <td className="px-5 py-4">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={user.status} isID={isID} />
      </td>

      <td className="px-5 py-4 text-[12px] text-slate-500">
        {formatDate(user.created_at, isID)}
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onEdit}>
            <Pencil className="size-3.5" />
            {editLabel}
          </ActionButton>

          <ActionButton onClick={onToggle}>
            {user.status === "ACTIVE" ? (
              <UserX className="size-3.5" />
            ) : (
              <UserCheck className="size-3.5" />
            )}

            {user.status === "ACTIVE" ? deactivateLabel : activateLabel}
          </ActionButton>
        </div>
      </td>
    </tr>
  );
}

function MobileUserCard({
  user,
  isID,
  editLabel,
  activateLabel,
  deactivateLabel,
  onEdit,
  onToggle,
}: {
  user: User;
  isID: boolean;
  editLabel: string;
  activateLabel: string;
  deactivateLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />

        <StatusBadge status={user.status} isID={isID} />
      </div>

      <div className="flex items-center justify-between">
        <RoleBadge role={user.role} />

        <span className="text-[11px] text-slate-500">
          {formatDate(user.created_at, isID)}
        </span>
      </div>

      <div className="flex gap-2">
        <ActionButton onClick={onEdit}>
          <Pencil className="size-3.5" />

          {editLabel}
        </ActionButton>

        <ActionButton onClick={onToggle}>
          {user.status === "ACTIVE" ? (
            <UserX className="size-3.5" />
          ) : (
            <UserCheck className="size-3.5" />
          )}

          {user.status === "ACTIVE" ? deactivateLabel : activateLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-[#0b1120]">
        <UserRound className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-slate-950 dark:text-white">
          {user.name}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {user.email}
        </p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const label =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "MANAGER"
        ? "Manager"
        : role === "AGENT"
          ? "Agent"
          : "Customer";

  return (
    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-[#0b1120] dark:text-slate-300">
      {label}
    </span>
  );
}

function StatusBadge({ status, isID }: { status: UserStatus; isID: boolean }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        active
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-slate-500/10 text-slate-500"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-500"
        }`}
      />

      {active ? (isID ? "Aktif" : "Active") : isID ? "Tidak Aktif" : "Inactive"}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto size-5 animate-spin text-slate-500" />

        <p className="mt-3 text-[12px] text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-10">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-[#0b1120]">
          <Users className="size-5" />
        </div>

        <h3 className="mt-4 text-[13px] font-semibold text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  retry,
  onRetry,
}: {
  message: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-10">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <X className="size-5" />
        </div>

        <h3 className="mt-4 text-[13px] font-semibold text-slate-950 dark:text-white">
          Gagal memuat data
        </h3>

        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{message}</p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <RefreshCw className="size-3.5" />

          {retry}
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string, isID: boolean) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(isID ? "id-ID" : "en-US", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  }).format(date);
}
