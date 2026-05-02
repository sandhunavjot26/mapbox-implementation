"use client";

import { useMemo, useState } from "react";
import type { Device } from "@/types/aeroshield";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import {
  MissionWorkspaceHeader,
  MissionWorkspacePanel,
} from "@/components/missions/MissionWorkspaceShell";
import {
  deviceDisplayName,
  formatDeviceSubtitle,
} from "@/utils/deviceDisplay";
import { InlineLoadIndicator } from "@/components/ui/InlineLoadIndicator";

export type SelectAssetsWorkspaceProps = {
  devices: Device[];
  isLoading: boolean;
  error: Error | null;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBack: () => void;
};

export function SelectAssetsWorkspace({
  devices,
  isLoading,
  error,
  selectedIds,
  onSelectionChange,
  onBack,
}: SelectAssetsWorkspaceProps) {
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => {
      const blob = `${deviceDisplayName(d)} ${d.serial_number} ${d.id}`.toLowerCase();
      return blob.includes(q);
    });
  }, [devices, search]);

  const toggleId = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  };

  const fieldShellStyle = {
    background: COLOR.missionCreateFieldBg,
    borderColor: COLOR.missionCreateFieldBorder,
  } as const;

  const fieldTextStyle = {
    color: COLOR.missionCreateFieldText,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  const rowShellStyle = {
    background: COLOR.missionCreateFenceItemBg,
  } as const;

  return (
    <MissionWorkspacePanel>
      <MissionWorkspaceHeader title="Select Assets" onBack={onBack} />

      <label
        className="flex shrink-0 items-center overflow-hidden border px-3"
        style={{
          ...fieldShellStyle,
          minHeight: SPACING.iconRowHeight,
          borderRadius: RADIUS.panel,
          marginBottom: SPACING.missionCreateSearchFieldMarginBottom,
        }}
      >
        <span className="sr-only">Search assets</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Assets..."
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{
            ...fieldTextStyle,
            fontSize: FONT.sizeMd,
            lineHeight: "21px",
          }}
        />
      </label>

      <div className="driif-mission-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {error && (
          <p
            style={{
              color: COLOR.statusDanger,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "17px",
              paddingBottom: SPACING.missionCreateBlockGapMd,
            }}
          >
            Failed to load devices
          </p>
        )}
        {isLoading && (
          <InlineLoadIndicator
            label="Loading assets…"
            minHeight="min(180px, 32vh)"
            spinnerSize={28}
            className="py-4"
          />
        )}
        <ul
          className="m-0 flex list-none flex-col p-0"
          style={{ gap: SPACING.missionCreateBlockGapSm }}
        >
          {filtered.map((device) => {
            const checked = selectedSet.has(device.id);
            const online = device.status === "ONLINE" || device.status === "WORKING";
            return (
              <li key={device.id}>
                <label
                  className="flex cursor-pointer items-start border border-transparent"
                  style={{
                    ...rowShellStyle,
                    borderRadius: RADIUS.panel,
                    paddingLeft: SPACING.missionCreateListItemPadX,
                    paddingRight: SPACING.missionCreateListItemPadX,
                    paddingTop: SPACING.missionCreateListItemPadY,
                    paddingBottom: SPACING.missionCreateListItemPadY,
                    gap: SPACING.missionCreateBlockGapMd,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(device.id)}
                    className="shrink-0"
                    style={{ accentColor: COLOR.brandYellow }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="flex items-center"
                      style={{ gap: SPACING.missionCreateBlockGapMd }}
                    >
                      <span
                        style={{
                          color: COLOR.missionsBodyText,
                          fontFamily: `${FONT.family}, sans-serif`,
                          fontSize: FONT.sizeMd,
                          fontWeight: FONT.weightMedium,
                          lineHeight: "21px",
                        }}
                      >
                        {deviceDisplayName(device)}
                      </span>
                      <span
                        className="inline-flex shrink-0 items-center"
                        style={{
                          gap: SPACING.missionCreateBlockGapSm,
                          color: COLOR.missionsSecondaryText,
                          fontFamily: `${FONT.family}, sans-serif`,
                          fontSize: FONT.sizeXs,
                          lineHeight: "17px",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: SPACING.deviceStatusDotSize,
                            height: SPACING.deviceStatusDotSize,
                            borderRadius: RADIUS.logo,
                            background: online
                              ? COLOR.statusOnline
                              : COLOR.missionsSecondaryText,
                          }}
                        />
                        {online ? "Online" : "Offline"}
                      </span>
                    </span>
                    <span
                      className="block"
                      style={{
                        marginTop: SPACING.missionCreateBlockGapSm,
                        color: COLOR.missionReviewChecklistDetail,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.missionReviewDetail10Size,
                        fontWeight: FONT.weightNormal,
                        lineHeight: FONT.missionReviewDetail10LineHeight,
                      }}
                    >
                      {formatDeviceSubtitle(device)}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </MissionWorkspacePanel>
  );
}
