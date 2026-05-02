# Old-UI → New-UI: Complete Code-Level Gap Analysis

> **Source**: Deep code review of every file in `oldui/src/app/{components,hooks,utils,api}/`
> **Target**: `mapbox-implementation/src/`
> **Updated**: 2026-04-30 (full code audit pass)

---

## 1. Old-UI Component Inventory (40 files) vs New-UI Status

Every old-UI component is listed below with its **exact file**, **size**, **purpose**, and whether the new UI has it.

### ✅ Ported / Equivalent Exists

| Old-UI Component | Size | New-UI Equivalent | Notes |
|---|---|---|---|
| `Toasts.tsx` | 3.6KB | `ToastProvider` + `useToast()` | Fully ported, different styling |
| `DetectionsPanel.tsx` | 10.1KB | `MissionDetectionsList` + `OverallDetectionPanel` | Functionally equivalent |
| `DevicePanel.tsx` | 25.3KB | `MissionDeviceLiveStateGrid` + `MissionDeviceDiagnostics` + `MissionDeviceAimControls` | Split into focused components |
| `Dialogs.tsx` | 9.2KB | `AssignDeviceDialog` + `EditDeviceModal` + `DeviceDetailDrawer` | Fully ported to new design system |
| `AssignDevicesModal.tsx` | 2.7KB | `AssignDeviceDialog.tsx` | Ported |
| `Secure.tsx` | 0.7KB | `authStore.hasPermission` | Pattern replaced by Zustand store |
| `MissionEditorMap.tsx` | 70.2KB | `CreateMissionForm` + Mapbox draw tools | Replaced with Mapbox GL equivalent |
| `MissionMap.tsx` | 117KB | Mapbox GL layers + `buildMergedRadarAssetsGeoJSON` | Core map replaced (Leaflet → Mapbox) |

### ❌ Completely Missing in New UI

