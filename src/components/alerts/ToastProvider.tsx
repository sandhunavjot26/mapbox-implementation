"use client";

/**
 * Toast / Alert provider — Task 1a of .cursor/plans/operator-api-gap-plan_8558442c.plan.md
 *
 * Behaviour (from old-ui Toasts.tsx L49-L62, reshaped):
 *   - Context-based, imperative push(kind, message, durationMs)
 *   - Auto-dismiss via setTimeout
 *   - Queue trimmed to MAX_STACK entries (oldest evicted first)
 *   - Kinds: success | error | info | warning
 *
 * User spec:
 *   - Default durationMs = 3000
 *   - Max 5 stacked
 *
 * Visuals:
 *   - Derived from existing new-project UI language (driifTokens.ts).
 *     Dark modal surface + status-colored left accent strip + matching pill
 *     text, to align with the radar-status pill pattern used across the app
 *     (missionCreateRadarStatusPillText / PillBg).
 *   - TODO: Figma — replace positioning / padding / motion with exact
 *     design once a Figma node is provided for the toast container.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { COLOR, FONT, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";

export type ToastKind = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: ReactNode;
  /** When true, card fades out then unmounts. */
  exiting?: boolean;
};

export type ToastContextValue = {
  push: (kind: ToastKind, message: ReactNode, durationMs?: number) => number;
  success: (message: ReactNode, durationMs?: number) => number;
  error: (message: ReactNode, durationMs?: number) => number;
  info: (message: ReactNode, durationMs?: number) => number;
  warning: (message: ReactNode, durationMs?: number) => number;
  dismiss: (id: number) => void;
};

const DEFAULT_DURATION_MS = 3000;
const MAX_STACK = 5;
/** Exit animation — toast stays in DOM with opacity 0 before removal. */
const FADE_OUT_MS = 280;
const FADE_IN_MS = 180;

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seqRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const exitTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const finalRemove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const beginDismiss = useCallback(
    (id: number) => {
      if (exitTimersRef.current.has(id)) {
        return;
      }
      let willExit = false;
      flushSync(() => {
        setToasts((prev) => {
          const item = prev.find((x) => x.id === id);
          if (!item || item.exiting) {
            return prev;
          }
          const timer = timersRef.current.get(id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
          }
          willExit = true;
          return prev.map((x) => (x.id === id ? { ...x, exiting: true } : x));
        });
      });
      if (!willExit) {
        return;
      }
      const exitT = setTimeout(() => {
        exitTimersRef.current.delete(id);
        finalRemove(id);
      }, FADE_OUT_MS);
      exitTimersRef.current.set(id, exitT);
    },
    [finalRemove],
  );

  const dismiss = useCallback(
    (id: number) => {
      beginDismiss(id);
    },
    [beginDismiss],
  );

  const push = useCallback(
    (
      kind: ToastKind,
      message: ReactNode,
      durationMs: number = DEFAULT_DURATION_MS,
    ): number => {
      seqRef.current += 1;
      const id = seqRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, kind, message }];
        if (next.length <= MAX_STACK) return next;
        const overflow = next.slice(0, next.length - MAX_STACK);
        overflow.forEach((evicted) => {
          const t = timersRef.current.get(evicted.id);
          if (t) {
            clearTimeout(t);
            timersRef.current.delete(evicted.id);
          }
          const et = exitTimersRef.current.get(evicted.id);
          if (et) {
            clearTimeout(et);
            exitTimersRef.current.delete(evicted.id);
          }
        });
        return next.slice(next.length - MAX_STACK);
      });
      const timer = setTimeout(() => beginDismiss(id), durationMs);
      timersRef.current.set(id, timer);
      return id;
    },
    [beginDismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    const exitTimers = exitTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      exitTimers.forEach((t) => clearTimeout(t));
      exitTimers.clear();
    };
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (m, d) => push("success", m, d),
      error: (m, d) => push("error", m, d),
      info: (m, d) => push("info", m, d),
      warning: (m, d) => push("warning", m, d),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        style={containerStyle}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => beginDismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const palette = KIND_PALETTE[toast.kind];
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const cardStyle: CSSProperties = {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "260px",
    maxWidth: "min(360px, calc(100vw - 32px))",
    padding: "8px 10px",
    background: COLOR.missionCreateSummaryModalBg,
    border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
    borderLeft: `3px solid ${palette.accent}`,
    borderRadius: RADIUS.panel,
    color: COLOR.missionsBodyText,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.sizeSm,
    lineHeight: "17px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.45)",
    cursor: "pointer",
    opacity: toast.exiting ? 0 : entered ? 1 : 0,
    transform: toast.exiting ? "translateY(-3px)" : "translateY(0)",
    transition: `opacity ${toast.exiting ? FADE_OUT_MS : FADE_IN_MS}ms ease, transform ${toast.exiting ? FADE_OUT_MS : FADE_IN_MS
      }ms ease`,
    willChange: "opacity, transform",
  };

  const badgeStyle: CSSProperties = {
    flexShrink: 0,
    padding: "1px 6px",
    borderRadius: RADIUS.panel,
    background: palette.badgeBg,
    color: palette.accent,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.sizeXs,
    lineHeight: "15px",
    fontWeight: FONT.weightMedium,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const messageStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    color: COLOR.missionsBodyText,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const closeStyle: CSSProperties = {
    flexShrink: 0,
    background: "transparent",
    border: "none",
    padding: "0 2px",
    color: COLOR.missionsSecondaryText,
    fontSize: FONT.sizeMd,
    lineHeight: "17px",
    cursor: "pointer",
  };

  return (
    <div
      role="status"
      style={cardStyle}
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
          e.preventDefault();
          onDismiss();
        }
      }}
      tabIndex={0}
    >
      <span style={badgeStyle} aria-hidden>
        {KIND_LABEL[toast.kind]}
      </span>
      <span style={messageStyle}>{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        style={closeStyle}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        ×
      </button>
    </div>
  );
}

const KIND_LABEL: Record<ToastKind, string> = {
  success: "OK",
  error: "ERR",
  info: "INFO",
  warning: "WARN",
};

const KIND_PALETTE: Record<
  ToastKind,
  { accent: string; badgeBg: string }
> = {
  success: {
    accent: COLOR.missionCreateRadarStatusPillText,
    badgeBg: COLOR.missionCreateRadarStatusPillBg,
  },
  warning: {
    accent: COLOR.missionCreateRadarStatusOfflinePillText,
    badgeBg: COLOR.missionCreateRadarStatusOfflinePillBg,
  },
  error: {
    accent: COLOR.statusDanger,
    badgeBg: "rgba(239, 68, 68, 0.2)",
  },
  info: {
    accent: COLOR.accentCyan,
    badgeBg: COLOR.accentCyanBg,
  },
};

// Bottom-right stack — clears CopTopBar / mission chrome at top and sits above
// Mapbox zoom (zoomBottom + zoomWidth + zoomGap). TODO: Figma — exact gutter.
const containerStyle: CSSProperties = {
  position: "fixed",
  right: POSITION.zoomRight,
  bottom: `calc(${POSITION.zoomBottom} + ${POSITION.zoomWidth} + ${SPACING.zoomGap})`,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  zIndex: 1000,
  pointerEvents: "none",
  maxWidth: "360px",
};
