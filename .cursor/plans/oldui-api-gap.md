# Driif Nexus — Master Implementation Plan

> **Single source of truth** for feature parity: `oldui/` → `mapbox-implementation/`
> **Rule**: Old-UI = reference for **business logic, API contracts, WS handling** only. All UI comes from **Figma via MCP**.
> **Sources audited**: `oldui/` (40 components, 11 hooks, 16 utils), `src/`, `docs/API_GUIDE.md`, `docs/API_REFERENCE.md`, `docs/PROJECT_REQUIREMENTS.md`
> **Updated**: 2026-04-30

**Legend**: `[ ]` pending · `[/]` in-progress · `[x]` done

---

## Inventory — What Exists vs What's Missing

### ✅ Already Ported

| Old-UI File | New-UI Equivalent |
|---|---|
| `MissionMap.tsx` (117KB) | Mapbox GL layers + `radarAssetsGeoJSON.ts` |
| `MissionEditorMap.tsx` (70KB) | `CreateMissionForm` + Mapbox draw tools |
| `DevicePanel.tsx` (25KB) | `MissionDeviceLiveStateGrid` + `MissionDeviceDiagnostics` + `MissionDeviceAimControls` |
| `DetectionsPanel.tsx` (10KB) | `MissionDetectionsList` + `OverallDetectionPanel` |
| `Dialogs.tsx` (9KB) | `AssignDeviceDialog` + `EditDeviceModal` + `DeviceDetailDrawer` |
| `Toasts.tsx` (3.6KB) | `ToastProvider` + `useToast()` |
| `Secure.tsx` (0.7KB) | `authStore.hasPermission` (Zustand) |
| `useMissionSockets.ts` | `useMissionSockets.ts` (centralized, richer) |
| `useMissionOverlaps.ts` | `useMissionOverlaps` hook (exists, zero UI) |
| `usePermission.ts` / `useScope.ts` | `authStore` Zustand selectors |
| `beam.ts` | Ported in radar layer utils |
| `deviceHealth.ts` | `src/utils/deviceHealth.ts` |
| `aimEligibility.ts` | Used in `MissionDeviceAimControls` |
| `apiErrors.ts` | `formatCommandError.ts` |

### ❌ Missing — Business Logic / Hooks / Utils (no UI needed)

| # | Old-UI File | Size | What to port | Priority |
|---|---|---|---|---|
| 1 | `eventSeverity.ts` | 4.7KB | Event→severity map, `severityFor()`, `SEVERITY_RING` tokens | P2 |
| 2 | `eventSpeech.ts` | 4.5KB | `formatEventForSpeech()` — plain-English per event type | P2 |
| 3 | `voiceAlertConfig.ts` | 8.4KB | Config shape, defaults, schema migration, `shouldSpeakEvent()` | P2 |
| 4 | `useVoiceAlerts.ts` | 18.5KB | speechSynthesis wrapper, cooldowns, cross-tab sync, gesture warmup | P2 |
| 5 | `useDvrPlayback.ts` | 26KB | 10Hz interpolation ticker, lerp positions, shortest-arc azimuth | P3 |
| 6 | `useDvrTimeline.ts` | 5.7KB | Notable events fetch + grouping for density strip | P3 |
| 7 | `dvr.api.ts` | 5.7KB | DVR snapshot + NDJSON stream API client | P3 |
| 8 | `useRadarKinematics.ts` | 10.2KB | Rotation/jam state machine + command correlation | P2 |
| 9 | `swarmCluster.ts` | 5KB | Client-side swarm clustering from positions | P2 |
| 10 | `overlapPreview.ts` | 7.1KB | Coverage overlap geometry for map line rendering | P2 |
| 11 | `threat.ts` | 15.1KB | Threat assessment + level computation | P3 |
| 12 | `radioBands.ts` | 8.6KB | Radio band range definitions + validation | P3 |
| 13 | `rebootTracker.ts` | 4.8KB | Device reboot detection + notifications | P3 |
| 14 | `rmtpDt.ts` | 5KB | RMTP data-type parser for diagnostics | P3 |
| 15 | `useRoeCatalogue.ts` | 7.9KB | ROE rules list/CRUD hooks | P4 |
| 16 | `useSiteBoundary.ts` | 3.8KB | Site boundary polygon CRUD | P4 |
| 17 | `useCommanderLiveWs.ts` | 8.2KB | Commander live-feed WS + poll hybrid | P4 |

