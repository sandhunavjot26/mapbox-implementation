"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Asset } from "@/types/assets";
import type { Target } from "@/types/targets";
import { subscribeToPopup, PopupState, clearSelection } from "../mapController";
import { useTargetsStore } from "@/stores/targetsStore";
import { useAttackModeStore } from "@/stores/attackModeStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMissionStore } from "@/stores/missionStore";
import { AssetPopupControls } from "@/components/commands/PopupControls";
import { DroneOverlayCard } from "./DroneOverlayCard";
import { RadarOverlayCard } from "./RadarOverlayCard";
import { reclassifyTarget, confirmThreat } from "@/stores/mapActionsStore";
import { useTargetsStore as useTargetsStoreActions } from "@/stores/targetsStore";
import { executeEngageJam } from "@/lib/engageJamCommand";
import { COLOR, FONT, RADIUS } from "@/styles/driifTokens";

/** Staleness threshold: no update for this many seconds → show stale */
const STALE_SECONDS = 30;

/** Mini hover card — matches DroneOverlayCard / RadarOverlayCard panel surface */
const HOVER_TOOLTIP_SHELL: CSSProperties = {
  background: COLOR.missionsPanelBg,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: RADIUS.panel,
  padding: "10px 14px",
  minWidth: "200px",
  fontFamily: `${FONT.family}, sans-serif`,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "12px",
  fontSize: FONT.sizeSm,
  lineHeight: "17px",
};

const labelStyle: CSSProperties = {
  color: COLOR.missionsSecondaryText,
  flexShrink: 0,
};

const valueStyle: CSSProperties = {
  color: COLOR.missionCreateFieldText,
  textAlign: "right" as const,
  minWidth: 0,
};

function assetStatusColor(status: string): string {
  if (status === "ACTIVE") return COLOR.statusOnline;
  return COLOR.missionsSecondaryText;
}

