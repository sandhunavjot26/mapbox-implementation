"use client";

import type { Device, DeviceStatus } from "@/types/aeroshield";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import {
  deviceDisplayName,
  formatSelectedRadarMetaLine,
  deviceTypeLabel,
  getDeviceStatusPresentation,
} from "@/utils/deviceDisplay";

function statusPillColors(status: DeviceStatus): {
  text: string;
  background: string;
} {
  const { variant } = getDeviceStatusPresentation(status);
  if (variant === "ok") {
    return {
      text: COLOR.missionCreateRadarStatusPillText,
      background: COLOR.missionCreateRadarStatusPillBg,
    };
  }
  if (variant === "offline") {
    return {
      text: COLOR.missionCreateRadarStatusOfflinePillText,
      background: COLOR.missionCreateRadarStatusOfflinePillBg,
    };
  }
  return {
    text: COLOR.missionsSecondaryText,
    background: "rgba(255, 255, 255, 0.08)",
  };
}

function formatKmOneDecimal(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return "—";
  const km = m / 1000;
  return `${km.toFixed(1)} km`;
}

export type ConfigureRadarDeviceCardProps = {
  device: Device;
  configureBodyExpanded: boolean;
  onToggleConfigureBody: () => void;
};

/**
 * Figma Driif-UI node 853:10449 — radar header + meta + stats (inner card).
 */
export function ConfigureRadarDeviceCard({
  device,
  configureBodyExpanded,
  onToggleConfigureBody,
}: ConfigureRadarDeviceCardProps) {
  const statusUi = getDeviceStatusPresentation(device.status);
  const pill = statusPillColors(device.status);
  const jamLabel =
    device.device_type === "DETECTION"
      ? "—"
      : formatKmOneDecimal(device.jammer_radius_m);

  return (
    <div
      className="flex flex-col"
      style={{ gap: SPACING.missionCreateStackGapMd }}
    >
      <div
        className="flex w-full items-center justify-between gap-2"
        style={{ minHeight: "24px" }}
      >
        <p
          className="m-0 min-w-0 flex-1 truncate"
          style={{
            color: COLOR.missionsTitleMuted,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            fontWeight: FONT.weightMedium,
            lineHeight: "20px",
          }}
        >
          {deviceDisplayName(device)}
        </p>
        <div
          className="flex shrink-0 items-center"
          style={{ gap: SPACING.missionCreateBlockGapMd }}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "4px",
              paddingBottom: "4px",
              borderRadius: RADIUS.panel,
              background: COLOR.missionCreatePrimaryChipText,
            }}
            aria-hidden
          >
            <img src="/icons/Broadcast.svg" alt="" width={14} height={14} />
          </span>
          <button
            type="button"
            onClick={onToggleConfigureBody}
            className="flex shrink-0 items-center justify-center border-0 bg-transparent p-0 transition-opacity hover:opacity-80"
            style={{
              width: "24px",
              height: "24px",
              cursor: "pointer",
            }}
            aria-label={
              configureBodyExpanded
                ? "Collapse radar configuration"
                : "Expand radar configuration"
            }
            aria-expanded={configureBodyExpanded}
          >
            <img
              src="/icons/dropdown-icon.svg"
              alt=""
              width={11}
              height={6}
              style={{
                transform: configureBodyExpanded ? "none" : "rotate(180deg)",
                transition: "transform 120ms ease",
              }}
            />
          </button>
        </div>
      </div>

      <p
        className="m-0"
        style={{
          color: COLOR.missionsSecondaryText,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
        }}
      >
        {formatSelectedRadarMetaLine(device)}
      </p>

      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: SPACING.missionCreateBlockGapMd,
        }}
      >
        <StatBlock label="Detection" value={formatKmOneDecimal(device.detection_radius_m)} />
        <StatBlock label="Jamming" value={jamLabel} />
        <StatBlock label="Type" value={deviceTypeLabel(device.device_type)} />
      </div>

      {/* <div className="flex flex-wrap items-center" style={{ gap: SPACING.missionCreateBlockGapSm }}>
        <span
          className="inline-flex items-center"
          style={{
            gap: SPACING.missionReviewChecklistStackGap,
            paddingLeft: "8px",
            paddingRight: "8px",
            paddingTop: "2px",
            paddingBottom: "2px",
            borderRadius: "9999px",
            background: pill.background,
            color: pill.text,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeSm,
            fontWeight: FONT.weightNormal,
            lineHeight: "16px",
          }}
        >
          {statusUi.label}
        </span>
      </div> */}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col" style={{ gap: "2px" }}>
      <span
        style={{
          color: COLOR.missionsSecondaryText,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeXs,
          fontWeight: FONT.weightNormal,
          lineHeight: "13px",
        }}
      >
        {label}
      </span>
      <span
        className="truncate"
        style={{
          color: COLOR.missionsBodyText,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
          fontWeight: FONT.weightMedium,
          lineHeight: "16px",
        }}
      >
        {value}
      </span>
    </div>
  );
}