| # | Old-UI Component | Size | What It Does | Priority |
|---|---|---|---|---|
| 1 | **`VoiceAlertsModal.tsx`** | 16.5KB | Full TTS settings: voice picker, rate/pitch/volume sliders, severity gate, per-event override grid, test button. Portal-rendered modal. | P2 |
| 2 | **`useVoiceAlerts.ts`** (hook) | 18.5KB | `speechSynthesis` wrapper with per-event cooldown, cross-tab config sync via `storage` event, gesture warmup for Chrome/Safari, stable `speak()` callback for WS handlers. | P2 |
| 3 | **`voiceAlertConfig.ts`** (util) | 8.4KB | Config shape + defaults + schema-version migration + `shouldSpeakEvent()` gating logic. | P2 |
| 4 | **`eventSeverity.ts`** (util) | 4.7KB | Canonical `event_type → Severity` map (CRITICAL/HIGH/MEDIUM/LOW). Drives voice alerts + commander feed severity chips. | P2 |
| 5 | **`eventSpeech.ts`** (util) | 4.5KB | `formatEventForSpeech()` — plain-English utterance builder per event type (e.g. "No-fly zone breach. Sentinel-02 entered Zone Alpha.") | P2 |
| 6 | **`DvrScrubber.tsx`** | 22KB | DVR playback scrubber: timestamp slider, play/pause, speed buttons (0.5–10×), event-density timeline strip, jump-to-next/prev event, share-clip URL copy, export-window CSV download. | P3 (licensed) |
| 7 | **`DvrTimeline.tsx`** | 3.9KB | Event-density strip sub-component for the DVR scrubber. Clickable tick marks for jams, zone breaches, swarm detections, ROE firings. | P3 (licensed) |
| 8 | **`useDvrPlayback.ts`** (hook) | 26KB | Full DVR playback engine: paused/playing modes, anchor snapshot + chunked event buffer, 10Hz interpolation ticker (lerp positions + shortest-arc azimuth), prefetch pipeline, auto-pause at mission end. | P3 (licensed) |
| 9 | **`useDvrTimeline.ts`** (hook) | 5.7KB | Fetches notable events for the DVR density strip, groups by type. | P3 (licensed) |
| 10 | **`dvr.api.ts`** (API) | 5.7KB | `GET /dvr/state` (snapshot at timestamp) + `GET /dvr/events` (NDJSON chunk stream) — typed `DvrSnapshot`, `DvrDrone`, `DvrDeviceState`, `DvrActiveJam`, `DvrActiveBreach`. | P3 (licensed) |
| 11 | **`CommandLatencyOverlay.tsx`** | 5.1KB | Floating panel showing command RTT (dispatch/wire/radar breakdown). Color-coded: <100ms green, 100-300ms amber, >300ms red. WS `command_update`-driven. Click-expand for per-stage breakdown. | P2 |
| 12 | **`MapLegendCard.tsx`** | 11.9KB | Combined layer toggles (zones/detection/jammer/breach rings) + full icon legend. Collapsible, localStorage-persisted state. | P1 |
| 13 | **`CoverageOverlapIndicator.tsx`** | 9.3KB | Compact severity pill in workspace header. Click → popover listing every overlapping radar pair with distance/severity. Links to Intel tab. | P2 |
| 14 | **`WsStatusIndicator.tsx`** | 4.9KB | 3 colored dots showing events/devices/commands WS connection status (green/yellow/red). Auto-reconnect with capped exponential backoff. | P1 |
| 15 | **`CommandAuditPanel.tsx`** | 12.1KB | Per-mission command audit log: status chips, operator filter, device-name resolution, humanized failure reasons, 5s auto-poll. | P2 |
| 16 | **`JamsPanel.tsx`** | 9.4KB | Live jam summary: per-radar grouping of currently jammed drones, haversine attribution to closest jammer, rolling history buffer (last 50 transitions). | P2 |
| 17 | **`OverlapPanel.tsx`** | 7.3KB | Full overlap detail panel (for Intel tab). Collapsible per-pair list with severity chips + messages. Click row → draws the pair on map. | P2 |
| 18 | **`ApprovalsPanel.tsx`** | 5.4KB | Pending approvals queue. Approve/reject buttons. | P1 |
| 19 | **`FriendliesPanel.tsx`** | 6KB | Per-mission friendly drone list. Create/deactivate. | P2 |
| 20 | **`SwarmsPanel.tsx`** | 15KB | Swarm cards with severity, member chips, close/reopen. | P2 |
| 21 | **`TimelinePanel.tsx`** | 23.9KB | Full filter bar, type chips, date range, CSV/NDJSON export, X-Total-Count pagination. | P2 |
| 22 | **`CommandPanel.tsx`** | 37.9KB | 7 structured command forms + dynamic schema forms. | P3 |
| 23 | **`PayloadForm.tsx`** | 30.2KB | Dynamic command payload forms from policy schemas. | P3 |
| 24 | **`SchemaForm.tsx`** | 7KB | JSON-schema-driven form renderer for policy payloads. | P3 |
| 25 | **`ExportMissionPdfButton.tsx`** | 4.6KB | One-click mission AAR PDF download with status pill. | P3 |
| 26 | **`ChangePasswordModal.tsx`** | 6.9KB | Self-service password change (current + new + confirm). | P4 |
| 27 | **`PitchSideView.tsx`** | 7.8KB | SVG side-view antenna pitch indicator. Pairs with AzimuthDial to show 3D antenna pointing. | P3 |
| 28 | **`RadarModeChip.tsx`** | 6.8KB | Compact chip showing combined rotation×jam state (SCAN/PARK/SLEW × JAM ON/OFF). 5 visual states with tooltips. | P2 |
| 29 | **`ZoneActionPlanForm.tsx`** | 2.8KB | Zone action plan editor (notify roles, SLA seconds, action checkboxes). Sub-form inside zone create/edit. | P3 |
| 30 | **`PlaybookEditor.tsx`** | 15.1KB | Playbook rule list + create. Admin-scope. | P4 (admin) |
| 31 | **`PlaybookRuleEditor.tsx`** | 18.6KB | Individual playbook rule editor. Admin-scope. | P4 (admin) |
| 32 | **`RoePolicyEditor.tsx`** | 62.5KB | ROE policy CRUD + DSL. Admin-scope. | P4 (admin) |
| 33 | **`RoeDslBuilder.tsx`** | 32.2KB | ROE DSL condition builder. Admin-scope. | P4 (admin) |
| 34 | **`RoeTraceModal.tsx`** | 18.3KB | ROE firing decision trace viewer. | P4 (admin) |
| 35 | **`RoeFiringsDrawer.tsx`** | 13KB | ROE firings history drawer. | P4 (admin) |
| 36 | **`AzimuthDial.tsx`** | 46.9KB | SVG compass dial for device azimuth. | P3 |
| 37 | **`CommanderOverviewMap.tsx`** | 30.5KB | Multi-mission overview map for commander view. | P3 |
| 38 | **`CommanderAlertsFeed.tsx`** | 5.8KB | Live severity-tagged alert feed for commander. | P3 |
| 39 | **`DeviceDiagnostics.tsx`** | 22.6KB | Device alarm history + health. | Partial — `MissionDeviceDiagnostics` exists but simpler |

