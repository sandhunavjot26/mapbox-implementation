"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Device, DeviceType } from "@/types/aeroshield";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

function deviceTypeLabel(deviceType: DeviceType): string {
  switch (deviceType) {
    case "DETECTION":
      return "Detection";
    case "JAMMER":
      return "Jammer";
    case "DETECTION_JAMMER":
      return "Detection + Jammer";
    default:
      return deviceType;
  }
}

function formatRangeKm(detectionRadiusM: number | null): string | null {
  if (detectionRadiusM == null) return null;
  const km = detectionRadiusM / 1000;
  if (km >= 1) {
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
    return `${rounded}km range`;
  }
  return `${Math.round(detectionRadiusM)}m range`;
}

function formatDeviceSubtitle(device: Device): string {
  const parts: string[] = [];
  const range = formatRangeKm(device.detection_radius_m);
  if (range) parts.push(range);
  parts.push(deviceTypeLabel(device.device_type));
  if (device.mission_id) parts.push("On another mission");
  return parts.join(" • ");
}

function deviceDisplayName(device: Device): string {
  const name = device.name?.trim();
  if (name) return name;
  return device.serial_number || device.id.slice(0, 8);
}

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

  const panelStyle = {
    background: COLOR.missionsPanelBg,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

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
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
      style={panelStyle}
    >
      <div
        className="flex items-center"
        style={{
          gap: SPACING.missionCreateBlockGapMd,
          paddingBottom: SPACING.missionCreateHeaderPadBottom,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-85"
          style={{
            width: SPACING.iconButtonSize,
            height: SPACING.iconButtonSize,
          }}
          aria-label="Back"
        >
          <Image src="/icons/back-icon.svg" alt="" width={8} height={8} />
        </button>
        <p
          style={{
            color: COLOR.missionsTitleMuted,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            fontWeight: FONT.weightMedium,
            lineHeight: "20px",
          }}
        >
          Select Assets
        </p>
      </div>

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
            lineHeight: "20px",
          }}
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {error && (
          <p
            style={{
              color: COLOR.statusDanger,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "16px",
              paddingBottom: SPACING.missionCreateBlockGapMd,
            }}
          >
            Failed to load devices
          </p>
        )}
        {isLoading && (
          <p
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "16px",
            }}
          >
            Loading...
          </p>
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
                          lineHeight: "20px",
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
                          lineHeight: "16px",
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
                        color: COLOR.missionsSecondaryText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeSm,
                        lineHeight: "16px",
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
    </div>
  );
}
