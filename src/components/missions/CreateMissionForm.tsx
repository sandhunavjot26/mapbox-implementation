"use client";

import Image from "next/image";
import { useState } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { CustomDateTimeField } from "@/components/ui/CustomDateTimeField";
import { COLOR, FONT } from "@/styles/driifTokens";
import { CreateFenceWorkspace } from "@/components/missions/CreateFenceWorkspace";
import type { SavedFence } from "@/types/aeroshield";

export type MissionType = "Live Op" | "Training Sim" | "Maintenance";

export type CreateMissionFormProps = {
  name: string;
  commandUnit: string;
  missionType: MissionType;
  startAt: string;
  endAt: string;
  fenceSearch: string;
  createError: string;
  isSubmitting: boolean;
  commandUnits: string[];
  missionTypes: MissionType[];
  fenceItems: SavedFence[];
  allFenceItems: SavedFence[];
  onBack: () => void;
  onNameChange: (value: string) => void;
  onCommandUnitChange: (value: string) => void;
  onMissionTypeChange: (value: MissionType) => void;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
  onFenceSearchChange: (value: string) => void;
  onFenceItemsChange: (items: SavedFence[]) => void;
  onSubmit: () => void;
  onModeChange?: (mode: "form" | "createFence") => void;
};

export function CreateMissionForm({
  name,
  commandUnit,
  missionType,
  startAt,
  endAt,
  fenceSearch,
  createError,
  isSubmitting,
  commandUnits,
  missionTypes,
  fenceItems,
  allFenceItems,
  onBack,
  onNameChange,
  onCommandUnitChange,
  onMissionTypeChange,
  onStartAtChange,
  onEndAtChange,
  onFenceSearchChange,
  onFenceItemsChange,
  onSubmit,
  onModeChange,
}: CreateMissionFormProps) {
  const [view, setView] = useState<"form" | "createFence">("form");

  const changeView = (nextView: "form" | "createFence") => {
    setView(nextView);
    onModeChange?.(nextView);
  };

  const panelStyle = {
    background: COLOR.missionsPanelBg,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  const fieldShellStyle = {
    background: COLOR.missionCreateFieldBg,
    borderColor: COLOR.missionCreateFieldBorder,
  } as const;

  const fieldTextStyle = {
    color: COLOR.missionCreateFieldText,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  if (view === "createFence") {
    return (
      <CreateFenceWorkspace
        fences={allFenceItems}
        onBack={() => changeView("form")}
        onFencesChange={onFenceItemsChange}
      />
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
      style={panelStyle}
    >
      <div className="flex items-center gap-2 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-4 w-4 items-center justify-center transition-opacity hover:opacity-85"
        >
          <Image src="/icons/back-icon.svg" alt="Back" width={8} height={8} />
        </button>
        <p
          className="text-[18px] font-medium leading-[26px]"
          style={{ color: COLOR.missionsTitleMuted }}
        >
          Create Mission
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <label
                className="flex h-8 items-center overflow-hidden rounded-[2px] border px-3"
                style={fieldShellStyle}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Enter Mission Name"
                  className="w-full bg-transparent text-[14px] leading-5 outline-none"
                  style={fieldTextStyle}
                />
              </label>

              <Dropdown
                options={commandUnits.map((unit) => ({
                  label: unit,
                  value: unit,
                }))}
                value={commandUnit}
                onChange={onCommandUnitChange}
                buttonStyle={fieldShellStyle}
                textStyle={fieldTextStyle}
                menuStyle={{
                  background: COLOR.missionCreateFieldBg,
                  borderColor: COLOR.missionCreateFieldBorder,
                }}
                optionStyle={{
                  background: COLOR.missionCreateFieldBg,
                  color: COLOR.missionCreateFieldText,
                }}
                selectedOptionStyle={{
                  background: "rgba(230, 230, 230, 0.08)",
                  color: COLOR.missionsTitleMuted,
                }}
              />
            </div>

            <div className="flex flex-col gap-2 py-1">
              <p
                className="text-[14px] font-medium leading-5"
                style={{ color: COLOR.missionsTitleMuted }}
              >
                Select Mission type
              </p>
              <div className="flex gap-[5px]">
                {missionTypes.map((option) => {
                  const active = missionType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onMissionTypeChange(option)}
                      className="rounded-[2px] px-2 py-1 text-[12px] leading-4"
                      style={{
                        background: active
                          ? COLOR.missionCreatePrimaryChipBg
                          : COLOR.missionCreateSecondaryChipBg,
                        color: active
                          ? COLOR.missionCreatePrimaryChipText
                          : COLOR.missionCreateSecondaryChipText,
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p
                className="text-[14px] font-medium leading-5"
                style={{ color: COLOR.missionsTitleMuted }}
              >
                Mission Duration
              </p>
              <div className="flex gap-2 text-[12px] leading-4">
                <p
                  className="w-[196px]"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  Start Date & Time
                </p>
                <p
                  className="w-[196px]"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  End Date & Time
                </p>
              </div>
              <div className="flex gap-[14px]">
                <CustomDateTimeField
                  value={startAt}
                  onChange={onStartAtChange}
                  className="min-w-0 flex-1"
                  buttonStyle={fieldShellStyle}
                  textStyle={fieldTextStyle}
                />
                <CustomDateTimeField
                  value={endAt}
                  onChange={onEndAtChange}
                  className="min-w-0 flex-1"
                  buttonStyle={fieldShellStyle}
                  textStyle={fieldTextStyle}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-4 text-[14px] leading-5">
              <div
                className="border-b pb-1 font-medium"
                style={{
                  borderColor: COLOR.missionCreateTabActiveBorder,
                  color: COLOR.missionsTitleMuted,
                }}
              >
                Select Fences
              </div>
              <div style={{ color: COLOR.missionCreateTabInactiveText }}>
                Select Assets
              </div>
            </div>

            <div
              className="flex h-[281px] flex-col gap-2 overflow-hidden rounded-[2px] px-2 py-[10px]"
              style={{ background: COLOR.missionCreateSectionBg }}
            >
              <div className="flex gap-1">
                <label
                  className="flex h-8 flex-1 items-center overflow-hidden rounded-[2px] border px-3"
                  style={fieldShellStyle}
                >
                  <input
                    type="text"
                    value={fenceSearch}
                    onChange={(e) => onFenceSearchChange(e.target.value)}
                    placeholder="Search fences..."
                    className="w-full bg-transparent text-[14px] leading-5 outline-none"
                    style={fieldTextStyle}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => changeView("createFence")}
                  className="h-8 rounded-[2px] px-3 text-[14px] leading-5"
                  style={{
                    background: COLOR.missionsCreateBtnBg,
                    color: COLOR.missionsCreateBtnText,
                  }}
                >
                  Create Fence
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {fenceItems.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-[2px] px-[15px] py-[9px] text-[14px] leading-5"
                    style={{
                      background: COLOR.missionCreateFenceItemBg,
                      color: COLOR.missionsBodyText,
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>

            {createError && <p className="text-[12px] text-red-400">{createError}</p>}

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-10 rounded-[2px] border text-[14px] leading-5 disabled:opacity-60"
              style={{
                background: COLOR.missionsCardBg,
                borderColor: COLOR.missionCreateFooterBorder,
                color: COLOR.missionsTitleMuted,
              }}
            >
              {isSubmitting ? "Creating..." : "Create Mission"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
