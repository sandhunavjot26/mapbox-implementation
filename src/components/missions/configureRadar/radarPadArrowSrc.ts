/** D-pad / pitch nudge arrows — committed assets (Figma Driif-UI). */
export type RadarPadArrowDir =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const RADAR_PAD_ARROW_SRC: Record<RadarPadArrowDir, string> = {
  n: "/icons/ArrowUp.svg",
  ne: "/icons/ArrowUpRight.svg",
  e: "/icons/ArrowRight.svg",
  se: "/icons/ArrowDownRight.svg",
  s: "/icons/ArrowDown.svg",
  sw: "/icons/ArrowDownLeft.svg",
  w: "/icons/ArrowLeft.svg",
  nw: "/icons/ArrowUpLeft.svg",
};
