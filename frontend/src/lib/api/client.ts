const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8082";
const API_URL =
  `${API_ORIGIN}/api/v1`;
export class ApiError extends Error {
  status: number;
  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name =
      "ApiError";
    this.status =
      status;
  }
}
export type ApiFetchOptions =
  RequestInit & {
    errorAlert?: boolean;
    successAlert?: boolean;
    successMessage?: string;
  };
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const requestOptions = { ...options };
  delete requestOptions.errorAlert;
  delete requestOptions.successAlert;
  delete requestOptions.successMessage;

  const headers =
    new Headers(
      requestOptions.headers,
    );
  if (
    requestOptions.body &&
    !(
      requestOptions.body instanceof
      FormData
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }
  headers.set(
    "Accept",
    "application/json",
  );
  let response: Response;
  try {
    response =
      await fetch(
        `${API_URL}${path}`,
        {
          ...requestOptions,
          headers,
          credentials:
            "include",
        },
      );
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server GoDesk. Pastikan backend sedang berjalan.",
      0,
    );
  }
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";
  let payload:
    unknown = null;
  if (
    contentType.includes(
      "application/json",
    )
  ) {
    try {
      payload =
        await response.json();
    } catch {
      payload =
        null;
    }
  }
  if (!response.ok) {
    let message =
      "Terjadi kesalahan pada server.";
    if (
      payload &&
      typeof payload ===
        "object" &&
      "message" in
        payload
    ) {
      const apiMessage =
        (
          payload as {
            message?: unknown;
          }
        ).message;
      if (
        typeof apiMessage ===
          "string" &&
        apiMessage.trim() !==
          ""
      ) {
        message =
          apiMessage;
      }
    }
    throw new ApiError(
      message,
      response.status,
    );
  }
  return payload as T;
}
