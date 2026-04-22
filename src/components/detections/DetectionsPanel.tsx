"use client";

/**
 * Detections side panel — Figma node 1442:15801.
 * Styling: COLOR / FONT from driifTokens; Figma-only hexes marked // TODO: token
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { COLOR, FONT, RADIUS } from "@/styles/driifTokens";

const PANEL_W = 510;

// Figma-only colors (Secondary/*, Green/50, Red/*, etc.) — no matching entry in COLOR; TODO: token
const FG_LIVE = "#0CBB58";
const FG_CLOCK = "#A3A3A3";
const FG_SECTION_LABEL = "#A3A3A3";
const BG_COUNT_BADGE_RED = "#7C0000";
const BG_CRITICAL_PILL = "#530000";
const FG_CRITICAL_PILL = "#EC9999";
const BG_SWARM_ICON = "#3F180B";
const BG_POSSIBLE_PILL = "#923D1A";
const FG_POSSIBLE_PILL = "#FCEFD8";
const FG_NEUTRALIZED_ACCENT = "#0CBB58";
const BG_ENEMY_THREAT = "#91430F";
const BG_FRIENDLY_BADGE = "#1D71D8";
const BG_DRONE_NEUTRAL = "#535353";
const BG_DRONE_ENEMY = "#3F180B";
const BG_DRONE_FRIENDLY = "#1E4E8A";
const BG_ON_MISSION = "#04381A";
const FG_ON_MISSION = "#67E09C";
const BG_RETURNING = "#1E5FAF";
const FG_RETURNING = "#DBEBFE";
const FG_BATTERY_LOW = "#CF0000";

const RADIUS_MD = "4px"; // TODO: token (Figma 4px; RADIUS.panel is 2px)

const fontFamily = `${FONT.family}, sans-serif`;

function CaretDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke={COLOR.missionCreateFieldText}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwarmGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="3.5" cy="7" r="1.2" fill="white" opacity={0.25} />
      <circle cx="7" cy="7" r="1.2" fill="white" opacity={0.25} />
      <circle cx="10.5" cy="7" r="1.2" fill="white" opacity={0.25} />
    </svg>
  );
}

function DroneGlyph({ variant }: { variant: "neutral" | "enemy" | "friendly" }) {
  const bg =
    variant === "neutral"
      ? BG_DRONE_NEUTRAL
      : variant === "enemy"
        ? BG_DRONE_ENEMY
        : BG_DRONE_FRIENDLY;
  const src =
    variant === "friendly"
      ? "/icons/green-drone.png"
      : variant === "enemy"
        ? "/icons/red-drone.png"
        : "/icons/unknown-drone.png";
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: 24, height: 24, background: bg }}
    >
      <Image src={src} alt="" width={14} height={14} className="opacity-30" />
    </div>
  );
}

function StatLine({
  pairs,
  tail,
}: {
  pairs: { label: string; value: string; valueColor?: string }[];
  /** Muted radar / secondary line (Figma: RAD-02, RAD-01) */
  tail?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2" style={{ gap: "8px" }}>
      {pairs.map(({ label, value, valueColor }) => (
        <div
          key={`${label}-${value}`}
          className="flex items-start gap-1 whitespace-nowrap"
          style={{
            gap: "4px",
            fontFamily,
            fontSize: FONT.sizeSm,
            lineHeight: FONT.missionReviewLine12LineHeight,
            fontWeight: FONT.weightNormal,
            color: COLOR.missionReviewChecklistHeading,
          }}
        >
          {label ? <span style={{ opacity: 0.6 }}>{label}</span> : null}
          <span style={valueColor ? { color: valueColor } : undefined}>{value}</span>
        </div>
      ))}
      {tail ? (
        <p
          style={{
            fontFamily,
            fontSize: FONT.sizeSm,
            lineHeight: FONT.missionReviewLine12LineHeight,
            fontWeight: FONT.weightNormal,
            color: COLOR.missionReviewChecklistHeading,
            opacity: 0.6,
          }}
        >
          {tail}
        </p>
      ) : null}
    </div>
  );
}

