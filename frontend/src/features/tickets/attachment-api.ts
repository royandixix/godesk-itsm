import { ApiError, apiFetch } from "@/lib/api/client";

import type {
  AttachmentDeleteResponse,
  AttachmentListResponse,
  AttachmentUploadResponse,
} from "@/lib/types/attachment";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";

const API_URL = `${API_ORIGIN}/api/v1`;

export function getTicketAttachments(ticketId: number) {
  return apiFetch<AttachmentListResponse>(`/tickets/${ticketId}/attachments`, {
    errorAlert: false,
  });
}

export function uploadTicketAttachment(ticketId: number, file: File) {
  const formData = new FormData();

  formData.append("file", file);

  return apiFetch<AttachmentUploadResponse>(
    `/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      body: formData,
      errorAlert: false,
    },
  );
}

export async function downloadTicketAttachment(attachmentId: number): Promise<{
  blob: Blob;
  filename: string | null;
}> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/attachments/${attachmentId}/download`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server GoDesk. Pastikan backend sedang berjalan.",
      0,
    );
  }

  if (!response.ok) {
    let message = "Lampiran gagal diunduh.";

    try {
      const payload = (await response.json()) as {
        message?: unknown;
      };

      if (
        typeof payload.message === "string" &&
        payload.message.trim() !== ""
      ) {
        message = payload.message;
      }
    } catch {
      // Response bukan JSON.
    }

    throw new ApiError(message, response.status);
  }

  const disposition = response.headers.get("content-disposition");

  let filename: string | null = null;

  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    const normalMatch = disposition.match(/filename="?([^";]+)"?/i);

    if (utf8Match?.[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch {
        filename = utf8Match[1];
      }
    } else if (normalMatch?.[1]) {
      filename = normalMatch[1];
    }
  }

  const blob = await response.blob();

  return {
    blob,
    filename,
  };
}

export function deleteTicketAttachment(attachmentId: number) {
  return apiFetch<AttachmentDeleteResponse>(`/attachments/${attachmentId}`, {
    method: "DELETE",
    errorAlert: false,
  });
}