### Missing Old-UI Hooks (not ported)

| Hook | Size | Purpose | New-UI Status |
|---|---|---|---|
| `useCommanderLiveWs.ts` | 8.2KB | Commander live-feed WS + poll hybrid | ❌ Nothing |
| `useDvrPlayback.ts` | 26KB | DVR engine (see above) | ❌ Nothing |
| `useDvrTimeline.ts` | 5.7KB | DVR density strip data | ❌ Nothing |
| `useMissionOverlaps.ts` | 4.8KB | Overlap warnings + counts | ✅ `useMissionOverlaps` exists |
| `useRadarKinematics.ts` | 10.2KB | Rotation/jam state machine + command correlation | ❌ Nothing |
| `useRoeCatalogue.ts` | 7.9KB | ROE rules list/CRUD hooks | ❌ Nothing |
| `useSiteBoundary.ts` | 3.8KB | Site boundary polygon CRUD | ❌ Nothing |
| `useVoiceAlerts.ts` | 18.5KB | TTS engine (see above) | ❌ Nothing |
| `usePermission.ts` | 0.3KB | Permission guard hook | ✅ `authStore.hasPermission` |
| `useScope.ts` | 0.3KB | Scope guard hook | ✅ `authStore.hasMissionAccess` |

### Missing Old-UI Utils (not ported)

| Util | Size | Purpose | New-UI Status |
|---|---|---|---|
| `eventSeverity.ts` | 4.7KB | Event→severity map for voice alerts + feeds | ❌ Nothing |
| `eventSpeech.ts` | 4.5KB | Event→spoken-text formatter | ❌ Nothing |
| `voiceAlertConfig.ts` | 8.4KB | TTS config shape + migration + gating | ❌ Nothing |
| `overlapPreview.ts` | 7.1KB | Coverage overlap geometry preview calculations | ❌ Nothing |
| `radioBands.ts` | 8.6KB | Radio band range definitions + validation | ❌ Nothing |
| `rebootTracker.ts` | 4.8KB | Device reboot detection + auto-reconnect | ❌ Nothing |
| `rmtpDt.ts` | 5KB | RMTP data-type parser (protocol frame parsing) | ❌ Nothing |
| `swarmCluster.ts` | 5KB | Swarm clustering algorithm from target positions | ❌ Nothing |
| `threat.ts` | 15.1KB | Threat assessment + threat-level computation | ❌ Nothing |
| `beam.ts` | 5.2KB | Radar beam geometry calculations | ✅ Ported in radar layer utils |
| `deviceHealth.ts` | 9.7KB | Device health rollups | ✅ `src/utils/deviceHealth.ts` |
| `aimEligibility.ts` | 5KB | Aim control eligibility logic | ✅ Used in `MissionDeviceAimControls` |
| `apiErrors.ts` | 3.5KB | API error humanization | ✅ `formatCommandError.ts` |
| `storage.ts` | 1.3KB | localStorage wrapper | ✅ Different pattern (sessionStorage + stores) |

---

## 2. Features Missed in Prior Plan — Now Added

### 2.1 Voice Alerts System (V2.6.1) — **P2, Medium-Large**

