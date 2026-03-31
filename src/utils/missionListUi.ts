/**
 * Missions overlay — display helpers (Figma Driif-UI node 853:9691).
 * API may omit status / created_at; UI falls back to sensible defaults.
 */

import type { Mission } from "@/types/aeroshield";

export type MissionCardStatusKind =
  | "LIVE_OPS"
  | "TRAINING_SIM"
  | "ACTIVE"
  | "COMPLETED"
  | "SCHEDULED";

const TAG_LABEL: Record<MissionCardStatusKind, string> = {
  LIVE_OPS: "LIVE OPS",
  TRAINING_SIM: "TRAINING SIM",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  SCHEDULED: "SCHEDULED",
};

/** Figma tag text colors (text-only pills, no icons). */
const TAG_TEXT: Record<MissionCardStatusKind, string> = {
  LIVE_OPS: "#EEFF30",
  TRAINING_SIM: "#F4A30C",
  ACTIVE: "#EEFF30",
  COMPLETED: "#0CBB58",
  SCHEDULED: "#8A8A8A",
};

export const MISSION_TAG_PILL_BG = "#171717";

function normalizeRawStatus(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/**
 * Map API/freeform status to a card kind. Unknown values → ACTIVE.
 */
export function resolveMissionCardStatus(m: Mission): MissionCardStatusKind {
  const raw = normalizeRawStatus((m.status ?? "").toString());
  if (!raw) return "ACTIVE";

  if (
    raw === "LIVE_OPS" ||
    raw === "LIVEOPS" ||
    raw === "LIVE" ||
    raw === "OPERATIONS"
  ) {
    return "LIVE_OPS";
  }
  if (
    raw === "TRAINING_SIM" ||
    raw === "TRAININGSIM" ||
    raw === "TRAINING" ||
    raw === "SIM" ||
    raw === "SIMULATION"
  ) {
    return "TRAINING_SIM";
  }
  if (raw === "COMPLETED" || raw === "COMPLETE" || raw === "DONE" || raw === "CLOSED") {
    return "COMPLETED";
  }
  if (
    raw === "SCHEDULED" ||
    raw === "PENDING" ||
    raw === "PLANNED" ||
    raw === "DRAFT"
  ) {
    return "SCHEDULED";
  }
  if (raw === "ACTIVE" || raw === "RUNNING" || raw === "IN_PROGRESS") {
    return "ACTIVE";
  }

  return "ACTIVE";
}

export function missionStatusTagLabel(kind: MissionCardStatusKind): string {
  return TAG_LABEL[kind];
}

export function missionStatusTagTextColor(kind: MissionCardStatusKind): string {
  return TAG_TEXT[kind];
}

/** Display code like Figma “MSN-…”. */
export function formatMissionListCode(id: string): string {
  const compact = id.replace(/-/g, "");
  if (compact.length >= 8) {
    return `MSN-${compact.slice(0, 4).toUpperCase()}-${compact.slice(-4).toUpperCase()}`;
  }
  return `MSN-${id.toUpperCase()}`;
}

/** “Created on …” line; null if no timestamp. */
export function formatMissionCreatedLine(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);
  return `Created on ${formatted} IST`;
}
