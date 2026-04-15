"use client";

import { useState } from "react";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

// TODO: token — Figma Green/50 firmware version value text
const FIRMWARE_VERSION_COLOR = "#0CBB58";

const INPUT_SHELL = {
  background: COLOR.missionCreateFieldBg,
  borderColor: COLOR.missionCreateFieldBorder,
  borderWidth: "0.768px",
  borderStyle: "solid" as const,
  borderRadius: RADIUS.panel,
  height: SPACING.missionCreateFieldRowHeight,
  paddingLeft: "12px",
  paddingRight: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  overflow: "hidden",
} as const;

const LABEL_STYLE = {
  color: COLOR.missionsSecondaryText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeSm,
  lineHeight: "16px",
} as const;

const VALUE_STYLE = {
  color: COLOR.missionsBodyText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeMd,
  lineHeight: "20px",
  whiteSpace: "nowrap" as const,
} as const;

/** Dropdown display field — label + value + caret chevron. */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
      <span style={LABEL_STYLE}>{label}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none outline-none"
          style={{
            ...INPUT_SHELL,
            width: "100%",
            paddingRight: "32px",
            cursor: "pointer",
            ...VALUE_STYLE,
          }}
          aria-label={label}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} style={{ background: COLOR.missionCreateFieldBg }}>
              {opt}
            </option>
          ))}
        </select>
        <img
          src="/icons/dropdown-icon.svg"
          alt=""
          width={12}
          height={12}
          style={{ position: "absolute", right: "12px", pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}

/** Read-only display field — label + static value (no caret). */
function DisplayField({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
      <span style={LABEL_STYLE}>{label}</span>
      <div style={INPUT_SHELL}>
        <span style={{ ...VALUE_STYLE, color: valueColor ?? COLOR.missionsBodyText }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/** Two-column row wrapper. */
function ParamRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full min-w-0"
      style={{ gap: "16px", alignItems: "start" }}
    >
      {children}
    </div>
  );
}

/** Figma Driif-UI node 853:11129 — Parameters tab. */
export function ConfigureRadarParametersTabContent() {
  const [spectrumSwitch, setSpectrumSwitch] = useState("Auto");
  const [attackStatus, setAttackStatus] = useState("Armed");
  const [sourceParameter, setSourceParameter] = useState("Auto");
  const [strikeFreqMode, setStrikeFreqMode] = useState("Armed");
  const [dataCollect, setDataCollect] = useState("Enable");

  return (
    <div
      className="flex w-full flex-col"
      style={{ gap: SPACING.missionCreateFormSectionGap }}
    >
      {/* Row 1: Spectrum Switch | Attack Status */}
      <ParamRow>
        <SelectField
          label="Spectrum Switch"
          value={spectrumSwitch}
          options={["Auto", "Manual", "Off"]}
          onChange={setSpectrumSwitch}
        />
        <SelectField
          label="Attack Status"
          value={attackStatus}
          options={["Armed", "Disarmed", "Standby"]}
          onChange={setAttackStatus}
        />
      </ParamRow>

      {/* Row 2: Source Parameter | Strike Frequency Mode */}
      <ParamRow>
        <SelectField
          label="Source Parameter"
          value={sourceParameter}
          options={["Auto", "Manual"]}
          onChange={setSourceParameter}
        />
        <SelectField
          label="Strike Frequency Mode"
          value={strikeFreqMode}
          options={["Armed", "Disarmed", "Standby"]}
          onChange={setStrikeFreqMode}
        />
      </ParamRow>

      {/* Row 3: Data Collect | Firmware Version (read-only, green) */}
      <ParamRow>
        <SelectField
          label="Data Collect"
          value={dataCollect}
          options={["Enable", "Disable"]}
          onChange={setDataCollect}
        />
        <DisplayField
          label="Firmware Version"
          value="V2.4.1"
          valueColor={FIRMWARE_VERSION_COLOR}
        />
      </ParamRow>
    </div>
  );
}
