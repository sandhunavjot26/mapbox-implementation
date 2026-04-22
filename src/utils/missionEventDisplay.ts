import type { MissionEventEntry } from "@/stores/missionEventsStore";
import type { Device } from "@/types/aeroshield";

/**
 * Human device column for mission timeline — mission devices, then payload fallbacks.
 */
export function missionEventDeviceLabel(
  e: MissionEventEntry,
  devices: Device[] | undefined,
): string {
  if (e.device_id) {
    const d = devices?.find((x) => x.id === e.device_id);
    if (d) return d.name || d.serial_number;
    return `${e.device_id.slice(0, 8)}…`;
  }
  const p = e.payload;
  if (!p || typeof p !== "object") return "—";
  const pr = p as Record<string, unknown>;
  if (typeof pr.name === "string" && pr.name.trim()) return pr.name;
  if (typeof pr.device_name === "string" && pr.device_name.trim()) {
    return pr.device_name;
  }
  const did = pr.device_id;
  if (typeof did === "string") {
    const d = devices?.find((x) => x.id === did);
    if (d) return d.name || d.serial_number;
    return `${did.slice(0, 8)}…`;
  }
  const mon = pr.monitor_device_id;
  if (mon != null && devices?.length) {
    const n = Number(mon);
    if (Number.isFinite(n)) {
      const d = devices.find((d) => d.monitor_device_id === n);
      if (d) return d.name || d.serial_number;
      return `mon ${n}`;
    }
  }
  const uav = pr.uav as Record<string, unknown> | undefined;
  if (uav && typeof uav.target_name === "string" && uav.target_name.trim()) {
    return uav.target_name;
  }
  // Zone-breach / NFZ rows (see docs/API_REFERENCE.md) — no radar device; target is the UAV
  if (typeof pr.target_name === "string" && pr.target_name.trim()) {
    const zl =
      typeof pr.zone_label === "string" && pr.zone_label.trim()
        ? pr.zone_label
        : null;
    return zl ? `${pr.target_name} · ${zl}` : pr.target_name;
  }
  if (typeof pr.target_uid === "string" && pr.target_uid.trim()) {
    return pr.target_uid.length > 14
      ? `${pr.target_uid.slice(0, 12)}…`
      : pr.target_uid;
  }
  return "—";
}

/**
 * Best-effort lat,lon from mission_event.payload (DETECTED uav, TRACK_UPDATE, NFZ, etc.).
 * Returns "—" when not present (many events are device-only with no position).
 */
export function missionEventLocation(
  p: Record<string, unknown> | null | undefined,
): string {
  if (!p) return "—";
  // Zone breach — lat/lon often at payload root (not under uav)
  if (p.uav_lat != null && p.uav_lon != null) {
    const lat = Number(p.uav_lat);
    const lon = Number(p.uav_lon);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      !(lat === 0 && lon === 0)
    ) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }
  const u = p.uav as Record<string, unknown> | undefined;
  if (u) {
    const la = u.uav_lat ?? u.lat;
    const lo = u.uav_lon ?? u.lon;
    if (la != null && lo != null) {
      const lat = Number(la);
      const lon = Number(lo);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        !(lat === 0 && lon === 0)
      ) {
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    }
  }
  if (p.lat != null && p.lon != null) {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      if (lat === 0 && lon === 0) return "—";
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }
  const head = p.head;
  if (Array.isArray(head) && head.length >= 2) {
    const lon = Number(head[0]);
    const lat = Number(head[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }
  const pos = p.position;
  if (Array.isArray(pos) && pos.length >= 2) {
    const a = Number(pos[0]);
    const b = Number(pos[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `${b.toFixed(4)}, ${a.toFixed(4)}`;
    }
  }
  return "—";
}
