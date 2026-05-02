"use client";

import { COLOR, FONT } from "@/styles/driifTokens";

export type InlineLoadIndicatorProps = {
  /** Visible text; keep specific when the context matters (e.g. “Loading assets…”). */
  label?: string;
  /** Centered block min-height, e.g. `min(240px, 40vh)` for panels. Omit for default. */
  minHeight?: string;
  /** Spinner size in pixels */
  spinnerSize?: number;
  className?: string;
  /** `start` = left-aligned row-ish blocks (form fields); default centered */
  align?: "center" | "start";
};

/**
 * Spinner + optional label for inline / panel loading states.
 * Use inside overlays, drawers, or list shells — not full-page blocking loaders.
 */
export function InlineLoadIndicator({
  label = "Loading…",
  minHeight = "min(240px, 40vh)",
  spinnerSize = 32,
  className,
  align = "center",
}: InlineLoadIndicatorProps) {
  const items = align === "start" ? "items-start" : "items-center";
  return (
    <div
      className={`flex flex-col ${items} justify-center gap-3 py-8${className ? ` ${className}` : ""}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="shrink-0 animate-spin rounded-full border-2 border-solid"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderColor: "rgba(255,255,255,0.12)",
          borderTopColor: COLOR.accentCyan,
        }}
        aria-hidden
      />
      {label ? (
        <p
          style={{
            color: COLOR.missionsSecondaryText,
            fontSize: FONT.sizeSm,
            lineHeight: "17px",
            margin: 0,
          }}
        >
          {label}
        </p>
      ) : null}
    </div>
  );
}
