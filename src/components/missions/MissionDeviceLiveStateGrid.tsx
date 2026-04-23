"use client";

import { COLOR, FONT } from "@/styles/driifTokens";
import { relativeTimeShort } from "@/utils/deviceHealth";

type Tone = "warn" | "bad";

function rowToneColor(tone?: Tone): string {
  if (tone === "bad") return "#fca5a5";
  if (tone === "warn") return "#fcd34d";
  return COLOR.missionsBodyText;
}

/**
 * Operator-facing telemetry grid (old-ui LiveStateGrid semantics, Driif tokens).
 */
export function MissionDeviceLiveStateGrid({
  state,
}: {
  state: Record<string, unknown>;
}) {
  const items: Array<{ label: string; value: string; tone?: Tone }> = [];

  if (state.last_seen != null && typeof state.last_seen === "string") {
    items.push({
      label: "Last seen",
      value: relativeTimeShort(state.last_seen),
    });
  }
  if (state.op_status != null) {
    const os = Number(state.op_status);
    const label =
      os === 1 ? "Normal" : os === 2 ? "Degraded" : os === 3 ? "Fault" : `Code ${os}`;
    items.push({
      label: "Op status",
      value: label,
      tone: os === 1 ? undefined : os === 2 ? "warn" : "bad",
    });
  }
  if (state.power_mode === 1) {
    const bRaw = state.battery_pct;
    const b = bRaw == null ? null : Math.round(Number(bRaw));
    if (b != null && b > 0 && b < 99) {
      items.push({
        label: "Power",
        value: `AC + ${b}% backup`,
        tone: b < 15 ? "bad" : b < 30 ? "warn" : undefined,
      });
    } else {
      items.push({ label: "Power", value: "AC powered" });
    }
  } else if (state.battery_pct != null) {
    const b = Math.round(Number(state.battery_pct));
    items.push({
      label: "Power",
      value: `Battery ${b}%`,
      tone: b < 15 ? "bad" : b < 30 ? "warn" : undefined,
    });
  }
  if (state.temp_c != null) {
    const t = Number(state.temp_c);
    if (Number.isFinite(t)) {
      items.push({
        label: "Temp",
        value: `${t.toFixed(1)} °C`,
        tone: t > 75 ? "bad" : t > 60 ? "warn" : undefined,
      });
    }
  }
  if (state.humidity_pct != null) {
    items.push({
      label: "Humidity",
      value: `${Number(state.humidity_pct).toFixed(0)}%`,
    });
  }
  if (state.azimuth_deg != null && Number.isFinite(Number(state.azimuth_deg))) {
    items.push({
      label: "Azimuth",
      value: `${Number(state.azimuth_deg).toFixed(1)}°`,
    });
  }
  if (state.elevation_deg != null && Number.isFinite(Number(state.elevation_deg))) {
    items.push({
      label: "Elevation",
      value: `${Number(state.elevation_deg).toFixed(1)}°`,
    });
  }

  if (items.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: FONT.sizeXs,
          color: COLOR.missionsSecondaryText,
          fontFamily: `${FONT.family}, sans-serif`,
          fontStyle: "italic",
        }}
      >
        No telemetry received yet. Open raw status below when debugging.
      </p>
    );
  }

  return (
    <div
      className="grid gap-x-3 gap-y-1"
      style={{
        gridTemplateColumns: "1fr 1fr",
        paddingTop: "4px",
        paddingBottom: "4px",
      }}
    >
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          className="flex items-baseline justify-between gap-2 border-b pb-0.5"
          style={{ borderColor: `${COLOR.border}99` }}
        >
          <span
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
            }}
          >
            {it.label}
          </span>
          <span
            className="tabular-nums text-right"
            style={{
              fontSize: FONT.sizeXs,
              fontFamily: `${FONT.mono}, monospace`,
              color: rowToneColor(it.tone),
            }}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}