> **Old-UI**: 5 files, ~52KB total code
> - `VoiceAlertsModal.tsx` (16.5KB) — Settings UI
> - `useVoiceAlerts.ts` (18.5KB) — TTS engine hook
> - `voiceAlertConfig.ts` (8.4KB) — Config + migration
> - `eventSeverity.ts` (4.7KB) — Severity map
> - `eventSpeech.ts` (4.5KB) — Speech formatter

**What it does**: Browser TTS (Web Speech API) that speaks critical mission events aloud. Features:
- Master enable/disable toggle in AppShell header (🔊/🔇)
- Voice picker from `speechSynthesis.getVoices()` with rate/pitch/volume sliders
- Per-severity gate (CRITICAL/HIGH/MEDIUM/LOW toggles)
- Per-event-type override (tri-state: inherit/on/off)
- Per-event cooldown (0-60s, prevents flood)
- Cross-tab + same-tab config sync
- Chrome gesture warmup (silent utterance on first user interaction)
- Stable `speak()` callback via refs (safe for WS handler closures)
- Debug breadcrumbs (`localStorage.voice_debug=1`)

**New-UI**: Zero code. No voice, no TTS, no severity map, no speech formatting.

**Deliverables**:
- `src/utils/eventSeverity.ts` — severity map
- `src/utils/eventSpeech.ts` — speech formatter
- `src/utils/voiceAlertConfig.ts` — config shape + defaults
- `src/hooks/useVoiceAlerts.ts` — engine
- `src/components/settings/VoiceAlertsModal.tsx` — settings UI
- Wire `speak()` into `useMissionSockets.ts` WS handler
- Add 🔊/🔇 toggle to app shell header

---

### 2.2 DVR Playback (V2.3) — **P3, X-Large (licensed)**

> **Old-UI**: 5 files, ~83KB total code
> - `DvrScrubber.tsx` (22KB) — Scrubber UI
> - `DvrTimeline.tsx` (3.9KB) — Event density strip
> - `useDvrPlayback.ts` (26KB) — Playback engine
> - `useDvrTimeline.ts` (5.7KB) — Timeline data hook
> - `dvr.api.ts` (5.7KB) — API client

**What it does**: Mission replay — scrub to any timestamp, play forward at 0.5-10× speed with interpolated drone positions and radar azimuths. Features:
- Slider spanning [missionStart, missionEnd]
- Play/pause with 10Hz render ticker
- Speed selection: 0.5×, 1×, 2×, 5×, 10×
- Linear interpolation for drone lat/lon, shortest-arc interpolation for radar azimuth
- Anchor snapshot + chunked event buffer with prefetch pipeline
- Event-density timeline strip with clickable ticks
- Jump-to-next/prev notable event
- Share-clip URL (deep-link to mission at specific timestamp)
- Export-window CSV download with auth bearer header
- Auto-pause at mission end
- UTC timestamp normalization (handles Python naive isoformat)

**New-UI**: Zero code.

**Deliverables** (when licensed feature is needed):
- `src/lib/api/dvr.ts` — API client
- `src/hooks/useDvrPlayback.ts` — engine
- `src/hooks/useDvrTimeline.ts` — timeline data
- `src/components/dvr/DvrScrubber.tsx` — scrubber UI
- `src/components/dvr/DvrTimeline.tsx` — density strip
- DVR mode toggle in MissionWorkspace header

---

### 2.3 Command Latency Overlay (V2.11) — **P2, Small**

> **Old-UI**: `CommandLatencyOverlay.tsx` (5.1KB)

**What it does**: Floating bottom-right panel on mission map showing last command's end-to-end RTT. Features:
- Color-coded: <100ms green, 100-300ms amber, >300ms red
- Click to expand per-stage breakdown (dispatch → wire → radar)
- Driven by WS `command_update` event `latency_ms.deltas_ms.total`
- Auto-collapse 5s after new command
- Opt-in via layer toggle

**New-UI**: Zero code.

---

### 2.4 Map Legend + Layer Toggles (V2.11) — **P1, Medium**

> **Old-UI**: `MapLegendCard.tsx` (11.9KB)

**What it does**: Combined floating card with:
- Layer toggles: Zones / Detection rings / Jammer rings / Breach rings (checkboxes)
- Reset button
- Collapsible legend section with icon key for: radar cones, breach rings (green/amber/red), drone markers (hostile/friendly/jammed/rated/swarm), zone types (6 colors)
- localStorage-persisted collapse state
- Live track count footer

