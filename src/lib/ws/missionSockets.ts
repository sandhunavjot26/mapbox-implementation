/**
 * WebSocket URL builder for mission-scoped streams.
 *
 * Device-service (port 8001):
 *   ws://<host>/ws/missions/{mission_id}/events?token=<JWT>
 *   ws://<host>/ws/missions/{mission_id}/devices?token=<JWT>
 *
 * Command-service (port 8002):
 *   ws://<host>/ws/missions/{mission_id}/commands?token=<JWT>
 *
 * Base URL: NEXT_PUBLIC_WS_BASE_URL or NEXT_PUBLIC_WS_DEVICE_URL / NEXT_PUBLIC_WS_COMMAND_URL.
 * WebSockets use separate URLs from REST (e.g. IP-based for WS, HTTPS for REST).
 */

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "";
const WS_DEVICE_URL = process.env.NEXT_PUBLIC_WS_DEVICE_URL ?? "";
const WS_COMMAND_URL = process.env.NEXT_PUBLIC_WS_COMMAND_URL ?? "";

const WS_PATH = "/ws/missions/{mission_id}";

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

/** Returns null if base URL is not configured (avoids malformed relative URL). */
export function getEventsWsUrl(
  missionId: string,
  token: string,
): string | null {
  const base = WS_BASE_URL || WS_DEVICE_URL;
  if (!base) {
    if (typeof console !== "undefined") {
      console.warn(
        "[missionSockets] Missing base URL for events WebSocket. Set NEXT_PUBLIC_WS_BASE_URL or NEXT_PUBLIC_WS_DEVICE_URL.",
      );
    }
    return null;
  }
  return buildWsUrl(base, `${WS_PATH}/events`, missionId, token);
}

/** Returns null if base URL is not configured (avoids malformed relative URL). */
export function getDevicesWsUrl(
  missionId: string,
  token: string,
): string | null {
  const base = WS_BASE_URL || WS_DEVICE_URL;
  if (!base) {
    if (typeof console !== "undefined") {
      console.warn(
        "[missionSockets] Missing base URL for devices WebSocket. Set NEXT_PUBLIC_WS_BASE_URL or NEXT_PUBLIC_WS_DEVICE_URL.",
      );
    }
    return null;
  }
  return buildWsUrl(base, `${WS_PATH}/devices`, missionId, token);
}

/** Returns null if base URL is not configured (avoids malformed relative URL). */
export function getCommandsWsUrl(
  missionId: string,
  token: string,
): string | null {
  const base = WS_BASE_URL || WS_COMMAND_URL;
  if (!base) {
    if (typeof console !== "undefined") {
      console.warn(
        "[missionSockets] Missing base URL for commands WebSocket. Set NEXT_PUBLIC_WS_BASE_URL or NEXT_PUBLIC_WS_COMMAND_URL.",
      );
    }
    return null;
  }
  return buildWsUrl(base, `${WS_PATH}/commands`, missionId, token);
}
