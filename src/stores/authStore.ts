/**
 * Auth store — JWT token, roles, permissions, scopes.
 * Token persisted in sessionStorage (avoids localStorage for XSS).
 * Cookie set for middleware to protect /dashboard (middleware cannot read sessionStorage).
 */

import { create } from "zustand";
import { setAuthCookie, clearAuthCookie } from "@/lib/authCookie";

const TOKEN_KEY = "aeroshield_token";
const AUTH_DATA_KEY = "aeroshield_auth_data";
const USERNAME_KEY = "aeroshield_username";

export interface AuthScopes {
  global: boolean;
  missions: string[];
  devices: string[];
}

export interface AuthData {
  roles: string[];
  permissions: string[];
  scopes: AuthScopes;
}

interface AuthState {
  token: string | null;
  authData: AuthData | null;
  /** Trimmed login name from last successful login, if stored. */
  username: string | null;
  setAuth: (token: string, authData: AuthData, username?: string | null) => void;
  clearAuth: () => void;
  getToken: () => string | null;
  hasPermission: (permission: string) => boolean;
  hasMissionAccess: (missionId: string) => boolean;
  hasDeviceAccess: (deviceId: string) => boolean;
}

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function loadAuthData(): AuthData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_DATA_KEY);
    return raw ? (JSON.parse(raw) as AuthData) : null;
  } catch {
    return null;
  }
}

function loadUsername(): string | null {
  if (typeof window === "undefined") return null;
  const u = sessionStorage.getItem(USERNAME_KEY);
  return u && u.trim() ? u.trim() : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: loadToken(),
  authData: loadAuthData(),
  username: loadUsername(),

  setAuth: (token: string, authData: AuthData, loginUsername?: string | null) => {
    let trimmed: string | null;
    if (loginUsername !== undefined) {
      trimmed =
        typeof loginUsername === "string" && loginUsername.trim()
          ? loginUsername.trim()
          : null;
    } else {
      trimmed = get().username ?? loadUsername();
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));
      if (trimmed) sessionStorage.setItem(USERNAME_KEY, trimmed);
      else sessionStorage.removeItem(USERNAME_KEY);
      setAuthCookie();
    }
    set({ token, authData, username: trimmed });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(AUTH_DATA_KEY);
      sessionStorage.removeItem(USERNAME_KEY);
      clearAuthCookie();
    }
    set({ token: null, authData: null, username: null });
  },

  getToken: () => get().token ?? loadToken(),

  hasPermission: (permission: string) => {
    const { authData } = get();
    if (!authData) return false;
    if (authData.permissions.includes("*")) return true;
    return authData.permissions.includes(permission);
  },

  hasMissionAccess: (missionId: string) => {
    const { authData } = get();
    if (!authData) return false;
    if (authData.scopes.global) return true;
    return authData.scopes.missions.includes(missionId);
  },

  hasDeviceAccess: (deviceId: string) => {
    const { authData } = get();
    if (!authData) return false;
    if (authData.scopes.global) return true;
    return authData.scopes.devices.includes(deviceId);
  },
}));
