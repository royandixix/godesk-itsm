import { apiFetch } from "@/lib/api/client";
import type {
  User,
  UserRole,
  UserStatus,
} from "@/lib/types/auth";

export interface UserListResult {
  items: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserListResponse {
  data: UserListResult;
}

export interface UserResponse {
  message?: string;
  data: User;
}

export interface UserListParams {
  role?: UserRole;
  status?: UserStatus | "";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

function buildQuery(
  params: UserListParams,
) {
  const query =
    new URLSearchParams();

  if (params.role) {
    query.set(
      "role",
      params.role,
    );
  }

  if (params.status) {
    query.set(
      "status",
      params.status,
    );
  }

  if (params.search?.trim()) {
    query.set(
      "search",
      params.search.trim(),
    );
  }

  if (
    typeof params.limit ===
    "number"
  ) {
    query.set(
      "limit",
      String(params.limit),
    );
  }

  if (
    typeof params.offset ===
    "number"
  ) {
    query.set(
      "offset",
      String(params.offset),
    );
  }

  return query.toString();
}

export function getAdminUsers(
  params: UserListParams = {},
) {
  const query =
    buildQuery(params);

  return apiFetch<UserListResponse>(
    `/admin/users${
      query ? `?${query}` : ""
    }`,
  );
}

export function getAdminUser(
  id: number,
) {
  return apiFetch<UserResponse>(
    `/admin/users/${id}`,
  );
}

export function createAdminUser(
  payload: CreateUserPayload,
) {
  return apiFetch<UserResponse>(
    "/admin/users",
    {
      method: "POST",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}

export function updateAdminUser(
  id: number,
  payload: UpdateUserPayload,
) {
  return apiFetch<UserResponse>(
    `/admin/users/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}

export function updateAdminUserStatus(
  id: number,
  status: UserStatus,
) {
  return apiFetch<UserResponse>(
    `/admin/users/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    },
  );
}