"use client";

import { COLOR, FONT, POSITION } from "@/styles/driifTokens";

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

  return (
    <div
      className="absolute top-[195px] flex w-[240px] flex-col gap-[14px] rounded-[8px] border p-3"
      style={{
        left: `calc(${POSITION.createFenceWorkspaceWidth} + 56px)`,
        background: COLOR.missionCreateSectionBg,
        borderColor: COLOR.missionCreateFieldBorder,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p
            className="text-[12px] leading-4"
            style={{ color: COLOR.missionsSecondaryText }}
          >
            Fence Name
          </p>
          <label
            className="flex h-8 items-center justify-between overflow-hidden rounded-[2px] border px-3"
            style={{
              ...fieldStyle,
              borderColor: nameError
                ? "#FF6B6B"
                : COLOR.missionCreateFieldBorder,
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-[14px] leading-5 outline-none"
              style={{ color: COLOR.missionsBodyText }}
              placeholder="Enter fence name"
            />
          </label>
          {nameError ? (
            <p className="text-[11px] leading-4" style={{ color: "#FF8A8A" }}>
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="text-[12px] leading-4"
            style={{ color: COLOR.missionsSecondaryText }}
          >
            Altitude Ceiling
          </p>
          <label
            className="flex h-8 items-center justify-between overflow-hidden rounded-[2px] border px-3"
            style={{
              ...fieldStyle,
              borderColor: altitudeError
                ? "#FF6B6B"
                : COLOR.missionCreateFieldBorder,
            }}
          >
            <input
              type="text"
              value={altitude}
              onChange={(e) => onAltitudeChange(e.target.value)}
              className="w-full bg-transparent text-[14px] leading-5 outline-none"
              style={{ color: COLOR.missionsBodyText }}
              placeholder="Enter altitude ceiling"
            />
            <span
              className="shrink-0 text-[14px] leading-5 opacity-50"
              style={{ color: COLOR.missionsBodyText }}
            >
              m AGL
            </span>
          </label>
          {altitudeError ? (
            <p className="text-[11px] leading-4" style={{ color: "#FF8A8A" }}>
              {altitudeError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-[10px]">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-16 items-center justify-center rounded-[2px] border text-[14px] leading-5"
          style={{
            background: COLOR.missionsCardBg,
            borderColor: COLOR.missionCreateFooterBorder,
            color: COLOR.missionsTitleMuted,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex h-7 w-16 items-center justify-center rounded-[2px] text-[14px] font-medium leading-5"
          style={{
            background: canSave ? "#F5F5F5" : COLOR.missionsCardBg,
            color: canSave
              ? COLOR.missionCreateFieldBorder
              : COLOR.missionsSecondaryText,
            opacity: canSave ? 1 : 0.7,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
