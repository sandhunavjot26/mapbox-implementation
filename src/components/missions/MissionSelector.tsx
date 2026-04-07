"use client";

/**
 * Mission selector — list missions, create new, load mission.
 * Overlay layout aligned with Figma Driif-UI (node 853:9691 / panel 853:9729).
 * Status tags are text-only (no icons) per product request.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMissionsList, useCreateMission } from "@/hooks/useMissions";
import { useMissionStore } from "@/stores/missionStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { COLOR, FONT, POSITION } from "@/styles/driifTokens";
import {
  CreateMissionForm,
  type MissionType,
} from "@/components/missions/CreateMissionForm";
import {
  formatMissionCreatedLine,
  formatMissionListCode,
  MISSION_TAG_PILL_BG,
  missionStatusTagLabel,
  missionStatusTagTextColor,
  resolveMissionCardStatus,
} from "@/utils/missionListUi";
import { ApiClientError } from "@/lib/api/client";
import { createZone } from "@/lib/api/zones";
import type { SavedFence } from "@/types/aeroshield";

export type MissionSelectorProps = {
  variant?: "sidebar" | "overlay";
  onClose?: () => void;
  className?: string;
  activeMissionId?: string | null;
  onMapDismissLockChange?: (locked: boolean) => void;
};

type MissionSelectorView = "list" | "create";

const COMMAND_UNITS = [
  "Northern Command",
  "Western Command",
  "Eastern Command",
];
const MISSION_TYPES: MissionType[] = ["Live Op", "Training Sim", "Maintenance"];
const DEFAULT_DATETIME = "17-03-2026,21:00";

export function MissionSelector({
  variant = "sidebar",
  onClose,
  className = "",
  activeMissionId = null,
  onMapDismissLockChange,
}: MissionSelectorProps) {
  const [view, setView] = useState<MissionSelectorView>("list");
  const [createDetailMode, setCreateDetailMode] = useState<"form" | "createFence">(
    "form",
  );
  const [search, setSearch] = useState("");
  const [createName, setCreateName] = useState("");
  const [commandUnit, setCommandUnit] = useState(COMMAND_UNITS[0]);
  const [missionType, setMissionType] = useState<MissionType>("Live Op");
  const [startAt, setStartAt] = useState(DEFAULT_DATETIME);
  const [endAt, setEndAt] = useState(DEFAULT_DATETIME);
  const [fenceSearch, setFenceSearch] = useState("");
  const [fenceItems, setFenceItems] = useState<SavedFence[]>([]);
  const [createError, setCreateError] = useState("");

  const {
    data: missions,
    isLoading,
    error,
  } = useMissionsList(search || undefined);
  const createMutation = useCreateMission();
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  const clearTargets = useTargetsStore((s) => s.clearTargets);

  const handleLoad = (missionId: string) => {
    clearTargets();
    setActiveMission(missionId);
    onClose?.();
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCommandUnit(COMMAND_UNITS[0]);
    setMissionType("Live Op");
    setStartAt(DEFAULT_DATETIME);
    setEndAt(DEFAULT_DATETIME);
    setFenceSearch("");
    setFenceItems([]);
    setCreateError("");
  };

  const showCreateView = () => {
    resetCreateForm();
    setCreateDetailMode("form");
    setView("create");
  };

  const showListView = () => {
    setCreateError("");
    setCreateDetailMode("form");
    setView("list");
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Mission name is required.");
      return;
    }

    const borderGeojson =
      fenceItems.length > 0
        ? fenceItems[0].geometry.geometry
        : null;

    try {
      const m = await createMutation.mutateAsync({
        name,
        aop: null,
        border_geojson: borderGeojson,
      });

      // Bulk-POST all drawn fences as zones under the newly created mission.
      // Uses Promise.allSettled so one failure doesn't block the rest.
      if (fenceItems.length > 0) {
        await Promise.allSettled(
          fenceItems.map((fence) =>
            createZone(m.id, {
              label: fence.name,
              priority: 1,
              zone_geojson: fence.geometry.geometry,
              action_plan: {
                altitude_ceiling: fence.altitude,
                draw_mode: fence.mode,
              },
            }),
          ),
        );
      }

      resetCreateForm();
      setView("list");
      handleLoad(m.id);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setCreateError(err.message || "Could not create mission.");
      } else {
        setCreateError("Could not create mission.");
      }
    }
  };

  const panelWidth =
    variant === "overlay"
      ? view === "create"
        ? createDetailMode === "createFence"
          ? POSITION.createFenceWorkspaceWidth
          : POSITION.createMissionWidth
        : POSITION.missionsWidth
      : undefined;

  const rootClass =
    variant === "overlay"
      ? `flex flex-col max-h-[min(70vh,calc(100vh-120px))] ${
          view === "create" && createDetailMode === "createFence"
            ? "overflow-visible"
            : "overflow-hidden"
        } rounded-[2px] ${className}`
      : `flex flex-col h-full w-80 overflow-hidden rounded-[2px] ${className}`;

  const panelStyle = {
    background:
      view === "create" && createDetailMode === "createFence"
        ? "transparent"
        : COLOR.missionsPanelBg,
    width: panelWidth,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  const filteredFenceItems = fenceItems.filter((item) =>
    item.name.toLowerCase().includes(fenceSearch.trim().toLowerCase()),
  );

  useEffect(() => {
    const locked = view === "create" && createDetailMode === "createFence";
    onMapDismissLockChange?.(locked);

    return () => {
      onMapDismissLockChange?.(false);
    };
  }, [view, createDetailMode, onMapDismissLockChange]);

  return (
    <div className={rootClass} style={panelStyle}>
      {view === "list" ? (
        <>
          <div
            className="flex shrink-0 flex-col gap-[14px] px-4 py-3"
            style={panelStyle}
          >
            <h2
              className="text-[18px] font-medium leading-[26px]"
              style={{ color: COLOR.missionsTitleMuted }}
            >
              Missions
            </h2>

            <div className="flex gap-1 items-stretch">
              <label
                className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[2px] border border-solid px-3 h-8"
                style={{
                  background: COLOR.missionsSearchBg,
                  borderColor: COLOR.missionsSearchBorder,
                }}
              >
                <span className="sr-only">Search missions</span>
                <input
                  type="text"
                  placeholder="Search Mission...."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[14px] leading-5 outline-none placeholder:text-[#8A8A8A]"
                  style={{
                    color: COLOR.missionsBodyText,
                    fontFamily: `${FONT.family}, sans-serif`,
                  }}
                />
                <Image
                  src="/icons/search.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 opacity-70"
                />
              </label>
              <button
                type="button"
                onClick={showCreateView}
                className="shrink-0 rounded-[2px] px-3 text-[14px] leading-5 whitespace-nowrap h-8 flex items-center justify-center"
                style={{
                  background: COLOR.missionsCreateBtnBg,
                  color: COLOR.missionsCreateBtnText,
                  fontFamily: `${FONT.family}, sans-serif`,
                }}
              >
                Create Mission
              </button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-[10px]"
            style={panelStyle}
          >
            {error && (
              <p className="text-[12px] text-red-400 px-1">
                Failed to load missions
              </p>
            )}
            {isLoading && (
              <p
                className="text-[12px] px-1"
                style={{ color: COLOR.missionsSecondaryText }}
              >
                Loading...
              </p>
            )}
            {missions?.map((m) => {
              const kind = resolveMissionCardStatus(m);
              const tagColor = missionStatusTagTextColor(kind);
              const createdLine = formatMissionCreatedLine(m.created_at);
              const selected = activeMissionId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleLoad(m.id)}
                  className="w-full text-left rounded-[2px] p-3 transition-colors"
                  style={{
                    background: COLOR.missionsCardBg,
                    boxShadow: selected
                      ? "inset 0 0 0 1px rgba(198, 230, 0, 0.45)"
                      : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-col gap-1">
                      <p
                        className="text-[14px] leading-5 line-clamp-2"
                        style={{ color: COLOR.missionsBodyText }}
                      >
                        {m.name}
                      </p>
                      <p
                        className="text-[12px] leading-4 opacity-60"
                        style={{ color: COLOR.missionsTitleMuted }}
                      >
                        {formatMissionListCode(m.id)}
                      </p>
                      {createdLine && (
                        <p
                          className="text-[12px] leading-4 opacity-60"
                          style={{ color: COLOR.missionsTitleMuted }}
                        >
                          {createdLine}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-[2px] px-2 py-1 text-[12px] leading-4 whitespace-nowrap"
                      style={{
                        background: MISSION_TAG_PILL_BG,
                        color: tagColor,
                        fontFamily: `${FONT.family}, sans-serif`,
                      }}
                    >
                      {missionStatusTagLabel(kind)}
                    </span>
                  </div>
                </button>
              );
            })}
            {missions?.length === 0 && !isLoading && (
              <p
                className="text-[12px] px-1"
                style={{ color: COLOR.missionsSecondaryText }}
              >
                No missions. Create one to start.
              </p>
            )}
          </div>
        </>
      ) : (
        <CreateMissionForm
          name={createName}
          commandUnit={commandUnit}
          missionType={missionType}
          startAt={startAt}
          endAt={endAt}
          fenceSearch={fenceSearch}
          createError={createError}
          isSubmitting={createMutation.isPending}
          commandUnits={COMMAND_UNITS}
          missionTypes={MISSION_TYPES}
          fenceItems={filteredFenceItems}
          allFenceItems={fenceItems}
          onBack={showListView}
          onNameChange={(value) => {
            setCreateName(value);
            setCreateError("");
          }}
          onCommandUnitChange={setCommandUnit}
          onMissionTypeChange={setMissionType}
          onStartAtChange={setStartAt}
          onEndAtChange={setEndAt}
          onFenceSearchChange={setFenceSearch}
          onFenceItemsChange={setFenceItems}
          onSubmit={handleCreate}
          onModeChange={setCreateDetailMode}
        />
      )}
    </div>
  );
}
