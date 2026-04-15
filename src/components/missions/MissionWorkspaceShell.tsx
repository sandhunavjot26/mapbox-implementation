"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { COLOR, FONT, SPACING } from "@/styles/driifTokens";

/** Panel chrome shared by Create Mission, Select Assets, Review & Launch (full-height steps). */
export function missionWorkspacePanelBaseStyle(): CSSProperties {
  return {
    background: COLOR.missionsPanelBg,
    fontFamily: `${FONT.family}, sans-serif`,
    paddingLeft: SPACING.missionWorkspacePadX,
    paddingRight: SPACING.missionWorkspacePadX,
    paddingTop: SPACING.missionWorkspacePadY,
    paddingBottom: SPACING.missionWorkspacePadY,
  };
}

export function missionWorkspaceTitleStyle(): CSSProperties {
  return {
    color: COLOR.missionsTitleMuted,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.missionWorkspaceTitleSize,
    fontWeight: FONT.weightMedium,
    lineHeight: FONT.missionWorkspaceTitleLineHeight,
  };
}

export function missionWorkspaceSectionLabelStyle(): CSSProperties {
  return {
    color: COLOR.missionsSecondaryText,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.missionWorkspaceSectionLabelSize,
    fontWeight: FONT.weightMedium,
    lineHeight: FONT.missionWorkspaceSectionLabelLineHeight,
    letterSpacing: FONT.missionWorkspaceSectionLabelLetterSpacing,
    textTransform: "uppercase",
  };
}

/** Figma 853:10163 — uppercase row label under summary value (MISSION, RADAR, …). 12px / 16px / #D3D3D3 */
export function missionReviewSummaryLabelStyle(): CSSProperties {
  return {
    color: COLOR.missionReviewSummaryLabel,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.missionReviewLine12Size,
    fontWeight: FONT.weightNormal,
    lineHeight: FONT.missionReviewLine12LineHeight,
    letterSpacing: FONT.missionWorkspaceSummaryLabelLetterSpacing,
    marginTop: "2px",
    textTransform: "uppercase",
  };
}

export type MissionWorkspacePanelProps = {
  children: ReactNode;
  /** When true (default), panel grows in flex parents like MissionSelector overlay. */
  fillHeight?: boolean;
  className?: string;
};

export function MissionWorkspacePanel({
  children,
  fillHeight = true,
  className = "",
}: MissionWorkspacePanelProps) {
  const layout = fillHeight
    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
    : "flex flex-col overflow-hidden";
  return (
    <div className={`${layout} ${className}`.trim()} style={missionWorkspacePanelBaseStyle()}>
      {children}
    </div>
  );
}

export type MissionWorkspaceHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
};

export function MissionWorkspaceHeader({
  title,
  onBack,
  backLabel = "Back",
}: MissionWorkspaceHeaderProps) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: SPACING.missionWorkspaceHeaderGap,
        paddingBottom: SPACING.missionCreateHeaderPadBottom,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-85"
        style={{
          width: SPACING.missionWorkspaceBackHitSize,
          height: SPACING.missionWorkspaceBackHitSize,
        }}
        aria-label={backLabel}
      >
        <Image
          src="/icons/back-icon.svg"
          alt=""
          width={8}
          height={8}
        />
      </button>
      <p style={missionWorkspaceTitleStyle()}>{title}</p>
    </div>
  );
}
