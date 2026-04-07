# Create Mission and Fence Flow

## Scope Implemented

This document captures the UI, interaction, and API integration work implemented for:

- missions list and search
- create mission form with fence drawing
- fence geometry persistence as zones via API
- mission border rendering on the landing overview map
- camera and layer behavior across mission selection

## Mission Selector

`src/components/missions/MissionSelector.tsx` supports two top-level views:

- `list` -- mission list with search, status tags, and load action
- `create` -- mission creation form with fence workspace

Responsibilities:

- fetching and rendering mission list data via `useMissionsList`
- switching between list and create views
- creating a mission through `useCreateMission` (submits `name`, `aop`, `border_geojson`)
- bulk-saving all drawn fences as zones via `createZone` after mission POST succeeds
- loading a mission after successful creation via `handleLoad`
- locking map-dismiss behavior while create-fence mode is active

### Zone Bulk-Save in `handleCreate`

After `POST /missions` returns the new `mission.id`:

1. Iterates `fenceItems` array
2. For each fence, calls `createZone(mission.id, { label, priority, zone_geojson, action_plan })`
3. Uses `Promise.allSettled` so one failure does not block others
4. Then proceeds with `resetCreateForm()` + `handleLoad(m.id)`

Field mapping from `SavedFence` to Zone API payload:

| SavedFence field | Zone API field |
|-----------------|----------------|
| `name` | `label` |
| `geometry.geometry` (the Polygon) | `zone_geojson` |
| Default `1` | `priority` |
| `{ altitude_ceiling: altitude, draw_mode: mode }` | `action_plan` |

## Create Mission Form

`src/components/missions/CreateMissionForm.tsx`

Current behavior:

- opens from the missions list via `Create Mission`
- has a back action to return to the mission list
- matches the Figma layout for the current phase
- shows:
  - mission name
  - command unit dropdown
  - mission type chips
  - start date and time
  - end date and time
  - fence search
  - create fence entry point
  - fence list with delete and "No fences added yet" empty state

Current API payload behavior:

- `name` is submitted
- `aop: null` is submitted
- `border_geojson` is submitted from `fenceItems[0].geometry.geometry` (first fence becomes the mission border)
- all fences are bulk-POSTed as zones after mission creation succeeds

Fields shown for UI/design purposes but not submitted:

- command unit
- mission type
- start/end date and time

## Reusable UI Components

### Dropdown

`src/components/ui/Dropdown.tsx` -- used by create mission command unit field.

### Date and Time

- `src/components/ui/DateTimeField.tsx` -- simpler native-backed version
- `src/components/ui/CustomDateTimeField.tsx` -- custom grey picker used in the create mission form

## Create Fence Workspace

Extracted into separate components:

- `src/components/missions/CreateFenceWorkspace.tsx` -- orchestrates drawing state and map interaction
- `src/components/missions/CreateFencePanel.tsx` -- displays saved fences list with delete, shows empty state when no fences
- `src/components/missions/FenceDrawToolbar.tsx` -- drawing tool selection
- `src/components/missions/FenceMetadataPopover.tsx` -- name and altitude input after shape completion

### Flow

From `CreateMissionForm`, clicking `Create Fence` switches the panel into the fence workspace. The workspace provides:

- left fence list panel
- detached drawing toolbar
- metadata popover after a shape is completed
- local draft and saved fence rendering on the map

### Fence Toolbar

Visible tools:

- polygon (pink `#FF30C6`)
- square (purple `#9E5CFF`)
- circle (green `#00D68F`)

Hidden for now: line.

### Types

Defined in `src/types/aeroshield.ts`:

- `FenceDrawTool` -- `"polygon" | "square" | "circle"`
- `SavedFence` -- `{ name, altitude, mode, geometry }` where geometry is `GeoJSON.Feature<GeoJSON.Polygon>`

## Fence Drawing Implementation

### Extracted Modules

Drawing logic was refactored from inline `CreateFenceWorkspace` code into dedicated modules:

- `src/hooks/useFenceDraw.ts` -- custom hook encapsulating Mapbox click handlers, drawing state machine, map interaction snapshot/restore
- `src/utils/fenceGeometry.ts` -- pure geometry utilities: `buildPolygonFeature`, `buildRectanglePoints`, `buildCirclePoints` (Haversine-based), `closeRing`, `getPolygonCentroid`, `isSameCoordinate`
- `src/components/map/layers/fence.ts` -- Mapbox source/layer management: `ensureFenceLayers`, `updateFenceLayers`, `setDraftLayerData`, `removeFenceLayers`

### Supported Shapes

