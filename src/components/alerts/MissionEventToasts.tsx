"use client";

/**
 * Pushes a toast for new real-time mission_event (WebSocket) rows for the
 * active mission — only for critical severities (`error` and `warning`), not
 * routine traffic (`TRACK_UPDATE`, `DETECTED`, command success, etc.).
 * REST timeline backfill uses addEvent({ silent: true }) so those rows do not
 * alert (avoid hundreds of toasts on mission select).
 *
 * Mission events use a longer default duration than global toasts (3s) so
 * operators can read event type + track name before auto-dismiss.
 */

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useToast } from "@/components/alerts/useToast";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useMissionStore } from "@/stores/missionStore";
import { useTargetsStore } from "@/stores/targetsStore";
import type { MissionEventEntry } from "@/stores/missionEventsStore";
import type { Target } from "@/types/targets";
import { COLOR, FONT } from "@/styles/driifTokens";
import type { ToastContextValue, ToastKind } from "@/components/alerts/ToastProvider";

/**
 * Visible time before fade-out. Exit animation adds ~FADE_OUT_MS in ToastProvider
 * on top of this.
 */
const MISSION_EVENT_TOAST_MS = 6000;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function kindForEvent(eventType: string): ToastKind {
  const t = eventType.toUpperCase();
  if (
    t.includes("FAILED") ||
    t.includes("TIMEOUT") ||
    t.includes("ERROR") ||
    t.includes("LOST")
  ) {
    return "error";
  }
  if (t.includes("SUCCEEDED") || t === "MISSION_ACTIVATED") {
    return "success";
  }
  if (
    t.includes("BREACH") ||
    t.includes("NFZ") ||
    t.includes("JAM") ||
    t.includes("THREAT") ||
    t.startsWith("ZONE_")
  ) {
    return "warning";
  }
  return "info";
}

/** Only surface toasts that need operator attention — not info/success churn. */
function shouldToastMissionEvent(eventType: string): boolean {
  const k = kindForEvent(eventType);
  return k === "error" || k === "warning";
}

function shortTrackId(uid: string): string {
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

/**
 * Best-effort drone / track display name: payload fields first, then live
 * `targetsStore` (TRACK_UPDATE / DETECTED may have set `targetName` before this toast).
 */
function resolveDroneLabel(e: MissionEventEntry, targets: Target[]): string | null {
  const p = e.payload;
  if (!p || typeof p !== "object") {
    return null;
  }
  const o = p as Record<string, unknown>;

  if (typeof o.target_name === "string" && o.target_name.trim()) {
    return o.target_name.trim();
  }
  if (o.uav && typeof o.uav === "object" && o.uav !== null) {
    const u = o.uav as Record<string, unknown>;
    if (typeof u.target_name === "string" && u.target_name.trim()) {
      return u.target_name.trim();
    }
    if (typeof u.name === "string" && u.name.trim()) {
      return u.name.trim();
    }
  }
  const targetUid = typeof o.target_uid === "string" ? o.target_uid : null;
  if (targetUid) {
    const t = targets.find((x) => x.id === targetUid);
    if (t?.targetName?.trim()) {
      return t.targetName.trim();
    }
    return `Track ${shortTrackId(targetUid)}`;
  }
  if (typeof o.zone_name === "string" && o.zone_name.trim()) {
    return o.zone_name.trim();
  }
  if (typeof o.label === "string" && o.label.trim()) {
    return o.label.trim();
  }
  return null;
}

const sep: CSSProperties = {
  color: "rgba(230, 230, 230, 0.45)",
  fontWeight: FONT.weightNormal,
};

const timeStyle: CSSProperties = {
  color: "rgba(230, 230, 230, 0.5)",
  fontFamily: `${FONT.mono}, monospace`,
  fontWeight: FONT.weightNormal,
};

/** One line: [drone · ] EVENT_TYPE · HH:MM:SS (ellipsis via parent in ToastItem). */
function messageForEvent(e: MissionEventEntry, targets: Target[]) {
  const drone = resolveDroneLabel(e, targets);
  const time = formatTime(e.ts);
  return (
    <span
      style={{
        display: "block",
        color: COLOR.missionsBodyText,
        fontSize: FONT.sizeSm,
        lineHeight: "17px",
      }}
    >
      {drone ? (
        <>
          <span style={{ fontWeight: FONT.weightMedium }}>{drone}</span>
          <span style={sep}> · </span>
        </>
      ) : null}
      <span style={{ fontWeight: FONT.weightNormal }}>{e.event_type}</span>
      <span style={sep}> · </span>
      <span style={timeStyle}>{time}</span>
    </span>
  );
}

function emitEventToast(
  toast: ToastContextValue,
  e: MissionEventEntry,
  targets: Target[],
) {
  const k = kindForEvent(e.event_type);
  const body = messageForEvent(e, targets);
  const push =
    k === "success"
      ? toast.success
      : k === "error"
        ? toast.error
        : k === "warning"
          ? toast.warning
          : toast.info;
  push(body, MISSION_EVENT_TOAST_MS);
}

export function MissionEventToasts() {
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const events = useMissionEventsStore((s) => s.events);
  const targets = useTargetsStore((s) => s.targets);
  const toast = useToast();
  const lastHeadId = useRef<string | null>(null);
  const lastMissionId = useRef<string | null>(null);

  useEffect(() => {
    if (activeMissionId !== lastMissionId.current) {
      lastMissionId.current = activeMissionId;
      lastHeadId.current = null;
    }
  }, [activeMissionId]);

  useEffect(() => {
    if (!activeMissionId) {
      return;
    }

    const missionEvents = events.filter((e) => e.mission_id === activeMissionId);
    const head = missionEvents[0];
    if (!head) {
      return;
    }

    if (head.id === lastHeadId.current) {
      return;
    }

    lastHeadId.current = head.id;

    if (
      head.suppressToast ||
      !shouldToastMissionEvent(head.event_type)
    ) {
      return;
    }

    emitEventToast(toast, head, targets);
  }, [activeMissionId, events, toast, targets]);

  return null;
}
