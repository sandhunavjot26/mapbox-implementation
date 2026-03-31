---
name: ""
overview: ""
todos: []
isProject: false
---

# Driif Figma UI → Dashboard / MissionWorkspace (single live path)

## Goal (authoritative)

- **Keep one operational UI:** [Dashboard](src/app/dashboard/page.tsx) as the **map landing** (no separate mission-selection page), then **mission-focused** [MissionWorkspace](src/components/missions/MissionWorkspace.tsx) after the user picks a mission from the **menu overlay**.
- **When a mission is active:** preserve **existing API + WebSocket data flow** (`useMissionLoad`, `useMapFeatures`, `useMissionSockets`, `useMissionEvents`, [MapContainer](src/components/map/MapContainer.tsx) with real `missionId` / `mapFeatures`). [useMissionSockets](src/hooks/useMissionSockets.ts) already uses `missionId` from the store — **no WS URLs until a mission is selected** (acceptable for landing overview).
- **Replace chrome** with the **new Figma design** ([Driif-UI file](https://www.figma.com/design/dkRUNmWWxBYeiBAVrMcS26/Driif-UI), node `**853:9618`** — frame `CUAS`), not the legacy “Desktop - 25” (`176:1002`) implementation in code today.
- **Remove permanently:** the separate Driif demo route and all hardcoded map/mission data used only for that demo.

## Landing page & mission selection (routing)

- **No** full-page [MissionSelector](src/components/missions/MissionSelector.tsx) gate: after auth, user **lands on the map immediately** (same shell as Figma landing).
- **Active missions:** load via missions API (e.g. [listMissions](src/lib/api/missions.ts) / `useMissionsList`); **filter to active** per product/API rules (if the list has no status field yet, document assumption or coordinate a small API field — plan assumes “active” is definable from API or list).
- **Map:** show **all active missions** on the map (markers / pins — positions from `**border_geojson` centroid** per [Mission](src/types/aeroshield.ts), or agreed fallback e.g. lightweight geometry load; implementation detail). Selecting a mission from the **Missions overlay** sets `activeMissionId` and transitions to full mission mode (devices, zones, WS, etc.).
- **Missions UI:** move **list, search, create** from the old sidebar into the **Missions menu overlay** (Figma shell); remove the “select mission to see map” empty state in [dashboard/page.tsx](src/app/dashboard/page.tsx).
- **Globe / earth intro:** **keep** current cinematic behavior ([MapContainer](src/components/map/MapContainer.tsx): globe projection, fog, timed fly-in) on **initial load**.
- **Landing camera (after intro):** frame **India** at **country / subcontinent scale** — **not** a tight `fitBounds` on all mission geometries (missions may be far apart). Use a **fixed India bounding box** (e.g. fit `~[68°E, 6°N]–[98°E, 36°N]` with padding) and a **low `maxZoom` cap** (~4–5) so the user sees the full country context and scattered missions remain plausible. **Per-mission** `fitBounds` / fly-to-devices (current behavior) applies **only after** the user selects a mission.
- **Header / back:** replace “← Missions” empty-dashboard pattern with behavior aligned to overlay (e.g. clear selection returns to **overview** with India framing, not a non-map page).

## Map / basemap direction (for now)

- **Region:** **Landing:** India overview as above. **Mission selected:** operational region follows **that mission’s** devices / API (existing logic).
- **Basemap:** **Satellite + labels** — keep Mapbox `**satellite-streets-v12`** (or equivalent) aligned with Figma’s satellite COP look.
- **Theme:** **Dark UI chrome** in the shell (Figma: `rgba(0,0,0,0.64)` panels, `rgba(255,255,255,0.12)` borders, backdrop blur) + **existing tactical dimming** of raster layers in `MapContainer` (brightness / saturation / contrast). Optional later: Mapbox Studio style tweaks for closer pixel match — not required for the first merge.

## Icons — map and menu (explicit — first pass)

- **Map symbology:** Keep existing in-app assets for **radar, drones, towers/sensors, and other map glyphs** — [MapContainer](src/components/map/MapContainer.tsx) and layer helpers (e.g. [targets.ts](src/components/map/layers/targets.ts), [assets.ts](src/components/map/layers/assets.ts)) (SVG / GeoJSON styling / `mapbox-gl` layers).
- **Menu / shell icons:** Keep **existing project assets** (e.g. under `public/icons/`, same sources the Driif page already uses — search, assets, missions, files, logs, settings, user, etc.). Match **layout, spacing, and panel chrome** from Figma; **do not** replace nav/control icons with Figma MCP exports in this phase.
- **Defer:** Figma icon parity (map + menu) to a later task.

## Final takeaway — what changes in UI


| Area                      | Action                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Figma source of truth** | Node `**853:9618`** (`CUAS`) via MCP (`get_design_context` / screenshots).                                                                                                                                                                                                                                |
| **Shell**                 | Same Figma chrome on **landing** and **mission** views: **46px left nav**, logo, bottom settings/user, **top-right X**, **bottom-right** regions + compass + zoom + scale. Tokens: [driifTokens.ts](src/styles/driifTokens.ts). **Icons:** existing `public/icons/` etc., not Figma exports (first pass). |
| **Map**                   | **Mapbox-only** data layers. **Landing:** mission markers + India framing; **mission mode:** tracks/zones/devices from API/WS as today. **Glyphs:** keep current project assets; no Figma map icons yet.                                                                                                  |
| **Missions UX**           | **No** standalone picker page; **Missions** opens **overlay** (reuse/refactor [MissionSelector](src/components/missions/MissionSelector.tsx) content). Dashboard header/back flows updated for overview ↔ selected mission.                                                                               |
| **Delete**                | [src/app/driif-ui/page.tsx](src/app/driif-ui/page.tsx) (entire route), [src/data/driifUiMockData.ts](src/data/driifUiMockData.ts), and the **Driif UI** link in [dashboard/page.tsx](src/app/dashboard/page.tsx) (`href="/driif-ui"`).                                                                    |
| **Keep**                  | Public assets still used elsewhere (e.g. [login](src/app/login/page.tsx) `driif-logo.png`); shared tokens file (updated, not deleted) unless renamed for clarity.                                                                                                                                         |


## Architecture (unchanged)

Per [Driif-Frontend-System-Rules.mdc](.cursor/rules/Driif-Frontend-System-Rules.mdc): live telemetry in Zustand / sockets; Mapbox owns map rendering; no moving live telemetry into React local state for the merge.

## Implementation checklist

1. **Landing + routing:** Always render **map + shell** on dashboard; remove mission-gated empty state. Add **overview** `MapContainer` path: optional `missionId` / distinct props; **India** `fitBounds` after intro with **maxZoom** cap; **mission pins** from missions list (+ centroid helper for `border_geojson`).
2. **Missions overlay:** Embed list/search/create in Figma **Missions** overlay; `setActiveMission(id)` enters [MissionWorkspace](src/components/missions/MissionWorkspace.tsx); clearing selection returns to overview (clear targets / cache as needed).
3. Pull Figma `**853:9618`**; shell components; wire overlays (search, assets, missions, …).
4. **Mission mode:** unchanged data hooks inside `MissionWorkspace` with **real** `mapFeatures` / `missionId` — **no** mock mission seed.
5. Align **2D/3D** and **regions** with Mapbox; avoid duplicate controls.
6. Remove `**/driif-ui`** route + `**driifUiMockData.ts`** + dashboard Driif link; grep cleanup.
7. Visual QA: satellite + dark chrome; landing India scale vs mission zoom-in.
8. **Icons:** keep existing map + menu assets; defer Figma parity.

## Out of scope for this plan doc

- Backend/API changes.
- Replacing Mapbox with static Figma map images.
- Replacing **map** or **menu/shell** icons with Figma MCP asset exports (later phase).

