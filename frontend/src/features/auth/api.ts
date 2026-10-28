import { apiFetch } from "@/lib/api/client";

import type {
  ApiResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/lib/types/auth";

export function login(payload: LoginPayload) {
  return apiFetch<ApiResponse<User>>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function register(
  payload: RegisterPayload,
) {
  return apiFetch<ApiResponse<User>>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getMe() {
  return apiFetch<ApiResponse<User>>(
    "/auth/me",
  );
}

export function logout() {
  return apiFetch<{ message: string }>(
    "/auth/logout",
    {
      method: "POST",
    },
  );
}