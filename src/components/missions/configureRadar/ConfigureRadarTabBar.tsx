"use client";

import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import type { ConfigureRadarTabId } from "@/components/missions/configureRadar/configureRadarTabIds";
import { CONFIGURE_RADAR_TABS } from "@/components/missions/configureRadar/configureRadarTabIds";

export type ConfigureRadarTabBarProps = {
  activeId: ConfigureRadarTabId;
  onChange: (id: ConfigureRadarTabId) => void;
};

/** Figma Driif-UI node 853:10308 / 680:6668 — segmented tabs (rounded 2px, gap 5px, h 23). */
export function ConfigureRadarTabBar({
  activeId,
  onChange,
}: ConfigureRadarTabBarProps) {
  return (
    <div
      className="flex min-w-0 flex-wrap"
      style={{
        gap: SPACING.missionCreateChipGap,
        minHeight: "23px",
      }}
      role="tablist"
      aria-label="Configure radar sections"
    >
      {CONFIGURE_RADAR_TABS.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="shrink-0 border-0 transition-opacity hover:opacity-90"
            style={{
              height: "23px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "4px",
              paddingBottom: "4px",
              borderRadius: RADIUS.panel,
              background: active
                ? COLOR.missionCreatePrimaryChipBg
                : COLOR.missionCreateFieldBg,
              color: active
                ? COLOR.missionCreatePrimaryChipText
                : COLOR.missionCreateFieldText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              fontWeight: FONT.weightNormal,
              lineHeight: "16px",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
