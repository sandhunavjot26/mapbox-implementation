"use client";

/**
 * Account flyout — opened from the user icon in CopShell; session actions live here.
 */

import { COLOR, FONT, POSITION, SPACING } from "@/styles/driifTokens";
import { useAuthStore } from "@/stores/authStore";

export type AccountOverlayProps = {
  onLogout: () => void;
};

export function AccountOverlay({ onLogout }: AccountOverlayProps) {
  const username = useAuthStore((s) => s.username);

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
        style={{
          paddingLeft: SPACING.missionWorkspacePadX,
          paddingRight: SPACING.missionWorkspacePadX,
        }}
      >
        <h2
          style={{
            color: COLOR.missionsTitleMuted,
            fontSize: FONT.missionWorkspaceTitleSize,
            lineHeight: FONT.missionWorkspaceTitleLineHeight,
            fontWeight: FONT.weightMedium,
          }}
        >
          Account
        </h2>
      </div>

      <div
        className="driif-mission-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto"
        style={{
          paddingLeft: SPACING.missionWorkspacePadX,
          paddingRight: SPACING.missionWorkspacePadX,
          paddingTop: SPACING.missionWorkspacePadY,
          paddingBottom: SPACING.missionWorkspacePadY,
        }}
      >
        {username ? (
          <div className="flex flex-col gap-1">
            <p className="text-slate-500 text-[11px] font-mono uppercase tracking-wide">
              Signed in as
            </p>
            <p
              style={{
                color: COLOR.missionsSecondaryText,
                fontSize: FONT.sizeMd,
                lineHeight: "22px",
                fontWeight: FONT.weightMedium,
              }}
            >
              {username}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          className="self-start rounded-[2px] border border-slate-700/80 bg-black/35 px-3 py-2 text-xs font-mono text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
