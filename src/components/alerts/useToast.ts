"use client";

/**
 * useToast — convenience hook for imperatively pushing alerts.
 *
 * Usage (inside any component rendered below <ToastProvider>):
 *
 *   const toast = useToast();
 *   toast.success("Mission activated");
 *   toast.error("Activate failed: " + err.message);
 *   toast.info("Radar reconnected", 5000);
 *
 * If called outside a ToastProvider, the hook returns a console-backed
 * fallback so tests / storybook consumers do not crash.
 */

import { useContext } from "react";
import { ToastContext } from "./ToastProvider";
import type { ToastContextValue } from "./ToastProvider";

const noopId = 0;

const consoleFallback: ToastContextValue = {
  push: (kind, message) => {
    console.log(`[toast:${kind}]`, message);
    return noopId;
  },
  success: (message) => {
    console.log("[toast:success]", message);
    return noopId;
  },
  error: (message) => {
    console.warn("[toast:error]", message);
    return noopId;
  },
  info: (message) => {
    console.info("[toast:info]", message);
    return noopId;
  },
  warning: (message) => {
    console.warn("[toast:warning]", message);
    return noopId;
  },
  dismiss: () => {},
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? consoleFallback;
}
