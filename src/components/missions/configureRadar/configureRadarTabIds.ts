export type ConfigureRadarTabId =
  | "direction"
  | "detection"
  | "jammers"
  | "parameters"
  | "health";

export const CONFIGURE_RADAR_TABS: ReadonlyArray<{
  id: ConfigureRadarTabId;
  label: string;
}> = [
  { id: "direction", label: "Direction" },
  { id: "detection", label: "Detection" },
  { id: "jammers", label: "Jammers" },
  { id: "parameters", label: "Parameters" },
  { id: "health", label: "Health" },
];
