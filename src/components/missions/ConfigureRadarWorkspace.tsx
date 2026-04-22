"use client";

/**
 * Configure Radar — Create Mission sub-step.
 * Figma Driif-UI nodes 853:10308, 853:10443, 853:10668, 853:10899, 853:11129, 853:11348.
 */

import { useState } from "react";
import type { Device } from "@/types/aeroshield";
import type { RadarConfigureDraft } from "@/types/radarMissionDraft";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import {
  MissionWorkspaceHeader,
  MissionWorkspacePanel,
} from "@/components/missions/MissionWorkspaceShell";
import type { ConfigureRadarTabId } from "@/components/missions/configureRadar/configureRadarTabIds";
import { ConfigureRadarTabBar } from "@/components/missions/configureRadar/ConfigureRadarTabBar";
import { ConfigureRadarDeviceCard } from "@/components/missions/configureRadar/ConfigureRadarDeviceCard";
import { ConfigureRadarPanelShell } from "@/components/missions/configureRadar/ConfigureRadarPanelShell";
import { ConfigureRadarDirectionTabContent } from "@/components/missions/configureRadar/ConfigureRadarDirectionTabContent";
import { ConfigureRadarDetectionTabContent } from "@/components/missions/configureRadar/ConfigureRadarDetectionTabContent";
import { ConfigureRadarJammersTabContent } from "@/components/missions/configureRadar/ConfigureRadarJammersTabContent";
import { ConfigureRadarParametersTabContent } from "@/components/missions/configureRadar/ConfigureRadarParametersTabContent";
import { ConfigureRadarHealthTabContent } from "@/components/missions/configureRadar/ConfigureRadarHealthTabContent";
import { ConfigureRadarPlusGlyph } from "@/components/missions/configureRadar/ConfigureRadarIcons";
import { CONFIGURE_RADAR_TABS } from "@/components/missions/configureRadar/configureRadarTabIds";

export type ConfigureRadarWorkspaceProps = {
  device: Device;
  draft: RadarConfigureDraft;
  onDraftChange: (next: RadarConfigureDraft) => void;
  onBack: () => void;
  onRequestAddRadar?: () => void;
};

function tabPanelLabel(id: ConfigureRadarTabId): string {
  return CONFIGURE_RADAR_TABS.find((t) => t.id === id)?.label ?? id;
}

export function ConfigureRadarWorkspace({
  device,
  draft,
  onDraftChange,
  onBack,
  onRequestAddRadar,
}: ConfigureRadarWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ConfigureRadarTabId>("direction");
  const [configureBodyExpanded, setConfigureBodyExpanded] = useState(true);

  return (
    <MissionWorkspacePanel>
      <MissionWorkspaceHeader title="Configure Radar" onBack={onBack} />

      <div className="driif-mission-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pr-1">
        <div
          className="flex flex-col"
          style={{
            gap: SPACING.missionCreateFormSectionGap,
            paddingBottom: SPACING.missionCreateBlockGapMd,
          }}
        >
          <ConfigureRadarPanelShell>
            <ConfigureRadarDeviceCard
              device={device}
              configureBodyExpanded={configureBodyExpanded}
              onToggleConfigureBody={() =>
                setConfigureBodyExpanded((open) => !open)
              }
            />

            {configureBodyExpanded ? (
              <>
                <ConfigureRadarTabBar activeId={activeTab} onChange={setActiveTab} />

                <div role="tabpanel" aria-label={tabPanelLabel(activeTab)}>
                  {activeTab === "direction" ? (
                    <ConfigureRadarDirectionTabContent
                      draft={draft}
                      onDraftChange={onDraftChange}
                    />
                  ) : null}
                  {activeTab === "detection" ? (
                    <ConfigureRadarDetectionTabContent />
                  ) : null}
                  {activeTab === "jammers" ? <ConfigureRadarJammersTabContent /> : null}
                  {activeTab === "parameters" ? (
                    <ConfigureRadarParametersTabContent />
                  ) : null}
                  {activeTab === "health" ? <ConfigureRadarHealthTabContent /> : null}
                </div>
              </>
            ) : null}
          </ConfigureRadarPanelShell>

          <div
            className="flex flex-col"
            style={{
              borderRadius: RADIUS.fencePopover,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: COLOR.missionCreateFieldBorder,
              background: COLOR.missionCreateSectionBg,
            }}
          >
            <button
              type="button"
              onClick={() => onRequestAddRadar?.()}
              className="flex w-full shrink-0 items-center justify-start border-0 transition-opacity hover:opacity-80"
              style={{
                gap: SPACING.missionCreateBlockGapMd,
                minHeight: SPACING.iconRowHeight,
                height: SPACING.iconRowHeight,
                paddingLeft: SPACING.missionCreateBlockGapMd,
                borderRadius: RADIUS.panel,
                background: "transparent",
                cursor: "pointer",
                color: COLOR.missionsTitleMuted,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                fontWeight: FONT.weightMedium,
                lineHeight: "21px",
              }}
            >
              <ConfigureRadarPlusGlyph size={18} />
              ADD RAD
            </button>
          </div>
        </div>
      </div>
    </MissionWorkspacePanel>
  );
}
