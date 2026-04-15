"use client";

import { useState } from "react";
import type { Asset } from "@/types/assets";
import type { DeviceStatusEntry } from "@/stores/deviceStatusStore";
import { COLOR, FONT } from "@/styles/driifTokens";

// ---------------------------------------------------------------------------
// Local colour constants
// ---------------------------------------------------------------------------
const CHIP_DARK = "#171717"; // Logo/black — broadcast icon chip
const STATUS_BG = "#150000"; // Red/100    — degraded badge bg
const STATUS_FG = "#F4A30C"; // Yellow/50  — degraded badge text
const ALERT_BG = "#451B03"; // Yellow/100 — alert banner bg
const ALERT_FG = "#F9DAAF"; // Orange/20  — alert banner text
const LOG_RED = "#CF0000"; // Red/50
const LOG_AMBER = "#F4A30C"; // Yellow/50
const LOG_GREY = "#8A8A8A"; // Secondary/50
const LOG_BLUE = "#3B8FF6"; // Blue/60
const NEW_MISSION_BG = "#EEFF30"; // Primary/50 — New Mission button
const NEW_MISSION_FG = "#171717"; // Logo/black — New Mission text

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatLastSeen(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CARD_STYLE: React.CSSProperties = {
  background: COLOR.missionsPanelBg,
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "2px",
  width: "316px",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflowY: "auto",
  fontFamily: `${FONT.family}, sans-serif`,
};

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
// Inline SVG icons
// ---------------------------------------------------------------------------
function BroadcastIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="1.5" fill="white" />
      <path
        d="M4.5 9.5a3.5 3.5 0 0 1 0-5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 9.5a3.5 3.5 0 0 0 0-5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M2.5 11.5a6.5 6.5 0 0 1 0-9"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M11.5 11.5a6.5 6.5 0 0 0 0-9"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon({ color = STATUS_FG }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1.5L11 10.5H1L6 1.5Z"
        stroke={color}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <line
        x1="6"
        y1="4.5"
        x2="6"
        y2="7.5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="6" cy="9" r="0.6" fill={color} />
    </svg>
  );
}

function RefreshIcon() {
  return <img src="/icons/refresh.svg" alt="" width={12} height={11} style={{ flexShrink: 0 }} />;
}

function CoverageIcon() {
  return <img src="/icons/coverage.svg" alt="" width={14} height={14} style={{ flexShrink: 0 }} />;
}

function CaretIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 0.15s",
        flexShrink: 0,
      }}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="#8A8A8A"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// AccordionSection
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
        style={{ ...ACCORDION_ROW, borderRadius: isOpen ? "2px 2px 0 0" : "2px" }}
      >
        <span
          style={{
            color: COLOR.missionsBodyText,
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
          }}
        >
          {label}
        </span>
        <CaretIcon open={isOpen} />
      </button>
      {isOpen && children && (
        <div
          style={{
            padding: "8px",
            background: COLOR.missionsCardBg,
            borderTop: `1px solid ${COLOR.missionCreateFieldBg}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopBar — broadcast chip + status badge + refresh button (shared)
// ---------------------------------------------------------------------------
function TopBar({ isDegraded }: { isDegraded: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {/* Broadcast icon chip */}
        <div
          style={{
            background: CHIP_DARK,
            borderRadius: "2px",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BroadcastIcon />
        </div>

        {/* Status badge */}
        <div
          style={{
            background: STATUS_BG,
            borderRadius: "2px",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <WarningIcon />
          <span
            style={{
              color: STATUS_FG,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
              whiteSpace: "nowrap",
            }}
          >
            {isDegraded ? "Degraded" : "2"}
          </span>
        </div>
      </div>

      {/* Refresh button */}
      <button
        type="button"
        style={{
          background: COLOR.missionCreateFieldBg,
          borderRadius: "2px",
          width: "30px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: "none",
          flexShrink: 0,
        }}
        aria-label="Refresh"
      >
        <RefreshIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaRow — three-column stats (Heartbeat / Uptime / Last Check)
// ---------------------------------------------------------------------------
function MetaRow({ heartbeat }: { heartbeat: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "4px",
      }}
    >
      {(
        [
          ["Heartbeat", heartbeat],
          ["Uptime", "14h 22m"],
          ["Last Check", "09:14 AM"],
        ] as [string, string][]
      ).map(([label, value]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverviewHeader
// ---------------------------------------------------------------------------
function OverviewHeader({
  asset,
  deviceStatus,
  isDegraded,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
  isDegraded: boolean;
}) {
  const heartbeat = formatLastSeen(deviceStatus?.last_seen);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Alert banner — shown when degraded */}
      {isDegraded && (
        <div
          style={{
            background: ALERT_BG,
            borderRadius: "2px",
            padding: "6px 8px",
            display: "flex",
            gap: "6px",
            alignItems: "flex-start",
          }}
        >
          <WarningIcon color={ALERT_FG} />
          <span
            style={{
              color: ALERT_FG,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            System performance degraded. Running at reduced capacity.
          </span>
        </div>
      )}

      {/* Name + type row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeMd,
              lineHeight: "20px",
              fontWeight: 600,
            }}
          >
            {asset.name}
          </span>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            Fixed Installation
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            Mission
          </span>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            Alpha Battalion
          </span>
        </div>
      </div>

      {/* Location row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            Command
          </span>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            Northern Command
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            Location
          </span>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            {asset.area}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <MetaRow heartbeat={heartbeat} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompactHeader (Hardware + Logs tabs)
// ---------------------------------------------------------------------------
function CompactHeader({
  asset,
  deviceStatus,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
}) {
  const heartbeat = formatLastSeen(deviceStatus?.last_seen);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* ID + coverage / area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeMd,
              lineHeight: "20px",
              fontWeight: 600,
            }}
          >
            {asset.name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CoverageIcon />
            <span
              style={{
                color: COLOR.missionsSecondaryText,
                fontSize: FONT.sizeXs ?? "10px",
                lineHeight: "12px",
              }}
            >
              {asset.coverageRadiusKm} km Coverage
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: FONT.sizeXs ?? "10px",
              lineHeight: "12px",
            }}
          >
            Area
          </span>
          <span
            style={{
              color: COLOR.missionsBodyText,
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            {asset.area}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <MetaRow heartbeat={heartbeat} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
function OverviewTab({
  asset,
  deviceStatus,
  isDegraded,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
  isDegraded: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <>
      <OverviewHeader asset={asset} deviceStatus={deviceStatus} isDegraded={isDegraded} />

      <AccordionSection
        label="Coverage Capabilities"
        isOpen={open === "coverage"}
        onToggle={() => toggle("coverage")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Detection Range" value={`${asset.coverageRadiusKm} km`} />
          <InfoRow label="Azimuth Coverage" value="360°" />
          <InfoRow label="Elevation Coverage" value="0° – 90°" />
          <InfoRow label="Altitude Range" value={`${asset.altitude} ft`} />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Radar Details"
        isOpen={open === "details"}
        onToggle={() => toggle("details")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Type" value="Phased Array" />
          <InfoRow label="Frequency Band" value="X-Band" />
          <InfoRow label="Scan Mode" value="Continuous" />
          <InfoRow label="Resolution" value="High" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Current State"
        isOpen={open === "state"}
        onToggle={() => toggle("state")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Operating Mode" value="Active Scan" />
          <InfoRow label="Status" value={isDegraded ? "Degraded" : "Nominal"} />
          <InfoRow label="Alerts" value={isDegraded ? "1 active" : "None"} />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Detection Frequencies"
        isOpen={open === "detFreq"}
        onToggle={() => toggle("detFreq")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Primary" value="9.3 – 9.5 GHz" />
          <InfoRow label="Secondary" value="5.6 – 5.9 GHz" />
          <InfoRow label="Min Target Size" value="0.001 m²" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Jamming Frequencies"
        isOpen={open === "jamFreq"}
        onToggle={() => toggle("jamFreq")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Band" value="2.4 GHz / 5.8 GHz" />
          <InfoRow label="Power Output" value="20 W" />
          <InfoRow label="Mode" value="Directional" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Lifetime Stats"
        isOpen={open === "lifetime"}
        onToggle={() => toggle("lifetime")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Total Detections" value="4,821" />
          <InfoRow label="Threats Neutralised" value="312" />
          <InfoRow label="Uptime Hours" value="2,140 h" />
        </div>
      </AccordionSection>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hardware tab
// ---------------------------------------------------------------------------
function HardwareTab({
  asset,
  deviceStatus,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <>
      <CompactHeader asset={asset} deviceStatus={deviceStatus} />

      <AccordionSection
        label="Detection System"
        isOpen={open === "detection"}
        onToggle={() => toggle("detection")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Sensor Type" value="Active Phased Array" />
          <InfoRow label="Transmit Power" value="500 W peak" />
          <InfoRow label="Pulse Width" value="1 µs" />
          <InfoRow label="PRF" value="1,000 Hz" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Jammers"
        isOpen={open === "jammers"}
        onToggle={() => toggle("jammers")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Jammer Units" value="2 active" />
          <InfoRow label="Frequency Coverage" value="800 MHz – 6 GHz" />
          <InfoRow label="Max EIRP" value="60 dBm" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Connectivity & Power"
        isOpen={open === "connectivity"}
        onToggle={() => toggle("connectivity")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Primary Link" value="Fibre (10 Gbps)" />
          <InfoRow label="Backup Link" value="LTE" />
          <InfoRow label="Power Supply" value="Grid + UPS" />
          <InfoRow label="Power Draw" value="3.2 kW" />
        </div>
      </AccordionSection>

      <AccordionSection
        label="Software & Firmware"
        isOpen={open === "software"}
        onToggle={() => toggle("software")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <InfoRow label="Firmware" value="v4.2.1" />
          <InfoRow label="Signal Processor" value="v2.8.0" />
          <InfoRow label="Last Update" value="2026-03-14" />
          <InfoRow label="Next Maintenance" value="2026-09-01" />
        </div>
      </AccordionSection>
    </>
  );
}

// ---------------------------------------------------------------------------
// Logs tab
// ---------------------------------------------------------------------------
type LogLevel = "error" | "warn" | "info" | "neutral";

interface LogEntry {
  id: string;
  level: LogLevel;
  title: string;
  description: string;
  timestamp: string;
}

const LOG_DOT_COLOR: Record<LogLevel, string> = {
  error: LOG_RED,
  warn: LOG_AMBER,
  info: LOG_BLUE,
  neutral: LOG_GREY,
};

const RADAR_LOGS: LogEntry[] = [
  {
    id: "l1",
    level: "error",
    title: "Signal Loss",
    description: "Primary antenna lost signal on sector 3.",
    timestamp: "09:14 AM",
  },
  {
    id: "l2",
    level: "warn",
    title: "Degraded Mode",
    description: "Processing unit running at 60% capacity.",
    timestamp: "09:02 AM",
  },
  {
    id: "l3",
    level: "info",
    title: "Threat Detected",
    description: "Micro-drone detected at bearing 042°, 1.2 km.",
    timestamp: "08:47 AM",
  },
  {
    id: "l4",
    level: "neutral",
    title: "Routine Scan",
    description: "Sector sweep completed. No anomalies.",
    timestamp: "08:30 AM",
  },
  {
    id: "l5",
    level: "info",
    title: "Jammer Activated",
    description: "Directed jamming on 2.4 GHz initiated.",
    timestamp: "08:28 AM",
  },
  {
    id: "l6",
    level: "neutral",
    title: "System Check",
    description: "All hardware diagnostics passed.",
    timestamp: "07:00 AM",
  },
];

function LogsTab({
  asset,
  deviceStatus,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
}) {
  return (
    <>
      <CompactHeader asset={asset} deviceStatus={deviceStatus} />

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {RADAR_LOGS.map((entry) => (
          <div
            key={entry.id}
            style={{
              background: COLOR.missionsCardBg,
              borderRadius: "2px",
              padding: "8px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            {/* Coloured dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: LOG_DOT_COLOR[entry.level],
                flexShrink: 0,
                marginTop: "4px",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    color: COLOR.missionsBodyText,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                    fontWeight: 500,
                  }}
                >
                  {entry.title}
                </span>
                <span
                  style={{
                    color: COLOR.missionsSecondaryText,
                    fontSize: FONT.sizeXs ?? "10px",
                    lineHeight: "12px",
                    flexShrink: 0,
                  }}
                >
                  {entry.timestamp}
                </span>
              </div>
              <span
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontSize: FONT.sizeXs ?? "10px",
                  lineHeight: "14px",
                  display: "block",
                  marginTop: "2px",
                }}
              >
                {entry.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// InfoRow helper
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        style={{
          color: COLOR.missionsSecondaryText,
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: COLOR.missionsBodyText,
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function CardFooter() {
  return (
    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
      <button
        type="button"
        style={{
          flex: "1 0 0",
          height: "32px",
          background: NEW_MISSION_BG,
          color: NEW_MISSION_FG,
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
          border: "none",
          borderRadius: "2px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        New Mission
      </button>
      <button
        type="button"
        style={{
          flex: "1 0 0",
          height: "32px",
          background: COLOR.missionCreateFieldBg,
          color: COLOR.missionsBodyText,
          fontSize: FONT.sizeSm,
          lineHeight: "16px",
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: "2px",
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Assign to Mission
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props & main export
// ---------------------------------------------------------------------------
export interface RadarOverlayCardProps {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
  style?: React.CSSProperties;
}

export function RadarOverlayCard({ asset, deviceStatus, style }: RadarOverlayCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "hardware" | "logs">("overview");

  const isDegraded =
    deviceStatus?.status === "DEGRADED" || deviceStatus?.op_status === "DEGRADED";

  return (
    <div
      className="driif-mission-scrollbar"
      style={{ ...CARD_STYLE, ...style }}
    >
      {/* Top bar */}
      <TopBar isDegraded={isDegraded} />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "2px" }}>
        {(
          [
            ["overview", "Overview"],
            ["hardware", "Hardware"],
            ["logs", "Logs"],
          ] as ["overview" | "hardware" | "logs", string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            style={activeTab === id ? TAB_ACTIVE : TAB_INACTIVE}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab asset={asset} deviceStatus={deviceStatus} isDegraded={isDegraded} />
      )}
      {activeTab === "hardware" && (
        <HardwareTab asset={asset} deviceStatus={deviceStatus} />
      )}
      {activeTab === "logs" && (
        <LogsTab asset={asset} deviceStatus={deviceStatus} />
      )}

      {/* Footer */}
      <CardFooter />
    </div>
  );
}
