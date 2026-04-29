"use client";

import type {
  MissionOverlapSeverity,
  MissionOverlapWarning,
} from "@/types/aeroshield";
import { COLOR, FONT, RADIUS } from "@/styles/driifTokens";

const SEVERITY_FG: Record<MissionOverlapSeverity, string> = {
  CRITICAL: "#fecaca",
  HIGH: "#fdba74",
  LOW: "#e2e8f0",
};

const SEVERITY_BG: Record<MissionOverlapSeverity, string> = {
  CRITICAL: "rgba(127, 29, 29, 0.45)",
  HIGH: "rgba(154, 52, 18, 0.4)",
  LOW: "rgba(51, 65, 85, 0.5)",
};

export function CoverageWarningModal({
  open,
  title,
  subtitle,
  counts,
  warnings,
  onClose,
  blockActivate,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  counts: { CRITICAL: number; HIGH: number; LOW: number };
  warnings: MissionOverlapWarning[];
  onClose: () => void;
  /** When true, copy explains activation is blocked until overlaps are resolved */
  blockActivate: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center px-3"
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coverage-warning-title"
    >
      <div
        className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-md border border-solid shadow-xl"
        style={{
          background: COLOR.missionsPanelBg,
          borderColor: COLOR.missionCreateSummaryModalBorder,
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        <div
          className="shrink-0 border-b border-solid px-4 py-3"
          style={{ borderColor: COLOR.missionCreateFieldBorder }}
        >
          <h2
            id="coverage-warning-title"
            className="text-sm font-semibold"
            style={{ color: COLOR.missionsBodyText }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className="mt-1 text-xs"
              style={{ color: COLOR.missionsSecondaryText }}
            >
              {subtitle}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {(["CRITICAL", "HIGH", "LOW"] as const).map((sev) => (
              <span
                key={sev}
                className="rounded px-2 py-0.5 font-mono"
                style={{
                  background: SEVERITY_BG[sev],
                  color: SEVERITY_FG[sev],
                }}
              >
                {sev}: {counts[sev] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <div
          className="driif-mission-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2"
          style={{ maxHeight: "min(360px, 50vh)" }}
        >
          {warnings.length === 0 ? (
            <p
              className="py-4 text-center text-xs"
              style={{ color: COLOR.missionsSecondaryText }}
            >
              No overlap details returned.
            </p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li
                  key={`${w.device_a_id}-${w.device_b_id}-${w.kind}-${i}`}
                  className="rounded border border-solid px-2.5 py-2 text-[11px]"
                  style={{
                    borderColor: COLOR.missionCreateFieldBorder,
                    background: "rgba(39, 39, 39, 0.6)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        background: SEVERITY_BG[w.severity],
                        color: SEVERITY_FG[w.severity],
                      }}
                    >
                      {w.severity}
                    </span>
                    <span
                      className="truncate font-mono text-[10px]"
                      style={{ color: COLOR.missionsSecondaryText }}
                    >
                      {w.kind}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 leading-snug"
                    style={{ color: COLOR.missionCreateFieldText }}
                  >
                    <span className="font-medium">{w.device_a_name}</span>
                    <span style={{ color: COLOR.missionsSecondaryText }}> ↔ </span>
                    <span className="font-medium">{w.device_b_name}</span>
                  </div>
                  {w.overlap_radius_m != null ? (
                    <div
                      className="mt-1 font-mono text-[10px]"
                      style={{ color: COLOR.missionsSecondaryText }}
                    >
                      Radius ~{Math.round(w.overlap_radius_m)} m
                      {w.overlap_area_m2 != null
                        ? ` · area ~${Math.round(w.overlap_area_m2).toLocaleString()} m²`
                        : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className="flex shrink-0 justify-end gap-2 border-t border-solid px-4 py-3"
          style={{ borderColor: COLOR.missionCreateFieldBorder }}
        >
          {blockActivate ? (
            <p
              className="mr-auto max-w-[70%] self-center text-[10px]"
              style={{ color: COLOR.missionsSecondaryText }}
            >
              Resolve critical jammer overlaps before activating.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-solid px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            style={{
              borderColor: COLOR.missionCreateSummaryModalBorder,
              background: COLOR.missionCreateFieldBg,
              color: COLOR.missionCreateFieldText,
              borderRadius: RADIUS.panel,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
