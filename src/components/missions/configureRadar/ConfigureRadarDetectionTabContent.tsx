"use client";

import { useState } from "react";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

// TODO: token — Figma Primary/50 active jamming frequency chip colour
const JAMMING_ACTIVE_COLOR = "#EEFF30";

const INPUT_SHELL = {
  background: COLOR.missionCreateFieldBg,
  borderColor: COLOR.missionCreateFieldBorder,
  borderWidth: "0.768px",
  borderStyle: "solid" as const,
  borderRadius: RADIUS.panel,
  height: SPACING.missionCreateFieldRowHeight,
  paddingLeft: "12px",
  paddingRight: "12px",
  color: COLOR.missionsSecondaryText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeMd,
  lineHeight: "21px",
} as const;

const FREQ_OPTIONS = [
  "433 MHz",
  "868 MHz",
  "2.4 GHz",
  "1.2 GHz GPS",
  "1.5 GHz GPS",
  "915 MHz",
  "1.3 GHz",
];

const DEFAULT_ACTIVE_FREQS = new Set(["433 MHz", "868 MHz", "2.4 GHz"]);

/** Figma Driif-UI node 853:10668 — Detection tab. */
export function ConfigureRadarDetectionTabContent() {
  const [scanSensitivity, setScanSensitivity] = useState<"Low" | "Medium" | "High">("Low");
  const [falsePositive, setFalsePositive] = useState<"Strict" | "Moderate" | "Off">("Strict");
  const [confidenceThreshold, setConfidenceThreshold] = useState(25);
  const [detectionRange, setDetectionRange] = useState("5.0");
  const [altitudeCeiling, setAltitudeCeiling] = useState("1500");
  const [activeFreqs, setActiveFreqs] = useState<Set<string>>(new Set(DEFAULT_ACTIVE_FREQS));

  const toggleFreq = (freq: string) => {
    setActiveFreqs((prev) => {
      const next = new Set(prev);
      if (next.has(freq)) next.delete(freq);
      else next.add(freq);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col"
      style={{ gap: SPACING.missionCreateStackGapMd }}
    >
      {/* 1. Detection mode input */}
      <div
        className="flex flex-col"
        style={{ gap: SPACING.missionCreateBlockGapSm }}
      >
        <span
          style={{
            color: COLOR.missionsSecondaryText,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeSm,
            lineHeight: "17px",
          }}
        >
          Detection mode
        </span>
        <div className="flex w-full items-center overflow-hidden" style={INPUT_SHELL}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeMd,
              lineHeight: "21px",
              whiteSpace: "nowrap",
            }}
          >
            Blend mode (recommended)
          </span>
        </div>
      </div>

      {/* 2. Description banner */}
      <div
        className="w-full"
        style={{
          background: COLOR.missionCreateFieldBorder,
          borderRadius: RADIUS.panel,
          padding: "8px",
        }}
      >
        <p
          className="m-0"
          style={{
            color: COLOR.missionsBodyText,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeXs,
            lineHeight: "15px",
          }}
        >
          Blend Mode runs both library matching and full RF parsing simultaneously.
          Best overall coverage catches known drones via signature and unknown threats via
          RF anomaly.
        </p>
      </div>

      {/* 3. Scan sensitivity + False positive filter */}
      <div
        className="grid w-full min-w-0"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: SPACING.missionCreateBlockGapMd,
          alignItems: "start",
        }}
      >
        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Scan sensitivity
          </span>
          <div className="flex flex-wrap" style={{ gap: SPACING.missionCreateChipGap }}>
            {(["Low", "Medium", "High"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setScanSensitivity(opt)}
                className="border-0 transition-opacity hover:opacity-90"
                style={{
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  paddingTop: "4px",
                  paddingBottom: "4px",
                  borderRadius: RADIUS.panel,
                  background:
                    scanSensitivity === opt
                      ? COLOR.missionCreatePrimaryChipBg
                      : COLOR.missionCreateFieldBg,
                  color:
                    scanSensitivity === opt
                      ? COLOR.missionCreatePrimaryChipText
                      : COLOR.missionCreateFieldText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <p
            className="m-0"
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "15px",
            }}
          >
            Balanced detection-recommended for most operations
          </p>
        </div>

        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            False positive filter
          </span>
          <div className="flex flex-wrap" style={{ gap: SPACING.missionCreateChipGap }}>
            {(["Strict", "Moderate", "Off"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFalsePositive(opt)}
                className="border-0 transition-opacity hover:opacity-90"
                style={{
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  paddingTop: "4px",
                  paddingBottom: "4px",
                  borderRadius: RADIUS.panel,
                  background:
                    falsePositive === opt
                      ? COLOR.missionCreatePrimaryChipBg
                      : COLOR.missionCreateFieldBg,
                  color:
                    falsePositive === opt
                      ? COLOR.missionCreatePrimaryChipText
                      : COLOR.missionCreateFieldText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <p
            className="m-0"
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "15px",
            }}
          >
            Filters known civilian RF signatures
          </p>
        </div>
      </div>

      {/* 4. Match confidence threshold + Unknown object action */}
      <div
        className="grid w-full min-w-0"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: SPACING.missionCreateBlockGapMd,
          alignItems: "start",
        }}
      >
        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Match confidence threshold
          </span>
          <div className="flex w-full items-center" style={{ gap: "6px" }}>
            <ConfidenceSlider value={confidenceThreshold} onChange={setConfidenceThreshold} />
            <span
              className="shrink-0 tabular-nums"
              style={{
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              {confidenceThreshold}%
            </span>
          </div>
          <p
            className="m-0"
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "15px",
            }}
          >
            Objects below threshold treated as unknown and scored for threat
          </p>
        </div>

        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Unknown object action
          </span>
          <div className="flex w-full items-center overflow-hidden" style={INPUT_SHELL}>
            <span
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
                whiteSpace: "nowrap",
              }}
            >
              Track + score threat
            </span>
          </div>
        </div>
      </div>

      {/* 5. Jamming Frequencies */}
      <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
        <span
          style={{
            color: COLOR.missionsSecondaryText,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeXs,
            lineHeight: "13px",
          }}
        >
          Jamming Frequencies
        </span>
        <div className="flex flex-wrap" style={{ gap: "8px" }}>
          {FREQ_OPTIONS.map((freq) => {
            const isActive = activeFreqs.has(freq);
            return (
              <button
                key={freq}
                type="button"
                onClick={() => toggleFreq(freq)}
                className="border transition-opacity hover:opacity-90"
                style={{
                  paddingLeft: "8px",
                  paddingRight: "8px",
                  paddingTop: "4px",
                  paddingBottom: "4px",
                  borderRadius: RADIUS.panel,
                  background: "transparent",
                  borderColor: isActive ? JAMMING_ACTIVE_COLOR : COLOR.missionCreateFieldBorder,
                  borderWidth: 1,
                  borderStyle: "solid",
                  color: isActive ? JAMMING_ACTIVE_COLOR : COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                  cursor: "pointer",
                }}
              >
                {freq}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Detection range + Altitude ceiling */}
      <div
        className="grid w-full min-w-0"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: SPACING.missionCreateBlockGapMd,
          alignItems: "start",
        }}
      >
        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Detection range (km)
          </span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={detectionRange}
            onChange={(e) => setDetectionRange(e.target.value)}
            className="w-full min-w-0 outline-none"
            style={INPUT_SHELL}
            aria-label="Detection range in km"
          />
          <p
            className="m-0"
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "15px",
            }}
          >
            Hardware max: {detectionRange} km
          </p>
        </div>

        <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Altitude ceiling (m AGL)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={altitudeCeiling}
            onChange={(e) => setAltitudeCeiling(e.target.value)}
            className="w-full min-w-0 outline-none"
            style={INPUT_SHELL}
            aria-label="Altitude ceiling in metres AGL"
          />
        </div>
      </div>
    </div>
  );
}

function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const t = value / 100;
  return (
    <div className="relative min-w-0 flex-1" style={{ height: "24px" }}>
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
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute left-0 top-0 w-full cursor-pointer opacity-0"
        style={{ height: "24px" }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Match confidence threshold"
      />
    </div>
  );
}
