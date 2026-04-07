import type { Device } from "@/types/aeroshield";
import type { Asset } from "@/types/assets";

function resolveAssetStatus(rawStatus?: string): Asset["status"] {
  return rawStatus === "ONLINE" || rawStatus === "WORKING" || rawStatus === "IDLE"
    ? "ACTIVE"
    : "INACTIVE";
}

/** Convert API devices to the shared asset view model, with optional WS status overrides. */
export function devicesToAssets(
  devices: Device[],
  statusOverrides?: Record<string, string>,
): Asset[] {
  return devices.map((device) => {
    const resolvedStatus = statusOverrides?.[device.id] ?? device.status;

    return {
      id: device.id,
      name: device.name ?? device.serial_number ?? device.id,
      status: resolveAssetStatus(resolvedStatus),
      altitude: 0,
      area: "",
      coordinates: [device.longitude, device.latitude],
      coverageRadiusKm: (device.detection_radius_m ?? 2000) / 1000,
    };
  });
}
