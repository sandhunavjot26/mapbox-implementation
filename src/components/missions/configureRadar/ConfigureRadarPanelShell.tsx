"use client";

import type { ReactNode } from "react";
import { COLOR, SPACING } from "@/styles/driifTokens";

/** Inner grey card — Figma Driif-UI Configure Radar shell (e.g. 853:10449). */
export function ConfigureRadarPanelShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{
        background: COLOR.missionCreateSectionBg,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: COLOR.missionCreateFieldBorder,
        /* TODO: token — Figma inner card corner 4px */
        borderRadius: "4px",
        padding: "12px",
        gap: SPACING.missionCreateFormSectionGap,
      }}
    >
      {children}
    </div>
  );
}
