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

/** Parse `filename` from Content-Disposition (RFC 5987 filename* and quoted/unquoted forms). */
export function parseContentDispositionFilename(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;\s]+)/i.exec(contentDisposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1]) return quoted[1];
  const bare = /filename\s*=\s*([^;\s]+)/i.exec(contentDisposition);
  if (bare?.[1]) return bare[1].replace(/^"|"$/g, "");
  return null;
}

function appendCacheBustToUrl(urlStr: string): string {
  const u = new URL(urlStr);
  u.searchParams.set("_ts", String(Date.now()));
  return u.toString();
}

function rejectWithApiError(res: Response, body: unknown): never {
  const rawDetail =
    (body as { detail?: unknown })?.detail ?? (body as { message?: unknown })?.message;
  const detailMessage =
    typeof rawDetail === "string"
      ? rawDetail
      : rawDetail !== undefined && rawDetail !== null
        ? JSON.stringify(rawDetail)
        : undefined;
  throw new ApiClientError(res.status, detailMessage ?? res.statusText, detailMessage);
}

/**
 * Fetch with Bearer JWT. 401 → redirect to /login (unless skipAuthRedirect).
 * 403 → throw for caller to show "No access".
 *
 * GET requests append `_ts` and send Cache-Control/Pragma no-cache so navigations
 * do not reuse stale zone/device responses (see oldui axios interceptors).
 */
export async function apiFetch(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<Response> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const base = getBaseUrl(service);
  let url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const extraHeaders: Record<string, string> = {};
  if (method === "GET") {
    url = appendCacheBustToUrl(url);
    extraHeaders["Cache-Control"] = "no-cache";
    extraHeaders["Pragma"] = "no-cache";
  }

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
    ...extraHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

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
 * Fetch, parse JSON, and return body plus response headers (e.g. `X-Total-Count`).
 * Throws on non-2xx.
 */
export async function apiJsonWithHeaders<T>(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<{ data: T; headers: Headers }> {
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
    rejectWithApiError(res, body);
  }
  return { data: body as T, headers: res.headers };
}

/**
 * Fetch and parse JSON. Throws on non-2xx.
 */
export async function apiJson<T>(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const { data } = await apiJsonWithHeaders<T>(service, path, options);
  return data;
}

export interface ApiBlobResult {
  blob: Blob;
  filename: string | null;
}

/**
 * Fetch a binary response. On success returns blob + optional filename from Content-Disposition.
 * On error, attempts to parse JSON (or text) for ApiClientError detail.
 */
export async function apiBlob(
  service: ApiService,
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<ApiBlobResult> {
  const res = await apiFetch(service, path, options);
  if (!res.ok) {
    let body: unknown = null;
    const ct = res.headers.get("content-type");
    if (ct?.includes("application/json")) {
      try {
        body = await res.json();
      } catch {
        // ignore
      }
    } else {
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = { message: text };
        }
      }
    }
    rejectWithApiError(res, body);
  }
  const blob = await res.blob();
  const filename = parseContentDispositionFilename(res.headers.get("content-disposition"));
  return { blob, filename };
}