### ❌ Missing — Features Needing UI from Figma

| # | Feature | Old-UI Reference | Logic to port | UI Source |
|---|---|---|---|---|
| 18 | Voice Alerts Modal | `VoiceAlertsModal.tsx` (16.5KB) | None (pure UI) | Figma |
| 19 | DVR Scrubber | `DvrScrubber.tsx` (22KB) | Share-clip URL gen, CSV export logic | Figma |
| 20 | DVR Timeline | `DvrTimeline.tsx` (3.9KB) | Tick density computation | Figma |
| 21 | Command Latency Overlay | `CommandLatencyOverlay.tsx` (5.1KB) | Color band thresholds, auto-collapse timer | Figma |
| 22 | Map Legend + Layer Toggles | `MapLegendCard.tsx` (11.9KB) | localStorage persistence, toggle→layer wiring | Figma |
| 23 | WS Status Indicator | `WsStatusIndicator.tsx` (4.9KB) | Status dot logic (store already exists) | Figma |
| 24 | Coverage Overlap Indicator | `CoverageOverlapIndicator.tsx` (9.3KB) | Severity rollup, popover pair sorting | Figma |
| 25 | Overlap Detail Panel | `OverlapPanel.tsx` (7.3KB) | `overlapKey()`, selected-pair map wiring | Figma |
| 26 | Jams Panel | `JamsPanel.tsx` (9.4KB) | Haversine attribution, history buffer | Figma |
| 27 | Command Audit Panel | `CommandAuditPanel.tsx` (12.1KB) | `humaniseFailureReason()`, device name resolution | Figma |
| 28 | Approvals Panel | `ApprovalsPanel.tsx` (5.4KB) | Approve/reject API calls (already in `lib/api/commands.ts`) | Figma |
| 29 | Friendlies Panel | `FriendliesPanel.tsx` (6KB) | CRUD API client | Figma |
| 30 | Swarms Panel | `SwarmsPanel.tsx` (15KB) | Swarm event subscription, member chip logic | Figma |
| 31 | Timeline V2 | `TimelinePanel.tsx` (23.9KB) | Pagination, export, extended filters | Figma |
| 32 | Command Forms | `CommandPanel.tsx` (37.9KB) + `PayloadForm.tsx` (30.2KB) + `SchemaForm.tsx` (7KB) | Schema-driven form logic | Figma |
| 33 | Radar Mode Chip | `RadarModeChip.tsx` (6.8KB) | 5-state visual logic (rotation×jam) | Figma |
| 34 | Pitch Side View | `PitchSideView.tsx` (7.8KB) | SVG needle geometry math | Figma |
| 35 | Zone Action Plan Form | `ZoneActionPlanForm.tsx` (2.8KB) | Action toggle emit logic | Figma |
| 36 | PDF Export Button | `ExportMissionPdfButton.tsx` (4.6KB) | Binary download via `apiBlob()` | Figma |
| 37 | Password Change Modal | `ChangePasswordModal.tsx` (6.9KB) | Validation + API call | Figma |
| 38 | Azimuth Dial | `AzimuthDial.tsx` (46.9KB) | SVG compass geometry, tick math | Figma |
| 39 | ROE Policy Editor | `RoePolicyEditor.tsx` (62.5KB) + 3 files | DSL parser, CRUD hooks | Figma |
| 40 | Playbook Editor | `PlaybookEditor.tsx` (15.1KB) + 1 file | Rule CRUD hooks | Figma |
| 41 | Commander Overview | `CommanderOverviewMap.tsx` (30.5KB) + `CommanderAlertsFeed.tsx` (5.8KB) | Multi-mission WS, alert severity feed | Figma |

