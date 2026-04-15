"use client";

import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

// TODO: token — Figma Green/90 health status pill bg
const HEALTH_PILL_BG = "#032110";
// TODO: token — Figma Green/50 health status pill text + status dot
const HEALTH_PILL_TEXT = "#0CBB58";
// TODO: token — Figma Secondary/5 health item name text
const HEALTH_NAME_COLOR = "#FAFAFA";

type HealthItem = {
  name: string;
  detail: string;
  status: string;
};

const ITEMS: readonly HealthItem[] = [
  { name: "RF Detection unit",    detail: "All bands operational", status: "OK" },
  { name: "Spectrum analyser",    detail: "Blend Mode",            status: "OK" },
  { name: "GPS / position unit",  detail: "±0.8m",                 status: "Locked" },
  { name: "Angle / gimbal sensor",detail: "Calibrated",            status: "OK" },
  { name: "Comm Link",            detail: "Signal 94%",            status: "Strong" },
  { name: "Power Supply",         detail: "Mains 230V",            status: "Normal" },
  { name: "Backup Battery",       detail: "94% : - 6h",            status: "OK" },
];

/** Figma Driif-UI node 853:11348 — Health diagnostics list. */
export function ConfigureRadarHealthTabContent() {
  return (
    <div
      className="flex w-full flex-col"
      style={{
        background: COLOR.missionsCardBg,
        borderRadius: RADIUS.panel,
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "8px",
        paddingBottom: "8px",
        gap: SPACING.missionCreateStackGapMd,
      }}
    >
      {ITEMS.map((item, index) => {
        const isLast = index === ITEMS.length - 1;
        return (
          <div
            key={item.name}
            className="flex w-full items-center justify-between"
            style={{
              paddingBottom: "8px",
              borderBottom: isLast
                ? "none"
                : `1px solid ${COLOR.missionCreateFieldBorder}`,
            }}
          >
            {/* Left: dot + name + detail */}
            <div className="flex min-w-0 flex-1 items-center" style={{ gap: "8px" }}>
              <span
                className="shrink-0"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: HEALTH_PILL_TEXT,
                  display: "inline-block",
                }}
              />
              <div className="flex min-w-0 flex-col">
                <span
                  style={{
                    color: HEALTH_NAME_COLOR,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeSm,
                    lineHeight: "20px",
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                  }}
                >
                  {item.detail}
                </span>
              </div>
            </div>

            {/* Right: status pill */}
            <span
              className="shrink-0"
              style={{
                background: HEALTH_PILL_BG,
                borderRadius: "999px",
                paddingLeft: "4px",
                paddingRight: "4px",
                paddingTop: "2px",
                paddingBottom: "2px",
                color: HEALTH_PILL_TEXT,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: "11px",
                fontWeight: FONT.weightMedium,
                lineHeight: "12px",
                whiteSpace: "nowrap",
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
