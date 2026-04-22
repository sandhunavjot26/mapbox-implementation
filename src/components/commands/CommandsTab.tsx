"use client";

import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

export function CommandsTab() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          style={{
            minHeight: SPACING.missionCreateFieldRowHeight,
            padding: "0 10px",
            background: `${COLOR.missionsCardBg}99`,
            color: COLOR.missionsSecondaryText,
            fontSize: FONT.sizeSm,
            fontFamily: `${FONT.family}, sans-serif`,
            border: `1px solid ${COLOR.border}`,
            borderRadius: RADIUS.panel,
            cursor: "not-allowed",
          }}
        >
          New command
        </button>
        <span
          style={{ fontSize: FONT.sizeXs, color: COLOR.missionsSecondaryText }}
        >
          Coming soon
        </span>
      </div>
    </div>
  );
}
