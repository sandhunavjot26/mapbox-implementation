"use client";

/**
 * MissionDetailOverlay — HUD that replaces the right-rail MissionWorkspace.
 * Shown inside the left missions overlay when a mission is selected.
 *
 * Figma:
 *   Info     → node 2308:22935
 *   Timeline → node 2308:22770
 *   Assets   → node 2308:22908
 *   Detections — reuses existing MissionDetectionsList (no separate Figma node)
 */

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MissionLoad, MissionOverlapsResult } from "@/types/aeroshield";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { useAuthStore } from "@/stores/authStore";
import {
  useMissionOverlaps,
  useActivateMission,
  useStopMission,
} from "@/hooks/useMissions";
import { useToast } from "@/components/alerts/useToast";
import { formatCommandError } from "@/lib/formatCommandError";
import { MissionDetectionsList } from "@/components/detections/MissionDetectionsList";
import { MissionDevicesTab } from "@/components/missions/MissionDevicesTab";
import { MissionHudTimelineTab } from "@/components/missions/MissionHudTimelineTab";
import { CoverageWarningModal } from "@/components/missions/CoverageWarningModal";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

type HudTab = "info" | "timeline" | "assets" | "detections";

const STALE_MS = 30_000;
const EMPTY_OVERLAP_COUNTS = { CRITICAL: 0, HIGH: 0, LOW: 0 };

function missionIsRunning(status: string | null | undefined): boolean {
  const u = (status ?? "").toUpperCase();
  return u === "ACTIVE" || u === "LIVE_OPS";
}

