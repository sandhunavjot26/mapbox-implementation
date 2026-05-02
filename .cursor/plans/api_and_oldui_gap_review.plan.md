# API Guide + oldui → new app — gap review and Cursor prompts

> **Superseded as the master plan.** Use **[.cursor/plans/operator-api-gap-plan_8558442c.plan.md](operator-api-gap-plan_8558442c.plan.md)** §0–§6 for execution order, todos, and prompts. This file is kept only if you want a **standalone Figma link registry** table; otherwise delete or ignore.

> **Rule:** Port **business logic, REST integration, and WebSocket behavior** from [oldui/](oldui/). **Do not** copy oldui layout, styling, or component structure. **UI** comes from **Figma** (links below as you provide them). **Contract:** [docs/API_GUIDE.md](docs/API_GUIDE.md) (primary); cross-check [docs/API_REFERENCE.md](docs/API_REFERENCE.md) if needed.

**Related plans:** [operator-api-gap-plan_8558442c.plan.md](operator-api-gap-plan_8558442c.plan.md) (in-repo todos), [oldui-api-gap.md](oldui-api-gap.md) (master phased checklist — note: that file’s *title* says “Driif Nexus Master Plan” while [driif-implementation-plan.md](driif-implementation-plan.md) is the deep component-level gap list).

---

## How to use this document in Cursor

1. **Start a chat** with the **Master prompt** (below), then paste the **work-item prompt** for the phase you are doing.
2. When UI is involved, paste the **Figma node URL** into the `Figma` line (or add a row to the **Figma link registry**).
3. For logic-only tasks, omit Figma and say “logic only / no Figma this pass.”
4. Always point the agent at exact **oldui** source files for parity; it should still **verify paths and fields** against `docs/API_GUIDE.md`.

---

## Figma link registry (fill in as you share nodes)

Replace `TODO` with `https://www.figma.com/design/...` (or FigJam). Convert `node-id=` dashes to colons when using Figma MCP.

| Work area | Figma link | Notes |
|-----------|------------|--------|
| WS status (3 dots) | TODO | Phase 1.1 |
| Map legend + layer toggles | TODO | Phase 1.2 |
| Approvals queue | TODO | Phase 1.3 |
| Friendly 409 confirm dialog | TODO | Phase 1.4 |
| Voice alerts modal + header toggle | TODO | Phase 2.2 |
| Radar mode chip | TODO | Phase 2.3 |
| Command latency overlay | TODO | Phase 2.4 |
| Coverage overlap pill + popover + panel | TODO | Phase 2.5 |
| Jams panel | TODO | Phase 2.6 |
| Command audit panel | TODO | Phase 2.7 |
| Friendlies panel | TODO | Phase 2.8 |
| Swarms panel | TODO | Phase 2.9 |
| Zone breach roster | TODO | Phase 2.11 |
| Timeline V2 | TODO | Phase 2.12 |
| DVR scrubber + timeline + LIVE/DVR | TODO | Phase 3.1 |
| Command launch / schema forms | TODO | Phase 3.2 |
| Pitch side view | TODO | Phase 3.3 |
| Zone action plan | TODO | Phase 3.4 |
| PDF export control | TODO | Phase 3.5 |
| Azimuth dial | TODO | Phase 3.6 |
| Change password | TODO | Phase 3.9 |
| ROE / playbooks / sites / commander | TODO | Phase 4 |

---

## Master prompt (paste at top of a Cursor task)

```
Context: monorepo root "mapbox-implementation". Main app: src/ (Next.js + Mapbox COP). Reference app (logic only): oldui/src/app/.
Rules:
- Do NOT copy oldui UI (JSX structure, CSS, layout). Extract types, API usage, pure functions, hook behavior, and WebSocket handling only.
- Implement screens from Figma. Figma: <PASTE URL OR "see .cursor/plans/api_and_oldui_gap_review.plan.md registry §...">. Use Figma MCP when I provide fileKey/nodeId.
- Verify REST paths, permissions, and payloads against docs/API_GUIDE.md (not only oldui).
- Prefer src/lib/api/* with apiFetch/apiJson; extend client.ts if headers or binary responses are needed.
Output: minimal diff; match existing naming and patterns in src/.
```

---

## Phase 0 — Foundation (types + HTTP client + mission site)

### 0.1 Mission `site_id` + types

**Refs:** `docs/API_GUIDE.md` (missions/sites), [oldui](oldui/) sites/mission creation if present, `src/lib/api/missions.ts`, mission create types in `src/types/`.

**Cursor prompt:**
```
Phase 0.1 — site_id on missions.
Read docs/API_GUIDE.md for mission create and sites. Inspect oldui for any site dropdown or mission create payload (search oldui for site_id).
Add optional site_id to createMission payload and Mission types in src/. Wire CreateMissionForm (or equivalent) to fetch sites and submit site_id. UI layout from Figma if available; otherwise minimal select until Figma is ready.
```

