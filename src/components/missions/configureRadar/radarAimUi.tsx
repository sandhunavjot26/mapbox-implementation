"use client";

/**
 * Shared radar aim visuals — D-pad shell, pitch gauge/slider, nudge buttons.
 * Used by create-mission ConfigureRadar direction tab and mission Devices live controls.
 */

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { clampElevationDeg } from "@/types/radarMissionDraft";
import { COLOR } from "@/styles/driifTokens";
import {
  RADAR_PAD_ARROW_SRC,
  type RadarPadArrowDir,
} from "@/components/missions/configureRadar/radarPadArrowSrc";

/** Figma 853:10484 — compact d-pad; slightly smaller than 109px frame. */
export const DPAD_PX = 96;
export const DPAD_ICON_PX = 17;

export const PAD_BEARINGS: readonly (number | "stop")[] = [
  315, 0, 45,
  270, "stop", 90,
  225, 180, 135,
];

export const PAD_DIRS: readonly (RadarPadArrowDir | "stop")[] = [
  "nw", "n", "ne",
  "w", "stop", "e",
  "sw", "s", "se",
];

export function PitchElevationGauge({ elevationDeg }: { elevationDeg: number }) {
  const t = useMemo(() => {
    const e = clampElevationDeg(elevationDeg);
    return (e + 40) / 130;
  }, [elevationDeg]);

  const needleAngleDeg = 180 - t * 180;
  const rad = (needleAngleDeg * Math.PI) / 180;
  const cx = 80;
  const cy = 72;
  const r = 56;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  return (
    <svg
      width="100%"
      height={88}
      viewBox="0 0 160 88"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ maxWidth: "88px", display: "block" }}
    >
      <path
        d="M 24 72 A 56 56 0 0 1 136 72"
        fill="none"
        stroke={COLOR.missionCreateFieldBorder}
        strokeWidth={2}
        pathLength={100}
      />
      <path
        d="M 24 72 A 56 56 0 0 1 136 72"
        fill="none"
        stroke={COLOR.missionsBodyText}
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${t * 100} 100`}
      />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={COLOR.missionsBodyText}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function padCellShell(active: boolean): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: "2.37px",
    background: COLOR.missionCreateFieldBorder,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: active ? `inset 0 0 0 1px ${COLOR.missionsBodyText}` : undefined,
  };
}

export function PitchElevationSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const t = (clampElevationDeg(value) + 40) / 130;

  return (
    <div className="relative w-full" style={{ height: "24px" }}>
      <div
        className="absolute left-0 right-0"
        style={{
          top: "9px",
          height: "6px",
          borderRadius: "20px",
          background: COLOR.missionCreateFieldBorder,
        }}
      />
      <div
        className="absolute left-0 top-[9px] h-[6px]"
        style={{
          width: `${t * 100}%`,
          borderRadius: "20px",
          background: COLOR.missionsBodyText,
        }}
      />
      <input
        type="range"
        min={-40}
        max={90}
        step={1}
        value={Math.round(clampElevationDeg(value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute left-0 top-0 w-full cursor-pointer opacity-0"
        style={{ height: "24px" }}
        aria-valuemin={-40}
        aria-valuemax={90}
        aria-valuenow={Math.round(clampElevationDeg(value))}
        aria-label="Pitch elevation in degrees"
      />
    </div>
  );
}

export function PitchNudgeImg({
  src,
  label,
  onClick,
  disabled,
}: {
  src: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-0 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        padding: "6px",
        borderRadius: "2.37px",
        background: COLOR.missionCreateFieldBorder,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        minWidth: "34px",
        minHeight: "34px",
        flexShrink: 0,
      }}
      aria-label={label}
    >
      <img
        src={src}
        alt=""
        width={DPAD_ICON_PX}
        height={DPAD_ICON_PX}
        draggable={false}
        style={{
          display: "block",
          flexShrink: 0,
          maxWidth: "none",
        }}
      />
    </button>
  );
}
