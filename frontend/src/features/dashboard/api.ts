import {
  apiFetch,
} from "@/lib/api/client";

import type {
  DashboardResponse,
} from "@/lib/types/dashboard";

export function getDashboard() {
  return apiFetch<DashboardResponse>(
    "/dashboard",
    {
      errorAlert:
        false,
    },
  );
}