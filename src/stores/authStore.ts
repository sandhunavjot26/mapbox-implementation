/**
 * Auth store — JWT token, roles, permissions, scopes.
 * Token persisted in sessionStorage (avoids localStorage for XSS).
 * Cookie set for middleware to protect /dashboard (middleware cannot read sessionStorage).
 */

import { create } from "zustand";
import { setAuthCookie, clearAuthCookie } from "@/lib/authCookie";

const TOKEN_KEY = "aeroshield_token";
const AUTH_DATA_KEY = "aeroshield_auth_data";

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
  setAuth: (token: string, authData: AuthData) => void;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: loadToken(),
  authData: loadAuthData(),

  setAuth: (token: string, authData: AuthData) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));
      setAuthCookie();
    }
    set({ token, authData });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(AUTH_DATA_KEY);
      clearAuthCookie();
    }
    set({ token: null, authData: null });
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