---

## Phase 0 — Critical Fixes

### 0.1 `createMission` missing `site_id`
- [ ] Add `site_id?: string` to `createMission()` payload in `src/lib/api/missions.ts`
- [ ] Add `site_id` to `MissionCreate` type
- [ ] Wire into `CreateMissionForm.tsx` (sites API fetch + dropdown — UI from Figma)

### 0.2 `apiJson` — add header access + blob support
- [ ] Add `apiJsonWithHeaders<T>()` → `{ data: T; headers: Headers }` in `client.ts`
- [ ] Add `apiBlob()` → `{ blob: Blob; filename: string; size: number }` for binary downloads
- [ ] Keep existing `apiJson()` unchanged for backward compat

> [!WARNING]
> **Code Issue**: `apiJson()` (client.ts:86-116) discards response headers. Blocks `X-Total-Count` pagination and binary exports.

### 0.3 Type gaps
- [ ] `CommandRequest` — add `monitor_device_id`, `idempotency_key`, `override_friendly`
- [ ] `Zone` — add `zone_type` enum (`no_fly|restricted|safe|detection|defense|jamming`)
- [ ] `Mission` — add `site_id`, `activated_at`, `stopped_at`
- [ ] `CommandOut` — add `latency_ms` bag (for latency overlay)
- [ ] `Device` — add `rotation_state`, `jam_state` (for RadarModeChip)

---

## Phase 1 — Operator Essentials (P1)

### 1.1 WS Status Indicator
- [ ] UI from Figma (3 colored dots — events/devices/commands)
- [ ] Wire to existing `useWsStatusStore` (store exists, synced by `useMissionSockets` line 544-547, **zero UI**)

**Logic prompt**:
```
Read eventsStatus, devicesStatus, commandsStatus from useWsStatusStore.
Map each to a color: open=green, connecting=amber, error=red, closed=gray.
Mount in MissionWorkspaceShell header.
```

### 1.2 Map Legend + Layer Toggles
- [ ] UI from Figma
- [ ] Business logic: localStorage persistence (`driif:map-controls-expanded`, `driif:map-legend-expanded`)
- [ ] Wire toggles to `MapContainer.tsx` via `map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')`

**Logic prompt**:
```
Create a LayerToggles type: { zones: boolean; detection: boolean; jammer: boolean; breach: boolean }.
Persist in localStorage. On toggle change, call map.setLayoutProperty() for the matching Mapbox layer IDs.
Export onSetLayer(key, value) and onResetLayers() callbacks.
```

### 1.3 Approvals Queue
- [ ] UI from Figma
- [ ] API: use existing `listCommands(missionId, "PENDING_APPROVAL")`, `approveCommand()`, `rejectCommand()` from `lib/api/commands.ts`
- [ ] WS refresh: auto-refetch when `commandsStore` receives `PENDING_APPROVAL` status

**Logic prompt**:
```
Fetch pending commands with listCommands(missionId, "PENDING_APPROVAL").
Approve button calls approveCommand(id, reason). Reject calls rejectCommand(id, reason).
Use useMutation from TanStack Query. Invalidate on success.
Auto-refetch when commandsStore updates with a PENDING_APPROVAL entry.
```

### 1.4 Friendly 409 Retry
- [ ] Catch 409 from `createCommand()` where detail contains "friendly"
- [ ] Show confirmation dialog (UI from Figma)
- [ ] Retry with `override_friendly: true` + `idempotency_key: crypto.randomUUID()`

---

## Phase 2 — Operational Awareness (P2)

