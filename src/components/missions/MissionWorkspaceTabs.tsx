"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MissionLoad, MissionOverlapsResult } from "@/types/aeroshield";
import { MissionDetectionsList } from "@/components/detections/MissionDetectionsList";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EngagementLog } from "@/components/panels/EngagementLog";
import { MissionTimeline } from "@/components/panels/MissionTimeline";
import { MissionDevicesTab } from "@/components/missions/MissionDevicesTab";
import { CommandsTab } from "@/components/commands/CommandsTab";
import { CoverageWarningModal } from "@/components/missions/CoverageWarningModal";
import {
  useMissionOverlaps,
  useActivateMission,
  useStopMission,
} from "@/hooks/useMissions";
import { useToast } from "@/components/alerts/useToast";
import { formatCommandError } from "@/lib/formatCommandError";
import { useAuthStore } from "@/stores/authStore";
import {
  MISSION_WORKSPACE_TAB_LABELS,
  MISSION_WORKSPACE_TAB_ORDER,
  MISSION_WORKSPACE_TAB_STORAGE_KEY,
  type MissionWorkspaceTabId,
} from "@/components/missions/missionWorkspaceTabIds";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

const PANEL_W = 510;
const STALE_MS = 30_000;
const FIVE_M_MS = 5 * 60_000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60_000;

function readInitialTab(): MissionWorkspaceTabId {
  if (typeof window === "undefined") return "timeline";
  const raw = localStorage.getItem(MISSION_WORKSPACE_TAB_STORAGE_KEY);
  if (raw && (MISSION_WORKSPACE_TAB_ORDER as string[]).includes(raw)) {
    return raw as MissionWorkspaceTabId;
  }
  return "timeline";
}