### 0.2 `apiJsonWithHeaders` + `apiBlob`

**Refs:** `src/lib/api/client.ts`, `docs/API_GUIDE.md` (events export, pagination, AAR/PDF if applicable).

**Cursor prompt:**
```
Phase 0.2 — HTTP helpers.
Add apiJsonWithHeaders<T>() returning { data: T; headers: Headers } and apiBlob() returning { blob, filename?, contentType? } for binary downloads. Keep existing apiJson() signature behavior unchanged. Document when to use each. Follow patterns in docs/API_GUIDE.md for X-Total-Count and CSV/NDJSON/PDF responses.
```

### 0.3 Type gaps (commands, zones, mission, device)

**Refs:** [oldui-api-gap.md](oldui-api-gap.md) §0.3, `src/types/`.

**Cursor prompt:**
```
Phase 0.3 — align TypeScript models with API_GUIDE + oldui command/zone/mission/device shapes.
Extend CommandRequest (monitor_device_id, idempotency_key, override_friendly), Zone (zone_type enum), Mission (site_id, activated_at, stopped_at), CommandOut (latency_ms bag), Device (rotation_state, jam_state). No UI changes unless types unblock a feature.
```

---

## Phase 1 — Operator essentials (P1)

### 1.1 WS status indicator

**Refs:** `useWsStatusStore`, `src/hooks/useMissionSockets.ts` (status sync), oldui `WsStatusIndicator.tsx` (logic only).

**Cursor prompt:**
```
Phase 1.1 — WebSocket status dots.
Read eventsStatus, devicesStatus, commandsStatus from useWsStatusStore (synced from useMissionSockets). Map: open=green, connecting=amber, error=red, closed=gray. Build a small presentational component; layout/visual from Figma: <LINK>. Do not copy oldui/src/app/components/WsStatusIndicator.tsx markup; only replicate behavior.
```

### 1.2 Map legend + layer toggles

**Refs:** `MapContainer.tsx`, oldui `MapLegendCard.tsx` (persistence + layer IDs concept).

**Cursor prompt:**
```
Phase 1.2 — Map legend and layer toggles.
Create LayerToggles type: { zones, detection, jammer, breach } booleans. Persist expanded/collapsed + toggles in localStorage (use keys compatible with oldui if documented in MapLegendCard, or namespace driif:). On change, call map.setLayoutProperty(layerId,'visibility', visible?'visible':'none') for Mapbox layers in MapContainer. Export callbacks onSetLayer, onResetLayers. Visual from Figma: <LINK>. Reference oldui MapLegendCard for layer naming only, not JSX.
```

### 1.3 Approvals queue

**Refs:** `src/lib/api/commands.ts` (`listCommands`, `approveCommand`, `rejectCommand`), oldui `ApprovalsPanel.tsx`, `commandsStore`.

**Cursor prompt:**
```
Phase 1.3 — Pending approvals queue.
Use listCommands(missionId, "PENDING_APPROVAL"), approveCommand(id, reason), rejectCommand(id, reason) from src/lib/api/commands.ts. TanStack Query mutations; invalidate on success. When commandsStore receives updates involving PENDING_APPROVAL, refetch the queue. UI from Figma: <LINK>. Compare flow to oldui/src/app/components/ApprovalsPanel.tsx without copying UI.
```

### 1.4 Friendly 409 retry

**Refs:** `docs/API_GUIDE.md` (friendly lockout / override), oldui command creation error handling.

**Cursor prompt:**
```
Phase 1.4 — Friendly drone 409 retry.
On createCommand, if status 409 and detail references friendly_drone_active (or per API_GUIDE), show confirm dialog (Figma: <LINK>). On confirm, retry with override_friendly: true and idempotency_key: crypto.randomUUID(). Types from Phase 0.3. Trace oldui for any existing messaging but implement with our ApiClientError.
```

---

## Phase 2 — Operational awareness (P2)

### 2.1 Event severity + speech strings (pure utils)

**Refs:** oldui `eventSeverity.ts`, `eventSpeech.ts`.

**Cursor prompt:**
```
Phase 2.1 — Port pure utils from oldui/src/app/utils/eventSeverity.ts and eventSpeech.ts into src/utils/. No React. Map event_type to severity; formatEventForSpeech(eventType, payload). Adapt any Tailwind/token references to project tokens.
```

### 2.2 Voice alerts engine

**Refs:** oldui `voiceAlertConfig.ts`, `useVoiceAlerts.ts`, `src/hooks/useMissionSockets.ts`.