### 2.1 Event Severity Utils
- [ ] Port `eventSeverity.ts` — copy `EVENT_SEVERITY` map, `severityFor()`, `sortedEventTypes()` (pure data, direct copy)
- [ ] Port `eventSpeech.ts` — copy `formatEventForSpeech()` (pure function, direct copy)
- [ ] Adapt `SEVERITY_RING` color tokens from Tailwind → driifTokens

### 2.2 Voice Alerts Engine
- [ ] Port `voiceAlertConfig.ts` — config type, defaults, `shouldSpeakEvent()`, localStorage persistence (pure logic, direct copy)
- [ ] Port `useVoiceAlerts.ts` — `speechSynthesis` wrapper, cooldown ledger, gesture warmup, cross-tab sync (pure browser API, direct copy)
- [ ] Wire `speak()` into `useMissionSockets.ts` `handleMissionEvent` (add call in default case)
- [ ] UI from Figma (settings modal + header toggle)

**Logic prompt**:
```
Copy business logic from oldui/src/app/utils/voiceAlertConfig.ts and oldui/src/app/hooks/useVoiceAlerts.ts.
These are pure browser API + localStorage — no framework dependencies to change.
Adapt: replace any Axios imports with nothing (these files don't use Axios).
Integration point: in useMissionSockets.ts handleMissionEvent, after the switch statement,
call speak(eventType, payload) from the useVoiceAlerts hook.
Add a master enabled boolean to a new Zustand store (voiceStore) read by the hook.
```

### 2.3 Radar Kinematics + Mode Chip
- [ ] Port `useRadarKinematics.ts` — rotation/jam state machine from `device_state_update` WS events (pure logic)
- [ ] Business logic for RadarModeChip: 5-state resolver `visualFor(rotation, jam)` → label + color (port from `RadarModeChip.tsx` lines 54-161)
- [ ] UI from Figma

### 2.4 Command Latency Overlay
- [ ] Extract `latency_ms` from WS `command_update` in `useMissionSockets.ts` `onCommand` handler
- [ ] Store last command latency in Zustand or local state
- [ ] Color band logic: `<100ms → green, 100-300ms → amber, >300ms → red` (port `tone()` from old-UI)
- [ ] Auto-collapse timer (5s)
- [ ] UI from Figma

### 2.5 Coverage Overlap Indicator + Panel
- [ ] `useMissionOverlaps` hook already exists — **connect it to UI**
- [ ] Port `overlapPreview.ts` — overlap geometry calculations for map line rendering
- [ ] Port `overlapKey()` from `OverlapPanel.tsx` — canonical pair key for selection sync
- [ ] Severity rollup logic: worst of CRITICAL > HIGH > LOW
- [ ] UI from Figma (pill + popover + detail panel)

### 2.6 Jams Panel
- [ ] Port haversine attribution logic from `JamsPanel.tsx` lines 48-100 (pure math)
- [ ] Read jammed targets from `useTargetsStore` (filter `[JAMMED]` in name)
- [ ] History buffer: `useRef<Set>` dedup + `useState` array capped at 50
- [ ] UI from Figma

### 2.7 Command Audit Panel
- [ ] Port `humaniseFailureReason()` from `CommandAuditPanel.tsx` lines 66-107 (pure string logic, direct copy)
- [ ] Port `relTime()` UTC timestamp normalizer (lines 30-57, direct copy)
- [ ] Use existing `listMissionCommandsAudit()` from `lib/api/commands.ts`
- [ ] Device name resolution: fetch devices, build `byId` + `byMonitorId` maps
- [ ] 5s polling interval
- [ ] UI from Figma

### 2.8 Friendlies Panel
- [ ] Create `src/lib/api/friendlies.ts` — CRUD (`GET/POST/DELETE /api/v1/missions/{id}/friendlies`)
- [ ] UI from Figma

