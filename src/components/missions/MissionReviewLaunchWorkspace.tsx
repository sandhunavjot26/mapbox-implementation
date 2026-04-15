"use client";

import { useState } from "react";
import type { MissionReviewLaunchContent } from "@/types/missionCreate";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import {
  MissionWorkspaceHeader,
  MissionWorkspacePanel,
  missionReviewSummaryLabelStyle,
  missionWorkspaceSectionLabelStyle,
} from "@/components/missions/MissionWorkspaceShell";

export type MissionReviewLaunchWorkspaceProps = {
  content: MissionReviewLaunchContent;
  createError: string;
  isSubmitting: boolean;
  onBack: () => void;
  onLaunch: () => void;
};

function CheckIcon() {
  const size = SPACING.missionReviewStatusIconSize;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: COLOR.missionReviewChecklistSuccessHalo,
        color: COLOR.statusOnline,
        fontSize: FONT.sizeSm,
        lineHeight: size,
      }}
      aria-hidden
    >
      ✓
    </span>
  );
}

function WarningIcon() {
  const size = SPACING.missionReviewStatusIconSize;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: COLOR.missionReviewChecklistWarningHalo,
        color: COLOR.statusWarning,
        fontSize: FONT.sizeSm,
        fontWeight: FONT.weightBold,
        lineHeight: size,
      }}
      aria-hidden
    >
      !
    </span>
  );
}

export function MissionReviewLaunchWorkspace({
  content,
  createError,
  isSubmitting,
  onBack,
  onLaunch,
}: MissionReviewLaunchWorkspaceProps) {
  const needsAck = content.checklist.some((c) => c.needsAcknowledge);
  const [acknowledged, setAcknowledged] = useState(false);
  const canLaunch = !isSubmitting && (!needsAck || acknowledged);

  return (
    <MissionWorkspacePanel>
      <MissionWorkspaceHeader title="Review & Launch" onBack={onBack} />

      <div
        className="driif-mission-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pr-1"
        style={{ gap: SPACING.missionCreateStackGapMd }}
      >
        <p style={missionWorkspaceSectionLabelStyle()}>Pre-launch checklist</p>

        <div
          className="flex flex-col"
          style={{ gap: SPACING.missionCreateBlockGapMd }}
        >
          {content.checklist.map((item) => (
            <div
              key={item.id}
              className="flex flex-col"
              style={{
                background: COLOR.missionCreateFenceItemBg,
                borderRadius: RADIUS.panel,
                paddingLeft: SPACING.missionCreateListItemPadX,
                paddingRight: SPACING.missionCreateListItemPadX,
                paddingTop: SPACING.missionReviewChecklistCardPadY,
                paddingBottom: SPACING.missionReviewChecklistCardPadY,
                gap: SPACING.missionCreateBlockGapSm,
              }}
            >
              <div
                className="flex items-start"
                style={{ gap: SPACING.missionCreateBlockGapMd }}
              >
                {item.variant === "warning" ? <WarningIcon /> : <CheckIcon />}
                <div
                  className="flex min-w-0 flex-1 flex-col"
                  style={{ gap: SPACING.missionReviewChecklistStackGap }}
                >
                  <p
                    style={{
                      color: COLOR.missionReviewChecklistHeading,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.missionReviewLine12Size,
                      fontWeight: FONT.weightNormal,
                      lineHeight: FONT.missionReviewLine12LineHeight,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      color: COLOR.missionReviewChecklistDetail,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.missionReviewDetail10Size,
                      fontWeight: FONT.weightNormal,
                      lineHeight: FONT.missionReviewDetail10LineHeight,
                    }}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
              {item.needsAcknowledge ? (
                <div className="flex justify-end pl-7">
                  <button
                    type="button"
                    onClick={() => setAcknowledged(true)}
                    disabled={acknowledged}
                    className="transition-opacity disabled:opacity-50"
                    style={{
                      color: COLOR.missionsTitleMuted,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeSm,
                      lineHeight: "16px",
                      textDecoration: acknowledged ? "none" : "underline",
                    }}
                  >
                    {acknowledged ? "Acknowledged" : "Acknowledge"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <p
          style={{
            ...missionWorkspaceSectionLabelStyle(),
            marginTop: "4px",
          }}
        >
          Mission summary
        </p>

        <div
          className="flex flex-col"
          style={{ gap: SPACING.missionCreateBlockGapMd }}
        >
          {content.summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col"
              style={{
                background: COLOR.missionCreateFenceItemBg,
                borderRadius: RADIUS.panel,
                paddingLeft: SPACING.missionCreateListItemPadX,
                paddingRight: SPACING.missionCreateListItemPadX,
                paddingTop: SPACING.missionReviewSummaryRowPadY,
                paddingBottom: SPACING.missionReviewSummaryRowPadY,
                minHeight: SPACING.missionReviewSummaryRowMinHeight,
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  color: COLOR.missionReviewSummaryValue,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.missionReviewLine12Size,
                  fontWeight: FONT.weightNormal,
                  lineHeight: FONT.missionReviewLine12LineHeight,
                }}
              >
                {row.value}
              </p>
              <p style={missionReviewSummaryLabelStyle()}>{row.label}</p>
            </div>
          ))}
        </div>

        {createError ? (
          <p
            style={{
              color: COLOR.statusDanger,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeXs,
              lineHeight: "16px",
            }}
          >
            {createError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onLaunch}
          disabled={!canLaunch}
          className="mt-auto flex shrink-0 items-center justify-center border-0 disabled:opacity-55"
          style={{
            background: COLOR.missionCreateSubmitReadyBg,
            borderRadius: RADIUS.panel,
            color: COLOR.missionCreateSubmitReadyText,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            fontWeight: FONT.weightMedium,
            lineHeight: "20px",
            minHeight: SPACING.missionCreateFooterBtnMinHeight,
            paddingLeft: SPACING.missionCreateBlockGapMd,
            paddingRight: SPACING.missionCreateBlockGapMd,
          }}
        >
          Launch Mission
        </button>
      </div>
    </MissionWorkspacePanel>
  );
}