function parseTs(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

function missionIsRunning(status: string | null | undefined): boolean {
  const u = (status ?? "").toUpperCase();
  return u === "ACTIVE" || u === "LIVE_OPS";
}

function statusChipSurface(status: string | null | undefined) {
  const s = (status ?? "DRAFT").toUpperCase();
  if (s === "ACTIVE" || s === "LIVE_OPS") {
    return {
      background: "rgba(16, 185, 129, 0.18)",
      color: "#6ee7b7",
      border: "1px solid rgba(16, 185, 129, 0.4)",
    };
  }
  if (s === "STOPPED") {
    return {
      background: "rgba(100, 116, 139, 0.22)",
      color: "#cbd5e1",
      border: "1px solid rgba(148, 163, 184, 0.35)",
    };
  }
  return {
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fcd34d",
    border: "1px solid rgba(245, 158, 11, 0.35)",
  };
}

const EMPTY_OVERLAP_COUNTS = { CRITICAL: 0, HIGH: 0, LOW: 0 };

export function MissionWorkspaceTabs({
  missionName,
  cachedMission,
  onDeselect,
}: {
  missionName: string;
  cachedMission: MissionLoad | null | undefined;
  onDeselect: () => void;
}) {
  const [tab, setTab] = useState<MissionWorkspaceTabId>(readInitialTab);
  const missionId = cachedMission?.id;
  const toast = useToast();
  const canUpdateMission = useAuthStore((s) => s.hasPermission("mission:update"));
  const { data: overlapsData, refetch: refetchOverlaps } = useMissionOverlaps(
    missionId,
    !!missionId,
  );
  const activateMut = useActivateMission();
  const stopMut = useStopMission();
  const criticalOverlapToastMissionRef = useRef<string | null>(null);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [coverageModalBlocks, setCoverageModalBlocks] = useState(false);
  const [coverageModalPayload, setCoverageModalPayload] =
    useState<MissionOverlapsResult | null>(null);

  const events = useMissionEventsStore((s) => s.events);
  const targets = useTargetsStore((s) => s.targets);
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    criticalOverlapToastMissionRef.current = null;
  }, [missionId]);

  useEffect(() => {
    if (!missionId || !overlapsData) return;
    const n = overlapsData.counts?.CRITICAL ?? 0;
    if (n <= 0) return;
    if (criticalOverlapToastMissionRef.current === missionId) return;
    criticalOverlapToastMissionRef.current = missionId;
    toast.error(
      `${n} critical jammer overlap${n > 1 ? "s" : ""} — review Coverage before activating.`,
    );
  }, [missionId, overlapsData, toast]);

  const isRunning = missionIsRunning(cachedMission?.status);

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
      // Overlaps are advisory only (same as old-ui MissionWorkspacePage.activate —
      // it does not block on CRITICAL; load-time toast + Coverage panel warn).
      const refetchResult = await refetchOverlaps();
      if (refetchResult.error) {
        toast.warning(
          `Could not refresh coverage — ${formatCommandError(refetchResult.error)}. Activating anyway.`,
        );
      } else {
        const payload = refetchResult.data;
        const crit = payload?.counts?.CRITICAL ?? 0;
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

  const onTab = useCallback((id: MissionWorkspaceTabId) => {
    setTab(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(MISSION_WORKSPACE_TAB_STORAGE_KEY, tab);
  }, [tab]);

  const missionEvents = useMemo(
    () =>
      missionId
        ? events.filter((e) => e.mission_id === missionId)
        : events,
    [events, missionId],
  );

  const { kpis, tabDefs } = useMemo(() => {
    const now = Date.now();
    const active = targets.filter((t) => {
      if (t.lost) return false;
      const last = t.lastSeenAt ?? now;
      return now - last <= STALE_MS;
    });

    const devList = cachedMission?.devices ?? [];
    const totalDevices = devList.length;
    let online = 0;
    for (const d of devList) {
      const live = byDeviceId[d.id];
      const s = (live?.status ?? d.status ?? "").toUpperCase();
      if (s === "ONLINE" || s === "WORKING") online++;
    }

    const det5 = missionEvents.filter((e) => {
      const ev = (e.event_type || "").toUpperCase();
      if (ev !== "DETECTED" && ev !== "UAV_DETECTED") return false;
      const ts = parseTs(e.ts);
      if (!Number.isFinite(ts)) return false;
      return now - ts <= FIVE_M_MS;
    }).length;

    const det24 = missionEvents.filter((e) => {
      const ev = (e.event_type || "").toUpperCase();
      if (ev !== "DETECTED" && ev !== "UAV_DETECTED") return false;
      const ts = parseTs(e.ts);
      if (!Number.isFinite(ts)) return false;
      return now - ts <= TWENTY_FOUR_H_MS;
    }).length;

    const dWarn = devList.some((d) => {
      const live = byDeviceId[d.id];
      const s = (live?.status ?? d.status ?? "UNKNOWN").toUpperCase();
      return s !== "ONLINE" && s !== "WORKING";
    });
    const detWarn = active.some((t) => t.positionDerived);
    const overlapCrit = overlapsData?.counts?.CRITICAL ?? 0;

    return {
      activeNonStaleTracks: active,
      kpis: {
        online,
        totalDevices,
        activeTracks: active.length,
        detections5m: det5,
        detections24h: det24,
      },
      tabDefs: [
        { id: "timeline" as const, badge: missionEvents.length, warn: false as boolean },
        {
          id: "devices" as const,
          badge: devList.length,
          warn: dWarn || overlapCrit > 0,
        },
        {
          id: "detections" as const,
          badge: active.length,
          warn: detWarn,
        },
        { id: "commands" as const, badge: null as number | null, warn: false },
      ],
    };
  }, [
    tick,
    targets,
    cachedMission?.devices,
    missionEvents,
    byDeviceId,
    overlapsData?.counts?.CRITICAL,
  ]);

  const overlapCounts = overlapsData?.counts ?? EMPTY_OVERLAP_COUNTS;
  const overlapTotal =
    overlapCounts.CRITICAL + overlapCounts.HIGH + overlapCounts.LOW;
  const statusLabel = (cachedMission?.status ?? "DRAFT").toUpperCase();

  return (
    <div
      className="driif-mission-scrollbar flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-x-hidden overflow-y-hidden"
      style={{
        width: "100%",
        maxWidth: PANEL_W,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
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

      {/* Header card — mirrors old-ui sidebar top */}
      <div
        className="shrink-0"
        style={{
          borderRadius: RADIUS.fencePopover,
          border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
          background: COLOR.missionsPanelBg,
          padding: "12px",
        }}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={statusChipSurface(cachedMission?.status)}
                >
                  {statusLabel}
                </span>
                <div
                  className="min-w-0 truncate"
                  style={{
                    fontSize: FONT.missionWorkspaceTitleSize,
                    lineHeight: FONT.missionWorkspaceTitleLineHeight,
                    fontWeight: FONT.weightBold,
                    color: COLOR.missionsBodyText,
                  }}
                >
                  {missionName}
                </div>
              </div>
              <button
                type="button"
                onClick={onDeselect}
                className="shrink-0 rounded border border-solid px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-90"
                style={{
                  borderColor: COLOR.missionCreateSummaryModalBorder,
                  background: COLOR.missionCreateFieldBg,
                  color: COLOR.missionCreateFieldText,
                }}
                title="Clear mission selection and show the full map"
              >
                Deselect
              </button>
            </div>
            <div
              className="mt-1 truncate"
              style={{
                fontSize: FONT.sizeSm,
                color: COLOR.missionsSecondaryText,
              }}
            >
              {cachedMission?.aop || "—"}
            </div>
            {canUpdateMission ? (
              <div
                className="mt-2 flex flex-wrap items-center gap-2"
                style={{ gap: "8px" }}
              >
                <button
                  type="button"
                  onClick={() => void handleActivate()}
                  disabled={isRunning || activateMut.isPending}
                  className="min-w-0 flex-1 rounded border border-solid px-2 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
                  style={{
                    borderColor: "rgba(16, 185, 129, 0.45)",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#a7f3d0",
                  }}
                >
                  {activateMut.isPending ? "Activating…" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  disabled={!isRunning || stopMut.isPending}
                  className="min-w-0 flex-1 rounded border border-solid px-2 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
                  style={{
                    borderColor: COLOR.missionCreateSummaryModalBorder,
                    background: COLOR.missionCreateFieldBg,
                    color: COLOR.missionCreateFieldText,
                  }}
                >
                  {stopMut.isPending ? "Stopping…" : "Stop"}
                </button>
              </div>
            ) : null}
            {overlapTotal > 0 ? (
              <button
                type="button"
                className="mt-2 w-full rounded border border-dashed px-2 py-1.5 text-left text-[10px] transition-opacity hover:opacity-90"
                style={{
                  borderColor: COLOR.missionCreateSummaryModalBorder,
                  color: COLOR.missionsSecondaryText,
                  background: COLOR.missionCreateSectionBg,
                }}
                onClick={() =>
                  openCoverageDetails({ blockActivate: false, data: null })
                }
              >
                <span className="font-semibold" style={{ color: COLOR.missionsBodyText }}>
                  Coverage
                </span>
                <span className="ml-1 font-mono">
                  {overlapCounts.CRITICAL} critical · {overlapCounts.HIGH} high ·{" "}
                  {overlapCounts.LOW} low
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI strip — borders inside layout (no box-shadow) so first/last cells are not clipped */}
      <div
        className="grid shrink-0 grid-cols-4 gap-2 px-0.5 text-center"
        style={{ color: COLOR.missionsBodyText }}
      >
        {(
          [
            { key: "online", label: "Online", a: kpis.online, b: ` / ${kpis.totalDevices}`, aColor: "#4ade80" },
            {
              key: "tracks",
              label: "Active tracks",
              a: kpis.activeTracks,
              b: null,
              aColor: "#f87171",
            },
            { key: "5m", label: "5m", a: kpis.detections5m, b: null, aColor: "#fbbf24" },
            { key: "24h", label: "24h", a: kpis.detections24h, b: null, aColor: "#22d3ee" },
          ] as const
        ).map((k) => (
          <div
            key={k.key}
            className="flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2"
            style={{
              background: COLOR.missionsPanelBg,
              border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
            }}
          >
            <div
              className="text-[10px] uppercase leading-tight tracking-wider"
              style={{ color: COLOR.missionsSecondaryText }}
            >
              {k.label}
            </div>
            <div
              className="flex min-h-[32px] w-full min-w-0 items-center justify-center font-bold leading-none"
              style={{ fontSize: "18px" }}
            >
              <span
                className="tabular-nums"
                style={{ color: k.aColor }}
              >
                {k.a}
              </span>
              {k.b != null && (
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "13px",
                    fontWeight: FONT.weightNormal,
                    color: COLOR.missionsSecondaryText,
                  }}
                >
                  {k.b}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar — old-ui: equal flex, badge + optional warn */}
      <div
        className="flex min-w-0 items-center gap-0.5 self-stretch rounded-md p-1"
        style={{
          width: "100%",
          background: COLOR.missionsPanelBg,
          border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
        }}
        role="tablist"
        aria-label="Workspace"
      >
        {tabDefs.map((def) => {
          const id = def.id;
          const active = tab === id;
          const label = MISSION_WORKSPACE_TAB_LABELS[id];
          const warn = "warn" in def && def.warn;
          const rawBadge = def.badge;
          const showBadge =
            rawBadge != null && rawBadge !== 0;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              title={label}
              onClick={() => onTab(id)}
              className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-hidden rounded-md px-1.5 py-1.5 transition-colors"
              style={{
                fontSize: "11px",
                fontWeight: FONT.weightBold,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: active ? "#a5f3fc" : COLOR.missionsSecondaryText,
                background: active
                  ? COLOR.accentCyanBg
                  : "transparent",
                boxShadow: active
                  ? `0 0 0 1px ${COLOR.accentCyan}55`
                  : "none",
              }}
            >
              <span className="truncate">{label}</span>
              {showBadge && (
                <span
                  className="shrink-0 rounded px-1 py-0.5 text-[10px] leading-none"
                  style={
                    warn
                      ? { background: "rgba(245, 158, 11, 0.25)", color: "#fef3c7" }
                      : active
                        ? { background: "rgba(6, 182, 212, 0.2)", color: "#e0f2fe" }
                        : { background: COLOR.missionsCardBg, color: COLOR.missionsSecondaryText }
                  }
                >
                  {String(rawBadge)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content — single scroll area */}
      <div
        className="driif-mission-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md"
        style={{
          background: COLOR.missionsPanelBg,
          border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
        }}
        role="tabpanel"
      >
        {tab === "timeline" ? (
          <div
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden"
            style={{ padding: "8px 6px" }}
          >
            <ErrorBoundary label="Engagement log">
              <EngagementLog layout="workspace" />
            </ErrorBoundary>
            <ErrorBoundary label="Mission timeline">
              <MissionTimeline layout="workspace" />
            </ErrorBoundary>
          </div>
        ) : (
          <div
            className="driif-mission-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto"
            style={{ padding: SPACING.missionWorkspacePadX }}
          >
            {tab === "devices" && (
              <ErrorBoundary label="Devices">
                <MissionDevicesTab devices={cachedMission?.devices} />
              </ErrorBoundary>
            )}

            {tab === "detections" && (
              <ErrorBoundary label="Detections">
                <MissionDetectionsList
                  devices={cachedMission?.devices}
                  compact
                />
              </ErrorBoundary>
            )}

            {tab === "commands" && (
              <ErrorBoundary label="Commands">
                <CommandsTab />
              </ErrorBoundary>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