### 2.9 Swarms Panel
- [ ] Port `swarmCluster.ts` — clustering algorithm (pure math, direct copy)
- [ ] Subscribe to `missionEventsBus` for `SWARM_DETECTED` (already published in `useMissionSockets.ts` line 249)
- [ ] Add swarm halo layer to Mapbox map (dashed circle around centroid)
- [ ] UI from Figma

### 2.10 Annotation Persistence
- [ ] Create `src/lib/api/annotations.ts` — `POST /api/v1/annotations`
- [ ] Wire TRACK_RATED → persist via API on operator rate action
- [ ] Load annotations on mission load, fold into `targetsStore`

### 2.11 Zone-Breach Roster
- [ ] Track `NFZ_BREACH` + `ZONE_ENTER` events from `useMissionSockets.ts`, compute per-target dwell time
- [ ] UI from Figma

### 2.12 Timeline V2
- [ ] Extended filters: event type, severity, date range, device (logic only)
- [ ] `X-Total-Count` pagination via `apiJsonWithHeaders` (depends on 0.2)
- [ ] CSV/NDJSON export via `apiBlob` (depends on 0.2)
- [ ] UI from Figma

---

## Phase 3 — Advanced Features (P3)

### 3.1 DVR Playback
- [ ] Port `dvr.api.ts` — adapt from Axios to `apiJson`/`apiFetch` + NDJSON stream handling
- [ ] Port `useDvrPlayback.ts` — interpolation engine (pure math: lerp lat/lon, shortest-arc azimuth), 10Hz ticker, prefetch pipeline
- [ ] Port `useDvrTimeline.ts` — event density data fetch + grouping
- [ ] Integration: DVR mode feeds `targetsStore` + `deviceStatusStore` instead of live WS
- [ ] UI from Figma (scrubber, timeline strip, LIVE/DVR toggle)

### 3.2 Command Launch UI
- [ ] Port schema-driven form logic from `SchemaForm.tsx` + `PayloadForm.tsx` (JSON schema → form fields)
- [ ] Structured command builders (JAM_START, TURNTABLE_POINT, ATTACK_MODE_SET, etc.)
- [ ] UI from Figma

### 3.3 Pitch Side View
- [ ] Port SVG needle geometry math from `PitchSideView.tsx` lines 86-99 (pure trig)
- [ ] UI from Figma

### 3.4 Zone Action Plan Form
- [ ] Action toggle logic + emit pattern from `ZoneActionPlanForm.tsx` (pure state)
- [ ] Wire into zone create/edit flow
- [ ] UI from Figma

### 3.5 Mission PDF Export
- [ ] Use `apiBlob()` (depends on 0.2) to download from backend PDF endpoint
- [ ] Status state machine: idle → pending → ok → err
- [ ] UI from Figma

### 3.6 Azimuth Dial
- [ ] Port SVG compass geometry + tick math from `AzimuthDial.tsx` (pure trig/SVG)
- [ ] UI from Figma

### 3.7 Threat Assessment Utils
- [ ] Port `threat.ts` — threat level computation + assessment logic (pure functions)
- [ ] Port `radioBands.ts` — band definitions + validation (pure data)

### 3.8 Device Reboot Tracker
- [ ] Port `rebootTracker.ts` — reboot detection from WS state transitions (pure logic)

### 3.9 Change Password
- [ ] API call: `POST /api/v1/auth/change-password` with `{ old_password, new_password }`
- [ ] Validation logic: min length, match confirmation, differ from current
- [ ] UI from Figma

---

## Phase 4 — Admin Features (P4)

### 4.1 ROE Policy Editor
- [ ] Port `useRoeCatalogue.ts` — ROE rules CRUD hooks (adapt Axios → apiJson)
- [ ] Port DSL condition parser logic from `RoeDslBuilder.tsx`
- [ ] UI from Figma (4 screens: policy list, rule editor, DSL builder, trace viewer)

### 4.2 Playbook Editor
- [ ] Playbook rule CRUD API hooks
- [ ] UI from Figma

