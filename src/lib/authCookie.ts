/**
 * Auth cookie — set/clear for middleware to protect /dashboard.
 * Middleware cannot access sessionStorage; cookie is sent with every request.
 */

const AUTH_COOKIE = "aeroshield_auth";
const MAX_AGE = 24 * 60 * 60; // 24 hours

export function setAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}
