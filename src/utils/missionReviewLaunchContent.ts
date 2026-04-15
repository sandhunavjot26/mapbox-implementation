import type { Device, SavedFence } from "@/types/aeroshield";
import type {
  MissionReviewChecklistItem,
  MissionReviewLaunchContent,
  MissionReviewSummaryRow,
  MissionType,
} from "@/types/missionCreate";

function formatRangeKm(detectionRadiusM: number | null): string | null {
  if (detectionRadiusM == null) return null;
  const km = detectionRadiusM / 1000;
  if (km >= 1) {
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
    return `${rounded}km`;
  }
  return `${Math.round(detectionRadiusM)}m`;
}

function deviceDisplayName(device: Device): string {
  const name = device.name?.trim();
  if (name) return name;
  return device.serial_number || device.id.slice(0, 8);
}

function jammingModeLabel(missionType: MissionType): string {
  switch (missionType) {
    case "Live Op":
      return "Auto";
    case "Training Sim":
      return "Manual";
    case "Maintenance":
      return "Standby";
    default:
      return "Manual";
  }
}

/**
 * Builds Review & Launch copy from the create-mission draft.
 * TODO: Replace coverage / swarm / overlap lines with API when available.
 */
export function buildMissionReviewLaunchContent(params: {
  name: string;
  missionType: MissionType;
  commandUnit: string;
  startAt: string;
  endAt: string;
  fences: SavedFence[];
  selectedDevices: Device[];
}): MissionReviewLaunchContent {
  const {
    name,
    missionType,
    commandUnit,
    startAt,
    endAt,
    fences,
    selectedDevices,
  } = params;

  const missionLine = `${name.trim()} · ${missionType} · ${commandUnit} · —`;

  const firstAlt = fences[0]?.altitude?.trim();
  const aopSubtitle =
    fences.length > 0
      ? `${fences.length} fence(s)${firstAlt ? ` · altitude ${firstAlt} m` : ""} · coverage —`
      : "No fences defined";

  const jammerCount = selectedDevices.filter(
    (d) => d.device_type === "JAMMER" || d.device_type === "DETECTION_JAMMER",
  ).length;

  let radarSubtitle = "No assets selected";
  if (selectedDevices.length > 0) {
    const d0 = selectedDevices[0];
    const range = formatRangeKm(d0.detection_radius_m);
    const loc = d0.name?.trim() || d0.serial_number || "Radar";
    const parts = [loc];
    if (range) parts.push(`${range} range`);
    if (jammerCount > 0)
      parts.push(`${jammerCount} Jammer${jammerCount === 1 ? "" : "s"}`);
    radarSubtitle = parts.join(" · ");
  }

  const checklist: MissionReviewChecklistItem[] = [
    {
      id: "identity",
      variant: "success",
      title: "Mission Identity",
      subtitle: missionLine,
    },
    {
      id: "aop",
      variant: "success",
      title: "AOP Defined",
      subtitle: aopSubtitle,
    },
    {
      id: "radar",
      variant: "success",
      title:
        selectedDevices.length > 0
          ? deviceDisplayName(selectedDevices[0])
          : "Radar assignment",
      subtitle:
        selectedDevices.length > 0
          ? radarSubtitle
          : "Select at least one radar asset",
    },
    {
      id: "jamming",
      variant: "warning",
      title: "Jamming / AOP overlap",
      subtitle:
        "Review jamming geometry against mission boundary before launch.",
      needsAcknowledge: true,
    },
    {
      id: "swarm",
      variant: "success",
      title: "Swarm readiness",
      subtitle: "Swarm thresholds · 3 / 5 / 8 drones (demo)",
    },
  ];

  const radarLabel =
    selectedDevices.length === 1
      ? "1 assigned"
      : `${selectedDevices.length} assigned`;

  const summaryRows: MissionReviewSummaryRow[] = [
    { value: name.trim() || "—", label: "MISSION" },
    { value: radarLabel, label: "RADAR" },
    { value: jammingModeLabel(missionType), label: "JAMMING MODE" },
    { value: `${startAt} – ${endAt}`, label: "SCHEDULE" },
    { value: "— · —", label: "AOP COVERAGE" },
    { value: "3 / 5 / 8 drones", label: "SWRAM THRESHOLDS" },
  ];

  return { checklist, summaryRows };
}
