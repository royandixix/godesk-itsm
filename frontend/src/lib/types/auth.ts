export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "AGENT"
  | "CUSTOMER";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}