/** Persists last selected tab — same key as legacy old-ui (behaviour reference only). */
export const MISSION_WORKSPACE_TAB_STORAGE_KEY = "aeroshield.workspace.tab";

export type MissionWorkspaceTabId =
  | "timeline"
  | "devices"
  | "detections"
  | "commands";

const ORDER: MissionWorkspaceTabId[] = [
  "timeline",
  "devices",
  "detections",
  "commands",
];

export function isMissionWorkspaceTabId(
  v: string | null | undefined,
): v is MissionWorkspaceTabId {
  return v != null && (ORDER as string[]).includes(v);
}

export const MISSION_WORKSPACE_TAB_LABELS: Record<MissionWorkspaceTabId, string> =
  {
    timeline: "Timeline",
    devices: "Devices",
    detections: "Detections",
    commands: "Commands",
  };

export const MISSION_WORKSPACE_TAB_ORDER = ORDER;
