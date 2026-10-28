const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";

export type User = {
  id: number;
  role: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ApiResponse<T> = {
  message: string;
  data?: T;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error("Response dari server tidak valid.");
  }

  if (!response.ok) {
    throw new Error(
      result.message || "Terjadi kesalahan pada server.",
    );
  }

  return result;
}

export async function login(
  email: string,
  password: string,
) {
  return request<User>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function getCurrentUser() {
  return request<User>("/api/v1/auth/me", {
    method: "GET",
  });
}

export async function logout() {
  return request<null>("/api/v1/auth/logout", {
    method: "POST",
  });
}