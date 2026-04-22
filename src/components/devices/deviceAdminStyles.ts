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

export { Z };

export { COLOR, FONT, SPACING, RADIUS };