**Cursor prompt:**
```
Phase 2.2 — Voice alerts (browser TTS).
Copy/adapt business logic from oldui/src/app/utils/voiceAlertConfig.ts and oldui/src/app/hooks/useVoiceAlerts.ts (speechSynthesis, cooldowns, cross-tab sync, gesture warmup). No axios. Add voiceStore or extend existing store for master enabled + settings. In useMissionSockets handleMissionEvent, invoke speak when shouldSpeakEvent passes. Settings modal + header toggle UI from Figma: <LINK>. Do not port VoiceAlertsModal.tsx layout wholesale—use Figma.
```

### 2.3 Radar kinematics + mode chip resolver

**Refs:** oldui `useRadarKinematics.ts`, `RadarModeChip.tsx` (state resolver only).

**Cursor prompt:**
```
Phase 2.3 — Radar kinematics.
Port useRadarKinematics from oldui (device_state_update correlation, rotation/jam state machine) to src/hooks/. Extract visualFor(rotation, jam) equivalent logic from RadarModeChip (labels/colors) as pure functions. Chip UI from Figma: <LINK>.
```

### 2.4 Command latency overlay

**Refs:** `useMissionSockets` command_update path, oldui `CommandLatencyOverlay.tsx`.

**Cursor prompt:**
```
Phase 2.4 — Command latency.
From WS command_update, extract latency_ms / breakdown if present per API_GUIDE. Store latest latency; tone(): <100ms green, 100–300 amber, >300 red (port idea from oldui CommandLatencyOverlay). Auto-collapse after 5s. Overlay UI from Figma: <LINK>.
```

### 2.5 Overlaps — preview util + UI wiring

**Refs:** `useMissionOverlaps` in `src/hooks/useMissions.ts`, oldui `overlapPreview.ts`, `OverlapPanel.tsx`, `CoverageOverlapIndicator.tsx`.

**Cursor prompt:**
```
Phase 2.5 — Coverage overlaps.
useMissionOverlaps exists; port overlapPreview.ts geometry helpers and overlapKey() selection sync from oldui OverlapPanel. Severity rollup: worst of CRITICAL > HIGH > LOW. Wire to Figma pill + popover + detail panel: <LINK>.
```

### 2.6 Jams panel logic

**Refs:** oldui `JamsPanel.tsx` (haversine, history buffer), `targetsStore`.

**Cursor prompt:**
```
Phase 2.6 — Jams panel.
Port haversine attribution and 50-event history buffer logic from oldui JamsPanel (math + state patterns). Derive jammed tracks from targetsStore / naming convention used in oldui. Panel UI from Figma: <LINK>. No oldui JSX.
```

### 2.7 Command audit panel

**Refs:** `src/lib/api/commands.ts` audit list, oldui `CommandAuditPanel.tsx`.

**Cursor prompt:**
```
Phase 2.7 — Command audit.
Port humaniseFailureReason and relTime helpers from oldui CommandAuditPanel (pure). Use listMissionCommandsAudit (or equivalent) from src/lib/api/commands.ts. Resolve device display names via devices list + maps. Poll every 5s or use WS if authoritative. UI from Figma: <LINK>.
```

### 2.8 Friendlies API + panel

**Refs:** `docs/API_GUIDE.md` friendlies endpoints, oldui `FriendliesPanel.tsx`.

**Cursor prompt:**
```
Phase 2.8 — Friendlies.
Add src/lib/api/friendlies.ts for GET/POST/PATCH/DELETE per docs/API_GUIDE.md mission friendlies routes. Panel CRUD UI from Figma: <LINK>. Reference oldui FriendliesPanel for fields and edge cases only.
```

### 2.9 Swarms — cluster util + panel + map halo

**Refs:** oldui `SwarmsPanel.tsx`, `swarmCluster.ts`, `useMissionSockets` SWARM_DETECTED.

**Cursor prompt:**
```
Phase 2.9 — Swarms.
Port swarmCluster.ts (pure). Subscribe to SWARM_DETECTED via mission event bus / useMissionSockets. Figma panel: <LINK>. Optional: dashed halo layer on Mapbox (match design tokens). Follow oldui semantics, not markup.
```

### 2.10 Annotation persistence (`TRACK_RATED`)

**Refs:** `docs/API_GUIDE.md` annotations, operator-api-gap plan, oldui if any.

**Cursor prompt:**
```
Phase 2.10 — Annotations.
Implement src/lib/api/annotations.ts per API_GUIDE. On operator track rating, POST annotation; on mission load, merge into targetsStore. No UI clone from oldui unless needed for field names.
```

### 2.11 Zone-breach roster

**Refs:** `useMissionSockets` NFZ_BREACH / ZONE_ENTER, oldui patterns.

**Cursor prompt:**
```
Phase 2.11 — Zone breach roster.
Track breaches and dwell times from mission events (types per API_GUIDE §10). Roster UI from Figma: <LINK>. Reduce client work if backend sends sufficient timestamps in payloads.
```

