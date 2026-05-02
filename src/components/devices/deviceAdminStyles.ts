/**
 * Device inventory / modals — styles aligned with Create Mission + Missions overlay (`driifTokens` only).
 */

import type { CSSProperties } from "react";
import { COLOR, FONT, RADIUS, SPACING, Z } from "@/styles/driifTokens";

/** Same as CreateMissionForm `fieldShellStyle` + `fieldTextStyle` for Dropdown trigger + menu. */
export const driifDeviceFieldShell: CSSProperties = {
  background: COLOR.missionCreateFieldBg,
  borderColor: COLOR.missionCreateFieldBorder,
};

export const driifDeviceFieldText: CSSProperties = {
  color: COLOR.missionCreateFieldText,
  fontFamily: `${FONT.family}, sans-serif`,
};

export const driifDeviceDropdown = {
  buttonStyle: driifDeviceFieldShell,
  textStyle: driifDeviceFieldText,
  menuStyle: {
    background: COLOR.missionCreateFieldBg,
    border: `1px solid ${COLOR.missionCreateFieldBorder}`,
  } as CSSProperties,
  optionStyle: {
    background: COLOR.missionCreateFieldBg,
    color: COLOR.missionCreateFieldText,
    fontFamily: `${FONT.family}, sans-serif`,
    padding: "8px 12px",
    minHeight: 36,
    boxSizing: "border-box",
  } as CSSProperties,
  selectedOptionStyle: {
    background: "rgba(230, 230, 230, 0.08)",
    color: COLOR.missionsTitleMuted,
    padding: "8px 12px",
    minHeight: 36,
    boxSizing: "border-box",
  } as CSSProperties,
} as const;

/** Full-width text/number field — matches mission create field row. */
export const driifDeviceTextField: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: SPACING.missionCreateFieldRowHeight,
  padding: "0 12px",
  background: COLOR.missionCreateFieldBg,
  border: `1px solid ${COLOR.missionCreateFieldBorder}`,
  borderRadius: RADIUS.panel,
  color: COLOR.missionCreateFieldText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeMd,
  lineHeight: "21px",
  outline: "none",
};

/** Primary CTA (Apply, Save, Open) — `Create Mission` / lime pair from tokens. */
export const driifDevicePrimaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: SPACING.missionCreateFieldRowHeight,
  padding: "0 12px",
  background: COLOR.missionsCreateBtnBg,
  color: COLOR.missionsCreateBtnText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeMd,
  lineHeight: "21px",
  fontWeight: FONT.weightNormal,
  border: "none",
  borderRadius: RADIUS.panel,
  cursor: "pointer",
};

/** Secondary (Cancel, Close text-style). */
export const driifDeviceSecondaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: SPACING.missionCreateFieldRowHeight,
  padding: "0 12px",
  background: "transparent",
  color: COLOR.missionsTitleMuted,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeSm,
  lineHeight: "17px",
  border: `1px solid ${COLOR.missionCreateFieldBorder}`,
  borderRadius: RADIUS.panel,
  cursor: "pointer",
};

export const driifDeviceModalBackdrop: CSSProperties = {
  background: "rgba(0, 0, 0, 0.65)",
};

export const driifDeviceModalCard: CSSProperties = {
  background: COLOR.missionCreateSummaryModalBg,
  border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
  borderRadius: RADIUS.panel,
};

/** Table row / divider */
export const driifDeviceTableRowBorder: CSSProperties = {
  borderBottom: `1px solid ${COLOR.border}`,
};

/** Driif-UI Assets panel shell (Figma node 1893:39114) */
export const driifAssetsPanelSurface: CSSProperties = {
  background: COLOR.missionsSearchBg,
  border: `1px solid rgba(255, 255, 255, 0.12)`,
  borderRadius: RADIUS.panel,
  boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.24)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
};

/** Asset row card surface (#272727, 4px radius in Figma — using token match) */
export const driifAssetsCardBg: CSSProperties = {
  background: COLOR.missionsPanelBg,
  borderRadius: "4px",
};

/** Small outline chips: Select all / Deselect all / Clear */
export const driifAssetsBulkChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 8px",
  background: "#0B0B0B",
  border: `1px solid ${COLOR.missionCreateFieldBorder}`,
  borderRadius: "4px",
  color: COLOR.missionsSecondaryText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  fontWeight: FONT.weightMedium,
  lineHeight: "12px",
  cursor: "pointer",
};

/** Send Command — outline dark */
export const driifAssetsOutlineButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 8px",
  background: COLOR.missionCreateFieldBorder,
  border: `1px solid ${COLOR.missionsSearchBorder}`,
  borderRadius: RADIUS.panel,
  color: COLOR.missionsBodyText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeSm,
  fontWeight: FONT.weightMedium,
  lineHeight: "16px",
  cursor: "pointer",
};

/** Search row shell */
export const driifAssetsSearchShell: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  height: SPACING.missionCreateSearchRowHeight,
  padding: "0 12px",
  background: "rgba(0, 0, 0, 0.4)",
  border: `1px solid ${COLOR.missionCreateFieldBorder}`,
  borderRadius: RADIUS.panel,
  boxSizing: "border-box",
};

/** Add Asset — lime secondary CTA */
export const driifAssetsAddButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "8px 10px 8px 6px",
  background: COLOR.missionsCreateBtnBg,
  border: "none",
  borderRadius: RADIUS.panel,
  color: COLOR.missionsCreateBtnText,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeSm,
  fontWeight: FONT.weightMedium,
  lineHeight: "16px",
  cursor: "pointer",
};

/** Icon-only affordance (funnel filter toggle) */
export const driifAssetsIconButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px",
  borderRadius: RADIUS.panel,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: COLOR.missionsBodyText,
};

/** Device row status pills — match Figma Online / Offline */
export const driifAssetsOnlineStatusPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 4px",
  borderRadius: "999px",
  background: "#04381A",
  color: "#0CBB58",
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  fontWeight: FONT.weightMedium,
  lineHeight: "12px",
};

export const driifAssetsOfflineStatusPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 4px",
  borderRadius: "999px",
  background: "#8F8F8F",
  color: "#1A1A1A",
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  fontWeight: FONT.weightMedium,
  lineHeight: "12px",
};

export const driifAssetsMutedStatusPill: CSSProperties = {
  ...driifAssetsOfflineStatusPill,
  background: "rgba(148, 163, 184, 0.35)",
  color: COLOR.missionsSearchBg,
};

/** In-Mission status pill — Figma Yellow/80 bg, Yellow/30 text */
export const driifAssetsInMissionPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 4px",
  borderRadius: "999px",
  background: "#91430F",
  color: "#FBD64E",
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  fontWeight: FONT.weightMedium,
  lineHeight: "12px",
};

/** Device-type ribbon — Detection / Jammer variants */
export const driifAssetsTypePillBlue: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 4px",
  borderRadius: RADIUS.panel,
  background: "#1E4E8A",
  color: "#FFFFFF",
  opacity: 0.95,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  fontWeight: FONT.weightNormal,
  lineHeight: "12px",
};

export const driifAssetsTypePillOlive: CSSProperties = {
  ...driifAssetsTypePillBlue,
  background: COLOR.missionsCreateBtnBg,
};

export { Z };

export { COLOR, FONT, SPACING, RADIUS };
