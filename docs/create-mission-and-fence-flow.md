# Create Mission And Fence Flow

## Scope Implemented

This document captures the UI and interaction work implemented so far for:

- missions list improvements
- create mission form
- reusable form inputs
- create fence workspace
- phase 1 and phase 2 fence drawing

## Mission Selector Changes

The missions overlay in `src/components/missions/MissionSelector.tsx` now supports two top-level views:

- `list`
- `create`

Responsibilities kept in `MissionSelector`:

- fetching and rendering mission list data
- switching between list and create views
- creating a mission through `useCreateMission`
- loading a mission after successful creation
- locking map-dismiss behavior while create-fence mode is active

## Create Mission Form

The create mission UI was extracted into:

- `src/components/missions/CreateMissionForm.tsx`

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
  - fence list

Current API payload behavior:

- only valid mission API fields are submitted
- current submit payload uses:
  - `name`
  - `aop: null`

Fields currently shown for UI/design purposes but not submitted:

- command unit
- mission type
- start/end date and time
- fence metadata

## Reusable UI Components

### Dropdown

Reusable dropdown component:

- `src/components/ui/Dropdown.tsx`

Used by:

- create mission command unit field

### Date And Time

Two date-time components now exist:

- `src/components/ui/DateTimeField.tsx`
  - simpler native-backed version
- `src/components/ui/CustomDateTimeField.tsx`
  - custom grey picker used in the create mission form

Current create mission form uses:

- `CustomDateTimeField`

## Create Fence Workspace

The create fence flow was extracted into separate components:

- `src/components/missions/CreateFenceWorkspace.tsx`
- `src/components/missions/CreateFencePanel.tsx`
- `src/components/missions/FenceDrawToolbar.tsx`
- `src/components/missions/FenceMetadataPopover.tsx`

### Current Flow

From `CreateMissionForm`, clicking `Create Fence` switches the panel into the fence workspace.

The workspace currently provides:

- left fence list panel
- detached drawing toolbar
- metadata popover after a shape is completed
- local draft and saved fence rendering on the map

### Fence Toolbar

Visible tools for the current phase:

- polygon
- square
- circle

Hidden for now:

- line

Toolbar icons come from:

- `public/icons/polygon.svg`
- `public/icons/square.svg`
- `public/icons/circle.svg`

Delete icon:

- `public/icons/trash.svg`

## Fence Drawing Implementation

Drawing currently uses the shared Mapbox map instance from:

- `src/components/map/mapController.ts`

### Supported Shapes

- polygon
- square
- circle

### Drawing Behavior

Polygon:

- click to add vertices
- double-click to finish

Square:

- first click sets anchor corner
- second click completes rectangle

Circle:

- first click sets center
- second click completes circle

### Geometry Storage

Current workspace state stores:

- in-progress drawing state
- draft polygon geometry
- saved fence geometries for the current workspace session

Shapes are stored as `GeoJSON.Polygon` features.

### Current Map Rendering

Draft and saved fences are rendered through dedicated sources/layers created by `CreateFenceWorkspace`:

- `create-fence-draft`
- `create-fence-saved`
- `create-fence-saved-label`

Tool-specific colors currently used:

- polygon: pink
- square: purple
- circle: green

## Validation Added

Fence metadata popover now includes:

- placeholder text
- required validation for fence name
- required validation for altitude ceiling
- numeric validation for altitude ceiling

Cancel behavior:

- closes the popover
- clears the draft fence from the map

## Map Dismiss Lock

While the create fence workspace is active, background map clicks should not dismiss the mission overlay.

This is handled by:

- `MissionSelector` reporting lock state upward
- `src/app/dashboard/page.tsx` respecting `mapDismissLocked`

## Current Known Limitations

These are important for the next phase:

1. Fence geometries are only stored locally inside `CreateFenceWorkspace`

- fence names are pushed back to the mission form list
- fence geometry is not yet persisted outside the fence workspace

2. `border_geojson` is not yet wired into mission creation

- geometry capture is available locally
- mission create submit still sends only currently supported fields

3. Fence drawing does not yet support editing

- no vertex drag/edit
- no resize handles
- no explicit finish control beyond the current click behavior

4. Fence rendering is owned inside the workspace

- if the map style is reloaded while drawing is active, fence layers may need explicit reattachment handling in a future pass

## Suggested Next Phase

Recommended next implementation order:

1. persist selected fence geometry in mission creation state
2. define how one or more fences map into mission `border_geojson`
3. add shape editing / reset affordances
4. add drawing hints and better completion UX
5. harden behavior around map style reloads

## Review Findings

Current code quality is in a workable state for iteration, but it is not yet production-ready.

The main reasons are:

1. Fence geometry persistence is incomplete

- fence names are pushed back into mission form state
- actual drawn geometry still lives only inside `CreateFenceWorkspace`
- if we leave the fence workspace and come back, the UI list remains but geometry is not durably owned by the parent mission flow

2. Map interaction restoration is too broad

- exiting draw mode currently re-enables map interactions directly
- that can conflict with the dashboard’s baseline map interaction settings
- draw mode should restore only the interaction state it actually changed

3. Fence layers are not hardened for map style reloads

- if the basemap or style changes while the fence workspace is active, the temporary sources/layers may be dropped
- the fence rendering path should reattach after style reload

## Open Issues Observed In Current Flow

These are still open and should be treated as active bugs:

1. Cancel is still not always clearing the drawing from the map immediately

- the draft fence preview should disappear as soon as the metadata popover is canceled
- this is currently not behaving consistently

2. Tool-specific colors are not showing consistently

- polygon should render pink
- square should render purple
- circle should render green
- current behavior is not consistently reflecting those per-tool colors on the map

## Recommended Stabilization Tasks Before Next Phase

Before moving deeper into the fence workflow, the best next technical pass is:

1. lift saved fence geometry into parent mission state

- store full fence objects in the mission creation flow, not just fence names
- keep geometry available for later `border_geojson` wiring

2. fix cancel behavior completely

- ensure cancel clears draft geometry source and local draft state in one deterministic path

3. fix tool-specific color rendering

- verify Mapbox paint expressions are reading feature properties correctly
- ensure both draft and saved sources preserve color properties

4. restore map interactions safely

- only restore interactions that draw mode disabled
- do not override the dashboard’s intended default interaction settings

5. reattach fence layers after style reload

- listen for style reload and restore draft/saved fence sources and layers

## Suggested Next Flows

Once the stabilization tasks above are done, the next product flows should be implemented in this order:

1. persist selected fence geometry into the create mission flow

- parent state should own fence names plus geometry
- mission form should be able to show which fence is currently selected for submission

2. define how fence geometry maps into mission creation payload

- decide whether mission creation will use one selected fence or a composed geometry
- then wire valid polygon geometry into `border_geojson`

3. add editing controls for saved fences

- edit fence metadata
- re-open a saved fence for geometry update
- delete saved fence and geometry together

4. improve drawing UX

- add instructional text per tool
- add explicit finish/reset controls where needed
- consider snapping or vertex editing later if required

5. harden create mission validation

- date validation
- start/end ordering
- better API error display