**New-UI**: Zero code. Map layers are always-on with no toggle control.

---

### 2.5 WebSocket Status Indicator — **P1, Small**

> **Old-UI**: `WsStatusIndicator.tsx` (4.9KB)

**What it does**: 3 colored dots (Events / Devices / Commands) showing WS connection health:
- Green = open, Yellow = connecting, Red = error, Grey = closed
- Auto-reconnect with capped exponential backoff (1s → 2s → 4s → 8s → 16s → 32s cap)
- Token refresh on reconnect

**New-UI**: Zero code. No visual WS health indicator for operators.

---

### 2.6 Coverage Overlap Indicator — **P2, Medium**

> **Old-UI**: `CoverageOverlapIndicator.tsx` (9.3KB) + `OverlapPanel.tsx` (7.3KB)

**What it does**: Ambient "are my radars clashing?" signal:
- **Indicator pill**: Compact severity pill (red/amber/slate) in workspace header. Hidden when no overlaps.
- **Click → popover**: Lists every overlapping radar pair with distance, overlap depth, severity.
- **Click row → draws pair on map** with severity-colored line.
- Footer links to Intel tab for full detail.
- Escape/click-outside closes popover.

**New-UI**: `useMissionOverlaps` hook exists but **zero UI rendering** in the workspace.

---

### 2.7 Jams Panel — **P2, Medium**

> **Old-UI**: `JamsPanel.tsx` (9.4KB)

**What it does**: Intel tab section showing:
- Per-radar grouping of currently jammed drones (attributed via haversine to closest jammer)
- Count badges per radar
- Rolling history buffer (last 50 jam transitions) with relative timestamps
- Live drone position → jammer attribution using jammer_radius_m

**New-UI**: Zero code. IntelTab has a "Jams" slot that's a placeholder.

---

### 2.8 Command Audit Panel — **P2, Medium**

> **Old-UI**: `CommandAuditPanel.tsx` (12.1KB)

**What it does**: Per-mission command audit log showing:
- Color-coded status chips (SENT/SUCCEEDED/FAILED/TIMEOUT/PENDING_APPROVAL/REJECTED)
- Operator filter + status filter dropdowns
- Device-name resolution (both by UUID and monitor_device_id)
- Humanized failure reasons ("Radar did not respond...", "Blocked by friendly-drone lockout...")
- Override flag display
- 5s auto-poll refresh
- Protocol + packet_no display

**New-UI**: `RecentCommands` component exists but is NOT mounted in CommandsTab. Missing the full audit UI with filters and humanized failure reasons.

---

### 2.9 Radar Mode Chip — **P2, Small**

> **Old-UI**: `RadarModeChip.tsx` (6.8KB)

**What it does**: Compact chip showing combined rotation×jam state machine:
- SCAN + JAM → red (sweeping jam)
- SCAN → cyan (passive 360° awareness)
- PARK + JAM → red + 🔒 (concentrated jam)
- PARK → slate (antenna fixed)
- SLEW → amber pulsing (turntable in transit)
- UNKNOWN → grey

**New-UI**: Zero code. Device cards show status text but no rotation×jam visual chip.

---

### 2.10 Pitch Side View — **P3, Small**

> **Old-UI**: `PitchSideView.tsx` (7.8KB)

**What it does**: SVG side-view antenna pitch indicator. Pairs with AzimuthDial:
- Top-down dial = azimuth (already have this concept in map)
- Side-view dial = pitch/elevation (-90° to +90°)
- Needle pivots from mast base, tick marks at -90/-45/0/+45/+90
- Color-coded: armed=cyan, read-only=slate

**New-UI**: Zero code.

---

### 2.11 Zone Action Plan Form — **P3, Small**

> **Old-UI**: `ZoneActionPlanForm.tsx` (2.8KB)

**What it does**: Sub-form inside zone create/edit for zone response plans:
- Notify roles (comma-separated input)
- SLA seconds (number input)
- Action checkboxes: track, notify_commander, jam_if_confirmed, jam_immediate, record_evidence

