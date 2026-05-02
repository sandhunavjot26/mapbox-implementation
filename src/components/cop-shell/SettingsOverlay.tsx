"use client";

/**
 * Dashboard settings panel — map display controls + mission WebSocket status.
 * Parent positions this beside the bottom-left settings/user icon stack.
 */

import { COLOR, FONT, POSITION, SPACING } from "@/styles/driifTokens";
import { MapDisplaySettings } from "@/components/cop-shell/MapDisplaySettings";
import { WsStatusIndicator } from "@/components/status/WsStatusIndicator";
import { useWsStatusStore } from "@/stores/wsStatusStore";
import type { MapDisplaySettingsProps } from "@/components/cop-shell/MapDisplaySettings";

export type SettingsOverlayProps = MapDisplaySettingsProps & {
  activeMissionId: string | null;
};

export function SettingsOverlay({
  activeMissionId,
  ...mapProps
}: SettingsOverlayProps) {
  const eventsStatus = useWsStatusStore((s) => s.eventsStatus);
  const devicesStatus = useWsStatusStore((s) => s.devicesStatus);
  const commandsStatus = useWsStatusStore((s) => s.commandsStatus);

  return (
    <div
      className="flex flex-col max-h-[min(70vh,calc(100vh-120px))] overflow-hidden rounded-[2px]"
      style={{
        width: POSITION.missionsWidth,
        background: COLOR.missionsPanelBg,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div
        className="flex shrink-0 items-center border-b border-white/10 px-4 py-3"
        style={{ paddingLeft: SPACING.missionWorkspacePadX, paddingRight: SPACING.missionWorkspacePadX }}
      >
        <h2
          style={{
            color: COLOR.missionsTitleMuted,
            fontSize: FONT.missionWorkspaceTitleSize,
            lineHeight: FONT.missionWorkspaceTitleLineHeight,
            fontWeight: FONT.weightMedium,
          }}
        >
          Settings
        </h2>
      </div>

      <div
        className="driif-mission-scrollbar min-h-0 flex-1 overflow-y-auto flex flex-col gap-6"
        style={{
          paddingLeft: SPACING.missionWorkspacePadX,
          paddingRight: SPACING.missionWorkspacePadX,
          paddingTop: SPACING.missionWorkspacePadY,
          paddingBottom: SPACING.missionWorkspacePadY,
        }}
      >
        <MapDisplaySettings {...mapProps} />

        <div className="flex flex-col gap-3">
          <p className="text-slate-500 text-[11px] font-mono uppercase tracking-wide">
            Realtime (WebSockets)
          </p>
          {!activeMissionId && (
            <p
              style={{
                color: COLOR.missionsSecondaryText,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              Open a mission to connect mission WebSockets.
            </p>
          )}
          <WsStatusIndicator
            variant="labeled"
            eventsStatus={eventsStatus}
            devicesStatus={devicesStatus}
            commandsStatus={commandsStatus}
          />
        </div>
      </div>
    </div>
  );
}
