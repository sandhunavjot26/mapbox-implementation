"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { CustomDateTimeField } from "@/components/ui/CustomDateTimeField";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { CreateFenceWorkspace } from "@/components/missions/CreateFenceWorkspace";
import { SelectAssetsWorkspace } from "@/components/missions/SelectAssetsWorkspace";
import type { Device, SavedFence } from "@/types/aeroshield";

export type MissionType = "Live Op" | "Training Sim" | "Maintenance";

export type CreateMissionFormProps = {
  name: string;
  commandUnit: string;
  missionType: MissionType;
  startAt: string;
  endAt: string;
  fenceSearch: string;
  assetSearch: string;
  createError: string;
  isSubmitting: boolean;
  commandUnits: string[];
  missionTypes: MissionType[];
  fenceItems: SavedFence[];
  allFenceItems: SavedFence[];
  devicesCatalog: Device[];
  devicesLoading: boolean;
  devicesError: Error | null;
  selectedDeviceIds: string[];
  onBack: () => void;
  onNameChange: (value: string) => void;
  onCommandUnitChange: (value: string) => void;
  onMissionTypeChange: (value: MissionType) => void;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
  onFenceSearchChange: (value: string) => void;
  onFenceItemsChange: (items: SavedFence[]) => void;
  onAssetSearchChange: (value: string) => void;
  onSelectedDeviceIdsChange: (ids: string[]) => void;
  onSubmit: () => void;
  onModeChange?: (mode: "form" | "createFence" | "selectAssets") => void;
};

function deviceLabel(device: Device): string {
  const name = device.name?.trim();
  if (name) return name;
  return device.serial_number || device.id.slice(0, 8);
}