**New-UI**: Zero code. Zone creation exists but no action_plan field.

---

### 2.12 Missing Utils

| Util | Size | Impact |
|---|---|---|
| `useRadarKinematics.ts` (10.2KB) | Rotation/jam state machine + command correlation | Needed for RadarModeChip |
| `swarmCluster.ts` (5KB) | Client-side swarm clustering from target positions | Needed for swarm halo geometry |
| `overlapPreview.ts` (7.1KB) | Coverage overlap geometry preview | Needed for overlap line rendering on map |
| `radioBands.ts` (8.6KB) | Radio band range definitions + validation | Needed for command forms |
| `rebootTracker.ts` (4.8KB) | Device reboot detection + notifications | UX improvement for operators |
| `threat.ts` (15.1KB) | Threat assessment + level computation | Needed for threat escalation display |
| `rmtpDt.ts` (5KB) | RMTP data-type parser | Needed for device diagnostics detail |

---

## 3. Updated Execution Order

| # | Task | Priority | Effort | New? |
|---|------|----------|--------|------|
| 1 | Fix `createMission` site_id + sites API | P0 | S | — |
| 2 | Fix `apiJson` header access + blob support | P0 | S | — |
| 3 | Fix type gaps (Command, Zone, Mission, Auth) | P0 | S | — |
| 4 | **WS Status Indicator** (3 dots) | P1 | S | ✅ NEW |
| 5 | **Map Legend + Layer Toggles** | P1 | M | ✅ NEW |
| 6 | Wire CommandsTab + IntelTab stubs | P1 | S | — |
| 7 | **Approvals queue** (Task 2) | P1 | M | — |
| 8 | **Friendly 409 retry** (Task 3) | P1 | M | — |
| 9 | **Friendlies panel** (Task 4) | P2 | M | — |
| 10 | **Swarms + halos** (Task 5) | P2 | L | — |
| 11 | **Voice Alerts system** (5 files) | P2 | L | ✅ NEW |
| 12 | **Radar Mode Chip** | P2 | S | ✅ NEW |
| 13 | **Command Latency Overlay** | P2 | S | ✅ NEW |
| 14 | **Coverage Overlap Indicator + Panel** | P2 | M | ✅ NEW |
| 15 | **Jams Panel** | P2 | M | ✅ NEW |
| 16 | **Command Audit Panel** | P2 | M | ✅ NEW |
| 17 | **Annotation persistence** (Task 6) | P2 | M | — |
| 18 | **Zone-breach roster** (Task 7) | P2 | M | — |
| 19 | **Timeline V2 + export** (Task 8) | P2 | L | — |
| 20 | Zone CRUD polish (Task 9) | P3 | M | — |
| 21 | **Pitch Side View** | P3 | S | ✅ NEW |
| 22 | **Zone Action Plan Form** | P3 | S | ✅ NEW |
| 23 | **DVR Playback** (5 files, licensed) | P3 | XL | ✅ NEW |
| 24 | **Command Launch UI** (Task 10) | P3 | XL | — |
| 25 | Commander overview | P3 | L | — |
| 26 | Mission PDF export | P3 | S | — |
| 27 | Sites admin | P4 | M | — |
| 28 | ROE rules/decisions (4 files, 125KB) | P4 | XL | — |
| 29 | Password change | P4 | S | — |
| 30 | Playbook editor (2 files, 34KB) | P4 | L | — |

---

## 4. Open Questions

> [!IMPORTANT]
> 1. **Voice Alerts priority** — Should TTS be shipped with Approvals (P1) or can it wait? Operators in old-UI rely on it for NFZ breach awareness.
> 2. **DVR licensing** — Is DVR gated by `feature.dvr` flag? Should we stub the UI early or defer entirely?
> 3. **Map Legend** — Old-UI has 4 layer toggles (zones/detection/jammer/breach). Do we want the same set or different toggles for Mapbox?
> 4. **RadarModeChip** — Needs `rotation_state` + `jam_state` from device state. Is this data flowing via WS already or do we need `useRadarKinematics`?
> 5. **Which P2 items to start first?** — Voice alerts (operator safety) vs Jams panel (operational awareness) vs Command audit (debugging)?