### 2.12 Timeline V2 (filters + pagination + export)

**Refs:** Phase 0.2 helpers, `docs/API_GUIDE.md` events filters export, oldui `TimelinePanel.tsx`.

**Cursor prompt:**
```
Phase 2.12 — Timeline V2.
Add filters (type, severity, date range, device) and pagination using X-Total-Count via apiJsonWithHeaders. CSV/NDJSON export via apiBlob per API_GUIDE. UI from Figma: <LINK>. Port filter/export **ideas** from oldui TimelinePanel, not the component tree.
```

---

## Phase 3 — Advanced (P3)

### 3.1 DVR playback

**Refs:** `docs/API_GUIDE.md` DVR, oldui `dvr.api.ts`, `useDvrPlayback.ts`, `useDvrTimeline.ts`, `DvrScrubber.tsx` / `DvrTimeline.tsx`.

**Cursor prompt:**
```
Phase 3.1 — DVR.
Port dvr.api.ts to src/lib/api/dvr.ts using apiFetch/apiJson + NDJSON stream reading per API_GUIDE. Port useDvrPlayback (lerp positions, shortest-arc azimuth, 10Hz ticker, prefetch) and useDvrTimeline. In DVR mode, feed stores from DVR snapshot instead of live WS. Scrubber UI from Figma: <LINK>; do not copy oldui DVR components visually.
```

### 3.2 Command launch (schema-driven + structured commands)

**Refs:** oldui `SchemaForm.tsx`, `PayloadForm.tsx`, `CommandPanel.tsx`, `src/lib/api/policies.ts`.

**Cursor prompt:**
```
Phase 3.2 — Command forms.
Port JSON-schema → field mapping logic from oldui SchemaForm/PayloadForm (pure + small React). Wire structured command types (JAM_START, turntable, attack mode, etc.) per API_GUIDE command policies. Layout from Figma: <LINK>.
```

### 3.3–3.9 Misc (pitch, zone action plan, PDF, azimuth, threat, reboot, password)

**Cursor prompt (shorthand block):**
```
Phase 3.x — Feature-specific port.
- 3.3 Pitch side view: port trig from oldui PitchSideView.tsx → presentational component per Figma <LINK>.
- 3.4 Zone action plan: port toggle/emit state from ZoneActionPlanForm.tsx; integrate zone editor; Figma <LINK>.
- 3.5 PDF: apiBlob GET mission AAR/PDF per API_GUIDE; idle/pending/ok/err; Figma <LINK>.
- 3.6 Azimuth dial: port SVG math from AzimuthDial.tsx; Figma <LINK>.
- 3.7 threat.ts + radioBands.ts → src/utils (pure).
- 3.8 rebootTracker.ts → device WS transitions.
- 3.9 change password: POST auth change-password per API_GUIDE + validation; Figma <LINK>.
For each sub-item, verify against docs/API_GUIDE.md before implementing.
```

---

## Phase 4 — Admin / commander (P4)

**Cursor prompt:**
```
Phase 4 — Admin / commander surfaces.
- ROE: port useRoeCatalogue + DSL logic from oldui Roe* files; use apiJson; screens per Figma <LINK>.
- Playbooks: API hooks per API_GUIDE/oldui playbooks.api; Figma <LINK>.
- Sites / boundary: port useSiteBoundary patterns; Figma <LINK>.
- Commander: GET /commander/overview + port useCommanderLiveWs hybrid idea from oldui; verify WS vs poll against API_GUIDE; dashboard Figma <LINK>.
Do not ship oldui admin layout; Figma is source of truth for UI.
```

---

## Architecture and gap summary (short)

- **Three REST hosts + three mission WebSockets:** aligned with `API_GUIDE`; see `src/lib/api/client.ts` and `src/lib/ws/missionSockets.ts`.
- **oldui axios GET cache-busting:** new stack may need `Cache-Control: no-cache` + cache-bust query on GETs for parity—add if stale-data bugs appear.
- **Missing API modules vs oldui `src/app/api`:** dvr, roe, sites, featureFlags, playbooks, edge, retention, license, etc. Add as features land; always confirm paths in `API_GUIDE.md`.
- **Hooks in new app** lack: commander live, DVR, voice, radar kinematics, ROE catalogue, site boundary—track via phases above.

---

## Execution priority (rollup)

- **P0:** Phase 0 (client + types + site_id)
- **P1:** Phase 1 (WS dots, legend, approvals, friendly retry)
- **P2:** Phase 2 (voice through timeline V2)
- **P3:** Phase 3 (DVR, command UI, utilities)
- **P4:** Phase 4 (admin / commander)

When you add a Figma link, paste it in the registry table and reference the row (e.g. “Figma: Phase 1.3 row”) in the master prompt.
