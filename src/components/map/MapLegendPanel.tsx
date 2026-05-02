"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import {
  type MapLayerToggleKey,
  type MapLayerToggles,
} from "@/components/map/mapLayerGroups";
import { COLOR, FONT, POSITION } from "@/styles/driifTokens";

const STORAGE_KEY_LEGEND = "aeroshield:map-legend-expanded";

export type MapLegendPanelProps = {
  toggles: MapLayerToggles;
  onSetLayer: (key: MapLayerToggleKey, value: boolean) => void;
  onResetLayers: () => void;
};

const ROWS: {
  key: MapLayerToggleKey;
  label: string;
  swatch: ReactNode;
}[] = [
  {
    key: "zones",
    label: "Zones / geofences",
    swatch: (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm ring-1"
        style={{
          background: "rgba(168, 85, 247, 0.45)",
          borderColor: "rgba(196, 181, 253, 0.8)",
        }}
      />
    ),
  },
  {
    key: "detection",
    label: "Detection rings",
    swatch: (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-dashed ring-1"
        style={{
          borderColor: COLOR.accentCyan,
          background: "rgba(6, 182, 212, 0.18)",
          boxShadow: "0 0 0 1px rgba(6, 182, 212, 0.35)",
        }}
      />
    ),
  },
  {
    key: "jammer",
    label: "Jammer rings",
    swatch: (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1"
        style={{
          background: "rgba(249, 115, 22, 0.45)",
          boxShadow: "0 0 0 1px rgba(251, 146, 60, 0.6)",
        }}
      />
    ),
  },
  {
    key: "breach",
    label: "Breach rings",
    swatch: (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1"
        style={{
          background: "rgba(16, 185, 129, 0.35)",
          boxShadow: "0 0 0 1px rgba(251, 191, 36, 0.65)",
        }}
      />
    ),
  },
];

