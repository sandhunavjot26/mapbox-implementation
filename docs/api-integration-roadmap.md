# API Integration Roadmap

> Prioritized list of AeroShield REST API integrations not yet wired into the frontend.
> See `docs/aeroshield-api-guide.md` for the full endpoint catalog.

## Current Integration Summary

| API Client File | Endpoints Covered | Hooks | Used in UI |
|-----------------|-------------------|-------|------------|
| `lib/api/auth.ts` | Login | Direct call | Login page |
| `lib/api/missions.ts` | List, Create, Load, Update, Map Features | `useMissionsList`, `useCreateMission`, `useMissionLoad`, `useMapFeatures` | Mission list, creation, workspace, map |
| `lib/api/zones.ts` | Create, List, Update, Delete | `useCreateZone`, `useDeleteZone` | Bulk-save on mission create |
| `lib/api/devices.ts` | List, States, Configs | `useDeviceStates` | Device panels (states only) |
| `lib/api/commands.ts` | Create, Approve, Reject, List | `useCommands` | Command workflow |
| `lib/api/policies.ts` | List, Update | `usePolicies` | Policy display/editing |
| `lib/api/missionEvents.ts` | List events | `useMissionEvents` | Timeline panel |

## Priority 1: Device Assignment

**Endpoint:** `POST /api/v1/missions/{id}/devices/assign`

**Payload:** `{ "device_ids": ["uuid1", "uuid2"] }`

**Current gap:** Missions are created without devices assigned from the UI. Operators must assign devices through the backend directly. The mission workspace shows devices once assigned, but there is no mechanism to assign or reassign them from the frontend.

**Implementation:**

- Add `assignDevices(missionId, deviceIds)` to `src/lib/api/devices.ts`
- Add `useAssignDevices(missionId)` mutation hook with cache invalidation for mission detail and map features
- UI: multi-select device picker during mission creation or a dedicated "Assign Devices" step in the mission workspace
- Requires `GET /api/v1/devices` (client exists) to populate the picker with available devices

**Dependencies:** None. Client file and device types already exist.

## Priority 2: Features CRUD

**Endpoints:**

- `POST /api/v1/missions/{id}/features` -- create a map feature (road, river, marker, note)
- `GET /api/v1/missions/{id}/features` -- list features for a mission
- `DELETE /api/v1/missions/{id}/features/{feature_id}` -- delete a map feature

> Note: no PATCH endpoint exists for features. Editing requires delete + recreate.

**Current gap:** The map already renders features from `GET /missions/{id}/map/features`, but there is no way to create or delete annotations from the UI. Roads, rivers, points of interest, and notes must be created through the backend.

**Implementation:**

- Create `src/lib/api/features.ts` with `createFeature`, `listFeatures`, `deleteFeature`
- Create hooks: `useCreateFeature`, `useDeleteFeature` with cache invalidation
- UI: draw-on-map tool for line/point/polygon features + metadata form, feature management panel with delete buttons
- Rendering pipeline already handles features from `mapFeatures`; no map layer changes needed

**Dependencies:** None. Feature types exist in `types/aeroshield.ts` (`MissionFeature`).

## Priority 3: Device Configs Display

**Endpoint:** `GET /api/v1/devices/configs/by-mission/{id}`

**Current gap:** The API client function `getDeviceConfigs` exists in `src/lib/api/devices.ts` but has no TanStack Query hook and is not wired to any UI component. Config data includes IP, netmask, gateway, DNS, attack mode status, and band range configuration.

**Implementation:**

- Add `useDeviceConfigs(missionId)` query hook (poll every 10s per AeroShield doc recommendation)
- UI: expand the device detail panel to show config information alongside the existing state data
- Consider a tabbed or accordion layout within the device card

**Dependencies:** Client already exists. Types need to be expanded beyond the current `DeviceConfig` interface (`{ device_id: string; [key: string]: unknown }`).

## Priority 4: Mission Update

**Endpoint:** `PATCH /api/v1/missions/{id}`

**Payload:** `Partial<{ name, aop, border_geojson }>`

**Current gap:** The API client function `updateMission` exists in `src/lib/api/missions.ts` but has no mutation hook and is not used in any UI. Missions cannot be renamed, have their AOP changed, or have their border redrawn after creation.

**Implementation:**

- Add `useUpdateMission(missionId)` mutation hook with cache invalidation for mission detail, list, and map features
- UI options:
  - Inline edit for mission name in the workspace header
  - "Edit Border" mode that reuses the fence drawing workspace
  - AOP field in a mission settings panel

**Dependencies:** Client already exists. Fence drawing workspace could be reused for border editing.

## Priority 5: Admin Module

**Endpoints (12 total):**

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/users` | List users |
| `POST /api/v1/users` | Create user |
| `PATCH /api/v1/users/{id}` | Enable/disable user |
| `DELETE /api/v1/users/{id}` | Delete user |
| `GET /api/v1/roles` | List roles |
| `POST /api/v1/roles` | Create role |
| `PUT /api/v1/roles/{id}/permissions` | Replace role permissions |
| `GET /api/v1/permissions` | List all permissions |
| `GET /api/v1/users/{id}/scopes` | Get user scopes |
| `POST /api/v1/users/{id}/scopes` | Grant scope |
| `DELETE /api/v1/users/{id}/scopes` | Revoke scope |

**Current gap:** No admin functionality exists in the frontend. User management, role assignment, permission editing, and scope configuration must all be done through the backend.

**Implementation:**

- Create `src/lib/api/admin.ts` with all user/role/permission/scope functions
- Create hooks for each CRUD operation
- UI: dedicated `/admin` route with:
  - Users table (list, create, disable, delete)
  - Roles management (list, create, edit permissions)
  - Scope assignment per user (mission and device scopes)
  - Permission matrix view
- JWT already carries `roles`, `permissions`, and `scopes`; use these to gate access to the admin section itself

**Dependencies:** Significant scope. Recommend breaking into sub-phases: (a) read-only user/role listing, (b) user create/disable, (c) role + permission editing, (d) scope management.

## Clients That Exist But Need Hooks

These API client functions are already written but lack TanStack Query hooks and UI integration:

| Client Function | File | Status |
|----------------|------|--------|
| `updateMission` | `lib/api/missions.ts` | No hook, no UI |
| `getDeviceConfigs` | `lib/api/devices.ts` | No hook, no UI |
| `listDevices` | `lib/api/devices.ts` | No hook, no UI (used indirectly via mission load) |
| `listZones` | `lib/api/zones.ts` | No hook (zones come via mission load) |
| `updateZone` | `lib/api/zones.ts` | No hook, no UI |
