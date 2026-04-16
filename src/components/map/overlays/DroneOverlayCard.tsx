"use client";

import { useState } from "react";
import type { Target, TargetClassification } from "@/types/targets";
import { COLOR, FONT, RADIUS } from "@/styles/driifTokens";

// ---------------------------------------------------------------------------
// Local colour constants (no matching driifToken exists yet)
// ---------------------------------------------------------------------------

// Enemy card
const RED_THREAT = "#CF0000"; // TODO: token (Red/50)
const RED_THREAT_BG = "#290000"; // TODO: token (Red/90)
const TRACKING_TEXT = "#EEFF30"; // TODO: token (Primary/50)
const TRACKING_BG = "#171717"; // TODO: token (Logo/black)

// Friendly card
const FRIENDLY_BADGE_BG = "#002522"; // TODO: token
const FRIENDLY_BADGE_TEXT = "#00DBCC"; // TODO: token
const RTB_BG = "#032110"; // TODO: token (Green/90)
const RTB_TEXT = "#0CBB58"; // TODO: token (Green/50)
const HOVER_HOLD_BG = "#451B03"; // TODO: token (Yellow/100)
const HOVER_HOLD_TEXT = "#F4A30C"; // TODO: token (Yellow/50)

// Threat Analysis tab
const SWARM_WARN_BG = "#3F180B"; // TODO: token (Orange/100)
const SWARM_WARN_TEXT = "#F9DAAF"; // TODO: token (Orange/20)
const THREAT_HIGH = "#D93333"; // TODO: token (Red/40)
const THREAT_MED = "#F09A47"; // TODO: token (Orange/40)

// Fly & Control / Waypoints
const AMBER_BORDER = "#91430F"; // TODO: token (Yellow/80)
const GREY_40 = "#A3A3A3"; // TODO: token (Secondary/40)

// Logs tab
const LOG_DOT_OK = "#0CBB58"; // TODO: token (Green/50)
const LOG_DOT_NEUTRAL = "#D3D3D3"; // TODO: token (Secondary/30)
const LOG_DOT_WARN = "#ED8936"; // TODO: token (Orange/50)

// Health tab
const HEALTH_OK_BG = "#0A2D18"; // TODO: token
const HEALTH_OK_TEXT = "#0CBB58"; // TODO: token (Green/50)
const HEALTH_WARN_BG = "#2D1A00"; // TODO: token
const HEALTH_WARN_TEXT = "#F09A47"; // TODO: token (Orange/40)
const HEALTH_SATS_BG = "#1A2A1A"; // TODO: token
const HEALTH_SATS_TEXT = "#EEFF30"; // TODO: token (Primary/50)

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const CARD_STYLE: React.CSSProperties = {
  background: COLOR.missionsPanelBg,
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: RADIUS.panel ?? "2px",
  width: "381px",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflowY: "auto",
  fontFamily: `${FONT.family}, sans-serif`,
};

const CHIP_STYLE = (bg: string, text: string): React.CSSProperties => ({
  background: bg,
  color: text,
  fontSize: FONT.sizeSm,
  lineHeight: "16px",
  padding: "4px 8px",
  borderRadius: "2px",
  whiteSpace: "nowrap",
  flexShrink: 0,
});

const TAB_ACTIVE: React.CSSProperties = {
  flex: "1 0 0",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: COLOR.missionCreatePrimaryChipBg,
  color: COLOR.missionCreatePrimaryChipText,
  fontSize: FONT.sizeSm,
  lineHeight: "16px",
  borderRadius: "2px",
  cursor: "default",
  border: "none",
  minWidth: 0,
  padding: "2px 8px",
  whiteSpace: "nowrap",
};

const TAB_INACTIVE: React.CSSProperties = {
  flex: "1 0 0",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: COLOR.missionCreateFieldBg,
  color: COLOR.missionsSecondaryText,
  fontSize: FONT.sizeSm,
  lineHeight: "16px",
  borderRadius: "2px",
  cursor: "pointer",
  border: "none",
  minWidth: 0,
  padding: "2px 8px",
};

