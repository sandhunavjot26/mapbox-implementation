"use client";

import { useState } from "react";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { ConfigureRadarPlusGlyph } from "./ConfigureRadarIcons";

// TODO: token — Figma Primary/50 active jamming chip colour
const JAMMING_ACTIVE_COLOR = "#EEFF30";
// TODO: token — Figma Primary/50 active direction card bg tint
const JAMMING_ACTIVE_BG = "rgba(238, 255, 48, 0.1)";
// TODO: token — Figma Secondary/50 inactive direction card bg
const JAMMING_INACTIVE_CARD_BG = "rgba(138, 138, 138, 0.1)";
// TODO: token — Figma Green/50 "Active" pill text
const ACTIVE_PILL_TEXT = "#0CBB58";
// TODO: token — Figma Green/90 "Active" pill bg
const ACTIVE_PILL_BG = "#032110";
// TODO: token — Figma Logo/Green add-jammer button text
const ADD_JAMMER_TEXT = "#E2FF00";

const INPUT_SHELL = {
  background: COLOR.missionCreateFieldBg,
  borderColor: COLOR.missionCreateFieldBorder,
  borderWidth: "0.768px",
  borderStyle: "solid" as const,
  borderRadius: RADIUS.panel,
  height: SPACING.missionCreateFieldRowHeight,
  paddingLeft: "12px",
  paddingRight: "12px",
  color: COLOR.missionsBodyText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeMd,
  lineHeight: "20px",
} as const;

type PowerLevel = "Low" | "Medium" | "High";
type JammerDirection = "Omnidirectional" | "Directional" | "Fixed Sector";

type JammerState = {
  id: string;
  name: string;
  freqSummary: string;
  isActive: boolean;
  expanded: boolean;
  frequencies: Set<string>;
  powerLevel: PowerLevel;
  activationTrigger: string;
  direction: JammerDirection;
  jammingRange: string;
  zoneShape: string;
};

const FREQ_OPTIONS = ["433 MHz", "868 MHz", "2.4 GHz", "5.8 GHz"];

function makeJammer(index: number): JammerState {
  return {
    id: `j${index}`,
    name: `Jammer #${index}`,
    freqSummary: "433 • 868 • 2.4GHz",
    isActive: index === 1,
    expanded: index === 1,
    frequencies: new Set(["433 MHz", "868 MHz", "2.4 GHz"]),
    powerLevel: "High",
    activationTrigger: "Auto (zone entry)",
    direction: "Omnidirectional",
    jammingRange: "2000",
    zoneShape: "Full circle (360°)",
  };
}

