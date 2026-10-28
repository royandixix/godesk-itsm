import Swal, {
  type SweetAlertIcon,
} from "sweetalert2";

type Language =
  | "id"
  | "en";

type ConfirmOptions = {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  icon?: SweetAlertIcon;
};

type TicketDeleteOptions = {
  ticketNumber: string;
  subject?: string;
  language?: Language;
};

type TicketStatusOptions = {
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
  language?: Language;
};

type CreateTicketOptions = {
  subject: string;
  category?: string;
  priority?: string;
  language?: Language;
};

type SaveTicketOptions = {
  ticketNumber?: string;
  subject?: string;
  language?: Language;
};

const baseAnimation = {
  showClass: {
    popup:
      "swal2-show",
    backdrop:
      "swal2-backdrop-show",
    icon:
      "swal2-icon-show",
  },

  hideClass: {
    popup:
      "swal2-hide",
    backdrop:
      "swal2-backdrop-hide",
    icon:
      "swal2-icon-hide",
  },
};

function escapeHTML(
  value: string,
) {
  return value.replace(
    /[&<>"']/g,
    (character) => {
      const entities: Record<
        string,
        string
      > = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return (
        entities[
          character
        ] ??
        character
      );
    },
  );
}

function statusLabel(
  value: string,
  language: Language,
) {
  const normalized =
    value
      .trim()
      .toUpperCase();

  const labels: Record<
    string,
    {
      id: string;
      en: string;
    }
  > = {
    OPEN: {
      id: "Terbuka",
      en: "Open",
    },

    IN_PROGRESS: {
      id: "Sedang Diproses",
      en: "In Progress",
    },

    RESOLVED: {
      id: "Selesai",
      en: "Resolved",
    },

    CLOSED: {
      id: "Ditutup",
      en: "Closed",
    },
  };

  return (
    labels[
      normalized
    ]?.[
      language
    ] ??
    value
  );
}

export async function showSuccess(
  message: string,
  title = "Berhasil",
) {
  return Swal.fire({
    ...baseAnimation,

    icon:
      "success",

    title,

    text:
      message,

    confirmButtonText:
      "OK",

    timer:
      3500,

    timerProgressBar:
      true,

    allowOutsideClick:
      false,

    allowEscapeKey:
      true,
  });
}

export async function showError(
  message: string,
  title = "Terjadi Kesalahan",
) {
  return Swal.fire({
    ...baseAnimation,

    icon:
      "error",

    title,

    html: `
      <p>
        ${escapeHTML(
          message,
        )}
      </p>

      <p style="margin-top:12px;font-size:13px;opacity:.75">
        Silakan periksa kembali data atau coba beberapa saat lagi.
      </p>
    `,

    confirmButtonText:
      "Mengerti",

    allowOutsideClick:
      false,

    allowEscapeKey:
      true,
  });
}

export async function showWarning(
  message: string,
  title = "Perhatian",
) {
  return Swal.fire({
    ...baseAnimation,

    icon:
      "warning",

    title,

    text:
      message,

    confirmButtonText:
      "Mengerti",

    allowOutsideClick:
      false,
  });
}

export async function showInfo(
  message: string,
  title = "Informasi",
) {
  return Swal.fire({
    ...baseAnimation,

    icon:
      "info",

    title,

    text:
      message,

    confirmButtonText:
      "OK",
  });
}

export async function showConfirm({
  title,
  text,
  confirmText =
    "Ya, Lanjutkan",
  cancelText =
    "Batal",
  icon =
    "question",
}: ConfirmOptions) {
  const result =
    await Swal.fire({
      ...baseAnimation,

      icon,

      title,

      text,

      showCancelButton:
        true,

      confirmButtonText:
        confirmText,

      cancelButtonText:
        cancelText,

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,

      allowEscapeKey:
        true,
    });

  return result.isConfirmed;
}

export async function confirmLogout(
  language: Language =
    "id",
) {
  const isID =
    language === "id";

  const result =
    await Swal.fire({
      ...baseAnimation,

      icon:
        "question",

      title: isID
        ? "Keluar dari GoDesk?"
        : "Sign out from GoDesk?",

      html: isID
        ? `
          <p>
            Anda akan keluar dari akun GoDesk yang sedang digunakan.
          </p>

          <p style="margin-top:14px">
            Setelah keluar, sesi login akan dihentikan dan Anda
            harus memasukkan email serta password kembali untuk
            mengakses dashboard.
          </p>

          <p style="margin-top:14px;font-size:13px;opacity:.75">
            Data yang sudah tersimpan tidak akan hilang.
          </p>
        `
        : `
          <p>
            You are about to sign out from your current GoDesk account.
          </p>

          <p style="margin-top:14px">
            Your login session will end and you will need to enter
            your email and password again to access the dashboard.
          </p>

          <p style="margin-top:14px;font-size:13px;opacity:.75">
            Your saved data will not be removed.
          </p>
        `,

      showCancelButton:
        true,

      confirmButtonText: isID
        ? "Ya, Keluar"
        : "Yes, Sign Out",

      cancelButtonText: isID
        ? "Tetap Masuk"
        : "Stay Signed In",

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,

      allowEscapeKey:
        true,
    });

  return result.isConfirmed;
}

export async function confirmDeleteTicket(
  ticketNumberOrOptions:
    | string
    | TicketDeleteOptions,
  subject?: string,
  language: Language =
    "id",
) {
  const options:
    TicketDeleteOptions =
    typeof ticketNumberOrOptions ===
    "string"
      ? {
          ticketNumber:
            ticketNumberOrOptions,
          subject,
          language,
        }
      : ticketNumberOrOptions;

  const currentLanguage =
    options.language ??
    "id";

  const isID =
    currentLanguage ===
    "id";

  const ticketNumber =
    escapeHTML(
      options.ticketNumber,
    );

  const safeSubject =
    options.subject
      ? escapeHTML(
          options.subject,
        )
      : "";

  const result =
    await Swal.fire({
      ...baseAnimation,

      icon:
        "warning",

      title: isID
        ? "Hapus Tiket Secara Permanen?"
        : "Delete Ticket Permanently?",

      html: isID
        ? `
          <p>
            Anda akan menghapus tiket
            <strong>${ticketNumber}</strong>
            dari sistem GoDesk.
          </p>

          ${
            safeSubject
              ? `
                <p style="margin-top:14px">
                  <strong>Subjek tiket</strong><br>
                  ${safeSubject}
                </p>
              `
              : ""
          }

          <p style="margin-top:16px">
            Setelah dihapus, tiket tidak akan muncul lagi
            pada daftar tiket dan halaman detail.
          </p>

          <p style="margin-top:14px">
            <strong>
              Tindakan ini tidak dapat dibatalkan.
            </strong>
          </p>

          <p style="margin-top:10px;font-size:13px;opacity:.75">
            Pastikan tiket yang dipilih sudah benar sebelum melanjutkan.
          </p>
        `
        : `
          <p>
            You are about to permanently delete ticket
            <strong>${ticketNumber}</strong>
            from GoDesk.
          </p>

          ${
            safeSubject
              ? `
                <p style="margin-top:14px">
                  <strong>Ticket subject</strong><br>
                  ${safeSubject}
                </p>
              `
              : ""
          }

          <p style="margin-top:16px">
            The ticket will no longer appear in the ticket
            list or detail page.
          </p>

          <p style="margin-top:14px">
            <strong>
              This action cannot be undone.
            </strong>
          </p>
        `,

      showCancelButton:
        true,

      confirmButtonText: isID
        ? "Ya, Hapus Permanen"
        : "Yes, Delete Permanently",

      cancelButtonText: isID
        ? "Batal"
        : "Cancel",

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,

      allowEscapeKey:
        true,
    });

  return result.isConfirmed;
}

export async function confirmUpdateStatus(
  ticketNumberOrOptions:
    | string
    | TicketStatusOptions,
  oldStatus?: string,
  newStatus?: string,
  language: Language =
    "id",
) {
  const options:
    TicketStatusOptions =
    typeof ticketNumberOrOptions ===
    "string"
      ? {
          ticketNumber:
            ticketNumberOrOptions,
          oldStatus:
            oldStatus ??
            "",
          newStatus:
            newStatus ??
            "",
          language,
        }
      : ticketNumberOrOptions;

  const currentLanguage =
    options.language ??
    "id";

  const isID =
    currentLanguage ===
    "id";

  const currentStatus =
    statusLabel(
      options.oldStatus,
      currentLanguage,
    );

  const targetStatus =
    statusLabel(
      options.newStatus,
      currentLanguage,
    );

  const result =
    await Swal.fire({
      ...baseAnimation,

      icon:
        "question",

      title: isID
        ? "Konfirmasi Perubahan Status"
        : "Confirm Status Update",

      html: isID
        ? `
          <p>
            Status tiket
            <strong>
              ${escapeHTML(
                options.ticketNumber,
              )}
            </strong>
            akan diperbarui.
          </p>

          <p style="margin-top:16px">
            <strong>Status saat ini</strong><br>
            ${escapeHTML(
              currentStatus,
            )}
          </p>

          <p style="margin-top:12px">
            ↓
          </p>

          <p style="margin-top:12px">
            <strong>Status baru</strong><br>
            ${escapeHTML(
              targetStatus,
            )}
          </p>

          <p style="margin-top:16px">
            Perubahan status akan langsung tersimpan
            dan terlihat pada detail serta daftar tiket.
          </p>

          <p style="margin-top:10px;font-size:13px;opacity:.75">
            Pastikan status baru sudah sesuai dengan
            kondisi penanganan tiket.
          </p>
        `
        : `
          <p>
            Ticket
            <strong>
              ${escapeHTML(
                options.ticketNumber,
              )}
            </strong>
            will have its status updated.
          </p>

          <p style="margin-top:16px">
            <strong>Current status</strong><br>
            ${escapeHTML(
              currentStatus,
            )}
          </p>

          <p style="margin-top:12px">
            ↓
          </p>

          <p style="margin-top:12px">
            <strong>New status</strong><br>
            ${escapeHTML(
              targetStatus,
            )}
          </p>

          <p style="margin-top:16px">
            The change will be saved immediately and
            reflected in the ticket list and detail page.
          </p>
        `,

      showCancelButton:
        true,

      confirmButtonText: isID
        ? "Ya, Perbarui Status"
        : "Yes, Update Status",

      cancelButtonText: isID
        ? "Periksa Lagi"
        : "Review Again",

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,

      allowEscapeKey:
        true,
    });

  return result.isConfirmed;
}

export async function confirmCreateTicket(
  subjectOrOptions:
    | string
    | CreateTicketOptions,
  language: Language =
    "id",
) {
  const options:
    CreateTicketOptions =
    typeof subjectOrOptions ===
    "string"
      ? {
          subject:
            subjectOrOptions,
          language,
        }
      : subjectOrOptions;

  const currentLanguage =
    options.language ??
    "id";

  const isID =
    currentLanguage ===
    "id";

  const result =
    await Swal.fire({
      ...baseAnimation,

      icon:
        "question",

      title: isID
        ? "Buat Tiket Baru?"
        : "Create New Ticket?",

      html: isID
        ? `
          <p>
            Tiket baru siap dikirim ke sistem GoDesk.
          </p>

          <p style="margin-top:16px">
            <strong>Subjek</strong><br>
            ${escapeHTML(
              options.subject,
            )}
          </p>

          ${
            options.category
              ? `
                <p style="margin-top:12px">
                  <strong>Kategori</strong><br>
                  ${escapeHTML(
                    options.category,
                  )}
                </p>
              `
              : ""
          }

          ${
            options.priority
              ? `
                <p style="margin-top:12px">
                  <strong>Prioritas</strong><br>
                  ${escapeHTML(
                    options.priority,
                  )}
                </p>
              `
              : ""
          }

          <p style="margin-top:16px">
            Setelah dibuat, tiket akan mendapatkan nomor
            tiket dan dapat dipantau melalui halaman Tiket.
          </p>

          <p style="margin-top:10px;font-size:13px;opacity:.75">
            Periksa kembali data sebelum membuat tiket.
          </p>
        `
        : `
          <p>
            Your new ticket is ready to be submitted to GoDesk.
          </p>

          <p style="margin-top:16px">
            <strong>Subject</strong><br>
            ${escapeHTML(
              options.subject,
            )}
          </p>

          <p style="margin-top:16px">
            After creation, the ticket will receive a ticket
            number and can be monitored from the Tickets page.
          </p>
        `,

      showCancelButton:
        true,

      confirmButtonText: isID
        ? "Ya, Buat Tiket"
        : "Yes, Create Ticket",

      cancelButtonText: isID
        ? "Periksa Lagi"
        : "Review Again",

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,
    });

  return result.isConfirmed;
}

export async function confirmSaveChanges(
  options:
    | SaveTicketOptions
    | Language = "id",
) {
  const normalized:
    SaveTicketOptions =
    typeof options ===
    "string"
      ? {
          language:
            options,
        }
      : options;

  const language =
    normalized.language ??
    "id";

  const isID =
    language === "id";

  const result =
    await Swal.fire({
      ...baseAnimation,

      icon:
        "question",

      title: isID
        ? "Simpan Perubahan Tiket?"
        : "Save Ticket Changes?",

      html: isID
        ? `
          <p>
            Perubahan yang Anda lakukan akan disimpan
            ke sistem GoDesk.
          </p>

          ${
            normalized.ticketNumber
              ? `
                <p style="margin-top:16px">
                  <strong>Nomor tiket</strong><br>
                  ${escapeHTML(
                    normalized.ticketNumber,
                  )}
                </p>
              `
              : ""
          }

          ${
            normalized.subject
              ? `
                <p style="margin-top:12px">
                  <strong>Subjek</strong><br>
                  ${escapeHTML(
                    normalized.subject,
                  )}
                </p>
              `
              : ""
          }

          <p style="margin-top:16px">
            Pastikan kategori, subjek, deskripsi dan
            prioritas sudah sesuai.
          </p>

          <p style="margin-top:10px;font-size:13px;opacity:.75">
            Perubahan akan langsung berlaku setelah disimpan.
          </p>
        `
        : `
          <p>
            Your ticket changes will be saved to GoDesk.
          </p>

          <p style="margin-top:16px">
            Make sure the category, subject, description
            and priority are correct before continuing.
          </p>
        `,

      showCancelButton:
        true,

      confirmButtonText: isID
        ? "Ya, Simpan Perubahan"
        : "Yes, Save Changes",

      cancelButtonText: isID
        ? "Periksa Lagi"
        : "Review Again",

      reverseButtons:
        true,

      focusCancel:
        true,

      allowOutsideClick:
        false,
    });

  return result.isConfirmed;
}

export function showLoading(
  title =
    "Sedang Memproses",
  text =
    "Mohon tunggu. Permintaan Anda sedang diproses oleh GoDesk.",
) {
  return Swal.fire({
    ...baseAnimation,

    title,

    text,

    allowOutsideClick:
      false,

    allowEscapeKey:
      false,

    showConfirmButton:
      false,

    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeAlert() {
  Swal.close();
}

export async function toastSuccess(
  message: string,
) {
  return Swal.fire({
    ...baseAnimation,

    toast:
      true,

    position:
      "top-end",

    icon:
      "success",

    title:
      message,

    showConfirmButton:
      false,

    timer:
      2500,

    timerProgressBar:
      true,
  });
}

export async function toastError(
  message: string,
) {
  return Swal.fire({
    ...baseAnimation,

    toast:
      true,

    position:
      "top-end",

    icon:
      "error",

    title:
      message,

    showConfirmButton:
      false,

    timer:
      3500,

    timerProgressBar:
      true,
  });
}