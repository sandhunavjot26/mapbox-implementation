"use client";

import { COLOR, FONT, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";

export type FenceMetadataPopoverProps = {
  name: string;
  altitude: string;
  nameError?: string;
  altitudeError?: string;
  canSave?: boolean;
  onNameChange: (value: string) => void;
  onAltitudeChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function FenceMetadataPopover({
  name,
  altitude,
  nameError,
  altitudeError,
  canSave = true,
  onNameChange,
  onAltitudeChange,
  onCancel,
  onSave,
}: FenceMetadataPopoverProps) {
  const fieldStyle = {
    background: COLOR.missionCreateFieldBg,
    borderColor: COLOR.missionCreateFieldBorder,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  const errorBorder = COLOR.statusDanger;

  return (
    <div
      className="absolute flex flex-col border p-3"
      style={{
        top: POSITION.missionFenceMetadataPopoverTop,
        left: `calc(${POSITION.createFenceWorkspaceWidth} + ${SPACING.missionFenceMetadataPopoverLeftOffset})`,
        width: POSITION.missionFenceMetadataPopoverWidth,
        gap: SPACING.missionFencePopoverOuterGap,
        borderRadius: RADIUS.fencePopover,
        background: COLOR.missionCreateSectionBg,
        borderColor: COLOR.missionCreateFieldBorder,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div
        className="flex flex-col"
        style={{ gap: SPACING.missionFencePopoverInnerGap }}
      >
        <div
          className="flex flex-col"
          style={{ gap: SPACING.missionFencePopoverFieldStackGap }}
        >
          <p
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Fence Name
          </p>
          <label
            className="flex items-center justify-between overflow-hidden border px-3"
            style={{
              ...fieldStyle,
              minHeight: SPACING.iconRowHeight,
              borderRadius: RADIUS.panel,
              borderColor: nameError ? errorBorder : COLOR.missionCreateFieldBorder,
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent outline-none"
              style={{
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
              }}
              placeholder="Enter fence name"
            />
          </label>
          {nameError ? (
            <p
              style={{
                color: COLOR.statusDanger,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.missionFormFieldErrorTextSize,
                lineHeight: "17px",
              }}
            >
              {nameError}
            </p>
          ) : null}
        </div>

        <div
          className="flex flex-col"
          style={{ gap: SPACING.missionFencePopoverFieldStackGap }}
        >
          <p
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Altitude Ceiling
          </p>
          <label
            className="flex items-center justify-between overflow-hidden border px-3"
            style={{
              ...fieldStyle,
              minHeight: SPACING.iconRowHeight,
              borderRadius: RADIUS.panel,
              borderColor: altitudeError
                ? errorBorder
                : COLOR.missionCreateFieldBorder,
            }}
          >
            <input
              type="text"
              value={altitude}
              onChange={(e) => onAltitudeChange(e.target.value)}
              className="w-full bg-transparent outline-none"
              style={{
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
              }}
              placeholder="Enter altitude ceiling"
            />
            <span
              className="shrink-0 opacity-50"
              style={{
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
              }}
            >
              m AGL
            </span>
          </label>
          {altitudeError ? (
            <p
              style={{
                color: COLOR.statusDanger,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.missionFormFieldErrorTextSize,
                lineHeight: "17px",
              }}
            >
              {altitudeError}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="flex items-center justify-end"
        style={{ gap: SPACING.missionFencePopoverFooterGap }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center border"
          style={{
            height: SPACING.missionFencePopoverButtonHeight,
            width: SPACING.missionFencePopoverButtonWidth,
            borderRadius: RADIUS.panel,
            background: COLOR.missionsCardBg,
            borderColor: COLOR.missionCreateFooterBorder,
            color: COLOR.missionsTitleMuted,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            lineHeight: "21px",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center justify-center"
          style={{
            height: SPACING.missionFencePopoverButtonHeight,
            width: SPACING.missionFencePopoverButtonWidth,
            borderRadius: RADIUS.panel,
            background: canSave
              ? COLOR.missionCreatePrimaryChipBg
              : COLOR.missionsCardBg,
            color: canSave
              ? COLOR.missionCreateFieldBorder
              : COLOR.missionsSecondaryText,
            opacity: canSave ? 1 : 0.7,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            fontWeight: FONT.weightMedium,
            lineHeight: "21px",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