function statusChipSurface(
  status: string | null | undefined,
): { background: string; color: string } {
  const s = (status ?? "DRAFT").toUpperCase();
  if (s === "ACTIVE" || s === "LIVE_OPS") {
    return {
      background: COLOR.missionHudStatusActiveBg,
      color: COLOR.missionHudStatusActiveText,
    };
  }
  if (s === "STOPPED" || s === "COMPLETED") {
    return { background: "rgba(100,116,139,0.22)", color: "#cbd5e1" };
  }
  return { background: "rgba(245,158,11,0.14)", color: "#fcd34d" };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const date = d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
    const time = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date},${time}`;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: `${FONT.family}, sans-serif`,
        fontSize: FONT.sizeSm,
        lineHeight: "16px",
        fontWeight: active ? FONT.weightMedium : FONT.weightNormal,
        color: active ? "#FFFFFF" : COLOR.missionHudTabInactiveText,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        alignItems: "flex-start",
        justifyContent: "center",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span>{label}</span>
      {active && (
        <div
          style={{
            height: "1px",
            width: "100%",
            background: COLOR.missionHudTabActiveBorder,
          }}
        />
      )}
    </button>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between w-full shrink-0"
      style={{
        fontSize: FONT.sizeSm,
        lineHeight: "16px",
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <span style={{ color: COLOR.missionHudSectionLabel }}>{label}</span>
      <span style={{ color: "#FFFFFF", textAlign: "right", marginLeft: "8px", minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface MissionDetailOverlayProps {
  cachedMission: MissionLoad | null | undefined;
  /** Clear active mission and return to the global map. */
  onDeselect: () => void;
  /** Go back to the mission list without clearing the active mission. */
  onBackToList: () => void;
}

export function MissionDetailOverlay({
  cachedMission,
  onDeselect,
  onBackToList,
}: MissionDetailOverlayProps) {
  const [tab, setTab] = useState<HudTab>("info");
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [coverageModalBlocks, setCoverageModalBlocks] = useState(false);
  const [coverageModalPayload, setCoverageModalPayload] =
    useState<MissionOverlapsResult | null>(null);
  const criticalToastRef = useRef<string | null>(null);

  const missionId = cachedMission?.id;
  const missionName = (cachedMission?.name ?? "Mission").trim() || "Mission";
  const isRunning = missionIsRunning(cachedMission?.status);

  const toast = useToast();
  const canUpdateMission = useAuthStore((s) => s.hasPermission("mission:update"));

  const events = useMissionEventsStore((s) => s.events);
  const targets = useTargetsStore((s) => s.targets);

  const { data: overlapsData, refetch: refetchOverlaps } = useMissionOverlaps(
    missionId,
    !!missionId,
  );
  const activateMut = useActivateMission();
  const stopMut = useStopMission();

  const missionEvents = useMemo(
    () =>
      missionId ? events.filter((e) => e.mission_id === missionId) : events,
    [events, missionId],
  );

  const now = Date.now();
  const activeTracks = useMemo(
    () =>
      targets.filter((t) => {
        if (t.lost) return false;
        const last = t.lastSeenAt ?? now;
        return now - last <= STALE_MS;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets],
  );

  const deviceList = cachedMission?.devices ?? [];
  const assetCount = deviceList.length;
  const detectionsCount = activeTracks.length;
  const timelineCount = missionEvents.length;

  const overlapCounts = overlapsData?.counts ?? EMPTY_OVERLAP_COUNTS;
  const overlapTotal =
    overlapCounts.CRITICAL + overlapCounts.HIGH + overlapCounts.LOW;

  const openCoverageDetails = useCallback(
    (opts: { blockActivate: boolean; data?: MissionOverlapsResult | null }) => {
      setCoverageModalPayload(opts.data ?? overlapsData ?? null);
      setCoverageModalBlocks(opts.blockActivate);
      setCoverageModalOpen(true);
    },
    [overlapsData],
  );

  const handleActivate = useCallback(async () => {
    if (!missionId) return;
    try {
      const refetchResult = await refetchOverlaps();
      if (!refetchResult.error) {
        const crit = refetchResult.data?.counts?.CRITICAL ?? 0;
        if (crit > 0) {
          toast.warning(
            `${crit} critical jammer overlap${crit > 1 ? "s" : ""} — review Coverage. Activating anyway.`,
          );
        }
      }
      await activateMut.mutateAsync(missionId);
      toast.success(`Mission "${missionName}" is now ACTIVE`);
    } catch (e) {
      toast.error(formatCommandError(e));
    }
  }, [missionId, missionName, refetchOverlaps, activateMut, toast]);

  const handleStop = useCallback(async () => {
    if (!missionId) return;
    try {
      await stopMut.mutateAsync(missionId);
      toast.info(`Mission "${missionName}" stopped`);
    } catch (e) {
      toast.error(formatCommandError(e));
    }
  }, [missionId, missionName, stopMut, toast]);

  // Suppress the unused-variable lint warning for criticalToastRef usage
  void criticalToastRef;

  const statusText =
    cachedMission?.status
      ? cachedMission.status.charAt(0).toUpperCase() +
        cachedMission.status.slice(1).toLowerCase()
      : "Draft";

  return (
    <>
      <CoverageWarningModal
        open={coverageModalOpen}
        title={
          coverageModalBlocks
            ? "Cannot activate — critical overlaps"
            : "Coverage overlaps"
        }
        subtitle={
          coverageModalBlocks
            ? undefined
            : "Jammer and coverage overlap warnings for this mission."
        }
        counts={
          coverageModalPayload?.counts ??
          overlapsData?.counts ??
          EMPTY_OVERLAP_COUNTS
        }
        warnings={
          coverageModalPayload?.warnings ?? overlapsData?.warnings ?? []
        }
        blockActivate={coverageModalBlocks}
        onClose={() => setCoverageModalOpen(false)}
      />

      {/* HUD card — matches Figma outer card (bg #1A1A1A, border rgba(255,255,255,0.2), radius 4px) */}
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          background: COLOR.missionHudPanelBg,
          border: `1px solid ${COLOR.missionHudBorder}`,
          borderRadius: "4px",
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        {/* ── Header (name + status + aop + back) ── */}
        <div
          className="flex flex-col gap-1 shrink-0"
          style={{ padding: "12px 16px 0" }}
        >
          <div
            className="flex items-start min-w-0"
            style={{ gap: SPACING.missionWorkspaceHeaderGap }}
          >
            {/* Same back control as Create Mission (MissionWorkspaceHeader) */}
            <button
              type="button"
              onClick={onBackToList}
              className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-85"
              style={{
                width: SPACING.missionWorkspaceBackHitSize,
                height: SPACING.missionWorkspaceBackHitSize,
                marginTop: "2px",
              }}
              aria-label="Back to missions list"
            >
              <Image
                src="/icons/back-icon.svg"
                alt=""
                width={8}
                height={8}
              />
            </button>

            <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  style={{
                    fontSize: "19px",
                    lineHeight: "26px",
                    fontWeight: FONT.weightMedium,
                    color: "#FFFFFF",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {missionName}
                </span>
                <span
                  style={{
                    ...statusChipSurface(cachedMission?.status),
                    borderRadius: "2px",
                    padding: "4px 6px",
                    fontSize: FONT.sizeXs,
                    lineHeight: "12px",
                    fontWeight: FONT.weightNormal,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {statusText}
                </span>
              </div>
              <span
                style={{
                  fontSize: FONT.sizeSm,
                  lineHeight: "16px",
                  color: "#A3A3A3",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cachedMission?.aop || "—"}
              </span>
            </div>

            <button
              type="button"
              onClick={onDeselect}
              style={{
                background: COLOR.missionHudEditBtnBg,
                border: `1px solid ${COLOR.missionHudEditBtnBorder}`,
                borderRadius: RADIUS.panel,
                padding: "4px 8px",
                fontSize: FONT.sizeXs,
                lineHeight: "16px",
                color: COLOR.missionHudEditBtnText,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                marginTop: "2px",
                fontFamily: `${FONT.family}, sans-serif`,
                fontWeight: FONT.weightMedium,
              }}
            >
              Deselect
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div
          className="flex gap-4 items-start shrink-0"
          style={{ padding: "12px 16px 0" }}
        >
          <TabButton
            label="Info"
            active={tab === "info"}
            onClick={() => setTab("info")}
          />
          <TabButton
            label={timelineCount > 0 ? `Timeline (${timelineCount})` : "Timeline"}
            active={tab === "timeline"}
            onClick={() => setTab("timeline")}
          />
          <TabButton
            label={
              assetCount > 0
                ? `Assets (${String(assetCount).padStart(2, "0")})`
                : "Assets"
            }
            active={tab === "assets"}
            onClick={() => setTab("assets")}
          />
          <TabButton
            label={
              detectionsCount > 0
                ? `Detections (${detectionsCount})`
                : "Detections"
            }
            active={tab === "detections"}
            onClick={() => setTab("detections")}
          />
        </div>

        {/* ── Tab content (scrollable) ── */}
        <div
          className="driif-mission-scrollbar flex-1 min-h-0 overflow-y-auto"
          style={{
            paddingTop: SPACING.missionWorkspacePadX,
            paddingBottom: SPACING.missionWorkspacePadY,
            paddingRight: SPACING.missionWorkspacePadX,
            paddingLeft:
              tab === "timeline"
                ? SPACING.missionWorkspaceHeaderGap
                : SPACING.missionWorkspacePadX,
          }}
        >
          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <div className="flex flex-col gap-6">
              {/* Overview */}
              <div className="flex flex-col gap-3">
                <span
                  style={{
                    fontSize: FONT.sizeXs,
                    lineHeight: "12px",
                    color: COLOR.missionHudSectionLabel,
                  }}
                >
                  Overview
                </span>
                <div
                  style={{
                    background: COLOR.missionHudCardBg,
                    borderRadius: RADIUS.panel,
                    padding: "12px",
                  }}
                >
                  <div className="flex flex-col gap-3">
                    <OverviewRow label="Command Unit" value="—" />
                    <OverviewRow label="Mission Type" value="—" />
                    <OverviewRow
                      label="AOP"
                      value={cachedMission?.aop || "—"}
                    />
                    <OverviewRow
                      label="Created on"
                      value={formatDate(cachedMission?.created_at)}
                    />
                    <OverviewRow
                      label="Start Date & Time"
                      value={formatDateTime(cachedMission?.activated_at)}
                    />
                    <OverviewRow
                      label="End Date & Time"
                      value={formatDateTime(cachedMission?.stopped_at)}
                    />
                  </div>
                </div>
              </div>

              {/* Fences (zones) */}
              {(cachedMission?.zones?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-3">
                  <span
                    style={{
                      fontSize: FONT.sizeXs,
                      lineHeight: "12px",
                      color: COLOR.missionHudSectionLabel,
                    }}
                  >
                    Fences
                  </span>
                  <div className="flex flex-col gap-1">
                    {cachedMission!.zones.map((zone) => (
                      <div
                        key={zone.id}
                        style={{
                          background: COLOR.missionHudCardBg,
                          borderRadius: "2px",
                          padding: "9px 15px",
                          fontSize: FONT.sizeSm,
                          lineHeight: "16px",
                          color: COLOR.missionHudValueText,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {zone.label || `Zone …${zone.id.slice(-6)}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coverage overlap warning */}
              {overlapTotal > 0 && (
                <button
                  type="button"
                  className="w-full text-left rounded-[2px] border border-dashed px-3 py-2 transition-opacity hover:opacity-90"
                  style={{
                    borderColor: COLOR.missionCreateSummaryModalBorder,
                    color: COLOR.missionsSecondaryText,
                    background: COLOR.missionCreateSectionBg,
                  }}
                  onClick={() =>
                    openCoverageDetails({ blockActivate: false, data: null })
                  }
                >
                  <span
                    style={{
                      fontWeight: FONT.weightMedium,
                      color: COLOR.missionsBodyText,
                      fontSize: FONT.sizeXs,
                    }}
                  >
                    Coverage
                  </span>
                  <span
                    className="ml-1 font-mono"
                    style={{ fontSize: FONT.sizeXs }}
                  >
                    {overlapCounts.CRITICAL} critical · {overlapCounts.HIGH}{" "}
                    high · {overlapCounts.LOW} low
                  </span>
                </button>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {canUpdateMission && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleActivate()}
                      disabled={isRunning || activateMut.isPending}
                      className="flex-1 rounded-[2px] border border-solid px-2 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
                      style={{
                        borderColor: "rgba(16,185,129,0.45)",
                        background: "rgba(16,185,129,0.2)",
                        color: "#a7f3d0",
                        fontFamily: `${FONT.family}, sans-serif`,
                      }}
                    >
                      {activateMut.isPending ? "Activating…" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStop()}
                      disabled={!isRunning || stopMut.isPending}
                      className="flex-1 rounded-[2px] border border-solid px-2 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
                      style={{
                        borderColor: COLOR.missionCreateSummaryModalBorder,
                        background: COLOR.missionCreateFieldBg,
                        color: COLOR.missionCreateFieldText,
                        fontFamily: `${FONT.family}, sans-serif`,
                      }}
                    >
                      {stopMut.isPending ? "Stopping…" : "Stop"}
                    </button>
                  </div>
                )}

                {/* Edit Mission */}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-[2px] border border-solid px-2 py-1.5 transition-opacity hover:opacity-90"
                  style={{
                    background: COLOR.missionHudEditBtnBg,
                    borderColor: COLOR.missionHudEditBtnBorder,
                    color: COLOR.missionHudEditBtnText,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                    fontWeight: FONT.weightMedium,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  {/* Pencil icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L5.333 13.333l-3.333.667.667-3.333L11.333 2z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit Mission
                </button>
              </div>
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {tab === "timeline" && <MissionHudTimelineTab />}

          {/* ── ASSETS TAB ── */}
          {tab === "assets" && (
            <MissionDevicesTab devices={deviceList} missionId={missionId} />
          )}

          {/* ── DETECTIONS TAB ── */}
          {tab === "detections" && (
            <MissionDetectionsList devices={deviceList} compact />
          )}
        </div>
      </div>
    </>
  );
}