export function EntityHoverPopup() {
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const [engageError, setEngageError] = useState<string | null>(null);
  const [engagePending, setEngagePending] = useState(false);
  const targets = useTargetsStore((s) => s.targets);
  const reclassifyTargetInStore = useTargetsStoreActions((s) => s.reclassifyTarget);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);

  const popupTargetId =
    popupState?.entityType === "target"
      ? (popupState.data as Target).id
      : null;

  useEffect(() => {
    const unsubscribe = subscribeToPopup((state) => {
      setPopupState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setEngageError(null);
    setEngagePending(false);
  }, [popupTargetId]);

  const handleEngageTarget = useCallback(
    async (t: Target) => {
      setEngagePending(true);
      setEngageError(null);
      try {
        const result = await executeEngageJam(t, activeMissionId);
        if (!result.ok) setEngageError(result.error);
      } finally {
        setEngagePending(false);
      }
    },
    [activeMissionId],
  );

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
            {/* <button
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
                fontSize: "19px",
                lineHeight: 1,
                cursor: "pointer",
                padding: "2px 4px",
              }}
              aria-label="Close"
            >
              ×
            </button> */}
            <DroneOverlayCard
              target={liveTarget}
              style={{ maxHeight: `${cardMaxHeight}px` }}
              onInitiateJam={() => confirmThreat(liveTarget.id)}
              onMarkFriendly={() => {
                reclassifyTarget(liveTarget.id, "FRIENDLY");
                reclassifyTargetInStore(liveTarget.id, "FRIENDLY");
              }}
              onEngage={() => handleEngageTarget(liveTarget)}
              engagePending={engagePending}
              engageError={engageError}
              onDismissEngageError={() => setEngageError(null)}
              onReturnToBase={() => { }}
              onHoverHold={() => { }}
              onAbort={() => { }}
              onEmergencyLand={() => { }}
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

  // Asset popup — pinned: full RadarOverlayCard with dynamic positioning
  if (isPinned) {
    const asset = data as Asset;
    const deviceStatus = useDeviceStatusStore.getState().getDeviceStatus(asset.id);

    const CARD_W = 316;
    const CARD_GAP = 16;
    const MIN_CARD_H = 280;

    const placeRight = screenPosition.x + CARD_GAP + CARD_W < window.innerWidth - 8;
    const cardLeft = placeRight
      ? screenPosition.x + CARD_GAP
      : screenPosition.x - CARD_GAP - CARD_W;
    const cardTop = Math.max(
      8,
      Math.min(screenPosition.y - 40, window.innerHeight - MIN_CARD_H - 8),
    );
    const cardMaxHeight = window.innerHeight - cardTop - 8;
    const lineEndX = placeRight ? cardLeft : cardLeft + CARD_W;
    const lineEndY = cardTop + 24;

    return (
      <>
        {/* ① Full-viewport SVG — dashed connector line */}
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
          <circle cx={lineEndX} cy={lineEndY} r="3" fill="#EEFF30" />
        </svg>

        {/* ② Card */}
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
          {/* <button
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
              fontSize: "19px",
              lineHeight: 1,
              cursor: "pointer",
              padding: "2px 4px",
            }}
            aria-label="Close"
          >
            ×
          </button> */}
          <RadarOverlayCard
            asset={asset}
            deviceStatus={deviceStatus}
            style={{ maxHeight: `${cardMaxHeight}px` }}
          />
        </div>
      </>
    );
  }

  // Asset popup — hover (not pinned): small tooltip
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: screenPosition.x + offsetX, top: screenPosition.y + offsetY }}
    >
      <div style={HOVER_TOOLTIP_SHELL}>
        <AssetPopupContent data={data as Asset} isPinned={false} />
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

  const headerRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    paddingBottom: "8px",
    marginBottom: "6px",
    borderBottom: `1px solid ${COLOR.borderMedium}`,
  };

  const titleStyle: CSSProperties = {
    color: COLOR.missionsBodyText,
    fontSize: FONT.sizeMd,
    lineHeight: "21px",
    fontWeight: FONT.weightBold,
    fontFamily: `${FONT.mono}, monospace`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };

  const badgeBase: CSSProperties = {
    fontSize: FONT.sizeXs,
    lineHeight: "15px",
    fontFamily: `${FONT.mono}, monospace`,
    padding: "2px 6px",
    borderRadius: RADIUS.panel,
    flexShrink: 0,
  };

  const detailStack: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontFamily: `${FONT.mono}, monospace`,
  };

  const detailRowFont: CSSProperties = {
    fontSize: FONT.sizeXs,
    lineHeight: "15px",
  };

  const detailRow: CSSProperties = { ...rowStyle, ...detailRowFont };

  return (
    <div>
      <div style={headerRow}>
        <span style={titleStyle}>{data.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {attackMode && (
            <span
              style={{
                ...badgeBase,
                color: attackMode.jamActive ? COLOR.statusDanger : COLOR.missionsSecondaryText,
                background: attackMode.jamActive
                  ? "rgba(239, 68, 68, 0.18)"
                  : COLOR.missionCreateFieldBg,
              }}
            >
              {attackMode.jamActive ? "Jam: ON" : "Idle"}
            </span>
          )}
          <span
            style={{
              ...badgeBase,
              color: assetStatusColor(data.status),
            }}
          >
            {data.status}
          </span>
        </div>
      </div>

      <div style={{ ...detailStack, ...detailRowFont }}>
        <div style={detailRow}>
          <span style={{ ...labelStyle, ...detailRowFont }}>ID</span>
          <span style={{ ...valueStyle, ...detailRowFont, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
            {data.id}
          </span>
        </div>
        <div style={detailRow}>
          <span style={{ ...labelStyle, ...detailRowFont }}>Area</span>
          <span style={{ ...valueStyle, ...detailRowFont }}>{data.area}</span>
        </div>
        <div style={detailRow}>
          <span style={{ ...labelStyle, ...detailRowFont }}>Altitude</span>
          <span style={{ ...valueStyle, ...detailRowFont }}>{data.altitude} FT</span>
        </div>
        <div style={detailRow}>
          <span style={{ ...labelStyle, ...detailRowFont }}>Coverage</span>
          <span style={{ ...valueStyle, ...detailRowFont }}>{data.coverageRadiusKm} KM</span>
        </div>
        {deviceStatus && (
          <>
            <div style={detailRow}>
              <span style={{ ...labelStyle, ...detailRowFont }}>Last seen</span>
              <span style={{ ...valueStyle, ...detailRowFont, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formatLastSeen(deviceStatus.last_seen)}
              </span>
            </div>
            {deviceStatus.op_status != null && (
              <div style={detailRow}>
                <span style={{ ...labelStyle, ...detailRowFont }}>Op status</span>
                <span style={{ ...valueStyle, ...detailRowFont }}>{String(deviceStatus.op_status)}</span>
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
    classLabel === "ENEMY" ? COLOR.droneEnemy : COLOR.droneFriendly;

  const mono: CSSProperties = { fontFamily: `${FONT.mono}, monospace` };

  return (
    <div style={{ ...HOVER_TOOLTIP_SHELL, display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          paddingBottom: "8px",
          borderBottom: `1px solid ${COLOR.borderMedium}`,
        }}
      >
        <span
          style={{
            color: COLOR.missionsBodyText,
            fontSize: FONT.sizeMd,
            lineHeight: "21px",
            fontWeight: FONT.weightBold,
            ...mono,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            maxWidth: "160px",
          }}
        >
          {target.targetName ?? target.id}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {isStale && (
            <span
              style={{
                fontSize: FONT.sizeXs,
                lineHeight: "15px",
                ...mono,
                color: COLOR.missionsSecondaryText,
                background: COLOR.missionCreateFieldBg,
                padding: "2px 6px",
                borderRadius: RADIUS.panel,
                whiteSpace: "nowrap",
              }}
            >
              Stale
            </span>
          )}
          <span style={{ fontSize: FONT.sizeXs, lineHeight: "15px", ...mono, color: classColor }}>
            {classLabel}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", ...mono }}>
        <div style={{ ...rowStyle, fontSize: FONT.sizeXs, lineHeight: "15px" }}>
          <span style={{ ...labelStyle, fontSize: FONT.sizeXs }}>Distance</span>
          <span style={{ ...valueStyle, fontSize: FONT.sizeXs }}>{target.distanceKm.toFixed(1)} km</span>
        </div>
        <div style={{ ...rowStyle, fontSize: FONT.sizeXs, lineHeight: "15px" }}>
          <span style={{ ...labelStyle, fontSize: FONT.sizeXs }}>Altitude</span>
          <span style={{ ...valueStyle, fontSize: FONT.sizeXs }}>{target.altitude} ft</span>
        </div>
        <div style={{ ...rowStyle, fontSize: FONT.sizeXs, lineHeight: "15px" }}>
          <span style={{ ...labelStyle, fontSize: FONT.sizeXs }}>Heading</span>
          <span style={{ ...valueStyle, fontSize: FONT.sizeXs }}>{target.heading}°</span>
        </div>
        <p
          style={{
            margin: 0,
            paddingTop: "4px",
            fontSize: FONT.sizeXs,
            lineHeight: "15px",
            color: COLOR.missionsSecondaryText,
            ...mono,
            opacity: 0.85,
          }}
        >
          Click to open full panel
        </p>
      </div>
    </div>
  );
}
