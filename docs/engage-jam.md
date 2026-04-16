# Engage and Jam — technical reference

This document describes how **Initiate Jam**, **Engage**, map intercept visualization, and jam-related UI relate to **REST**, **WebSockets**, and **local simulation / mock data** in the mapbox-implementation frontend.

## UI actions (drone / target overlay)

| Action | Location | Behavior |
|--------|----------|----------|
| **Initiate Jam** | [`DroneOverlayCard`](src/components/map/overlays/DroneOverlayCard.tsx) → [`EntityHoverPopup`](src/components/map/overlays/EntityHoverPopup.tsx) | Calls `confirmThreat(targetId)` only. No HTTP command. |
| **Engage** | Same card / popup | Calls [`executeEngageJam`](src/lib/engageJamCommand.ts): `confirmThreat` **plus** `ATTACK_MODE_SET` when mission and `deviceId` exist. |

Shared helper: [`src/lib/engageJamCommand.ts`](src/lib/engageJamCommand.ts). The legacy [`TargetPopupControls`](src/components/commands/PopupControls.tsx) **Engage** path uses the same helper.

## HTTP API (real backend)

- **Client:** [`createCommand`](src/lib/api/commands.ts) uses the **command** service (`apiJson("command", ...)`).
- **Endpoint:** `POST /api/v1/commands` on the base URL from **`NEXT_PUBLIC_COMMAND_URL`** (see [`src/lib/api/client.ts`](src/lib/api/client.ts)).
- **Engage command:** `command_type: "ATTACK_MODE_SET"` with payload `{ mode: 0, switch: 1 }` (expulsion/jam on, per comments in code / GUI guide).
- **Routing:** Command is sent to `device_id: target.deviceId` (detecting radar device), **not** the drone’s id.
- **Store:** On success, the created command is merged into [`useCommandsStore`](src/stores/commandsStore.ts) with `engaged_target_id` set to the **target** id for downstream UI.

If `activeMissionId` is missing or `target.deviceId` is missing, `executeEngageJam` still runs **`confirmThreat`** (local map behavior) and **skips** the HTTP call.

## WebSockets (real backend)

Hook: [`useMissionSockets`](src/hooks/useMissionSockets.ts).

- **Commands stream:** `getCommandsWsUrl` → `/ws/missions/{mission_id}/commands?token=...` (command service; see [`src/lib/ws/missionSockets.ts`](src/lib/ws/missionSockets.ts)).
- **Env:** `NEXT_PUBLIC_WS_BASE_URL` or `NEXT_PUBLIC_WS_COMMAND_URL` (and related device URLs for events/devices).

**Relevant handling when a command reaches a terminal status** (`SUCCEEDED` / `FAILED` / `TIMEOUT`):

- **`ATTACK_MODE_SET` + `SUCCEEDED`:** Reads `engaged_target_id` from the command record in the store and sets [`useEngageOverlayStore`](src/stores/engageOverlayStore.ts) (message such as “Jam active” / “Command delivered” from result payload).
- **`ATTACK_MODE_QUERY` + `SUCCEEDED`:** Updates [`useAttackModeStore`](src/stores/attackModeStore.ts) for “Jam: ON” / Idle style badges.

**Other streams** (events/devices) feed targets, device status, and timeline (e.g. `JAM_STARTED` / `JAM_STOPPED` labels in [`MissionTimeline`](src/components/panels/MissionTimeline.tsx)) but are not the primary path for the **Engage** button itself.

## Client-side simulation and mock data (no backend)

These run entirely in the browser and do **not** represent live device physics unless backed by API/WebSocket data elsewhere.

### Map intercept line and “neutralization” timeline

1. **`confirmThreat`** is delegated from [`mapActionsStore`](src/stores/mapActionsStore.ts) to [`MapContainer`](src/components/map/MapContainer.tsx).
2. **Line geometry:** A red dashed **GeoJSON line** is drawn from the **nearest active asset** (radar/jammer on the map) to the target ([`getNearestActiveAsset`](src/components/map/MapContainer.tsx)).
3. **Dash animation:** `requestAnimationFrame` updates `line-dasharray` on the `intercept-line` layer (visual “marching” effect).
4. **Intercept state machine:** [`mapActionsStore.addIntercept`](src/stores/mapActionsStore.ts) uses **fixed timers**: `vectoring` → `engaging` after **3s** → `neutralized` after **8s** total. This progression is **not** driven by WebSocket confirmation of a kill.
5. **Engagement log:** Entries are appended when an intercept completes to the **neutralized** state (same store).

### Target positions (API vs mock)

In [`MapContainer`](src/components/map/MapContainer.tsx), `useApiTargets = !!missionId`:

- **With an active mission:** targets come from the API-backed [`useTargetsStore`](src/stores/targetsStore.ts) pipeline (live or replayed detections).
- **Without a mission (e.g. landing/overview):** targets fall back to **mock / computed** targets via `subscribeToComputedTargets` and related logic; **simulated drift** (periodic coordinate updates) runs only when **`useApiTargets` is false**.

### Auto–confirm threat (simulation)

A `setInterval` (~2s) **auto-calls** `confirmThreat` for **ENEMY** targets inside an active asset coverage polygon ([`MapContainer`](src/components/map/MapContainer.tsx)). This is a **client-side** rule, not an API.

### Drone overlay card (mostly static demo copy)

[`DroneOverlayCard`](src/components/map/overlays/DroneOverlayCard.tsx) shows Figma-aligned layouts; much of the **detail text** is **hard-coded or sample data** (e.g. log lines, “Jamming status: Not jammed”, jammable frequencies derived from placeholders, duplicate log arrays). Treat as **UI mock** unless wired to real telemetry in the future.

### Radar asset overlay

[`RadarOverlayCard`](src/components/map/overlays/RadarOverlayCard.tsx) includes **local UI state** (e.g. jam frequency toggles) and **demo strings**; it is not the Engage/ATTACK path for targets.

### Configure mission / jammers UI

[`ConfigureRadarJammersTabContent`](src/components/missions/configureRadar/ConfigureRadarJammersTabContent.tsx) and related configure-radar components use **in-memory** jammer state for the configuration workflow, separate from live mission Engage.

## Command catalog (reference)

[`src/lib/commands.ts`](src/lib/commands.ts) lists command ids including `ATTACK_MODE_SET`, `ATTACK_MODE_QUERY`, `JAM_START`, `JAM_STOP`. The **Engage** button implementation uses **`ATTACK_MODE_SET`** specifically.

## Summary table

| Concern | Real API/WS | Local only |
|--------|-------------|------------|
| Engage → jam command | `POST /api/v1/commands` (`ATTACK_MODE_SET`) | — |
| Command lifecycle / overlay | Commands WebSocket + store | — |
| Red intercept line + dash animation | — | Mapbox layer in `MapContainer` |
| vectoring → engaging → neutralized | — | Timers in `mapActionsStore` |
| Initiate Jam | — | `confirmThreat` only (same map sim) |
| Drone card text / logs | — | Mostly mock copy in `DroneOverlayCard` |
| Targets when no mission | — | Mock / computed targets; optional drift |
