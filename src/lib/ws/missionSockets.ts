/**
 * WebSocket URL builder for mission-scoped streams.
 *
 * Device-service (port 8001):
 *   GET ws://<host>/api/v1/ws/missions/{mission_id}/events?token=<JWT>
 *   GET ws://<host>/api/v1/ws/missions/{mission_id}/devices?token=<JWT>
 *
 * Command-service (port 8002):
 *   GET ws://<host>/api/v1/ws/missions/{mission_id}/commands?token=<JWT>
 *
 * When behind nginx proxy: set NEXT_PUBLIC_WS_BASE_URL.
 */

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "";
const DEVICE_URL = process.env.NEXT_PUBLIC_DEVICE_URL ?? "";
const COMMAND_URL = process.env.NEXT_PUBLIC_COMMAND_URL ?? "";

function wsBaseUrl(httpUrl: string): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const proto = secure ? "wss" : "ws";
  return httpUrl.replace(/^https?/, proto).replace(/\/$/, "");
}

function buildWsUrl(
  baseUrl: string,
  path: string,
  missionId: string,
  token: string,
): string {
  const wsHost = wsBaseUrl(baseUrl);
  return `${wsHost}${path.replace("{mission_id}", missionId)}?token=${encodeURIComponent(token)}`;
}

/** ws(s)://<host>/api/v1/ws/missions/{id}/events — mission events (DETECTED, JAMMED, etc.) */
export function getEventsWsUrl(missionId: string, token: string): string {
  const base = WS_BASE_URL || DEVICE_URL;
  return buildWsUrl(
    base,
    "/api/v1/ws/missions/{mission_id}/events",
    missionId,
    token,
  );
}

/** ws(s)://<host>/api/v1/ws/missions/{id}/devices — device state (online/offline/status) */
export function getDevicesWsUrl(missionId: string, token: string): string {
  const base = WS_BASE_URL || DEVICE_URL;
  return buildWsUrl(
    base,
    "/api/v1/ws/missions/{mission_id}/devices",
    missionId,
    token,
  );
}

/** ws(s)://<host>/api/v1/ws/missions/{id}/commands — command lifecycle */
export function getCommandsWsUrl(missionId: string, token: string): string {
  const base = WS_BASE_URL || COMMAND_URL;
  return buildWsUrl(
    base,
    "/api/v1/ws/missions/{mission_id}/commands",
    missionId,
    token,
  );
}