export function CreateMissionForm({
  name,
  commandUnit,
  missionType,
  startAt,
  endAt,
  fenceSearch,
  assetSearch,
  createError,
  isSubmitting,
  commandUnits,
  missionTypes,
  fenceItems,
  allFenceItems,
  devicesCatalog,
  devicesLoading,
  devicesError,
  selectedDeviceIds,
  onBack,
  onNameChange,
  onCommandUnitChange,
  onMissionTypeChange,
  onStartAtChange,
  onEndAtChange,
  onFenceSearchChange,
  onFenceItemsChange,
  onAssetSearchChange,
  onSelectedDeviceIdsChange,
  onSubmit,
  onModeChange,
}: CreateMissionFormProps) {
  const [view, setView] = useState<"form" | "createFence" | "selectAssets">("form");
  const [sectionTab, setSectionTab] = useState<"fences" | "assets">("fences");

  const changeView = (nextView: "form" | "createFence" | "selectAssets") => {
    setView(nextView);
    if (nextView === "form") {
      onModeChange?.("form");
    } else {
      onModeChange?.(nextView);
    }
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

  const selectedDevices = useMemo(() => {
    const byId = new Map(devicesCatalog.map((d) => [d.id, d]));
    return selectedDeviceIds
      .map((id) => byId.get(id))
      .filter((d): d is Device => d != null);
  }, [devicesCatalog, selectedDeviceIds]);

  const filteredSelectedAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return selectedDevices;
    return selectedDevices.filter((d) =>
      `${deviceLabel(d)} ${d.serial_number}`.toLowerCase().includes(q),
    );
  }, [selectedDevices, assetSearch]);

  if (view === "createFence") {
    return (
      <CreateFenceWorkspace
        fences={allFenceItems}
        onBack={() => changeView("form")}
        onFencesChange={onFenceItemsChange}
      />
    );
  }

  if (view === "selectAssets") {
    return (
      <SelectAssetsWorkspace
        devices={devicesCatalog}
        isLoading={devicesLoading}
        error={devicesError}
        selectedIds={selectedDeviceIds}
        onSelectionChange={onSelectedDeviceIdsChange}
        onBack={() => changeView("form")}
      />
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
      style={panelStyle}
    >
      <div
        className="flex items-center"
        style={{
          gap: SPACING.missionCreateBlockGapMd,
          paddingBottom: SPACING.missionCreateHeaderPadBottom,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex h-4 w-4 shrink-0 items-center justify-center transition-opacity hover:opacity-85"
        >
          <Image src="/icons/back-icon.svg" alt="Back" width={8} height={8} />
        </button>
        <p
          style={{
            color: COLOR.missionsTitleMuted,
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeMd,
            fontWeight: FONT.weightMedium,
            lineHeight: "26px",
          }}
        >
          Create Mission
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div
          className="flex flex-col"
          style={{ gap: SPACING.missionCreateBlockGapMd }}
        >
          <div
            className="flex flex-col"
            style={{ gap: SPACING.settingsGap }}
          >
            <div
              className="flex flex-col"
              style={{ gap: SPACING.missionCreateStackGapMd }}
            >
              <label
                className="flex items-center overflow-hidden border px-3"
                style={{
                  ...fieldShellStyle,
                  minHeight: SPACING.iconRowHeight,
                  borderRadius: RADIUS.panel,
                }}
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Enter Mission Name"
                  className="w-full bg-transparent outline-none"
                  style={{
                    ...fieldTextStyle,
                    fontSize: FONT.sizeMd,
                    lineHeight: "20px",
                  }}
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

            <div
              className="flex flex-col py-1"
              style={{ gap: SPACING.missionCreateBlockGapSm }}
            >
              <p
                style={{
                  color: COLOR.missionsTitleMuted,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeMd,
                  fontWeight: FONT.weightMedium,
                  lineHeight: "20px",
                }}
              >
                Select Mission type
              </p>
              <div
                className="flex"
                style={{ gap: SPACING.missionCreateChipGap }}
              >
                {missionTypes.map((option) => {
                  const active = missionType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onMissionTypeChange(option)}
                      className="px-2 py-1"
                      style={{
                        borderRadius: RADIUS.panel,
                        background: active
                          ? COLOR.missionCreatePrimaryChipBg
                          : COLOR.missionCreateSecondaryChipBg,
                        color: active
                          ? COLOR.missionCreatePrimaryChipText
                          : COLOR.missionCreateSecondaryChipText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeXs,
                        lineHeight: "16px",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="flex flex-col"
              style={{ gap: SPACING.missionCreateBlockGapSm }}
            >
              <p
                style={{
                  color: COLOR.missionsTitleMuted,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeMd,
                  fontWeight: FONT.weightMedium,
                  lineHeight: "20px",
                }}
              >
                Mission Duration
              </p>
              <div
                className="flex"
                style={{ gap: SPACING.missionCreateBlockGapSm }}
              >
                <p
                  style={{
                    width: SPACING.missionCreateDurationColWidth,
                    color: COLOR.missionsSecondaryText,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                  }}
                >
                  Start Date & Time
                </p>
                <p
                  style={{
                    width: SPACING.missionCreateDurationColWidth,
                    color: COLOR.missionsSecondaryText,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                  }}
                >
                  End Date & Time
                </p>
              </div>
              <div
                className="flex"
                style={{ gap: SPACING.missionCreateBlockGapMd }}
              >
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

          <div
            className="flex flex-col"
            style={{ gap: SPACING.settingsGap }}
          >
            <div
              className="flex"
              style={{ gap: SPACING.missionCreateBlockGapMd }}
            >
              <button
                type="button"
                onClick={() => setSectionTab("fences")}
                className="border-b pb-1"
                style={{
                  borderColor:
                    sectionTab === "fences"
                      ? COLOR.missionCreateTabActiveBorder
                      : "transparent",
                  color: COLOR.missionsTitleMuted,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeMd,
                  fontWeight: sectionTab === "fences" ? FONT.weightMedium : FONT.weightNormal,
                  lineHeight: "20px",
                }}
              >
                Select Fences
              </button>
              <button
                type="button"
                onClick={() => setSectionTab("assets")}
                className="border-b pb-1"
                style={{
                  borderColor:
                    sectionTab === "assets"
                      ? COLOR.missionCreateTabActiveBorder
                      : "transparent",
                  color:
                    sectionTab === "assets"
                      ? COLOR.missionsTitleMuted
                      : COLOR.missionCreateTabInactiveText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeMd,
                  fontWeight: sectionTab === "assets" ? FONT.weightMedium : FONT.weightNormal,
                  lineHeight: "20px",
                }}
              >
                Select Assets
              </button>
            </div>

            {sectionTab === "fences" ? (
              <div
                className="flex min-h-0 flex-col overflow-hidden px-2"
                style={{
                  background: COLOR.missionCreateSectionBg,
                  minHeight: SPACING.missionCreateSectionMinHeight,
                  gap: SPACING.missionCreateBlockGapSm,
                  borderRadius: RADIUS.panel,
                  paddingTop: SPACING.missionCreateSectionVerticalPad,
                  paddingBottom: SPACING.missionCreateSectionVerticalPad,
                }}
              >
                <div
                  className="flex"
                  style={{ gap: SPACING.missionCreateBlockGapSm }}
                >
                  <label
                    className="flex flex-1 items-center overflow-hidden border px-3"
                    style={{
                      ...fieldShellStyle,
                      minHeight: SPACING.iconRowHeight,
                      borderRadius: RADIUS.panel,
                    }}
                  >
                    <input
                      type="text"
                      value={fenceSearch}
                      onChange={(e) => onFenceSearchChange(e.target.value)}
                      placeholder="Search fences..."
                      className="w-full bg-transparent outline-none"
                      style={{
                        ...fieldTextStyle,
                        fontSize: FONT.sizeMd,
                        lineHeight: "20px",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => changeView("createFence")}
                    className="shrink-0 px-3"
                    style={{
                      background: COLOR.missionsCreateBtnBg,
                      color: COLOR.missionsCreateBtnText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeMd,
                      lineHeight: "20px",
                      minHeight: SPACING.iconRowHeight,
                      borderRadius: RADIUS.panel,
                    }}
                  >
                    Create Fence
                  </button>
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto"
                  style={{ gap: SPACING.missionCreateBlockGapSm }}
                >
                  {fenceItems.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        background: COLOR.missionCreateFenceItemBg,
                        color: COLOR.missionsBodyText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeMd,
                        lineHeight: "20px",
                        borderRadius: RADIUS.panel,
                        paddingLeft: SPACING.missionCreateListItemPadX,
                        paddingRight: SPACING.missionCreateListItemPadX,
                        paddingTop: SPACING.missionCreateListItemPadY,
                        paddingBottom: SPACING.missionCreateListItemPadY,
                      }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="flex min-h-0 flex-col overflow-hidden px-2"
                style={{
                  background: COLOR.missionCreateSectionBg,
                  minHeight: SPACING.missionCreateSectionMinHeight,
                  gap: SPACING.missionCreateBlockGapSm,
                  borderRadius: RADIUS.panel,
                  paddingTop: SPACING.missionCreateSectionVerticalPad,
                  paddingBottom: SPACING.missionCreateSectionVerticalPad,
                }}
              >
                <div
                  className="flex"
                  style={{ gap: SPACING.missionCreateBlockGapSm }}
                >
                  <label
                    className="flex flex-1 items-center overflow-hidden border px-3"
                    style={{
                      ...fieldShellStyle,
                      minHeight: SPACING.iconRowHeight,
                      borderRadius: RADIUS.panel,
                    }}
                  >
                    <input
                      type="text"
                      value={assetSearch}
                      onChange={(e) => onAssetSearchChange(e.target.value)}
                      placeholder="Search selected assets..."
                      className="w-full bg-transparent outline-none"
                      style={{
                        ...fieldTextStyle,
                        fontSize: FONT.sizeMd,
                        lineHeight: "20px",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => changeView("selectAssets")}
                    className="shrink-0 px-3"
                    style={{
                      // Figma 853:9629 — add asset CTA uses primary lime/olive treatment
                      background: COLOR.missionsCreateBtnBg,
                      color: COLOR.missionsCreateBtnText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeMd,
                      lineHeight: "20px",
                      minHeight: SPACING.iconRowHeight,
                      borderRadius: RADIUS.panel,
                    }}
                  >
                    Add Asset
                  </button>
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto"
                  style={{ gap: SPACING.missionCreateBlockGapSm }}
                >
                  {filteredSelectedAssets.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between"
                      style={{
                        background: COLOR.missionsCardBg,
                        color: COLOR.missionsBodyText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeMd,
                        lineHeight: "20px",
                        borderRadius: RADIUS.panel,
                        paddingLeft: SPACING.missionCreateListItemPadX,
                        paddingRight: SPACING.missionCreateListItemPadX,
                        paddingTop: SPACING.missionCreateListItemPadY,
                        paddingBottom: SPACING.missionCreateListItemPadY,
                        gap: SPACING.missionCreateBlockGapMd,
                      }}
                    >
                      <span className="min-w-0 truncate">{deviceLabel(device)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onSelectedDeviceIdsChange(
                            selectedDeviceIds.filter((id) => id !== device.id),
                          )
                        }
                        style={{
                          color: COLOR.missionsSecondaryText,
                          fontFamily: `${FONT.family}, sans-serif`,
                          fontSize: FONT.sizeXs,
                          lineHeight: "16px",
                          flexShrink: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {createError && (
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
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="border disabled:opacity-60"
              style={{
                background: COLOR.missionsCardBg,
                borderColor: COLOR.missionCreateFooterBorder,
                color: COLOR.missionsTitleMuted,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
                lineHeight: "20px",
                minHeight: SPACING.missionCreateFooterBtnMinHeight,
                borderRadius: RADIUS.panel,
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
