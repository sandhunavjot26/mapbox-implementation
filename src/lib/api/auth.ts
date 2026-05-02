/**
 * Auth API — login, logout.
 * POST /api/v1/auth/login — obtain JWT for subsequent requests.
 */

import { apiJson } from "./client";
import type { AuthLoginResponse } from "@/types/aeroshield";
import { useAuthStore } from "@/stores/authStore";

/**
 * POST /api/v1/auth/login?username=&password=
 * Returns JWT and auth metadata (roles, permissions, scopes).
 */
export async function login(username: string, password: string): Promise<AuthLoginResponse> {
  const params = new URLSearchParams({ username, password });
  const res = await apiJson<AuthLoginResponse>("auth", `/api/v1/auth/login?${params}`, {
    method: "POST",
    skipAuthRedirect: true, // Don't redirect on invalid credentials; let form show error
  } as RequestInit & { skipAuthRedirect?: boolean });

  useAuthStore.getState().setAuth(
    res.access_token,
    {
      roles: res.roles ?? [],
      permissions: res.permissions ?? [],
      scopes: res.scopes ?? { global: false, missions: [], devices: [] },
    },
    username,
  );

  return res;
}

export function logout(): void {
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