- **Polygon:** click to add vertices, double-click to finish
- **Square:** first click sets anchor corner, second click completes rectangle
- **Circle:** first click sets center, second click sets radius (uses Haversine distance and destination-point for accurate rendering)

### Geometry Storage

`SavedFence` objects with full geometry live in `MissionSelector` state (`fenceItems`) and pass through to `CreateMissionForm` and `CreateFencePanel`. Shapes are stored as `GeoJSON.Polygon` features.

### Map Rendering (Fence Drawing)

Draft and saved fences are rendered through dedicated sources/layers:

- `create-fence-draft` (fill + outline)
- `create-fence-saved` (fill + outline)
- `create-fence-saved-label-src` (label layer)

All fence layers use `*-emissive-strength: 1` for visibility in Mapbox Standard night mode.

## Border Layer (Landing and Mission View)

`src/components/map/layers/border.ts` renders mission border polygons on the map.

### Landing Overview

All missions with `border_geojson` are displayed on initial map load via `useLandingBorders()` hook (in `src/hooks/useMissions.ts`). This hook extracts borders from the mission list query and converts them to `GeoJSON.Feature<GeoJSON.Polygon>[]` with `missionName` and `missionId` in properties.

### Shape Color Inference

The API stores raw `GeoJSON.Polygon` without color metadata. Colors are inferred from vertex count:

- 5 vertices (4 unique + closing) = square = purple `#9E5CFF`
- More than 50 vertices (circle has 64 segments) = circle = green `#00D68F`
- Everything else = polygon = pink `#FF30C6`

Colors are applied via data-driven paint expressions using `["coalesce", ["get", "outlineColor"], "#22d3ee"]` so explicit color properties take priority.

### Fill and Outline

- Fill: data-driven color at `opacity: 0.08` with `fill-emissive-strength: 1`
- Outline: data-driven color, `line-width: 2`, dashed, `line-emissive-strength: 1`

### Label Positioning

Labels are placed at the top-center of each polygon (horizontal center, maximum latitude) with `text-anchor: "bottom"` so text sits above the shape edge. Label color matches the border outline color.

### Mission Selection Behavior

When a mission is selected, its border from `mapFeatures` is merged into the landing borders array (deduplicating by `missionId`). All mission borders remain visible regardless of which mission is selected.

## Radar and Asset Visibility

### Landing Assets

`useLandingMissionAssets()` (in `src/hooks/useMissions.ts`) aggregates radar assets from all active/live missions. This hook is always enabled, not gated by mission selection.

### Mission Selection

When a mission is selected, `assetsForIntercept` merges landing assets with the selected mission's devices (deduplicating by ID, mission devices taking priority for fresher status). Other missions' radars remain visible on the map.

## Camera Behavior

### Initial Load

Camera fits to all landing assets (radars from active missions) or falls back to India overview.

### Mission Selection

Camera fits to the selected mission's own devices. If the mission has no devices, falls back to the mission border bounding box. Does not jump to other missions' assets.

### Deselection

Camera returns to landing assets overview.

## Zone API Integration

### API Client

`src/lib/api/zones.ts` provides typed functions for all Zone CRUD endpoints:

- `createZone(missionId, payload)` -- POST
- `listZones(missionId)` -- GET
- `updateZone(missionId, zoneId, payload)` -- PATCH
- `deleteZone(missionId, zoneId)` -- DELETE

### TanStack Query Hooks

`src/hooks/useZones.ts`:

- `useCreateZone(missionId)` -- mutation, invalidates mission detail + map features
- `useDeleteZone(missionId)` -- mutation, invalidates mission detail + map features

### Zone Rendering

`src/components/map/layers/zones.ts` renders zones from `cachedMission.zones` when a mission is loaded. Zone fills are controlled by `SHOW_MISSION_ZONE_FILLS` (currently `false`). Zone outlines and TL priority labels are always visible.

## Map Dismiss Lock

While the create fence workspace is active, background map clicks do not dismiss the mission overlay.

Handled by:

- `MissionSelector` reporting lock state upward
- `src/app/dashboard/page.tsx` respecting `mapDismissLocked`

## Validation

Fence metadata popover includes:

- placeholder text
- required validation for fence name
- required validation for altitude ceiling
- numeric validation for altitude ceiling

Cancel behavior:

- closes the popover
- clears the draft fence from the map immediately via imperative `setDraftLayerData(map, null)`

## Current Known Limitations

1. **No fence editing** -- no vertex drag, resize handles, or shape re-drawing after save

2. **No explicit finish control** -- polygon drawing finishes on double-click only; no explicit "Complete" button

3. **Style reload during drawing** -- if the Mapbox style reloads while the fence workspace is active, fence layers may need explicit reattachment (partially handled via `style.load` listener)