function FooterPills({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-2" style={{ gap: "8px" }}>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 whitespace-nowrap border border-solid"
      style={{
        borderColor: COLOR.missionsCardBg,
        borderRadius: RADIUS_MD,
        fontFamily,
        fontSize: FONT.missionReviewDetail10Size,
        lineHeight: "21px",
        color: COLOR.missionCreateDatePickerSelectionText,
        gap: "8px",
        paddingLeft: "8px",
        paddingRight: "8px",
        paddingTop: "2px",
        paddingBottom: "2px",
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  badgeBg,
  sub,
}: {
  label: string;
  count: number;
  badgeBg: string;
  sub?: string;
}) {
  return (
    <div
      className="flex items-center pl-3"
      style={{ gap: sub ? "4px" : "4px", paddingLeft: "12px" }}
    >
      <p
        style={{
          fontFamily,
          fontWeight: FONT.weightMedium,
          fontSize: FONT.sizeSm,
          lineHeight: FONT.missionReviewLine12LineHeight,
          color: FG_SECTION_LABEL,
        }}
      >
        {label}
      </p>
      <div
        className="flex flex-col items-center justify-center px-1"
        style={{
          background: badgeBg,
          borderRadius: RADIUS.panel,
          paddingLeft: "4px",
          paddingRight: "4px",
        }}
      >
        <p
          style={{
            fontFamily,
            fontWeight: FONT.weightBold,
            fontSize: FONT.missionReviewDetail10Size,
            lineHeight: FONT.missionReviewLine12LineHeight,
            color: COLOR.missionReviewChecklistHeading,
            width: "100%",
            textAlign: "center",
          }}
        >
          {count}
        </p>
      </div>
      {sub ? (
        <p
          style={{
            fontFamily,
            fontWeight: FONT.weightNormal,
            fontSize: FONT.sizeSm,
            lineHeight: FONT.missionReviewLine12LineHeight,
            color: FG_SECTION_LABEL,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function ListRowShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full items-center border-b border-solid pb-3"
      style={{
        borderColor: COLOR.missionCreateFieldBorder,
        paddingBottom: "12px",
      }}
    >
      <div
        className="flex min-w-0 flex-1 flex-col items-start gap-2 px-4"
        style={{ gap: "8px", paddingLeft: "16px", paddingRight: "16px" }}
      >
        {children}
      </div>
    </div>
  );
}

function SwarmRow({
  id,
  statusLabel,
  statusBg,
  statusFg,
  line1Left,
  line1Right,
  stats,
  statsTail,
  pills,
}: {
  id: string;
  statusLabel: string;
  statusBg: string;
  statusFg: string;
  line1Left: React.ReactNode;
  line1Right: string;
  stats: { label: string; value: string }[];
  statsTail: string;
  pills: [string, string];
}) {
  return (
    <ListRowShell>
      <div className="flex w-full flex-col gap-2" style={{ gap: "8px" }}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2" style={{ gap: "8px" }}>
            <div
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ width: 24, height: 24, background: BG_SWARM_ICON }}
            >
              <SwarmGlyph />
            </div>
            <p
              style={{
                fontFamily,
                fontWeight: FONT.weightNormal,
                fontSize: FONT.sizeSm,
                lineHeight: "21px",
                color: COLOR.missionCreateDatePickerSelectionText,
              }}
            >
              {id}
            </p>
          </div>
          <div
            className="flex shrink-0 items-center justify-center px-1.5 py-0.5"
            style={{
              background: statusBg,
              borderRadius: RADIUS.panel,
              paddingLeft: "6px",
              paddingRight: "6px",
              paddingTop: "2px",
              paddingBottom: "2px",
            }}
          >
            <p
              style={{
                fontFamily,
                fontWeight: FONT.weightNormal,
                fontSize: FONT.sizeSm,
                lineHeight: "21px",
                color: statusFg,
                whiteSpace: "nowrap",
              }}
            >
              {statusLabel}
            </p>
          </div>
        </div>
        <div
          className="flex w-full flex-wrap items-center gap-2 whitespace-nowrap"
          style={{ gap: "8px", fontSize: FONT.sizeSm, lineHeight: FONT.missionReviewLine12LineHeight, color: COLOR.missionReviewChecklistHeading }}
        >
          {line1Left}
          <p style={{ opacity: 0.6 }}>{line1Right}</p>
        </div>
        <StatLine
          pairs={stats.map((s) => ({
            label: s.label,
            value: s.value,
          }))}
          tail={statsTail}
        />
        <FooterPills>
          <Pill>
            <span>{pills[0]}</span>
            <span>{pills[1]}</span>
          </Pill>
        </FooterPills>
      </div>
    </ListRowShell>
  );
}

function EnemyDroneRow({
  variant,
  id,
  statusNode,
  stats,
  statsTail,
  pills,
}: {
  variant: "neutral" | "enemy";
  id: string;
  statusNode: React.ReactNode;
  stats: { label: string; value: string }[];
  statsTail: string;
  pills: React.ReactNode;
}) {
  return (
    <ListRowShell>
      <div className="flex w-full flex-col gap-2" style={{ gap: "8px" }}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2" style={{ gap: "8px" }}>
            <DroneGlyph variant={variant === "neutral" ? "neutral" : "enemy"} />
            <p
              style={{
                fontFamily,
                fontWeight: FONT.weightNormal,
                fontSize: FONT.sizeSm,
                lineHeight: "21px",
                color: COLOR.missionCreateDatePickerSelectionText,
              }}
            >
              {id}
            </p>
          </div>
          {statusNode}
        </div>
        <StatLine pairs={stats.map((s) => ({ label: s.label, value: s.value }))} tail={statsTail} />
        {pills}
      </div>
    </ListRowShell>
  );
}

function FriendlyDroneRow({
  id,
  statusNode,
  stats,
  statsTail,
  pills,
}: {
  id: string;
  statusNode: React.ReactNode;
  stats: { label: string; value: string; valueColor?: string }[];
  statsTail: string;
  pills: React.ReactNode;
}) {
  return (
    <ListRowShell>
      <div className="flex w-full flex-col gap-2" style={{ gap: "8px" }}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2" style={{ gap: "8px" }}>
            <DroneGlyph variant="friendly" />
            <p
              style={{
                fontFamily,
                fontWeight: FONT.weightNormal,
                fontSize: FONT.sizeSm,
                lineHeight: "21px",
                color: COLOR.missionCreateDatePickerSelectionText,
              }}
            >
              {id}
            </p>
          </div>
          {statusNode}
        </div>
        <StatLine pairs={stats} tail={statsTail} />
        {pills}
      </div>
    </ListRowShell>
  );
}

function DetectionsHeader({ titleId }: { titleId: string }) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex w-full flex-col gap-2 px-4" style={{ gap: "8px", paddingLeft: "16px", paddingRight: "16px" }}>
      <div className="flex w-full min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2" style={{ gap: "8px" }}>
          <h2
            id={titleId}
            style={{
              fontFamily,
              fontWeight: FONT.weightMedium,
              fontSize: FONT.missionWorkspaceTitleSize,
              lineHeight: FONT.missionWorkspaceTitleLineHeight,
              color: COLOR.missionsTitleMuted,
            }}
          >
            Detections
          </h2>
          <div className="flex items-center gap-1.5" style={{ gap: "5px" }}>
            <div
              className="shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: FG_LIVE }}
            />
            <span
              style={{
                fontFamily,
                fontWeight: FONT.weightMedium,
                fontSize: FONT.sizeSm,
                lineHeight: FONT.missionReviewLine12LineHeight,
                color: FG_LIVE,
              }}
            >
              LIVE
            </span>
          </div>
        </div>
        <p
          style={{
            fontFamily,
            fontWeight: FONT.weightMedium,
            fontSize: FONT.sizeMd,
            lineHeight: "21px",
            color: FG_CLOCK,
            whiteSpace: "nowrap",
          }}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

function SummaryCards() {
  const cards: { value: string; label: string; labelColor: string }[] = [
    { value: "14", label: "Active", labelColor: FG_CLOCK },
    { value: "2", label: "SWARMS", labelColor: COLOR.missionsSecondaryText },
    { value: "12", label: "ENEMY", labelColor: COLOR.missionsSecondaryText },
  ];
  return (
    <div className="flex w-full items-center" style={{ gap: "10px" }}>
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex min-w-0 flex-1 flex-col items-center justify-center border border-solid p-3"
          style={{
            background: COLOR.missionCreateSectionBg,
            borderColor: COLOR.missionCreateFieldBorder,
            borderRadius: RADIUS_MD,
            padding: "12px",
          }}
        >
          <p
            style={{
              fontFamily,
              fontWeight: FONT.weightMedium,
              fontSize: FONT.missionWorkspaceTitleSize,
              lineHeight: FONT.missionWorkspaceTitleLineHeight,
              color: COLOR.missionReviewChecklistHeading,
              width: "100%",
              textAlign: "center",
            }}
          >
            {c.value}
          </p>
          <p
            style={{
              fontFamily,
              fontWeight: FONT.weightMedium,
              fontSize: FONT.sizeSm,
              lineHeight: FONT.missionReviewLine12LineHeight,
              color: c.labelColor,
              textTransform: "uppercase",
              width: "100%",
              textAlign: "center",
            }}
          >
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

const FILTERS = ["All", "Swarms", "Enemy", "Friendly"] as const;

export type DetectionFilter = "all" | "swarms" | "enemy" | "friendly";

const FILTER_LABEL: Record<DetectionFilter, (typeof FILTERS)[number]> = {
  all: "All",
  swarms: "Swarms",
  enemy: "Enemy",
  friendly: "Friendly",
};

const FILTER_ORDER: DetectionFilter[] = ["all", "swarms", "enemy", "friendly"];

function FilterBar({
  active,
  onChange,
}: {
  active: DetectionFilter;
  onChange: (f: DetectionFilter) => void;
}) {
  return (
    <div className="flex w-full items-start justify-between">
      <div className="flex flex-wrap items-center gap-2.5" style={{ gap: "10px" }}>
        {FILTER_ORDER.map((key) => {
          const label = FILTER_LABEL[key];
          const isOn = active === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(key)}
              className="flex flex-col items-center justify-center border border-solid px-2 py-1"
              style={{
                background: isOn ? COLOR.missionCreatePrimaryChipBg : COLOR.missionCreateFieldBg,
                borderColor: COLOR.missionCreateFieldBorder,
                borderRadius: RADIUS_MD,
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "4px",
                paddingBottom: "4px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontWeight: FONT.weightMedium,
                  fontSize: FONT.sizeSm,
                  lineHeight: FONT.missionReviewLine12LineHeight,
                  color: isOn ? COLOR.missionCreatePrimaryChipText : COLOR.missionCreateFieldText,
                  textAlign: "center",
                  width: "100%",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 border border-solid px-2 py-1"
        style={{
          background: COLOR.missionCreateFieldBg,
          borderColor: COLOR.missionCreateFieldBorder,
          borderRadius: RADIUS_MD,
          paddingLeft: "8px",
          paddingRight: "8px",
          paddingTop: "4px",
          paddingBottom: "4px",
          gap: "4px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily,
            fontWeight: FONT.weightMedium,
            fontSize: FONT.sizeSm,
            lineHeight: FONT.missionReviewLine12LineHeight,
            color: COLOR.missionCreateFieldText,
            whiteSpace: "nowrap",
          }}
        >
          All Radars
        </span>
        <CaretDownIcon />
      </button>
    </div>
  );
}

export function DetectionsPanel() {
  const titleId = "detections-panel-title";
  const [filter, setFilter] = useState<DetectionFilter>("all");

  const showSwarms = filter === "all" || filter === "swarms";
  const showEnemy = filter === "all" || filter === "enemy";
  const showFriendly = filter === "all" || filter === "friendly";

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="false"
      className="driif-mission-scrollbar flex max-h-[calc(100vh-96px)] flex-col overflow-y-auto"
      style={{
        width: PANEL_W,
        background: COLOR.missionsPanelBg,
        gap: "14px",
        paddingTop: "16px",
        paddingBottom: "16px",
        fontFamily,
      }}
    >
      <DetectionsHeader titleId={titleId} />
      <div className="flex w-full flex-col gap-3 px-4" style={{ gap: "12px", paddingLeft: "16px", paddingRight: "16px" }}>
        <SummaryCards />
        <FilterBar active={filter} onChange={setFilter} />
      </div>
      <div className="flex w-full flex-col gap-3.5" style={{ gap: "14px" }}>
        {showSwarms ? (
        <div className="flex w-full flex-col gap-3.5" style={{ gap: "14px" }}>
          <SectionHeader label="SWARMS" count={7} badgeBg={BG_COUNT_BADGE_RED} />
          <div className="flex w-full flex-col gap-3.5" style={{ gap: "14px" }}>
            <SwarmRow
              id="SWM-DEL-26-3-01"
              statusLabel="Critical: 87%"
              statusBg={BG_CRITICAL_PILL}
              statusFg={FG_CRITICAL_PILL}
              line1Left={
                <span>
                  <span style={{ color: FG_NEUTRALIZED_ACCENT }}>5</span>
                  <span style={{ opacity: 0.6 }}>/56 Drones Neutralized </span>
                </span>
              }
              line1Right="12 Drone • V-formation • Co-ordinated attack"
              stats={[
                { label: "Speed", value: "52 km/h" },
                { label: "Hdg", value: "210º" },
                { label: "ETA", value: "4m 20s" },
              ]}
              statsTail="RAD-02, RAD-01"
              pills={["14:33:02", "Sector B • 240m"]}
            />
            <SwarmRow
              id="SWM-DEL-26-3-01"
              statusLabel="Possible: 54%"
              statusBg={BG_POSSIBLE_PILL}
              statusFg={FG_POSSIBLE_PILL}
              line1Left={
                <span>
                  <span style={{ color: FG_NEUTRALIZED_ACCENT }}>5</span>
                  <span style={{ opacity: 0.6 }}>/56 Drones Neutralized </span>
                </span>
              }
              line1Right="12 Drone • V-formation • Co-ordinated attack"
              stats={[
                { label: "Speed", value: "52 km/h" },
                { label: "Hdg", value: "210º" },
                { label: "ETA", value: "4m 20s" },
              ]}
              statsTail="RAD-02, RAD-01"
              pills={["14:33:02", "Sector B • 240m"]}
            />
          </div>
        </div>
        ) : null}

        {showEnemy ? (
        <div className="flex w-full flex-col gap-3.5" style={{ gap: "14px" }}>
          <SectionHeader
            label="ENEMY DRONE"
            count={14}
            badgeBg={BG_COUNT_BADGE_RED}
            sub="Inc. 12 in Swarms"
          />
          <EnemyDroneRow
            variant="neutral"
            id="DEL-26-03-011"
            statusNode={
              <div
                className="flex items-center justify-center px-1.5 py-0.5"
                style={{
                  background: COLOR.missionCreateFieldBorder,
                  borderRadius: RADIUS.panel,
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: FONT.sizeSm,
                    lineHeight: "21px",
                    color: COLOR.missionsBodyText,
                  }}
                >
                  Neutralized
                </span>
              </div>
            }
            stats={[
              { label: "Speed", value: "52 km/h" },
              { label: "Alt", value: "78m" },
              { label: "Dist", value: "220m" },
            ]}
            statsTail="RAD-02"
            pills={
              <FooterPills>
                <Pill>
                  <>
                    <span>14:33:02</span>
                    <span>Sector B • 240m</span>
                  </>
                </Pill>
                <Pill>
                  <>
                    <span>SWM-DEL-26-03-01</span>
                    <span>Attack</span>
                  </>
                </Pill>
              </FooterPills>
            }
          />
          <EnemyDroneRow
            variant="enemy"
            id="DEL-26-03-011"
            statusNode={
              <div
                className="flex items-center justify-center px-1.5 py-0.5"
                style={{
                  background: BG_ENEMY_THREAT,
                  borderRadius: RADIUS.panel,
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: FONT.sizeSm,
                    lineHeight: "21px",
                    color: FG_POSSIBLE_PILL,
                  }}
                >
                  45%
                </span>
              </div>
            }
            stats={[
              { label: "Speed", value: "52 km/h" },
              { label: "Alt", value: "78m" },
              { label: "Dist", value: "1.6 km" },
            ]}
            statsTail="RAD-03"
            pills={
              <FooterPills>
                <Pill>
                  <>
                    <span>14:33:02</span>
                    <span>Standalone</span>
                  </>
                </Pill>
                <Pill>
                  <span>Surveillance</span>
                </Pill>
              </FooterPills>
            }
          />
        </div>
        ) : null}

        {showFriendly ? (
        <div className="flex w-full flex-col gap-3.5" style={{ gap: "14px" }}>
          <SectionHeader label="FRIENDLY DRONE" count={10} badgeBg={BG_FRIENDLY_BADGE} />
          <FriendlyDroneRow
            id="DEL-26-03-011"
            statusNode={
              <div
                className="flex items-center justify-center px-1.5 py-0.5"
                style={{
                  background: BG_ON_MISSION,
                  borderRadius: RADIUS.panel,
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: FONT.sizeSm,
                    lineHeight: "21px",
                    color: FG_ON_MISSION,
                  }}
                >
                  On Mission
                </span>
              </div>
            }
            stats={[
              { label: "Speed", value: "52 km/h" },
              { label: "Alt", value: "78m" },
              { label: "Bat", value: "88%", valueColor: FG_LIVE },
            ]}
            statsTail="RAD-03"
            pills={
              <FooterPills>
                <Pill>
                  <>
                    <span>14:33:02</span>
                    <span>Standalone • Leg 1 of 3</span>
                  </>
                </Pill>
                <Pill>
                  <span>Surveillance</span>
                </Pill>
              </FooterPills>
            }
          />
          <FriendlyDroneRow
            id="DEL-26-03-011"
            statusNode={
              <div
                className="flex items-center justify-center px-1.5 py-0.5"
                style={{
                  background: BG_RETURNING,
                  borderRadius: RADIUS.panel,
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily,
                    fontSize: FONT.sizeSm,
                    lineHeight: "21px",
                    color: FG_RETURNING,
                  }}
                >
                  Returning
                </span>
              </div>
            }
            stats={[
              { label: "Speed", value: "52 km/h" },
              { label: "Alt", value: "78m" },
              { label: "Batt", value: "18%", valueColor: FG_BATTERY_LOW },
            ]}
            statsTail="RAD-03"
            pills={
              <FooterPills>
                <Pill>
                  <>
                    <span>14:33:02</span>
                    <span>Auto RTB • Low Bat</span>
                  </>
                </Pill>
                <Pill>
                  <span>Surveillance</span>
                </Pill>
              </FooterPills>
            }
          />
        </div>
        ) : null}
      </div>
    </div>
  );
}
