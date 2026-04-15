"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/types/assets";
import type { Target } from "@/types/targets";
import { subscribeToPopup, PopupState, clearSelection } from "../mapController";
import { useTargetsStore } from "@/stores/targetsStore";
import { useAttackModeStore } from "@/stores/attackModeStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { AssetPopupControls } from "@/components/commands/PopupControls";
import { DroneOverlayCard } from "./DroneOverlayCard";
import { reclassifyTarget, confirmThreat } from "@/stores/mapActionsStore";
import { useTargetsStore as useTargetsStoreActions } from "@/stores/targetsStore";

/** Staleness threshold: no update for this many seconds → show stale */
const STALE_SECONDS = 30;

// Status color mapping
const statusColors: Record<string, string> = {
  ACTIVE: "text-green-400",
  INACTIVE: "text-slate-500",
};

export function EntityHoverPopup() {
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const targets = useTargetsStore((s) => s.targets);
  const reclassifyTargetInStore = useTargetsStoreActions((s) => s.reclassifyTarget);

  useEffect(() => {
    const unsubscribe = subscribeToPopup((state) => {
      setPopupState(state);
    });
    return unsubscribe;
  }, []);

  if (!popupState || !popupState.visible) {
    return null;
  }

  const { entityType, data, screenPosition, isPinned } = popupState;

  // Offset from cursor for non-target popups
  const offsetX = 12;
  const offsetY = 12;

  // For target entities render the new DroneOverlayCard (pinned only; hover shows asset-style mini card)
  if (entityType === "target") {
    const target = data as Target;
    // Use live target from store (reflects reclassifications)
    const liveTarget = targets.find((t) => t.id === target.id) ?? target;

    if (isPinned) {
      const CARD_W = 381;
      const CARD_GAP = 16;    // px gap between drone marker edge and nearest card edge
      const MIN_CARD_H = 280; // minimum card height before clamping kicks in

      // ── Horizontal placement ─────────────────────────────────────────────
      // Prefer right (matches Figma); flip left when card would overflow viewport.
      const placeRight =
        screenPosition.x + CARD_GAP + CARD_W < window.innerWidth - 8;
      const cardLeft = placeRight
        ? screenPosition.x + CARD_GAP
        : screenPosition.x - CARD_GAP - CARD_W;

      // ── Vertical placement ───────────────────────────────────────────────
      // Align card top ~40px above drone centre; clamp so card stays on screen.
      const cardTop = Math.max(
        8,
        Math.min(
          screenPosition.y - 40,
          window.innerHeight - MIN_CARD_H - 8,
        ),
      );
      const cardMaxHeight = window.innerHeight - cardTop - 8;

      // ── Connector line endpoint on the card side ─────────────────────────
      // Connect to the corner of the card that is nearest to the drone.
      const lineEndX = placeRight ? cardLeft : cardLeft + CARD_W;
      const lineEndY = cardTop + 24; // slightly below card top corner

      return (
        <>
          {/* ① Full-viewport SVG — dashed connector line (pointer-events: none) */}
          <svg
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              pointerEvents: "none",
              zIndex: 48,
            }}
          >
            <line
              x1={screenPosition.x}
              y1={screenPosition.y}
              x2={lineEndX}
              y2={lineEndY}
              stroke="#EEFF30"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            {/* Dot at the card-corner end of the line */}
            <circle cx={lineEndX} cy={lineEndY} r="3" fill="#EEFF30" />
          </svg>

          {/* ② Dashed-rectangle selection indicator centred on drone icon */}
          <div
            style={{
              position: "fixed",
              left: screenPosition.x - 14,
              top: screenPosition.y - 14,
              width: 28,
              height: 28,
              border: "1.5px dashed #EEFF30",
              borderRadius: "2px",
              pointerEvents: "none",
              zIndex: 49,
            }}
          />

          {/* ③ Card */}
          <div
            style={{
              position: "fixed",
              left: cardLeft,
              top: cardTop,
              zIndex: 50,
              pointerEvents: "auto",
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={clearSelection}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                zIndex: 10,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                fontSize: "18px",
                lineHeight: 1,
                cursor: "pointer",
                padding: "2px 4px",
              }}
              aria-label="Close"
            >
              ×
            </button>
            <DroneOverlayCard
              target={liveTarget}
              style={{ maxHeight: `${cardMaxHeight}px` }}
              onInitiateJam={() => confirmThreat(liveTarget.id)}
              onMarkFriendly={() => {
                reclassifyTarget(liveTarget.id, "FRIENDLY");
                reclassifyTargetInStore(liveTarget.id, "FRIENDLY");
              }}
              onEscalate={() => {}}
              onReturnToBase={() => {}}
              onHoverHold={() => {}}
              onAbort={() => {}}
              onEmergencyLand={() => {}}
              onMarkEnemy={() => {
                reclassifyTarget(liveTarget.id, "ENEMY");
                reclassifyTargetInStore(liveTarget.id, "ENEMY");
              }}
            />
          </div>
        </>
      );
    }

    // Hover (not pinned): small tooltip
    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{ left: screenPosition.x + 12, top: screenPosition.y + 12 }}
      >
        <TargetHoverTooltip target={liveTarget} />
      </div>
    );
  }

  // Asset popup
  const popupClassName = isPinned
    ? "bg-slate-900 border-2 border-cyan-500/80 backdrop-blur-sm px-3 py-2 min-w-[200px] shadow-lg shadow-cyan-500/10 relative"
    : "bg-slate-900/95 border border-slate-700 backdrop-blur-sm px-3 py-2 min-w-[180px]";

  return (
    <div
      className={`fixed z-50 ${isPinned ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        left: screenPosition.x + offsetX,
        top: screenPosition.y + offsetY,
      }}
    >
      <div className={popupClassName}>
        {isPinned && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute top-1 right-1 text-slate-400 hover:text-slate-200 text-sm leading-none p-0.5"
            aria-label="Close"
          >
            ×
          </button>
        )}
        <AssetPopupContent data={data as Asset} isPinned={isPinned} />
      </div>
    </div>
  );
}

function formatLastSeen(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
}

function AssetPopupContent({
  data,
  isPinned,
}: {
  data: Asset;
  isPinned: boolean;
}) {
  const attackMode = useAttackModeStore((s) => s.getAttackMode(data.id));
  const deviceStatus = useDeviceStatusStore((s) => s.getDeviceStatus(data.id));

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50 pr-5">
        <span className="text-slate-200 text-xs font-mono font-semibold">
          {data.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {attackMode && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 ${
                attackMode.jamActive ? "text-red-400 bg-red-950/50" : "text-slate-500 bg-slate-800"
              }`}
            >
              {attackMode.jamActive ? "Jam: ON" : "Idle"}
            </span>
          )}
          <span className={`text-[10px] font-mono ${statusColors[data.status]}`}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">ID</span>
          <span className="text-slate-400 truncate max-w-[120px]">{data.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Area</span>
          <span className="text-slate-400">{data.area}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{data.altitude} FT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Coverage</span>
          <span className="text-slate-400">{data.coverageRadiusKm} KM</span>
        </div>
        {deviceStatus && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Last seen</span>
              <span className="text-slate-400 truncate max-w-[120px]">{formatLastSeen(deviceStatus.last_seen)}</span>
            </div>
            {deviceStatus.op_status != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Op status</span>
                <span className="text-slate-400">{String(deviceStatus.op_status)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {isPinned && <AssetPopupControls asset={data} />}
    </div>
  );
}

/** Lightweight hover tooltip shown before user clicks/pins a target */
function TargetHoverTooltip({ target }: { target: Target }) {
  const isStale =
    target.lastSeenAt != null &&
    (Date.now() - target.lastSeenAt) / 1000 > STALE_SECONDS;

  const classLabel =
    target.classification === "UNKNOWN" ? "ENEMY" : target.classification;
  const classColor =
    classLabel === "ENEMY" ? "text-red-400" : "text-green-400";

  return (
    <div className="bg-slate-900/95 border border-slate-700 backdrop-blur-sm px-3 py-2 min-w-[180px] space-y-1">
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50">
        <span className="text-slate-200 text-xs font-mono font-semibold truncate max-w-[140px]">
          {target.targetName ?? target.id}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isStale && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 animate-pulse whitespace-nowrap">
              Stale
            </span>
          )}
          <span className={`text-[10px] font-mono ${classColor}`}>
            {classLabel}
          </span>
        </div>
      </div>
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between gap-6">
          <span className="text-slate-500">Distance</span>
          <span className="text-slate-400">{target.distanceKm.toFixed(1)} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{target.altitude} ft</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Heading</span>
          <span className="text-slate-400">{target.heading}°</span>
        </div>
        <p className="text-slate-600 pt-0.5">Click to open full panel</p>
      </div>
    </div>
  );
}