/** Figma Driif-UI node 853:10899 — Jammers tab. */
export function ConfigureRadarJammersTabContent() {
  const [jammers, setJammers] = useState<JammerState[]>([makeJammer(1)]);

  const updateJammer = (id: string, patch: Partial<JammerState>) =>
    setJammers((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const toggleFreq = (id: string, freq: string) => {
    setJammers((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const next = new Set(j.frequencies);
        if (next.has(freq)) next.delete(freq);
        else next.add(freq);
        return { ...j, frequencies: next };
      })
    );
  };

  const addJammer = () =>
    setJammers((prev) => [...prev, makeJammer(prev.length + 1)]);

  return (
    <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
      {jammers.map((jammer) => (
        <JammerCard
          key={jammer.id}
          jammer={jammer}
          onToggleExpand={() =>
            updateJammer(jammer.id, { expanded: !jammer.expanded })
          }
          onUpdatePowerLevel={(powerLevel) => updateJammer(jammer.id, { powerLevel })}
          onUpdateDirection={(direction) => updateJammer(jammer.id, { direction })}
          onUpdateJammingRange={(jammingRange) => updateJammer(jammer.id, { jammingRange })}
          onUpdateZoneShape={(zoneShape) => updateJammer(jammer.id, { zoneShape })}
          onToggleFreq={(freq) => toggleFreq(jammer.id, freq)}
        />
      ))}

      {/* Add Jammer button */}
      <button
        type="button"
        onClick={addJammer}
        className="flex shrink-0 items-center justify-center border-0 transition-opacity hover:opacity-90"
        style={{
          background: COLOR.missionsCreateBtnBg,
          borderRadius: RADIUS.panel,
          height: SPACING.missionCreateFieldRowHeight,
          paddingLeft: "12px",
          paddingRight: "12px",
          gap: "4px",
          cursor: "pointer",
          alignSelf: "flex-start",
          minWidth: "111px",
        }}
        aria-label="Add Jammer"
      >
        <ConfigureRadarPlusGlyph
          size={12}
          color={ADD_JAMMER_TEXT}
        />
        <span
          style={{
            color: ADD_JAMMER_TEXT,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
          }}
        >
          Add Jammer
        </span>
      </button>
    </div>
  );
}

function JammerCard({
  jammer,
  onToggleExpand,
  onUpdatePowerLevel,
  onUpdateDirection,
  onUpdateJammingRange,
  onUpdateZoneShape,
  onToggleFreq,
}: {
  jammer: JammerState;
  onToggleExpand: () => void;
  onUpdatePowerLevel: (v: PowerLevel) => void;
  onUpdateDirection: (v: JammerDirection) => void;
  onUpdateJammingRange: (v: string) => void;
  onUpdateZoneShape: (v: string) => void;
  onToggleFreq: (freq: string) => void;
}) {
  return (
    <div
      className="flex w-full flex-col overflow-hidden"
      style={{
        borderRadius: RADIUS.panel,
        background: COLOR.missionsPanelBg,
      }}
    >
      {/* Row header */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={jammer.expanded}
        className="flex w-full items-center justify-between border-0 transition-opacity hover:opacity-90"
        style={{
          background: COLOR.missionsPanelBg,
          paddingLeft: "11px",
          paddingRight: "11px",
          paddingTop: "8px",
          paddingBottom: "8px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            color: COLOR.missionsBodyText,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
          }}
        >
          {jammer.name}
        </span>
        <div className="flex items-center" style={{ gap: "8px" }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {jammer.freqSummary}
          </span>
          {jammer.isActive && (
            <span
              className="shrink-0"
              style={{
                background: ACTIVE_PILL_BG,
                borderRadius: "999px",
                paddingLeft: "4px",
                paddingRight: "4px",
                paddingTop: "2px",
                paddingBottom: "2px",
                color: ACTIVE_PILL_TEXT,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: "11px",
                fontWeight: FONT.weightMedium,
                lineHeight: "12px",
                whiteSpace: "nowrap",
              }}
            >
              Active
            </span>
          )}
          <img
            src="/icons/dropdown-icon.svg"
            alt=""
            width={12}
            height={12}
            style={{
              transform: jammer.expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 120ms ease",
            }}
          />
        </div>
      </button>

      {/* Expanded body */}
      {jammer.expanded && (
        <div
          className="flex flex-col"
          style={{
            background: COLOR.missionsPanelBg,
            padding: "10px",
            gap: "16px",
          }}
        >
          {/* Jamming Frequencies */}
          <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
            <span
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeXs,
                lineHeight: "12px",
              }}
            >
              Jamming Frequencies
            </span>
            <div className="flex flex-wrap" style={{ gap: "8px" }}>
              {FREQ_OPTIONS.map((freq) => {
                const isActive = jammer.frequencies.has(freq);
                return (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => onToggleFreq(freq)}
                    className="border transition-opacity hover:opacity-90"
                    style={{
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      borderRadius: RADIUS.panel,
                      background: "transparent",
                      borderColor: isActive
                        ? JAMMING_ACTIVE_COLOR
                        : COLOR.missionCreateFieldBorder,
                      borderWidth: 1,
                      borderStyle: "solid",
                      color: isActive ? JAMMING_ACTIVE_COLOR : COLOR.missionsSecondaryText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeSm,
                      lineHeight: "16px",
                      cursor: "pointer",
                    }}
                  >
                    {freq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Power level + Activation trigger */}
          <div
            className="grid w-full min-w-0"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: SPACING.missionCreateBlockGapMd,
              alignItems: "start",
            }}
          >
            {/* Power level */}
            <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
              <span
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeXs,
                  lineHeight: "12px",
                }}
              >
                Power level
              </span>
              <div
                className="flex items-center"
                style={{
                  background: COLOR.missionCreateFieldBg,
                  borderRadius: "4px",
                  padding: "2px",
                  gap: 0,
                }}
              >
                {(["Low", "Medium", "High"] as PowerLevel[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onUpdatePowerLevel(opt)}
                    className="flex-1 border-0 transition-opacity hover:opacity-90"
                    style={{
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                      borderRadius: RADIUS.panel,
                      background:
                        jammer.powerLevel === opt
                          ? COLOR.missionCreatePrimaryChipBg
                          : COLOR.missionCreateFieldBg,
                      color:
                        jammer.powerLevel === opt
                          ? COLOR.missionCreatePrimaryChipText
                          : COLOR.missionCreateFieldText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeSm,
                      lineHeight: "16px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Activation trigger */}
            <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
              <span
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeXs,
                  lineHeight: "12px",
                }}
              >
                Activation trigger
              </span>
              <div
                className="flex w-full items-center justify-between overflow-hidden"
                style={INPUT_SHELL}
              >
                <span
                  style={{
                    color: COLOR.missionsBodyText,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeMd,
                    lineHeight: "20px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {jammer.activationTrigger}
                </span>
                <img
                  src="/icons/dropdown-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Jamming direction */}
          <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
            <span
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeXs,
                lineHeight: "12px",
              }}
            >
              Jamming direction
            </span>
            <div className="flex flex-wrap" style={{ gap: "8px" }}>
              {(["Omnidirectional", "Directional", "Fixed Sector"] as JammerDirection[]).map(
                (dir) => {
                  const isActive = jammer.direction === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onUpdateDirection(dir)}
                      className="flex flex-col items-center justify-center border transition-opacity hover:opacity-90"
                      style={{
                        width: "106px",
                        height: "57px",
                        borderRadius: RADIUS.panel,
                        background: isActive ? JAMMING_ACTIVE_BG : JAMMING_INACTIVE_CARD_BG,
                        borderColor: isActive
                          ? JAMMING_ACTIVE_COLOR
                          : COLOR.missionsSecondaryText,
                        borderWidth: 1,
                        borderStyle: "solid",
                        cursor: "pointer",
                        gap: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        paddingTop: "4px",
                        paddingBottom: "4px",
                      }}
                    >
                      <DirectionIcon type={dir} active={isActive} />
                      <span
                        style={{
                          color: isActive ? JAMMING_ACTIVE_COLOR : COLOR.missionCreateFieldText,
                          fontFamily: `${FONT.family}, sans-serif`,
                          fontSize: FONT.sizeSm,
                          lineHeight: "16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dir}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Jamming range + Zone shape */}
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
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeXs,
                  lineHeight: "12px",
                }}
              >
                Jamming range
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={jammer.jammingRange}
                onChange={(e) => onUpdateJammingRange(e.target.value)}
                className="w-full min-w-0 outline-none"
                style={INPUT_SHELL}
                aria-label="Jamming range"
              />
            </div>
            <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapMd }}>
              <span
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeXs,
                  lineHeight: "12px",
                }}
              >
                Jamming zone shape
              </span>
              <div
                className="flex w-full items-center overflow-hidden"
                style={INPUT_SHELL}
              >
                <span
                  style={{
                    color: COLOR.missionsBodyText,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeMd,
                    lineHeight: "20px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {jammer.zoneShape}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Simple inline SVG icons for jamming direction cards. */
function DirectionIcon({
  type,
  active,
}: {
  type: JammerDirection;
  active: boolean;
}) {
  const color = active ? JAMMING_ACTIVE_COLOR : COLOR.missionsSecondaryText;
  if (type === "Omnidirectional") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="2.5" fill={color} />
        <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.2" />
        <circle cx="12" cy="12" r="10.5" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "Directional") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 12 L20 6 L16 12 L20 18 Z"
          fill={color}
          opacity="0.4"
        />
        <path
          d="M4 12 L20 6 L16 12 L20 18 Z"
          stroke={color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="12" r="2" fill={color} />
      </svg>
    );
  }
  // Fixed Sector
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 L21 12 L12 21 L3 12 Z"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={color}
        opacity="0.25"
      />
      <path
        d="M12 7 L17 12 L12 17 L7 12 Z"
        fill={color}
        opacity="0.6"
      />
    </svg>
  );
}
