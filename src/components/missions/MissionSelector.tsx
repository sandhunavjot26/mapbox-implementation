"use client";

/**
 * Mission selector — list missions, create new, load mission.
 * Overlay layout aligned with Figma Driif-UI (node 853:9691 / panel 853:9729).
 * Status tags are text-only (no icons) per product request.
 */

import Image from "next/image";
import { useState } from "react";
import { useMissionsList, useCreateMission } from "@/hooks/useMissions";
import { useMissionStore } from "@/stores/missionStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { COLOR, FONT, POSITION } from "@/styles/driifTokens";
import {
  formatMissionCreatedLine,
  formatMissionListCode,
  MISSION_TAG_PILL_BG,
  missionStatusTagLabel,
  missionStatusTagTextColor,
  resolveMissionCardStatus,
} from "@/utils/missionListUi";

export type MissionSelectorProps = {
  variant?: "sidebar" | "overlay";
  onClose?: () => void;
  className?: string;
  activeMissionId?: string | null;
};

export function MissionSelector({
  variant = "sidebar",
  onClose,
  className = "",
  activeMissionId = null,
}: MissionSelectorProps) {
  const [search, setSearch] = useState("");
  const [createName, setCreateName] = useState("");
  const [createAop, setCreateAop] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: missions, isLoading, error } = useMissionsList(search || undefined);
  const createMutation = useCreateMission();
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  const clearTargets = useTargetsStore((s) => s.clearTargets);

  const handleLoad = (missionId: string) => {
    clearTargets();
    setActiveMission(missionId);
    onClose?.();
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const m = await createMutation.mutateAsync({
        name: createName.trim(),
        aop: createAop.trim() || null,
      });
      setCreateName("");
      setCreateAop("");
      setIsCreating(false);
      handleLoad(m.id);
    } catch {
      // error shown by mutation
    }
  };

  const overlayWidth =
    variant === "overlay" ? { width: POSITION.missionsWidth } : undefined;

  const rootClass =
    variant === "overlay"
      ? `flex flex-col max-h-[min(70vh,calc(100vh-120px))] overflow-hidden rounded-[2px] ${className}`
      : `flex flex-col h-full w-80 overflow-hidden rounded-[2px] ${className}`;

  const fieldClass =
    "w-full rounded-[2px] border px-3 py-2 text-[14px] leading-5 outline-none transition-colors";
  const fieldStyle = {
    background: COLOR.missionsSearchBg,
    borderColor: COLOR.missionsSearchBorder,
    color: COLOR.missionsBodyText,
    fontFamily: `${FONT.family}, sans-serif`,
  };

  return (
    <div className={rootClass} style={{ background: COLOR.missionsPanelBg, ...overlayWidth }}>
      <div
        className="flex shrink-0 flex-col gap-[14px] px-4 py-3"
        style={{ fontFamily: `${FONT.family}, sans-serif` }}
      >
        <h2
          className="text-[18px] font-medium leading-[26px]"
          style={{ color: COLOR.missionsTitleMuted }}
        >
          Missions
        </h2>

        <div className="flex flex-col gap-3">
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
              onClick={() => setIsCreating(!isCreating)}
              className="shrink-0 rounded-[2px] px-3 text-[14px] leading-5 whitespace-nowrap h-8 flex items-center justify-center"
              style={{
                background: COLOR.missionsCreateBtnBg,
                color: COLOR.missionsCreateBtnText,
                fontFamily: `${FONT.family}, sans-serif`,
              }}
            >
              {isCreating ? "Cancel" : "Create Mission"}
            </button>
          </div>

          {isCreating && (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Mission name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
              <input
                type="text"
                placeholder="AOP (optional)"
                value={createAop}
                onChange={(e) => setCreateAop(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
              {createMutation.isError && (
                <p className="text-[12px] text-red-400">Could not create mission.</p>
              )}
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending || !createName.trim()}
                className="rounded-[2px] py-2 text-[14px] leading-5 disabled:opacity-50"
                style={{
                  background: COLOR.missionsCreateBtnBg,
                  color: COLOR.missionsCreateBtnText,
                  fontFamily: `${FONT.family}, sans-serif`,
                }}
              >
                {createMutation.isPending ? "Creating..." : "Create & Load"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-[10px]"
        style={{ fontFamily: `${FONT.family}, sans-serif` }}
      >
        {error && (
          <p className="text-[12px] text-red-400 px-1">Failed to load missions</p>
        )}
        {isLoading && (
          <p className="text-[12px] px-1" style={{ color: COLOR.missionsSecondaryText }}>
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
                boxShadow: selected ? "inset 0 0 0 1px rgba(198, 230, 0, 0.45)" : undefined,
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
          <p className="text-[12px] px-1" style={{ color: COLOR.missionsSecondaryText }}>
            No missions. Create one to start.
          </p>
        )}
      </div>
    </div>
  );
}
