"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { Button } from "@/components/ui/button";

import {
  deleteTicketAttachment,
  downloadTicketAttachment,
  getTicketAttachments,
  uploadTicketAttachment,
} from "@/features/tickets/attachment-api";

import { ApiError } from "@/lib/api/client";

import type { TicketAttachment } from "@/lib/types/attachment";
import type { User } from "@/lib/types/auth";

type Language = "id" | "en";

type TicketAttachmentCardProps = {
  ticketId: number;
  currentUser: User | null;
  language: Language;
  disabled?: boolean;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export default function TicketAttachmentCard({
  ticketId,
  currentUser,
  language,
  disabled = false,
}: TicketAttachmentCardProps) {
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");

  const ui =
    language === "id"
      ? {
          title: "Lampiran",
          description:
            "Unggah dokumen atau gambar yang berkaitan dengan tiket ini.",
          upload: "Unggah File",
          uploading: "Mengunggah...",
          empty: "Belum ada lampiran pada tiket ini.",
          loadFailed: "Lampiran gagal dimuat.",

          uploadLoadingTitle: "Mengunggah Lampiran",
          uploadLoadingText: "Mohon tunggu. File sedang diunggah ke GoDesk.",
          uploadSuccessTitle: "Upload Berhasil",
          uploadSuccess: "Lampiran berhasil diunggah.",
          uploadFailedTitle: "Upload Gagal",
          uploadFailed: "Lampiran gagal diunggah.",

          download: "Unduh",
          downloadFailedTitle: "Download Gagal",
          downloadFailed: "Lampiran gagal diunduh.",

          delete: "Hapus",
          deleteConfirmTitle: "Hapus Lampiran?",
          deleteConfirmText:
            "Lampiran ini akan dihapus secara permanen dari tiket.",
          deleteConfirmButton: "Ya, Hapus",
          deleteCancelButton: "Batal",
          deleteLoadingTitle: "Menghapus Lampiran",
          deleteLoadingText:
            "Mohon tunggu. Lampiran sedang dihapus dari GoDesk.",
          deleteSuccessTitle: "Lampiran Berhasil Dihapus",
          deleteSuccess: "Lampiran berhasil dihapus secara permanen.",
          deleteFailedTitle: "Gagal Menghapus Lampiran",
          deleteFailed: "Lampiran gagal dihapus.",

          invalidTypeTitle: "Jenis File Tidak Didukung",
          invalidType:
            "Gunakan file JPG, JPEG, PNG, WEBP, PDF, TXT, DOC, DOCX, XLS, atau XLSX.",

          fileTooLargeTitle: "Ukuran File Terlalu Besar",
          fileTooLarge: "Ukuran maksimal lampiran adalah 10 MB.",

          sessionExpiredTitle: "Sesi Berakhir",
          sessionExpired:
            "Sesi login Anda telah berakhir. Silakan login kembali.",

          uploadedBy: "Diunggah oleh",
          maxSize: "Maksimal 10 MB",
        }
      : {
          title: "Attachments",
          description: "Upload documents or images related to this ticket.",
          upload: "Upload File",
          uploading: "Uploading...",
          empty: "There are no attachments on this ticket yet.",
          loadFailed: "Failed to load attachments.",

          uploadLoadingTitle: "Uploading Attachment",
          uploadLoadingText:
            "Please wait while the file is uploaded to GoDesk.",
          uploadSuccessTitle: "Upload Successful",
          uploadSuccess: "Attachment uploaded successfully.",
          uploadFailedTitle: "Upload Failed",
          uploadFailed: "Failed to upload attachment.",

          download: "Download",
          downloadFailedTitle: "Download Failed",
          downloadFailed: "Failed to download attachment.",

          delete: "Delete",
          deleteConfirmTitle: "Delete Attachment?",
          deleteConfirmText:
            "This attachment will be permanently removed from the ticket.",
          deleteConfirmButton: "Yes, Delete",
          deleteCancelButton: "Cancel",
          deleteLoadingTitle: "Deleting Attachment",
          deleteLoadingText:
            "Please wait while the attachment is removed from GoDesk.",
          deleteSuccessTitle: "Attachment Deleted",
          deleteSuccess: "The attachment has been permanently deleted.",
          deleteFailedTitle: "Failed to Delete Attachment",
          deleteFailed: "Failed to delete attachment.",

          invalidTypeTitle: "Unsupported File Type",
          invalidType:
            "Use JPG, JPEG, PNG, WEBP, PDF, TXT, DOC, DOCX, XLS, or XLSX files.",

          fileTooLargeTitle: "File Too Large",
          fileTooLarge: "Maximum attachment size is 10 MB.",

          sessionExpiredTitle: "Session Expired",
          sessionExpired:
            "Your login session has expired. Please log in again.",

          uploadedBy: "Uploaded by",
          maxSize: "Maximum 10 MB",
        };

  const loadAttachments = useCallback(async () => {
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getTicketAttachments(ticketId);

      setAttachments(response.data ?? []);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");
          return;
        }

        setError(err.message || getLoadFailedMessage(language));
        return;
      }

      setError(getLoadFailedMessage(language));
    } finally {
      setLoading(false);
    }
  }, [ticketId, router, language]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAttachments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAttachments]);

  function canDeleteAttachment(attachment: TicketAttachment) {
    if (!currentUser) {
      return false;
    }

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MANAGER") {
      return true;
    }

    return attachment.uploaded_by === currentUser.id;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || disabled || uploading) {
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      await Swal.fire({
        icon: "error",
        title: ui.invalidTypeTitle,
        text: ui.invalidType,
        confirmButtonText: "OK",
      });

      return;
    }

    if (file.size <= 0) {
      await Swal.fire({
        icon: "error",
        title: ui.uploadFailedTitle,
        text: ui.uploadFailed,
        confirmButtonText: "OK",
      });

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      await Swal.fire({
        icon: "warning",
        title: ui.fileTooLargeTitle,
        text: ui.fileTooLarge,
        confirmButtonText: "OK",
      });

      return;
    }

    try {
      setUploading(true);
      setError("");

      void Swal.fire({
        title: ui.uploadLoadingTitle,
        text: ui.uploadLoadingText,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,

        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await uploadTicketAttachment(ticketId, file);

      Swal.close();

      setAttachments((current) => [response.data, ...current]);

      await Swal.fire({
        icon: "success",
        title: ui.uploadSuccessTitle,
        text: `${ui.uploadSuccess} ${response.data.original_name}`,
        confirmButtonText: "OK",
      });
    } catch (err) {
      Swal.close();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          await Swal.fire({
            icon: "warning",
            title: ui.sessionExpiredTitle,
            text: ui.sessionExpired,
            confirmButtonText: "OK",
          });

          router.replace("/login");

          return;
        }

        setError(err.message || ui.uploadFailed);

        await Swal.fire({
          icon: "error",
          title: ui.uploadFailedTitle,
          text: err.message || ui.uploadFailed,
          confirmButtonText: "OK",
        });

        return;
      }

      setError(ui.uploadFailed);

      await Swal.fire({
        icon: "error",
        title: ui.uploadFailedTitle,
        text: ui.uploadFailed,
        confirmButtonText: "OK",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment: TicketAttachment) {
    if (
      disabled ||
      downloadingId !== null ||
      deletingId !== null ||
      uploading
    ) {
      return;
    }

    try {
      setDownloadingId(attachment.id);
      setError("");

      const result = await downloadTicketAttachment(attachment.id);

      const objectUrl = window.URL.createObjectURL(result.blob);

      const anchor = document.createElement("a");

      anchor.href = objectUrl;

      anchor.download = result.filename || attachment.original_name;

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          await Swal.fire({
            icon: "warning",
            title: ui.sessionExpiredTitle,
            text: ui.sessionExpired,
            confirmButtonText: "OK",
          });

          router.replace("/login");

          return;
        }

        await Swal.fire({
          icon: "error",
          title: ui.downloadFailedTitle,
          text: err.message || ui.downloadFailed,
          confirmButtonText: "OK",
        });

        return;
      }

      await Swal.fire({
        icon: "error",
        title: ui.downloadFailedTitle,
        text: ui.downloadFailed,
        confirmButtonText: "OK",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachment: TicketAttachment) {
    if (
      disabled ||
      deletingId !== null ||
      downloadingId !== null ||
      uploading ||
      !canDeleteAttachment(attachment)
    ) {
      return;
    }

    /*
     * SWEETALERT2 CONFIRMATION
     *
     * Tidak memakai:
     * window.confirm()
     *
     * Jadi popup "localhost:3000 says" tidak akan muncul lagi.
     */
    const result = await Swal.fire({
      icon: "warning",

      title: ui.deleteConfirmTitle,

      text: `${ui.deleteConfirmText}

${attachment.original_name}`,

      showCancelButton: true,

      confirmButtonText: ui.deleteConfirmButton,

      cancelButtonText: ui.deleteCancelButton,

      reverseButtons: true,

      focusCancel: true,

      allowOutsideClick: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeletingId(attachment.id);
      setError("");

      void Swal.fire({
        title: ui.deleteLoadingTitle,

        text: `${ui.deleteLoadingText}

${attachment.original_name}`,

        allowOutsideClick: false,

        allowEscapeKey: false,

        showConfirmButton: false,

        didOpen: () => {
          Swal.showLoading();
        },
      });

      await deleteTicketAttachment(attachment.id);

      Swal.close();

      setAttachments((current) =>
        current.filter((item) => item.id !== attachment.id),
      );

      await Swal.fire({
        icon: "success",

        title: ui.deleteSuccessTitle,

        text: `${ui.deleteSuccess}

${attachment.original_name}`,

        confirmButtonText: "OK",
      });
    } catch (err) {
      Swal.close();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          await Swal.fire({
            icon: "warning",
            title: ui.sessionExpiredTitle,
            text: ui.sessionExpired,
            confirmButtonText: "OK",
          });

          router.replace("/login");

          return;
        }

        setError(err.message || ui.deleteFailed);

        await Swal.fire({
          icon: "error",
          title: ui.deleteFailedTitle,
          text: err.message || ui.deleteFailed,
          confirmButtonText: "OK",
        });

        return;
      }

      setError(ui.deleteFailed);

      await Swal.fire({
        icon: "error",
        title: ui.deleteFailedTitle,
        text: ui.deleteFailed,
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020617]">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="size-4 text-slate-500" />

            <h3 className="text-sm font-semibold">{ui.title}</h3>

            {!loading ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {attachments.length}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {ui.description} {ui.maxSize}.
          </p>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPT_ATTRIBUTE}
            disabled={disabled || uploading}
            onChange={(event) => void handleFileChange(event)}
          />

          <Button
            type="button"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                {ui.uploading}
              </>
            ) : (
              <>
                <Upload className="size-4" />
                {ui.upload}
              </>
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="p-6">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center">
            <LoaderCircle className="size-5 animate-spin text-slate-400" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center dark:border-slate-800">
            <Paperclip className="mb-2 size-5 text-slate-400" />

            <p className="text-xs text-slate-500">{ui.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {attachments.map((attachment) => {
              const deleting = deletingId === attachment.id;

              const downloading = downloadingId === attachment.id;

              return (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
                      <AttachmentIcon attachment={attachment} />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium"
                        title={attachment.original_name}
                      >
                        {attachment.original_name}
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {formatFileSize(attachment.size_bytes)}
                        {" · "}
                        {ui.uploadedBy} {attachment.uploader_name}
                        {" · "}
                        {formatDate(attachment.created_at, language)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        disabled || downloading || deleting || uploading
                      }
                      onClick={() => void handleDownload(attachment)}
                    >
                      {downloading ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}

                      {ui.download}
                    </Button>

                    {canDeleteAttachment(attachment) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          disabled || deleting || downloading || uploading
                        }
                        className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        onClick={() => void handleDelete(attachment)}
                      >
                        {deleting ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}

                        {ui.delete}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AttachmentIcon({ attachment }: { attachment: TicketAttachment }) {
  const extension = attachment.file_extension?.toLowerCase() ?? "";

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return <FileImage className="size-5 text-slate-500" />;
  }

  if ([".xls", ".xlsx"].includes(extension)) {
    return <FileSpreadsheet className="size-5 text-slate-500" />;
  }

  if ([".pdf", ".txt", ".doc", ".docx"].includes(extension)) {
    return <FileText className="size-5 text-slate-500" />;
  }

  return <File className="size-5 text-slate-500" />;
}

function getFileExtension(filename: string) {
  const position = filename.lastIndexOf(".");

  if (position === -1) {
    return "";
  }

  return filename.slice(position).toLowerCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLoadFailedMessage(language: Language) {
  return language === "id"
    ? "Lampiran gagal dimuat."
    : "Failed to load attachments.";
}