4. **First fence is the border** -- only `fenceItems[0]` is sent as `border_geojson` in the mission creation payload; additional fences become zones only

5. **Zone save failures are silent** -- `Promise.allSettled` results are not inspected in `handleCreate`; if zone POSTs fail, the user sees a successful mission creation with no warning about missing zones

6. **Touch rotation not restored** -- `applyMapDrawingMode` disables touch rotation but `restoreMapInteractions` does not re-enable it; pinch-rotate may stay disabled after drawing

## Resolved Issues

These issues from the original document have been fixed:

1. **Fence geometries only stored locally** -- RESOLVED: `SavedFence` objects with full geometry now live in `MissionSelector` state and pass through to form and panel components

2. **`border_geojson` not wired** -- RESOLVED: `fenceItems[0].geometry.geometry` is submitted as `border_geojson` in `POST /missions`

3. **Cancel not clearing draft from map** -- RESOLVED: refactored click handlers out of `setDrawingState` updaters to avoid nested state updates; added imperative `setDraftLayerData(map, null)` in `resetDrawing()`

4. **Tool-specific colors not rendering** -- RESOLVED: added `fill-emissive-strength: 1`, `line-emissive-strength: 1`, and `text-emissive-strength: 1` to all fence layers for Mapbox Standard night mode compatibility

5. **Map interaction restoration too broad** -- RESOLVED: `useFenceDraw` now uses a snapshot/restore pattern that only changes the interactions it touched

6. **Borders disappearing on mission select** -- RESOLVED: active mission border is merged into landing borders instead of replacing them

7. **Camera jumping to wrong mission** -- RESOLVED: camera fits to selected mission's devices only; falls back to border bbox if no devices

## Production Readiness Notes

### Critical -- Fix Before Production

1. **Silent zone bulk-save failures**
   - File: `src/components/missions/MissionSelector.tsx` (`handleCreate`)
   - Issue: `Promise.allSettled` results are never inspected. If zone POSTs fail, the user sees a successful mission creation with no warning. Zones may be missing from the mission with no retry mechanism.
   - Fix: inspect settled results, show a toast or inline warning for any rejected promises, consider a retry option.

2. **Recursive setTimeout leak in map initialization**
   - File: `src/components/map/MapContainer.tsx` (`tryInitialize`)
   - Issue: recursive `setTimeout(tryInitialize, 100)` retries are not tracked or cleared on unmount. If the component unmounts while waiting for a non-zero container rect, a later retry can set state on an unmounted component.
   - Fix: store the retry timeout ID in a ref and clear it in the cleanup function.

3. **`apiJson` null body on 2xx**
   - File: `src/lib/api/client.ts`
   - Issue: on `res.ok`, returns `body as T` even when `body` stayed `null` (empty body or JSON parse skipped). Callers like `createZone` assume a real `Zone` object.
   - Fix: add a null/undefined check on `body` before returning; throw or return a typed default.

### Warnings -- Edge Cases

1. **Touch rotation not restored after fence draw mode**
   - File: `src/hooks/useFenceDraw.ts`
   - `applyMapDrawingMode` disables touch rotation but `restoreMapInteractions` never re-enables it.

2. **`assetsForIntercept` rebuilds on any device status change**
   - File: `src/components/map/MapContainer.tsx`
   - `useMemo` depends on `byDeviceId` (full store slice). Any WebSocket device status update triggers a full rebuild and `setAssetLayersData` call.

3. **Zones not cleared on mission switch when mapFeatures is loading**
   - File: `src/components/map/MapContainer.tsx`
   - If `cachedMission.zones` is empty and `mapFeatures` is falsy (still loading), old zone features remain on the map until the landing cleanup effect fires.

4. **Degenerate polygons from insufficient vertices**
   - File: `src/utils/fenceGeometry.ts`
   - `buildPolygonFeature` can produce invalid polygons with fewer than 3 vertices. Mapbox may misrender; server validation may reject.

5. **Labels at [0, 0] for empty geometry rings**
   - File: `src/components/map/layers/border.ts`
   - `polygonTopCenter` returns `[0, 0]` for features with empty or invalid outer rings, placing a label at Null Island.

## Suggested Next Phase

See `docs/api-integration-roadmap.md` for the prioritized list of future API integrations:

1. Device Assignment
2. Features CRUD
3. Device Configs Display
4. Mission Update
5. Admin Module

Additional UX improvements to consider:

- fence shape editing (vertex drag, resize handles)
- explicit "Complete Drawing" button for polygons
- drawing hints and instructional text per tool
- zone priority selection during fence creation
- date validation and start/end ordering in mission form
