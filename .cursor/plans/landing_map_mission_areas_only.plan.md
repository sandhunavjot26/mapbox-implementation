---
name: Landing map mission areas only
overview: Replace the fixed Rajasthan (Figma) landing viewport with a fit to real mission geography—union of mission border polygons when available, then radar assets—so the map never looks empty when missions exist.
todos:
  - id: bounds-helper
    content: Add helper to flatten polygon outer rings from landing border Features into coords and reuse existing computeBounds (MapContainer or small util)
    status: pending
  - id: intro-priority
    content: In map load intro (no missionId), fit order — (1) bounds from landingBorders, (2) landingAssets, (3) neutral fallback (not LANDING_REGION_BOUNDS)
    status: pending
  - id: sync-other-paths
    content: Align ease/fit when leaving a mission and late-loading assets effects with same priority; remove or narrow fitMapToIndia / easeMapToIndia usage
    status: pending
  - id: fallback-empty
    content: Define last-resort when no borders and no assets (e.g. globe zoom 2 or India-wide bbox)—product choice documented in code comment
    status: pending
isProject: true
---

# Landing map: show mission areas only (no fixed Rajasthan)

## Problem

The landing map uses [`LANDING_REGION_BOUNDS`](src/utils/missionOverview.ts) (Jaipur–Kota corridor) whenever [`landingAssets`](src/hooks/useMissions.ts) is empty at map load—even if missions exist with borders elsewhere. That feels **empty and wrong** because it ignores real mission geography.

## Desired behavior

On login / landing (no mission selected), the viewport should reflect **where missions actually are**:

1. **Mission borders** — [`useLandingBorders`](src/hooks/useMissions.ts) already builds polygon features from `border_geojson` on the **missions list** (no per-mission detail round-trip). This data often arrives **before** aggregated radar assets, so it fixes the “empty map” race.
2. **Radar assets** — If borders are missing but devices exist, keep fitting to [`landingAssets`](src/hooks/useMissions.ts) (existing behavior).
3. **No decorative region** — Do **not** use `fitMapToLandingRegion` / `LANDING_REGION_BOUNDS` as the default “pretty” view when missions exist.

## Implementation (focused)

**Files:** primarily [`src/components/map/MapContainer.tsx`](src/components/map/MapContainer.tsx); optionally trim or repurpose exports in [`src/utils/missionOverview.ts`](src/utils/missionOverview.ts) (legacy names `fitMapToIndia` / `easeMapToIndia` currently map to landing region—rename or stop using them on landing).

1. **Bounds from borders**  
   For each `GeoJSON.Feature<GeoJSON.Polygon>` in `landingBorders`, take the **outer ring** (`geometry.coordinates[0]`), collect all `[lng, lat]`, then `computeBounds` (already in `MapContainer`). If multiple missions, one merged bbox is enough (same as fitting “all mission areas”).

2. **Intro branch** (`map.on("load")`, `!missionId`)  
   Replace the `else { fitMapToIndia(map); }` path with:
   - If border bounds valid → `fitBounds` (reuse same padding/duration options as current landing asset fit, or match [`getLandingFitOptions`](src/utils/missionOverview.ts) minus the wrong region).
   - Else if `landingAssets` bounds → existing branch.
   - Else → **fallback** (see below)—**not** Rajasthan.

3. **Other call sites**  
   - Returning from a mission ([`prevMissionId` effect ~1028–1044](src/components/map/MapContainer.tsx)): same priority (borders → assets → fallback).  
   - Late [`landingAssets`](src/components/map/MapContainer.tsx) effect (~1053–1067): consider fitting to **borders** if assets were empty but borders existed (or rely on intro + one “landing fit” effect that watches borders + assets).

4. **Fallback when there are zero missions or no geometry**  
   Pick one and document: e.g. **globe-friendly** `easeTo` center/zoom similar to initial `[0, 20]` / zoom `2`, or a **broad India bbox** if you want a regional default without implying a fake COP. Avoid reintroducing Figma Rajasthan unless explicitly desired for marketing demos.

## Edge cases

- **List has missions but all `border_geojson` null** — rely on `landingAssets` when detail queries finish; if still empty, fallback.
- **Missions worldwide** — union bbox may be huge; `maxZoom` caps (already used) keep the frame sane.

## Out of scope

- Changing API payloads (assumes list already returns `border_geojson` where possible—per [mission_areas_on_map](.cursor/plans/mission_areas_on_map_34a3283e.plan.md)).
