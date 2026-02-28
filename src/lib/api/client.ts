/**
 * API client — base fetch wrapper with JWT Bearer auth.
 * Uses env base URLs; 401 → redirect to login; 403 → throws for "No access" handling.
 */

import { useAuthStore } from "@/stores/authStore";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "";
const DEVICE_URL = process.env.NEXT_PUBLIC_DEVICE_URL ?? "";
const COMMAND_URL = process.env.NEXT_PUBLIC_COMMAND_URL ?? "";

export const apiBaseUrls = {
  auth: AUTH_URL,
  device: DEVICE_URL,
  command: COMMAND_URL,
} as const;

export type ApiService = keyof typeof apiBaseUrls;

function getBaseUrl(service: ApiService): string {
  const url = apiBaseUrls[service];
  if (!url) throw new Error(`Missing env: NEXT_PUBLIC_${service.toUpperCase()}_URL`);
  return url.replace(/\/$/, "");
}

function getToken(): string | null {
  return useAuthStore.getState().getToken();
}

export interface ApiError {
  status: number;
  detail?: string;
  message?: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Fetch with Bearer JWT. 401 → redirect to /login (unless skipAuthRedirect).
 * 403 → throw for caller to show "No access".
 */
export async function apiFetch(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<Response> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const base = getBaseUrl(service);
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  // 401 Unauthorized — clear auth and redirect to login (skip for login endpoint itself)
  if (res.status === 401 && !skipAuthRedirect) {
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError(401, "Unauthorized");
  }

  return res;
}

/**
 * Fetch and parse JSON. Throws on non-2xx.
 */
export async function apiJson<T>(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const res = await apiFetch(service, path, options);

  let body: unknown = null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    const detail = (body as { detail?: string })?.detail ?? (body as { message?: string })?.message;
    throw new ApiClientError(res.status, detail ?? res.statusText, detail);
  }

  return body as T;
}
