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
/** Figma Primary/50 — detection frequency chip selected (Driif-UI 726:8809); TODO: token */
const FREQ_PRIMARY = "#EEFF30";

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

// Inactive tab text — Figma Secondary/40 #A3A3A3 (radar card tabs); TODO: token
const TAB_INACTIVE_TEXT = "#A3A3A3";

const TAB_INACTIVE: React.CSSProperties = {
  flex: "1 0 0",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: COLOR.missionCreateFieldBg,
  color: TAB_INACTIVE_TEXT,
  fontSize: FONT.sizeSm,
  lineHeight: "16px",
  borderRadius: "2px",
  cursor: "pointer",
  border: "none",
  minWidth: 0,
  padding: "2px 8px",
};

// Figma hardware rows — Green/50, Green/90, Red/50, Red/90, Yellow/50, Yellow/90; TODO: token where no COLOR match
const HW_GREEN = "#0CBB58";
const HW_GREEN_PILL_BG = "#032110";
const HW_RED = "#CF0000";
const HW_RED_PILL_BG = "#290000";
const HW_ORANGE = "#F4A30C";
const HW_ORANGE_PILL_BG = "#773710";

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
  bodyBorderTop = true,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  /** Figma frequency accordions (726:8809, 726:8836) omit the divider under the header */
  bodyBorderTop?: boolean;
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
            ...(bodyBorderTop
              ? { borderTop: `1px solid ${COLOR.missionCreateFieldBg}` }
              : {}),
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hardware tab — Figma accordions (726:8361, 726:8406, 726:8488, 726:8451)
// ---------------------------------------------------------------------------
function HardwareAccordionSection({
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
            padding: "8px 12px",
            background: COLOR.missionsCardBg,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function HardwareStatusRow({
  dotColor,
  title,
  subtitle,
  badge,
}: {
  dotColor: string;
  title: string;
  subtitle: string;
  badge: { text: string; bg: string; fg: string };
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: "8px",
        borderBottom: `1px solid ${COLOR.missionCreateFieldBorder}`,
        width: "100%",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flex: "1 0 0",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
          <p
            style={{
              fontSize: FONT.sizeSm,
              lineHeight: "20px",
              color: COLOR.missionCreateDatePickerSelectionText,
              fontWeight: FONT.weightNormal,
              width: "100%",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
              color: COLOR.missionReviewChecklistHeading,
              opacity: 0.6,
              width: "100%",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      <div
        style={{
          background: badge.bg,
          borderRadius: 999,
          padding: "2px 4px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            lineHeight: "12px",
            fontWeight: FONT.weightMedium,
            color: badge.fg,
            fontFamily: `${FONT.family}, sans-serif`,
            whiteSpace: "nowrap",
          }}
        >
          {badge.text}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopBar — broadcast chip + status badge + refresh button
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
        {isDegraded ? (
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
              Degraded
            </span>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(34,197,94,0.12)",
              borderRadius: "2px",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                color: "#22C55E",
                fontSize: FONT.sizeSm,
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              Nominal
            </span>
          </div>
        )}
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
// AlertBanner — always visible; content and style vary by status
// ---------------------------------------------------------------------------
function AlertBanner({ isDegraded }: { isDegraded: boolean }) {
  const bg = isDegraded ? ALERT_BG : "rgba(34,197,94,0.10)";
  const fg = isDegraded ? ALERT_FG : "#86EFAC";
  const message = isDegraded
    ? "Jammer #2 fault detected. Radar is in detection only mode on 5.8 GHz band. Jamming capability reduced."
    : "All systems operational. Radar running at full capacity.";

  return (
    <div
      style={{
        background: bg,
        borderRadius: "4px",
        padding: "8px 12px",
        display: "flex",
        alignItems: "flex-start",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: fg,
          fontSize: FONT.sizeSm,
          lineHeight: "1.2",
          flex: 1,
          minWidth: 0,
        }}
      >
        {message}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoSection — always-visible name / mission / location / stats block
// ---------------------------------------------------------------------------
function InfoSection({
  asset,
  deviceStatus,
}: {
  asset: Asset;
  deviceStatus?: DeviceStatusEntry;
}) {
  const heartbeat = formatLastSeen(deviceStatus?.last_seen);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
      {/* Row 1: name (left) + mission (right) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "129px" }}>
          <span
            style={{
              color: "#FFFFFF",
              fontSize: FONT.sizeMd,
              lineHeight: "20px",
              fontWeight: 500,
            }}
          >
            {asset.name}
          </span>
          <span
            style={{
              color: "#FAFAFA",
              fontSize: FONT.sizeXs,
              lineHeight: "12px",
              whiteSpace: "nowrap",
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
            gap: "5px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: FONT.sizeSm,
              lineHeight: "16px",
            }}
          >
            Mission
          </span>
          <span
            style={{
              color: "#FFFFFF",
              fontSize: FONT.sizeMd,
              lineHeight: "20px",
            }}
          >
            Alpha Battalion
          </span>
        </div>
      </div>

      {/* Row 2: location — single vertical column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <span
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: FONT.sizeSm,
            lineHeight: "16px",
          }}
        >
          Northern Command
        </span>
        <span
          style={{
            color: "#FFFFFF",
            fontSize: FONT.sizeMd,
            lineHeight: "20px",
          }}
        >
          {asset.area ?? "Airport North Tower"}
        </span>
      </div>

      {/* Row 3: stats — Heartbeat / Uptime / Last Check */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {(
          [
            ["Heartbeat", heartbeat, "83px"],
            ["Uptime", "14h 22m", "59px"],
            ["Last Check", "09:14 AM", "64px"],
          ] as [string, string, string][]
        ).map(([label, value, width]) => (
          <div
            key={label}
            style={{ display: "flex", flexDirection: "column", gap: "5px", width }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: FONT.sizeSm,
                lineHeight: "16px",
              }}
            >
              {label}
            </span>
            <span
              style={{
                color: "#FFFFFF",
                fontSize: FONT.sizeMd,
                lineHeight: "20px",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payload Feeds accordion content
// ---------------------------------------------------------------------------
const RADAR_SENSORS = ["EO Camera", "IR/Therma", "RF Sensor", "Slot 4"];

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
          src="/radar-feed-image.png"
          alt="Radar sensor feed"
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
              background: "#D93333",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "#D93333", fontSize: "10px", lineHeight: "14px" }}>
            REC 00:11:24
          </span>
        </div>
        {/* Expand button */}
        <button
          type="button"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: COLOR.missionCreateFieldBg,
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
        {/* Watermark */}
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
        {RADAR_SENSORS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSensor(i)}
            style={{
              background:
                i === activeSensor
                  ? COLOR.missionCreateFooterBorder
                  : COLOR.missionCreateFieldBorder,
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
// Overview — Detection / Jamming frequencies (Figma 726:8809, 726:8836)
// ---------------------------------------------------------------------------
const DETECTION_FREQ_ROWS = [
  ["433 MHz", "868 MHz", "2.4 GHz", "5.8 GHz"],
  ["1.2 GHz GPS", "1.5 GHz GPS"],
] as const;

const JAMMING_FREQS = ["433 MHz", "868 MHz", "1.5 GHz GPS"] as const;

function FrequencyChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const style: React.CSSProperties = selected
    ? {
      fontSize: FONT.sizeSm,
      lineHeight: "16px",
      fontFamily: `${FONT.family}, sans-serif`,
      padding: "4px 8px",
      borderRadius: "2px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flexShrink: 0,
      border: `1px solid ${FREQ_PRIMARY}`,
      color: FREQ_PRIMARY,
      background: "transparent",
    }
    : {
      fontSize: FONT.sizeSm,
      lineHeight: "16px",
      fontFamily: `${FONT.family}, sans-serif`,
      padding: "4px 8px",
      borderRadius: "2px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flexShrink: 0,
      border: "1px solid transparent",
      background: COLOR.missionCreateFieldBg,
      color: COLOR.missionsSecondaryText,
    };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? "Deselect" : "Select"} ${label}`}
      style={style}
    >
      {label}
    </button>
  );
}

function DetectionFrequenciesContent({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {DETECTION_FREQ_ROWS[0].map((label) => (
          <FrequencyChip
            key={label}
            label={label}
            selected={selected.has(label)}
            onToggle={() => onToggle(label)}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        {DETECTION_FREQ_ROWS[1].map((label) => (
          <FrequencyChip
            key={label}
            label={label}
            selected={selected.has(label)}
            onToggle={() => onToggle(label)}
          />
        ))}
      </div>
    </div>
  );
}

function JammingFrequenciesContent({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      {JAMMING_FREQS.map((label) => (
        <FrequencyChip
          key={label}
          label={label}
          selected={selected.has(label)}
          onToggle={() => onToggle(label)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab — accordions only (header lives in card body)
// ---------------------------------------------------------------------------
function OverviewTab({ asset, isDegraded }: { asset: Asset; isDegraded: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  const [detFreqSelected, setDetFreqSelected] = useState(
    () => new Set<string>([...DETECTION_FREQ_ROWS[0], ...DETECTION_FREQ_ROWS[1]]),
  );
  const [jamFreqSelected, setJamFreqSelected] = useState(() => new Set<string>());

  const toggleDetFreq = (id: string) => {
    setDetFreqSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleJamFreq = (id: string) => {
    setJamFreqSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <AccordionSection
        label="Payload Feeds"
        isOpen={open === "payload"}
        onToggle={() => toggle("payload")}
      >
        <PayloadFeedsContent />
      </AccordionSection>
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
        bodyBorderTop={false}
      >
        <DetectionFrequenciesContent selected={detFreqSelected} onToggle={toggleDetFreq} />
      </AccordionSection>

      <AccordionSection
        label="Jamming Frequencies"
        isOpen={open === "jamFreq"}
        onToggle={() => toggle("jamFreq")}
        bodyBorderTop={false}
      >
        <JammingFrequenciesContent selected={jamFreqSelected} onToggle={toggleJamFreq} />
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hardware tab — accordions only (header lives in card body)
// ---------------------------------------------------------------------------
function HardwareTab() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  const ok = { bg: HW_GREEN_PILL_BG, fg: HW_GREEN, text: "OK" };
  const fault = { bg: HW_RED_PILL_BG, fg: HW_RED, text: "Fault" };
  const warnPill = (text: string) => ({ bg: HW_ORANGE_PILL_BG, fg: HW_ORANGE, text });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <HardwareAccordionSection
        label="Detection system"
        isOpen={open === "detection"}
        onToggle={() => toggle("detection")}
      >
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="RF Detection unit"
          subtitle="All bands operational"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Spectrum analyser"
          subtitle="Parsing +library mode active"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="GPS / position unit"
          subtitle="Lock acquired • accuracy ±0.8m"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Angle / gimbal sensor"
          subtitle="H: 45° • V: ≠5° • Calibrated"
          badge={ok}
        />
      </HardwareAccordionSection>

      <HardwareAccordionSection
        label="Jammers"
        isOpen={open === "jammers"}
        onToggle={() => toggle("jammers")}
      >
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Jammer #1"
          subtitle="433 MHz • 868 MHz • 2.4 GHz"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Jammer #2"
          subtitle="5.8 GHz - amplifier fault"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_RED}
          title="Jammer #3"
          subtitle="1.2 GHz GPS • 1.5 GHz GPS"
          badge={fault}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Jammer #4"
          subtitle="Reserved • standby mode"
          badge={ok}
        />
      </HardwareAccordionSection>

      <HardwareAccordionSection
        label="Software & Firmware"
        isOpen={open === "software"}
        onToggle={() => toggle("software")}
      >
        <HardwareStatusRow
          dotColor={HW_ORANGE}
          title="Firmware"
          subtitle="Current: v2.2.0 • Available: v2.4.1"
          badge={warnPill("Update")}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Config Sync"
          subtitle="Synced at 8:50 today"
          badge={{ bg: HW_GREEN_PILL_BG, fg: HW_GREEN, text: "Synced" }}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Internal clock"
          subtitle={`NTP synced • drift <5ms`}
          badge={ok}
        />
      </HardwareAccordionSection>

      <HardwareAccordionSection
        label="Connectivity & Power"
        isOpen={open === "connectivity"}
        onToggle={() => toggle("connectivity")}
      >
        <HardwareStatusRow
          dotColor={HW_ORANGE}
          title="Communication link"
          subtitle="Signal: 62% • Weak"
          badge={warnPill("OK")}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Power supply"
          subtitle="Mains • 230V • Stable"
          badge={ok}
        />
        <HardwareStatusRow
          dotColor={HW_GREEN}
          title="Backup battery"
          subtitle="Charged 94% ~ 6h runtime"
          badge={ok}
        />
      </HardwareAccordionSection>
    </div>
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

function LogsTab() {
  return (
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
                  fontSize: FONT.sizeXs,
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
                fontSize: FONT.sizeXs,
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

function MissionDetailsFooter() {
  const btnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "2px",
    fontSize: FONT.sizeSm,
    lineHeight: "16px",
    cursor: "pointer",
    border: `1px solid ${COLOR.missionCreateFooterBorder}`,
    padding: "4px 8px",
    background: COLOR.missionsCardBg,
    color: COLOR.missionCreateFieldText,
  };

  return (
    <div
      style={{
        paddingTop: "4px",
        flexShrink: 0,
        display: "flex",
        gap: "4px",
        width: "100%",
      }}
    >
      <button
        type="button"
        style={btnStyle}
        onClick={() => {
          /* Mission action — wire when flow is ready */
        }}
      >
        Mission
      </button>
      <button
        type="button"
        style={btnStyle}
        onClick={() => {
          /* Send Command action — wire when flow is ready */
        }}
      >
        Send Command
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEV: Hard-code the first radar that is opened as degraded for UI testing.
// Remove this block (and the check below) when real WS status is available.
// ---------------------------------------------------------------------------
let _devDegradedId: string | null = null;

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

  // DEV: Pin the first radar opened as permanently degraded.
  if (_devDegradedId === null) _devDegradedId = asset.id;

  const isDegraded =
    asset.id === _devDegradedId ||
    deviceStatus?.status === "DEGRADED" ||
    deviceStatus?.op_status === "DEGRADED";

  return (
    <div className="driif-mission-scrollbar" style={{ ...CARD_STYLE, ...style }}>
      {/* 1. Top bar */}
      <TopBar isDegraded={isDegraded} />

      {/* 2. Alert banner — always visible */}
      <AlertBanner isDegraded={isDegraded} />

      {/* 3. Info section — always visible */}
      <InfoSection asset={asset} deviceStatus={deviceStatus} />

      {/* 4. Tab bar */}
      <div style={{ display: "flex", gap: "4px" }}>
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

      {/* 5. Tab content — accordions / log entries only */}
      {activeTab === "overview" && <OverviewTab asset={asset} isDegraded={isDegraded} />}
      {activeTab === "hardware" && <HardwareTab />}
      {activeTab === "logs" && <LogsTab />}

      {/* 6. Mission assignment (from active workspace mission) */}
      <MissionDetailsFooter />
    </div>
  );
}