const ACCORDION_ROW: React.CSSProperties = {
  background: COLOR.missionsCardBg,
  borderRadius: "2px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px",
  width: "100%",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accordion section (collapsible)
// ---------------------------------------------------------------------------

function AccordionSection({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLOR.missionsCardBg,
        borderRadius: "2px",
        width: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          ...ACCORDION_ROW,
          borderRadius: isOpen ? "2px 2px 0 0" : "2px",
        }}
      >
        <span style={{ color: COLOR.missionsBodyText, fontSize: FONT.sizeSm, lineHeight: "16px" }}>
          {label}
        </span>
        <img
          src="/icons/dropdown-icon.svg"
          alt=""
          width={12}
          height={12}
          style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
      {isOpen && children && (
        <div style={{ padding: "8px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Reusable 2-column data cell
function DataCell({
  label,
  value,
  valueColor,
  valueSuffix,
  suffixColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  valueSuffix?: string;
  suffixColor?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 4px 8px 8px" }}>
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
        {label}
      </span>
      <span style={{ color: valueColor ?? "#FFFFFF", fontSize: FONT.sizeMd, lineHeight: "20px" }}>
        {value}
        {valueSuffix && (
          <span style={{ color: suffixColor ?? "#FFFFFF", fontSize: FONT.sizeXs, lineHeight: "12px", marginLeft: "2px" }}>
            {valueSuffix}
          </span>
        )}
      </span>
    </div>
  );
}

// Stat tile (Speed / Altitude / Direction row in Detection)
const STAT_TILE_BG = "#1F1F1F"; // TODO: token

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        flex: "1 0 0",
        minWidth: 0,
        background: STAT_TILE_BG,
        borderRadius: "2px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
        {label}
      </span>
      <span style={{ color: "#FFFFFF", fontSize: FONT.sizeMd, lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
        {unit && (
          <span style={{ fontSize: FONT.sizeXs, lineHeight: "12px", marginLeft: "2px" }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detection accordion content
// ---------------------------------------------------------------------------

const CLASSIFICATION_CONF_COLOR = "#67E09C"; // TODO: token (Green/60 approx)

function DetectionContent({ target }: { target: Target }) {
  const lat = target.coordinates ? target.coordinates[1].toFixed(4) + "° " + (target.coordinates[1] >= 0 ? "N" : "S") : "—";
  const lon = target.coordinates ? target.coordinates[0].toFixed(4) + "° " + (target.coordinates[0] >= 0 ? "E" : "W") : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Stat row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <StatTile label="Speed" value={target.speedKmH != null ? String(Math.round(target.speedKmH)) : "—"} unit="km/h" />
        <StatTile label="Altitude" value={String(target.altitude)} unit="ft" />
        <StatTile label="Direction" value={`${target.heading}°`} />
      </div>
      {/* 2-col data grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <DataCell label="Detected at" value="16:21:04" />
        <DataCell label="Time in zone" value="4 min 12 sec" />
        <DataCell
          label="Detecting radar"
          value={target.deviceId ? target.deviceId.slice(0, 8) : "RAD-04 (Sector B)"}
        />
        <DataCell
          label="Distance to threat zone"
          value={`${Math.round(target.distanceKm * 1000)} m`}
          valueColor={THREAT_HIGH}
        />
        <DataCell label="Jamming status" value="Not jammed" />
        <DataCell
          label="Classification"
          value="Surveillance Drone"
          valueSuffix={target.confidence != null ? `${target.confidence}%` : "76%"}
          suffixColor={CLASSIFICATION_CONF_COLOR}
        />
        <DataCell label="Latitude" value={lat} />
        <DataCell label="Longitude" value={lon} />
        <DataCell
          label="Entry point"
          value={target.rcCoords
            ? `${target.rcCoords[1].toFixed(4)}° N, ${target.rcCoords[0].toFixed(4)}° E`
            : "28.6082° N, 77.2011° E"}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RF Analysis accordion content
// ---------------------------------------------------------------------------

function RFAnalysisContent({ target }: { target: Target }) {
  const freqGHz = (target.frequencyMHz / 1000).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Detected frequencies chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 8px 4px" }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
          Detected frequencies
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[`${freqGHz} GHz (control)`, "5.8 GHz (video)", "GPS L1 (1575 MHz)"].map((f) => (
            <span
              key={f}
              style={{
                border: `1px solid ${TRACKING_TEXT}`,
                color: TRACKING_TEXT,
                fontSize: FONT.sizeSm,
                lineHeight: "16px",
                padding: "4px 8px",
                borderRadius: "2px",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
      {/* 2-col data grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <DataCell label="Control frequency" value={`${freqGHz} GHz`} />
        <DataCell label="Signal modulation" value="FHSS" />
        <DataCell label="Packet interval" value={target.bandwidthMHz != null ? `${target.bandwidthMHz} MHz` : "12 ms"} />
        <DataCell label="RF fingerprint match" value="Unregistered" valueColor={THREAT_HIGH} />
        <DataCell label="Library match" value="Partial (62%)" />
        <DataCell label="Closest model" value="DJI Phantom 4 Mod" />
        <DataCell label="Manufacturer" value="Unknown / modified" />
        <DataCell label="Operational ceiling" value="~500 m" />
        <DataCell label="Speed range" value="15 – 60 km/h" />
        <DataCell label="Jammable frequencies" value={`${freqGHz} GHz, GPS L1`} />
        <DataCell label="Known capabilities" value={"Camera payload,\nGPS nav"} />
        <DataCell label="5.8 GHz jammer available" value="No" valueColor={THREAT_HIGH} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flight Path accordion content
// ---------------------------------------------------------------------------

function FlightPathContent({ target }: { target: Target }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <DataCell label="Total distance covered" value={`${target.distanceKm.toFixed(2)} km`} />
      <DataCell label="Time in detection zone" value="4 min 12 sec" />
      <DataCell label="Entry direction" value="North-west (315°)" />
      <DataCell label="Current heading" value={`${target.heading}° (south-west)`} />
      <DataCell label="Predicted target zone" value="Sector B installation" valueColor={THREAT_HIGH} />
      <DataCell label="Max altitude reached" value={`${target.altitude} ft`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enemy card tabs
// ---------------------------------------------------------------------------

function EnemyOverviewTab({ target }: { target: Target }) {
  const [open, setOpen] = useState<"detection" | "rf" | "flight" | null>(null);
  const toggle = (id: "detection" | "rf" | "flight") =>
    setOpen((prev) => (prev === id ? null : id));

  return (
    <>
      <AccordionSection
        label="Detection"
        isOpen={open === "detection"}
        onToggle={() => toggle("detection")}
      >
        <DetectionContent target={target} />
      </AccordionSection>
      <AccordionSection
        label="RF Analysis"
        isOpen={open === "rf"}
        onToggle={() => toggle("rf")}
      >
        <RFAnalysisContent target={target} />
      </AccordionSection>
      <AccordionSection
        label="Flight path"
        isOpen={open === "flight"}
        onToggle={() => toggle("flight")}
      >
        <FlightPathContent target={target} />
      </AccordionSection>
    </>
  );
}

function EnemyThreatTab() {
  const metrics: { label: string; value: string; color: string }[] = [
    { label: "RF drone signature match", value: "88%", color: THREAT_HIGH },
    { label: "Swarm probability", value: "44%", color: COLOR.missionsBodyText },
    { label: "Suspicious altitude profile", value: "70%", color: THREAT_MED },
    { label: "Speed anomaly", value: "55%", color: THREAT_MED },
    { label: "Suspicious timing", value: "65%", color: THREAT_MED },
    { label: "Non-registered operator", value: "90%", color: THREAT_HIGH },
    { label: "Possible type", value: "Surveillance drone", color: COLOR.missionsBodyText },
    { label: "Behavior pattern", value: "Circular orbit (reconnaissance)", color: COLOR.missionsBodyText },
    { label: "Behavioral pattern surveillance", value: "76%", color: THREAT_MED },
    { label: "Speed anomaly detected", value: "Yes — +18 km/h at 16:23:41", color: THREAT_HIGH },
  ];

  return (
    <div
      style={{
        background: COLOR.missionCreateSectionBg,
        border: `1px solid ${COLOR.missionCreateFieldBorder}`,
        borderRadius: "2px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
      }}
    >
      {/* Swarm warning banner */}
      <div
        style={{
          background: SWARM_WARN_BG,
          borderRadius: "4px",
          padding: "8px 12px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden>
          <circle cx="12" cy="12" r="5" stroke={SWARM_WARN_TEXT} strokeWidth="1.2" opacity="0.7" />
          <circle cx="12" cy="12" r="10" stroke={SWARM_WARN_TEXT} strokeWidth="1" opacity="0.4" />
          <circle cx="12" cy="12" r="2" fill={SWARM_WARN_TEXT} />
        </svg>
        <p
          style={{
            color: SWARM_WARN_TEXT,
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
            flex: 1,
            minWidth: 0,
          }}
        >
          Possible swarm — 2 nearby drones with similar RF signature and heading
        </p>
      </div>

      {/* Metrics 2-column grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: "0" }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "8px 8px 8px 8px",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: FONT.sizeSm,
                lineHeight: "16px",
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                color: m.color,
                fontSize: FONT.sizeMd,
                lineHeight: "20px",
              }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type LogEntry = { dot: string; message: string; time: string; category: string };

const ENEMY_LOGS: LogEntry[] = [
  { dot: LOG_DOT_OK, message: "Pre-flight checks passed — all systems nominal", time: "16:10:02", category: "System" },
  { dot: LOG_DOT_OK, message: "Launch authorized — MSN-DEL-26-03-04", time: "14:32:48", category: "Launch" },
  { dot: LOG_DOT_NEUTRAL, message: "Takeoff initiated — target altitude 120 m", time: "14:31:55", category: "Flight" },
  { dot: LOG_DOT_OK, message: "Altitude 120 m reached — autopilot engaged", time: "14:30:14", category: "Auto" },
  { dot: LOG_DOT_NEUTRAL, message: "WP-2 reached — 30s hold, EO recording started", time: "14:28:05", category: "Waypoint" },
  { dot: LOG_DOT_OK, message: "IFF verified by RAD-02 — friendly confirmed", time: "14:32:05", category: "IFF" },
  { dot: LOG_DOT_OK, message: "WP-3 active — Sector B east boundary scan", time: "14:32:05", category: "Waypoint" },
  { dot: LOG_DOT_WARN, message: "Motor 3 temperature elevated (+2°C) — monitoring", time: "14:32:05", category: "Health" },
];

function LogsTab({ entries }: { entries: LogEntry[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: isLast ? "none" : `1px solid ${COLOR.missionCreateFieldBorder}`,
              marginBottom: isLast ? 0 : "8px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: entry.dot,
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: FONT.sizeSm,
                  lineHeight: "20px",
                }}
              >
                <span style={{ color: "#FAFAFA" }}>{entry.message}</span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    flexShrink: 0,
                    marginLeft: "8px",
                  }}
                >
                  {entry.time}
                </span>
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: FONT.sizeSm,
                  lineHeight: "16px",
                }}
              >
                {entry.category}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friendly card tabs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Friendly Overview – D-Pad helper
// ---------------------------------------------------------------------------

function DPad({ label1, label2 }: { label1: string; label2: string }) {
  const S = "37px";
  const base: React.CSSProperties = {
    width: S,
    height: S,
    background: COLOR.missionCreateFieldBorder,
    border: "none",
    borderRadius: "2.87px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    fontSize: "16px",
    flexShrink: 0,
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${S} ${S} ${S}`,
        gridTemplateRows: `${S} ${S} ${S}`,
        gap: "0px",
      }}
    >
      <span />
      <button type="button" style={base}>↑</button>
      <span />
      <button type="button" style={base}>←</button>
      <div
        style={{
          ...base,
          cursor: "default",
          flexDirection: "column",
          gap: "1.5px",
          fontSize: "7.7px",
          lineHeight: "9.2px",
        }}
      >
        <span>{label1}</span>
        <span>{label2}</span>
      </div>
      <button type="button" style={base}>→</button>
      <span />
      <button type="button" style={base}>↓</button>
      <span />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friendly Overview – Slider row helper
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const pct = (value / max) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#fff",
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
        }}
      >
        <span style={{ opacity: 0.6 }}>{label}</span>
        <span>
          {value} {unit}
        </span>
      </div>
      <div style={{ position: "relative", height: "16px", width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: "5px",
            left: 0,
            width: "100%",
            height: "6px",
            background: COLOR.missionCreateFieldBorder,
            borderRadius: "20px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "5px",
            left: 0,
            width: `${pct}%`,
            height: "6px",
            background: COLOR.missionCreateFieldText,
            borderRadius: "20px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${pct}% - 8px)`,
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: COLOR.missionCreateFieldText,
            pointerEvents: "none",
          }}
        />
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "16px",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payload Feeds accordion content
// ---------------------------------------------------------------------------

const SENSORS = ["EO Camera", "IR/Therma", "RF Sensor", "Slot 4"];

function PayloadFeedsContent() {
  const [activeSensor, setActiveSensor] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* Feed image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "188px",
          borderRadius: "2px",
          overflow: "hidden",
          background: COLOR.missionCreateFieldBg,
        }}
      >
        <img
          src="/feed-image.png"
          alt="Sensor feed"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Telemetry overlay */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            color: "#fff",
            fontSize: "10px",
            lineHeight: "14px",
          }}
        >
          <div>ALT 122 SPD 38km/h</div>
          <div>28.6174°N 77.2118°E</div>
        </div>
        {/* REC indicator */}
        <div
          style={{
            position: "absolute",
            top: "38px",
            left: "8px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "9999px",
              background: THREAT_HIGH,
              flexShrink: 0,
            }}
          />
          <span style={{ color: THREAT_HIGH, fontSize: "10px", lineHeight: "14px" }}>REC 00:11:24</span>
        </div>
        {/* Expand button */}
        <button
          type="button"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: TRACKING_BG,
            borderRadius: "2px",
            width: "30px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M8.75 1.75h3.5v3.5M5.25 1.75H1.75v3.5M8.75 12.25h3.5v-3.5M5.25 12.25H1.75v-3.5"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            color: "rgba(255,255,255,0.2)",
            fontSize: "14px",
            lineHeight: "20px",
          }}
        >
          Sensor Feed
        </span>
      </div>

      {/* Sensor selector tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "3px" }}>
        {SENSORS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSensor(i)}
            style={{
              background:
                i === activeSensor ? COLOR.missionCreateFooterBorder : COLOR.missionCreateFieldBorder,
              color: "#fff",
              fontSize: "10px",
              lineHeight: "12px",
              padding: "4px 6px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              flex: "1 0 0",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "4px" }}>
        {(["Activate IR", "Snapshot All", "PiP Mode"] as const).map((label) => (
          <button
            key={label}
            type="button"
            style={{
              background: COLOR.missionsCardBg,
              border: `1px solid ${COLOR.missionCreateFooterBorder}`,
              color: COLOR.missionCreateFieldText,
              fontSize: FONT.sizeSm,
              lineHeight: "20px",
              padding: "5px 9px",
              borderRadius: "2px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flex: "1 0 0",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fly & Control accordion content
// ---------------------------------------------------------------------------

const FLIGHT_MODE_ROWS = [
  ["Stabilize", "Loiter", "Auto"],
  ["Circle", "guided", "Sport"],
];

function FlyControlContent() {
  const [altTarget, setAltTarget] = useState(122);
  const [speed, setSpeed] = useState(38);
  const [armed, setArmed] = useState(true);
  const [flightMode, setFlightMode] = useState("Stabilize");

  const btnBase: React.CSSProperties = {
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: FONT.sizeSm,
    lineHeight: "20px",
    padding: "5px 9px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Warning banner */}
      <div
        style={{
          background: HOVER_HOLD_BG,
          borderRadius: "4px",
          padding: "8px 12px",
          display: "flex",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <path
            d="M7 1.5L13 12.25H1L7 1.5Z"
            stroke="#F4A30C"
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1="7" y1="5.5" x2="7" y2="8.5" stroke="#F4A30C" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="7" cy="10.25" r="0.65" fill="#F4A30C" />
        </svg>
        <span style={{ color: HOVER_HOLD_TEXT, fontSize: FONT.sizeSm, lineHeight: "16px", flex: 1 }}>
          Manual override active — autopilot paused. Tap for nudge, hold for continuous movement.
        </span>
      </div>

      {/* D-pads */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <DPad label1="ALT" label2="YAW" />
        <DPad label1="FWD" label2="ROLL" />
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SliderRow label="Alt target" value={altTarget} max={200} unit="m" onChange={setAltTarget} />
        <SliderRow label="Speed" value={speed} max={80} unit="km/h" onChange={setSpeed} />
      </div>

      {/* Armed / Disarm */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          type="button"
          onClick={() => setArmed(true)}
          style={{
            ...btnBase,
            flex: "1 0 0",
            height: "32px",
            background: armed ? COLOR.missionsCreateBtnBg : COLOR.missionsCardBg,
            border: armed ? "none" : `1px solid ${COLOR.missionCreateFooterBorder}`,
            color: armed ? TRACKING_TEXT : COLOR.missionCreateFieldText,
          }}
        >
          Armed
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          style={{
            ...btnBase,
            flex: "1 0 0",
            height: "32px",
            background: COLOR.missionsCardBg,
            border: `1px solid ${COLOR.missionCreateFooterBorder}`,
            color: COLOR.missionCreateFieldText,
          }}
        >
          Disarm
        </button>
      </div>

      {/* Standby status bar */}
      <div
        style={{
          background: COLOR.missionCreateFieldBorder,
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>Standby</span>
        <span style={{ color: "#fff", fontSize: FONT.sizeMd, lineHeight: "20px" }}>Awaiting input</span>
      </div>

      {/* Flight mode */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={{ color: COLOR.missionsBodyText, fontSize: FONT.sizeMd, lineHeight: "20px" }}>
          Flight Mode
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {FLIGHT_MODE_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: "4px" }}>
              {row.map((mode) => {
                const isActive = flightMode === mode;
                const isDanger = isActive && mode === "Stabilize";
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFlightMode(mode)}
                    style={{
                      ...btnBase,
                      flex: "1 0 0",
                      minWidth: 0,
                      background: isDanger
                        ? RED_THREAT_BG
                        : isActive
                          ? COLOR.missionCreateFieldBorder
                          : COLOR.missionsCardBg,
                      border: isActive ? "none" : `1px solid ${COLOR.missionCreateFooterBorder}`,
                      color: isDanger ? RED_THREAT : COLOR.missionCreateFieldText,
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", gap: "4px", height: "30px" }}>
        <button
          type="button"
          style={{
            ...btnBase,
            flex: "1 0 0",
            background: HOVER_HOLD_BG,
            border: `1px solid ${AMBER_BORDER}`,
            color: HOVER_HOLD_TEXT,
          }}
        >
          Resume Autopilot
        </button>
        <button
          type="button"
          style={{
            ...btnBase,
            flex: "1 0 0",
            background: COLOR.missionsPanelBg,
            border: `1px solid ${COLOR.missionCreateFieldBorder}`,
            color: COLOR.missionCreateFieldText,
          }}
        >
          Set orbit
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Way Points accordion content
// ---------------------------------------------------------------------------

type WPStatus = "Done" | "Active" | "Pending";

const WP_ENTRIES: {
  num: number;
  name: string;
  detail: string;
  status: WPStatus;
  rowBg: string;
}[] = [
    {
      num: 1,
      name: "Launch point",
      detail: "28.6102°N 77.2045°E · 0 m AGL",
      status: "Done",
      rowBg: COLOR.missionsCardBg,
    },
    {
      num: 2,
      name: "Sector A — north perimeter",
      detail: "28.6148°N 77.2072°E · 120 m · Hold 30s",
      status: "Done",
      rowBg: COLOR.missionsCardBg,
    },
    {
      num: 3,
      name: "Sector B — east boundary",
      detail: "28.6174°N 77.2118°E · 120 m · EO recording",
      status: "Active",
      rowBg: "rgba(39,39,39,0.4)",
    },
    {
      num: 4,
      name: "Sector C — south-east sweep",
      detail: "28.6131°N 77.2155°E · 100 m · 30 km/h",
      status: "Pending",
      rowBg: COLOR.missionsCardBg,
    },
    {
      num: 5,
      name: "Return to base",
      detail: "28.6102°N 77.2045°E · Auto-descend & land",
      status: "Pending",
      rowBg: COLOR.missionsCardBg,
    },
  ];

const WP_STATUS_COLOR: Record<WPStatus, string> = {
  Done: TRACKING_TEXT,
  Active: RTB_TEXT,
  Pending: THREAT_HIGH,
};

function WayPointsContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
        }}
      >
        <span
          style={{ color: "rgba(255,255,255,0.7)", fontSize: FONT.sizeSm, lineHeight: "16px" }}
        >
          3/5 Way Points active
        </span>
        <button
          type="button"
          style={{
            background: COLOR.missionsCreateBtnBg,
            border: "none",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            cursor: "pointer",
            color: COLOR.missionsCreateBtnText,
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
          }}
        >
          <span style={{ fontSize: "14px", lineHeight: "14px" }}>+</span>
          Add Waypoint
        </button>
      </div>

      {/* Waypoint list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {WP_ENTRIES.map((wp) => (
          <div
            key={wp.num}
            style={{
              background: wp.rowBg,
              padding: "12px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "12px",
                  background: wp.status === "Active" ? TRACKING_BG : COLOR.missionCreateFieldBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: wp.status === "Active" ? RTB_TEXT : GREY_40,
                    fontSize: FONT.sizeSm,
                    lineHeight: "14.4px",
                  }}
                >
                  {wp.num}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    color: COLOR.missionsBodyText,
                    fontSize: FONT.sizeMd,
                    lineHeight: "20px",
                  }}
                >
                  {wp.name}
                </span>
                <span
                  style={{
                    color: GREY_40,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                    opacity: 0.6,
                  }}
                >
                  {wp.detail}
                </span>
              </div>
            </div>
            <div
              style={{
                background: TRACKING_BG,
                borderRadius: "2px",
                width: "57px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: WP_STATUS_COLOR[wp.status],
                  fontSize: "10px",
                  lineHeight: "12px",
                }}
              >
                {wp.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          type="button"
          style={{
            flex: "1 0 0",
            background: COLOR.missionsCardBg,
            border: `1px solid ${COLOR.missionCreateFooterBorder}`,
            color: COLOR.missionCreateFieldText,
            fontSize: FONT.sizeSm,
            lineHeight: "20px",
            padding: "5px 9px",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Edit WP-4
        </button>
        <button
          type="button"
          style={{
            flex: "1 0 0",
            background: COLOR.missionsPanelBg,
            border: `1px solid ${COLOR.missionCreateFieldBorder}`,
            color: COLOR.missionCreateFieldText,
            fontSize: FONT.sizeSm,
            lineHeight: "20px",
            padding: "5px 9px",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Skip WP-3
        </button>
        <button
          type="button"
          style={{
            flexShrink: 0,
            background: HOVER_HOLD_BG,
            border: `1px solid ${AMBER_BORDER}`,
            color: HOVER_HOLD_TEXT,
            fontSize: FONT.sizeSm,
            lineHeight: "20px",
            padding: "5px 9px",
            borderRadius: "2px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Return to base
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friendly Overview tab
// ---------------------------------------------------------------------------

function FriendlyOverviewTab({ target }: { target: Target }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <>
      <AccordionSection
        label="Detection"
        isOpen={open === "detection"}
        onToggle={() => toggle("detection")}
      >
        <DetectionContent target={target} />
      </AccordionSection>
      <AccordionSection
        label="Payload Feeds"
        isOpen={open === "payload"}
        onToggle={() => toggle("payload")}
      >
        <PayloadFeedsContent />
      </AccordionSection>
      <AccordionSection
        label="Fly & Control"
        isOpen={open === "fly"}
        onToggle={() => toggle("fly")}
      >
        <FlyControlContent />
      </AccordionSection>
      <AccordionSection
        label="Way Points"
        isOpen={open === "waypoints"}
        onToggle={() => toggle("waypoints")}
      >
        <WayPointsContent />
      </AccordionSection>
    </>
  );
}

type HealthItem = { name: string; status: string; statusBg: string; statusText: string };

const FRIENDLY_HEALTH: HealthItem[] = [
  { name: "Flight controller", status: "Nominal", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "GPS module", status: "14 sats", statusBg: HEALTH_SATS_BG, statusText: HEALTH_SATS_TEXT },
  { name: "IMU / gyro", status: "OK", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "Compass", status: "OK", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "Motor 1", status: "Normal", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "Motor 2", status: "Normal", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "Motor 3", status: "Warm +2°C", statusBg: HEALTH_WARN_BG, statusText: HEALTH_WARN_TEXT },
  { name: "Motor 4", status: "Normal", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "IFF transponder", status: "Active", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "Comms radio", status: "Active", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
  { name: "EO gimbal", status: "Nominal", statusBg: HEALTH_OK_BG, statusText: HEALTH_OK_TEXT },
];

function FriendlyHealthTab() {
  return (
    <div
      style={{
        background: COLOR.missionCreateSectionBg,
        border: `1px solid ${COLOR.missionCreateFieldBorder}`,
        borderRadius: "2px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "100%",
      }}
    >
      {FRIENDLY_HEALTH.map((item, idx) => {
        const isLast = idx === FRIENDLY_HEALTH.length - 1;
        return (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "6px",
              borderBottom: isLast ? "none" : `1px solid ${COLOR.missionCreateFieldBorder}`,
            }}
          >
            <span
              style={{
                color: COLOR.missionsBodyText,
                fontSize: FONT.sizeSm,
                lineHeight: "20px",
              }}
            >
              {item.name}
            </span>
            <span
              style={{
                background: item.statusBg,
                color: item.statusText,
                fontSize: "10px",
                lineHeight: "12px",
                padding: "2px 6px",
                borderRadius: "2px",
                fontWeight: FONT.weightMedium,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const FRIENDLY_LOGS: LogEntry[] = [
  { dot: LOG_DOT_OK, message: "Pre-flight checks passed — all systems nominal", time: "14:32:48", category: "Launch" },
  { dot: LOG_DOT_OK, message: "Launch authorized — MSN-DEL-26-03-04", time: "14:32:48", category: "Launch" },
  { dot: LOG_DOT_NEUTRAL, message: "Takeoff initiated — target altitude 120 m", time: "14:31:55", category: "Flight" },
  { dot: LOG_DOT_OK, message: "Altitude 120 m reached — autopilot engaged", time: "14:30:14", category: "Auto" },
  { dot: LOG_DOT_NEUTRAL, message: "WP-2 reached — 30s hold, EO recording started", time: "14:28:05", category: "Waypoint" },
  { dot: LOG_DOT_OK, message: "IFF verified by RAD-02 — friendly confirmed", time: "14:32:05", category: "IFF" },
  { dot: LOG_DOT_OK, message: "WP-3 active — Sector B east boundary scan", time: "14:32:05", category: "Waypoint" },
  { dot: LOG_DOT_WARN, message: "Motor 3 temperature elevated (+2°C)", time: "14:32:05", category: "Health" },
];

// ---------------------------------------------------------------------------
// Action rows
// ---------------------------------------------------------------------------

interface EnemyActionsProps {
  onInitiateJam: () => void;
  onMarkFriendly: () => void;
  onEngage: () => void;
  engagePending?: boolean;
  disabled?: boolean;
}

function EnemyActions({
  onInitiateJam,
  onMarkFriendly,
  onEngage,
  engagePending,
  disabled,
}: EnemyActionsProps) {
  const btnBase: React.CSSProperties = {
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "2px",
    fontSize: FONT.sizeSm,
    lineHeight: "20px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    padding: "4px 8px",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
  };

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", width: "100%", flexShrink: 0 }}>
      <button
        type="button"
        onClick={onInitiateJam}
        disabled={disabled}
        style={{ ...btnBase, flexShrink: 0, background: RED_THREAT_BG, color: RED_THREAT }}
      >
        Initiate Jam
      </button>
      <button
        type="button"
        onClick={onMarkFriendly}
        disabled={disabled}
        style={{
          ...btnBase,
          flex: "1 0 0",
          minWidth: 0,
          background: COLOR.missionsCardBg,
          border: `1px solid ${COLOR.missionCreateFooterBorder}`,
          color: COLOR.missionCreateFieldText,
        }}
      >
        Mark as friendly
      </button>
      <button
        type="button"
        onClick={onEngage}
        disabled={disabled || engagePending}
        style={{ ...btnBase, flexShrink: 0, background: RED_THREAT_BG, color: RED_THREAT }}
      >
        Engage
      </button>
    </div>
  );
}

interface FriendlyActionsProps {
  onReturnToBase: () => void;
  onHoverHold: () => void;
  onAbort: () => void;
  onEmergencyLand: () => void;
  disabled?: boolean;
}

function FriendlyActions({ onReturnToBase, onHoverHold, onAbort, onEmergencyLand, disabled }: FriendlyActionsProps) {
  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "2px",
    fontSize: FONT.sizeSm,
    lineHeight: "20px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    padding: "4px 8px",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "100%",
        flexShrink: 0,
      }}
    >
      {/* Row 1: primary actions */}
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          type="button"
          onClick={onReturnToBase}
          disabled={disabled}
          style={{ ...btnBase, flex: "1 0 0", minWidth: 0, background: RTB_BG, color: RTB_TEXT, height: "30px" }}
        >
          Return to Base
        </button>
        <button
          type="button"
          onClick={onHoverHold}
          disabled={disabled}
          style={{ ...btnBase, flex: "1 0 0", minWidth: 0, background: HOVER_HOLD_BG, color: HOVER_HOLD_TEXT }}
        >
          Hover &amp; Hold
        </button>
        <button
          type="button"
          onClick={onAbort}
          disabled={disabled}
          style={{ ...btnBase, flexShrink: 0, background: RED_THREAT_BG, color: RED_THREAT, height: "30px" }}
        >
          Abort
        </button>
      </div>
      {/* Row 2: emergency action — full width */}
      <button
        type="button"
        onClick={onEmergencyLand}
        disabled={disabled}
        style={{
          ...btnBase,
          width: "100%",
          background: COLOR.missionsCardBg,
          border: `1px solid ${COLOR.missionCreateFooterBorder}`,
          color: COLOR.missionCreateFieldText,
        }}
      >
        Emergency land
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DroneOverlayCard
// ---------------------------------------------------------------------------

export interface DroneOverlayCardProps {
  target: Target;
  /** Extra styles merged onto the card root element (e.g. maxHeight from parent). */
  style?: React.CSSProperties;
  // Enemy actions
  onInitiateJam?: () => void;
  onMarkFriendly?: () => void;
  onEngage?: () => void;
  engagePending?: boolean;
  engageError?: string | null;
  onDismissEngageError?: () => void;
  // Friendly actions
  onReturnToBase?: () => void;
  onHoverHold?: () => void;
  onAbort?: () => void;
  onEmergencyLand?: () => void;
  // Reclassification
  onMarkEnemy?: () => void;
}

export function DroneOverlayCard({
  target,
  style: styleProp,
  onInitiateJam,
  onMarkFriendly,
  onEngage,
  engagePending,
  engageError,
  onDismissEngageError,
  onReturnToBase,
  onHoverHold,
  onAbort,
  onEmergencyLand,
}: DroneOverlayCardProps) {
  // UNKNOWN is treated as ENEMY for display
  const effectiveClassification: TargetClassification =
    target.classification === "UNKNOWN" ? "ENEMY" : target.classification;

  const isEnemy = effectiveClassification === "ENEMY";

  const [enemyTab, setEnemyTab] = useState<"overview" | "threat" | "logs">("overview");
  const [friendlyTab, setFriendlyTab] = useState<"overview" | "health" | "logs">("overview");

  const displayName = target.targetName ?? target.id;

  if (isEnemy) {
    return (
      <div className="driif-mission-scrollbar" style={{ ...CARD_STYLE, ...styleProp }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingLeft: "8px" }}>
            <span
              style={{
                color: "#FFFFFF",
                fontSize: FONT.sizeMd,
                lineHeight: "20px",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
            <span style={{ color: RED_THREAT, fontSize: FONT.sizeSm, lineHeight: "16px" }}>
              THREAT: {target.confidence != null ? `${target.confidence}%` : "—"}
            </span>
          </div>
          {/* Status chips */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={CHIP_STYLE(TRACKING_BG, TRACKING_TEXT)}>Tracking</span>
            <span style={CHIP_STYLE(COLOR.missionCreateFieldBg, "#A3A3A3")}>
              {target.distanceKm != null ? `Jamming Zone: ${Math.round(target.distanceKm * 1000)}m` : "Jamming Zone: —"}
            </span>
            {target.deviceId && (
              <span style={CHIP_STYLE(COLOR.missionCreateFieldBg, "#A3A3A3")}>
                Radar: {target.deviceId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "8px", height: "24px", width: "100%" }}>
          <button
            type="button"
            style={enemyTab === "overview" ? TAB_ACTIVE : TAB_INACTIVE}
            onClick={() => setEnemyTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            style={enemyTab === "threat" ? TAB_ACTIVE : TAB_INACTIVE}
            onClick={() => setEnemyTab("threat")}
          >
            Threat Analysis
          </button>
          <button
            type="button"
            style={enemyTab === "logs" ? TAB_ACTIVE : TAB_INACTIVE}
            onClick={() => setEnemyTab("logs")}
          >
            Logs
          </button>
        </div>

        {/* Tab content */}
        {enemyTab === "overview" && <EnemyOverviewTab target={target} />}
        {enemyTab === "threat" && <EnemyThreatTab />}
        {enemyTab === "logs" && <LogsTab entries={ENEMY_LOGS} />}

        {engageError ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              border: `1px solid ${RED_THREAT}`,
              background: RED_THREAT_BG,
              borderRadius: "2px",
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
              color: RED_THREAT,
            }}
          >
            <span style={{ flex: "1 1 auto", minWidth: 0 }}>{engageError}</span>
            {onDismissEngageError && (
              <button
                type="button"
                onClick={onDismissEngageError}
                style={{
                  flexShrink: 0,
                  background: "transparent",
                  border: "none",
                  color: COLOR.missionCreateFieldText,
                  cursor: "pointer",
                  fontSize: FONT.sizeSm,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        ) : null}

        {/* Action row */}
        <EnemyActions
          onInitiateJam={onInitiateJam ?? (() => { })}
          onMarkFriendly={onMarkFriendly ?? (() => { })}
          onEngage={onEngage ?? (() => { })}
          engagePending={engagePending}
        />
      </div>
    );
  }

  // Friendly card
  return (
    <div className="driif-mission-scrollbar" style={{ ...CARD_STYLE, ...styleProp }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingLeft: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              color: "#FFFFFF",
              fontSize: FONT.sizeMd,
              lineHeight: "20px",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <span style={CHIP_STYLE(FRIENDLY_BADGE_BG, FRIENDLY_BADGE_TEXT)}>FRIENDLY</span>
          <span
            style={{
              background: TRACKING_BG,
              height: "24px",
              display: "flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: "2px",
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
              flexShrink: 0,
            }}
          >
            <span style={{ color: COLOR.missionCreateFieldText }}>Link:&nbsp;</span>
            <span style={{ color: RTB_TEXT }}>Strong</span>
          </span>
        </div>

        {/* Sub-row: battery, waypoint, radar, status */}
        <div
          style={{
            display: "flex",
            gap: "5px",
            alignItems: "center",
            opacity: 0.7,
            paddingLeft: "8px",
            flexWrap: "wrap",
          }}
        >
          <img src="/icons/BatteryMedium.svg" alt="" width={16} height={16} />
          <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
            {target.confidence != null ? `${target.confidence}%` : "—"}
          </span>
          <img src="/icons/MapPin.svg" alt="" width={12} height={12} />
          <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
            On Mission
          </span>
          <img src="/icons/ArrowsVertical.svg" alt="" width={12} height={12} />
          <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
            {target.deviceId ? target.deviceId.slice(0, 6) : "RAD-??"}
          </span>
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "999px",
              background: "#D93333",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "16px", whiteSpace: "nowrap" }}>
            On Mission
          </span>
        </div>
      </div>

      {/* Mission info grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "8px 0",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingLeft: "8px", minWidth: 0 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
              Altitude
            </span>
            <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "20px" }}>
              {target.altitude} ft
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
              Heading
            </span>
            <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "20px" }}>
              {target.heading}°
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingLeft: "8px", minWidth: 0 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
              Distance
            </span>
            <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "20px" }}>
              {target.distanceKm.toFixed(1)} km
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizeSm, lineHeight: "16px" }}>
              Frequency
            </span>
            <span style={{ color: "#FFFFFF", fontSize: FONT.sizeSm, lineHeight: "20px" }}>
              {target.frequencyMHz} MHz
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "8px", height: "24px", width: "100%" }}>
        <button
          type="button"
          style={friendlyTab === "overview" ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => setFriendlyTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          style={friendlyTab === "health" ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => setFriendlyTab("health")}
        >
          Health
        </button>
        <button
          type="button"
          style={friendlyTab === "logs" ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => setFriendlyTab("logs")}
        >
          Logs
        </button>
      </div>

      {/* Tab content */}
      {friendlyTab === "overview" && <FriendlyOverviewTab target={target} />}
      {friendlyTab === "health" && <FriendlyHealthTab />}
      {friendlyTab === "logs" && <LogsTab entries={FRIENDLY_LOGS} />}

      {/* Action row */}
      <FriendlyActions
        onReturnToBase={onReturnToBase ?? (() => { })}
        onHoverHold={onHoverHold ?? (() => { })}
        onAbort={onAbort ?? (() => { })}
        onEmergencyLand={onEmergencyLand ?? (() => { })}
      />
    </div>
  );
}
