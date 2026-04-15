import type { Device, DeviceStatus, DeviceType } from "@/types/aeroshield";

export function deviceTypeLabel(deviceType: DeviceType): string {
  switch (deviceType) {
    case "DETECTION":
      return "Detection";
    case "JAMMER":
      return "Jammer";
    case "DETECTION_JAMMER":
      return "Detection + Jammer";
    default:
      return deviceType;
  }
}

export function formatRangeKm(detectionRadiusM: number | null): string | null {
  if (detectionRadiusM == null) return null;
  const km = detectionRadiusM / 1000;
  if (km >= 1) {
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
    return `${rounded}km range`;
  }
  return `${Math.round(detectionRadiusM)}m range`;
}

function formatJammerRadiusKm(jammerRadiusM: number | null): string | null {
  if (jammerRadiusM == null) return null;
  const km = jammerRadiusM / 1000;
  if (km >= 1) {
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
    return `${rounded}km jammer`;
  }
  return `${Math.round(jammerRadiusM)}m jammer`;
}

/** Honest jammer/range copy for Figma-style meta (no device count from API). */
export function formatJammerCapabilityLine(device: Device): string | null {
  const { device_type, jammer_radius_m } = device;
  if (device_type === "DETECTION") return null;
  if (device_type === "JAMMER") {
    const jr = formatJammerRadiusKm(jammer_radius_m);
    return jr ?? "Jammer";
  }
  const jr = formatJammerRadiusKm(jammer_radius_m);
  return jr ?? "Detection + Jammer";
}

/** Figma 853:9679 — area placeholder, range, type/jammer (no city until API). */
export function formatSelectedRadarMetaLine(device: Device): string {
  const bits: string[] = ["—"];
  const range = formatRangeKm(device.detection_radius_m);
  if (range) bits.push(range);
  bits.push(formatJammerCapabilityLine(device) ?? deviceTypeLabel(device.device_type));
  return bits.join(" • ");
}

export function deviceDisplayName(device: Device): string {
  const name = device.name?.trim();
  if (name) return name;
  return device.serial_number || device.id.slice(0, 8);
}

export function formatDeviceSubtitle(device: Device): string {
  const parts: string[] = [];
  const range = formatRangeKm(device.detection_radius_m);
  if (range) parts.push(range);
  parts.push(deviceTypeLabel(device.device_type));
  if (device.mission_id) parts.push("On another mission");
  return parts.join(" • ");
}

export type DeviceStatusPresentationVariant = "ok" | "offline" | "neutral";

export function getDeviceStatusPresentation(status: DeviceStatus): {
  label: string;
  variant: DeviceStatusPresentationVariant;
} {
  switch (status) {
    case "ONLINE":
    case "WORKING":
      return { label: "All Systems OK", variant: "ok" };
    case "OFFLINE":
      return { label: "Offline", variant: "offline" };
    case "IDLE":
      return { label: "Idle", variant: "neutral" };
    default:
      return { label: "Unknown", variant: "neutral" };
  }
}