### 4.3 Sites Admin
- [ ] Port `useSiteBoundary.ts` — site boundary CRUD (adapt to apiJson)
- [ ] UI from Figma

### 4.4 Commander Overview
- [ ] Port `useCommanderLiveWs.ts` — multi-mission WS + poll hybrid (adapt to new WS pattern)
- [ ] UI from Figma

---

## PRD Feature Mapping

| PRD § | Requirement | Task | Status |
|---|---|---|---|
| §1 | Single operational interface | MapContainer + workspace | [x] |
| §2 | Mission setup workflow | CreateMissionForm | [x] |
| §4.1 | Fence config | CreateFencePanel + draw tools | [x] |
| §4.2 | Alert severity + sound | 2.1 + 2.2 (Voice) | [ ] |
| §4.3 | Escalation matrix | Future — no API yet | [ ] |
| §4.4 | Radar inventory | DevicesTable + DeviceAdmin | [x] |
| §6 | Radar config | EditDeviceModal + ConfigureRadar | [x] |
| §7 | Detection/Jamming zones | Map layers (rings) | [x] |
| §8 | Fence management | FenceDrawToolbar + FenceMetadata | [x] |
| §9 | Alert system | 2.1 Severity + 2.11 Breach Roster | [ ] |
| §10 | Mission config / radar assignment | SelectAssetsWorkspace | [x] |
| §11 | Jamming modes | PopupControls + TurntableControls | [x] Partial |
| §12.1 | Object detection + display | targetsStore + map markers | [x] |
| §12.2 | Path tracking | positionHistory + trail layer | [x] |
| §12.4 | Threat scoring | ThreatEscalation in targetsStore | [x] Partial |
| §12.5 | Enemy heatmap | Future — needs backend | [ ] |
| §12.7 | Object info display | TrackingPanel | [x] |
| §12.8 | Object logs | MissionTimeline + eventsStore | [x] |
| §12.11 | Jam failure handling | 2.7 Command Audit | [ ] |
| §15 | Swarm detection + viz | 2.9 Swarms Panel | [ ] |
| §16 | AI threat engine | Backend-driven, UI reads payload | [x] Partial |

---

## Critical Code Improvements

### CI-1: `apiJson` discards headers (P0 blocker)
`src/lib/api/client.ts` lines 86-116 — add `apiJsonWithHeaders()` + `apiBlob()`.

### CI-2: `targetsStore` O(n) per update
`src/stores/targetsStore.ts` line 137 — `findIndex()` is O(n). Use `Map<string, Target>` for 100+ drone perf.

### CI-3: `useMissionSockets` callback dependency bloat
`src/hooks/useMissionSockets.ts` lines 310-321 — 10+ deps in useCallback. Use `useRef`-based handler pattern (like `onMessageRef` already does for `useWs`).

### CI-4: No error boundary around map
`MapContainer.tsx` — Mapbox GL errors crash entire app. Wrap in dedicated `<ErrorBoundary>`.

### CI-5: Missing `zone_type` on Zone interface
`src/types/aeroshield.ts` line 61 — all zones treated identically. Needs 7 zone type colors/behaviors.

---

## Execution Priority

| Priority | Tasks | Effort |
|---|---|---|
| **P0** | 0.1-0.3 (site_id, apiJson, types) | 1-2 days |
| **P1** | 1.1-1.4 (WS dots, Legend, Approvals, Friendly retry) | 3-4 days |
| **P2** | 2.1-2.12 (Voice, Radar, Latency, Overlaps, Jams, Audit, Friendlies, Swarms, Annotations, Breaches, Timeline) | 2-3 weeks |
| **P3** | 3.1-3.9 (DVR, Commands, Pitch, Zones, PDF, Dial, Threat, Reboot, Password) | 2-3 weeks |
| **P4** | 4.1-4.4 (ROE, Playbook, Sites, Commander) | 3-4 weeks |