export function MapLegendPanel({
  toggles,
  onSetLayer,
  onResetLayers,
}: MapLegendPanelProps) {
  const panelId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legendExpanded, setLegendExpanded] = useState<boolean>(() => {
    try {
      const v =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY_LEGEND)
          : null;
      return v === "1";
    } catch {
      return false;
    }
  });

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const toggleLegend = useCallback(() => {
    setLegendExpanded((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORAGE_KEY_LEGEND, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const legendMuted = COLOR.missionsSecondaryText;
  const titleColor = COLOR.missionsTitleMuted;

  return (
    <>
      {/* Drawer — slides in from right, vertically centered; no backdrop (map stays full brightness) */}
      <div
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${panelId}-title`}
        className="fixed z-30 max-h-[85vh] w-[min(280px,calc(100vw-34px))] overflow-y-auto rounded-l-[2px] text-xs shadow-lg backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{
          right: POSITION.bellRight,
          top: "50%",
          pointerEvents: drawerOpen ? "auto" : "none",
          transform: drawerOpen
            ? "translate(0, -50%)"
            : "translate(calc(100% + 16px), -50%)",
          background: "rgba(39, 39, 39, 0.95)",
          border: `1px solid ${COLOR.borderMedium}`,
          borderRight: "none",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.45)",
          fontFamily: `${FONT.family}, sans-serif`,
        }}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
      >
        <div
          className="flex items-center justify-between gap-2 border-b px-2 py-2"
          style={{ borderColor: COLOR.borderMedium }}
        >
          <h2
            id={`${panelId}-title`}
            className="min-w-0 truncate text-left"
            style={{ color: titleColor, fontWeight: FONT.weightMedium }}
          >
            Layers{" "}
            <span style={{ color: legendMuted, fontWeight: 400 }}>· Legend</span>
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: legendMuted }}
            aria-label="Close layers panel"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          {ROWS.map(({ key, label, swatch }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 py-0.5"
              style={{ color: COLOR.missionsBodyText }}
            >
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={(e) => onSetLayer(key, e.target.checked)}
                className="shrink-0 rounded border-slate-600 accent-cyan-500"
              />
              {swatch}
              <span style={{ fontSize: FONT.sizeSm, lineHeight: "17px" }}>
                {label}
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={onResetLayers}
            className="mt-1 w-full cursor-pointer text-left text-[10px] underline decoration-slate-500 underline-offset-2 transition-colors hover:text-slate-200"
            style={{ color: legendMuted }}
          >
            Reset layers
          </button>
        </div>

        <button
          type="button"
          onClick={toggleLegend}
          className="flex w-full cursor-pointer items-center justify-between border-t px-2 py-1.5 transition-colors hover:bg-white/5"
          style={{
            borderColor: COLOR.borderMedium,
            color: legendMuted,
          }}
        >
          <span className="text-[10px] uppercase tracking-wider">Legend</span>
          <span className="text-[10px]">
            {legendExpanded ? "hide" : "show"}
          </span>
        </button>

        {legendExpanded && (
          <div
            className="space-y-2 border-t p-2"
            style={{ borderColor: COLOR.borderMedium }}
          >
            <LegendSection title="Radars">
              <LegendRow
                color={COLOR.mapRadarSweepDetectionWedge}
                text="Detection wedge (sector / boresight)"
              />
              <LegendRow
                color={COLOR.mapRadarSweepJammerWedge}
                text="Jammer wedge (amber)"
              />
            </LegendSection>
            <LegendSection title="Breach rings">
              <LegendRow
                color={COLOR.mapRadarBreachGreenStroke}
                text="Green — outer / safe"
              />
              <LegendRow
                color={COLOR.mapRadarBreachYellowStroke}
                text="Amber — warn"
              />
              <LegendRow
                color={COLOR.mapRadarBreachRedStroke}
                text="Red — engage"
              />
            </LegendSection>
            <LegendSection title="Drones">
              <LegendRow color={COLOR.droneEnemy} text="Hostile / unknown" />
              <LegendRow color={COLOR.droneFriendly} text="Friendly" />
            </LegendSection>
            <LegendSection title="Zones">
              <LegendRow color={COLOR.zoneRed} text="TL-1 / critical" />
              <LegendRow color={COLOR.zoneAmber} text="TL-2 / elevated" />
              <LegendRow
                color={COLOR.zonePurple}
                text="Inner defense / TL-4"
              />
            </LegendSection>
          </div>
        )}
      </div>

      {/* FAB — right edge, viewport vertical center; hidden while drawer is open */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={openDrawer}
          className="fixed top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full shadow-lg transition-[background,transform] hover:scale-[1.03] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
          style={{
            right: POSITION.bellRight,
            background: "rgba(39, 39, 39, 0.92)",
            border: `1px solid ${COLOR.borderMedium}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            color: titleColor,
          }}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label="Open map layers and legend"
        >
          <LayersStackIcon className="h-5 w-5" aria-hidden />
        </button>
      )}
    </>
  );
}

function LayersStackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.48 6.09a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12.65c0 .24.15.45.39.54l8.65 3.92a2 2 0 0 0 1.66 0l8.65-3.92a.65.65 0 0 0 0-1.19L12.7 9.44a2 2 0 0 0-1.66 0l-8.65 3.92a.65.65 0 0 0-.39.29z" />
      <path d="M2 17.65c0 .24.15.45.39.54l8.65 3.92a2 2 0 0 0 1.66 0l8.65-3.92a.65.65 0 0 0 0-1.19L12.7 14.44a2 2 0 0 0-1.66 0l-8.65 3.92a.65.65 0 0 0-.39.29z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function LegendSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-0.5 text-[10px] uppercase tracking-wider"
        style={{ color: COLOR.missionsSecondaryText }}
      >
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function LegendRow({ color, text }: { color: string; text: string }) {
  return (
    <div
      className="flex items-center gap-2 text-[11px]"
      style={{ color: COLOR.missionsBodyText }}
    >
      <span
        className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-white/20"
        style={{ background: color }}
      />
      <span>{text}</span>
    </div>
  );
}
