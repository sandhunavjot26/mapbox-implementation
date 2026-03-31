# COP (Common Operational Picture) — What It Is & Dashboard Changelog

This document explains **COP** in domain terms and summarizes **implementation changes** made for the Driif Counter-UAS dashboard (map, chrome, missions, and tactical layers).

---

## 1. What is COP?

**COP** stands for **Common Operational Picture**. In defense and public-safety C2 (command and control), it means a **single shared view** of the situation: where assets are, where threats are, mission context, and status—so everyone works off the **same fused picture** instead of disconnected tools.

In **this codebase**, “COP” is used in two ways:

| Usage | Meaning |
|--------|--------|
| **Product / UX** | The **dashboard experience**: full-screen map as the primary surface, tactical overlays (devices, targets, zones), mission workflow, and dark “command center” chrome (nav, top bar, panels). |
| **UI copy** | Labels such as **“COP”** on the top bar (`CopTopBar`) and **“COMMON OPERATIONAL PICTURE (COP)”** on the mission workspace status strip—these are **status/marketing badges**, not separate routes. |

**What we did *not* invent:** COP as a concept is standard terminology. **What we built** is a **Next.js + Mapbox** implementation of that idea: one persistent map, GeoJSON-driven layers, WebSockets/API for live data, and floating glass UI aligned with Figma (Driif-UI).

**Related architectural rules** (from project rules): React owns UI intent; Mapbox owns map rendering; live telemetry is not stored in React state for the map path; use Zustand/TanStack Query as specified.

---

## 2. High-level architecture (current)

- **Entry:** User lands on **`/dashboard`** with a **single full-screen map** (`MapContainer`).
- **Missions:** Opened from the **left nav (CopShell)** as an **overlay** (`MissionSelector`), not a separate map page. **Clicking the map background** (not asset/target hit layers) **closes** that overlay and clears the **active nav** highlight (`MapContainer` `onMapBackgroundClick` → dashboard).
- **Active mission:** `MissionWorkspace` adds **panels and overlays only** (no second map). Map stays the one in `MapContainer`.
- **Chrome:** `CopShell` (nav, logo, settings, **bell**), `CopTopBar` (stats, map mode, basemap/light toggles, logout).

---

## 3. Changelog — major changes (session work)

### 3.1 Dashboard & mission flow

- **Single map:** Dashboard renders one `MapContainer`; mission UI is overlays/panels.
- **Removed** separate mock-heavy **`/driif-ui`** flow and **`driifUiMockData`** where applicable; missions rely on **API + WebSockets** when a mission is active.
- **No mission “pins” on the map** for picking missions; selection is via **missions overlay/menu** only.
- **Bell control (top-right):** Replaced ad-hoc “×” close with **`/icons/notifications.svg`**; behavior remains **exit mission** or **dismiss overlays** (`CopShell` + dashboard wiring).

### 3.2 Map framing & intro

- **Landing region:** Intro **fly-in** still starts from a **global globe** (`center: [0, 20]`, `zoom: 2`), then **`fitBounds`** to a **regional box** (Rajasthan / Jaipur–Kota style scale), not the entire subcontinent—configured in **`src/utils/missionOverview.ts`** (`LANDING_REGION_BOUNDS`, `maxZoom`, padding, pitch/bearing).
- **Exiting mission:** Map **eases back** to that same regional overview (`easeMapToIndia` alias kept for call sites).

### 3.3 Map style: Mapbox Standard family

- **Default basemap:** **`mapbox://styles/mapbox/standard`** with **`config.basemap`**:
  - **Default preset:** **night** + **monochrome** on Standard (per your spec).
- **Variants:** **Standard** vs **Standard Satellite** (`mapbox://styles/mapbox/standard-satellite`).
- **Day / night:** **`map.setConfig("basemap", …)`** when only light changes; **`map.setStyle(…, { config })`** when switching Standard ↔ Satellite, then **re-mount operational layers** (assets, targets, zones, intercepts, terrain, listeners).
- **Config helpers:** **`src/utils/mapboxBasemapConfig.ts`** (`getMapboxStyleUrl`, `getBasemapFragmentConfig`, `getMapInitialConfig`).
- **Removed / avoided** on Standard path: legacy **satellite-streets** tactical raster dimming, custom **fog**, duplicate **3D buildings** layer (Standard owns buildings).

**UI:** **`CopTopBar`** — pills for **Standard | Satellite** and **Day | Night**, plus existing **2D | 3D**. **`dashboard/page.tsx`** holds `basemapVariant` and `mapLightPreset` state and passes them into `MapContainer`.

### 3.4 COP chrome (glass panels)

- **`src/components/cop-shell/shellStyles.ts`** — `COP_GLASS_PANEL` (dark translucent fill, blur, border, shadow).
- **`CopShell`**, **`TrackingPanel`** use this glass treatment for Figma-aligned side/top aesthetic.

### 3.5 Tactical layers — visible on Standard night / monochrome

Mapbox Standard **monochrome** can wash out custom layers. Mitigations applied:

- **`slot: "top"`** on operational layers so they composite above the basemap theme where supported.
- **`line-color-use-theme` / `fill-color-use-theme` / `circle-*-color-use-theme`: `"disabled"`** where applicable.
- **`line-emissive-strength` / `fill-emissive-strength` / `circle-emissive-strength`** (and symbol **icon-emissive-strength**) to keep colors readable.

**Radar / assets** (`src/components/map/layers/assets.ts`):

- **Rings:** Tiered colors (lime inner, orange mid, dashed orange-red outer) aligned with Driif map symbology; **static opacity** (no sine “pulse”) so **rings do not blink**; motion is from the **rotating sweep wedge** only.
- **Lock-on circles:** Stable opacity; slot + emissive + theme opt-out.
- **Intercept line** (`MapContainer`): `top` slot, emissive, theme opt-out (marching dash may still animate).

**Zones** (`zones.ts`), **border** (`border.ts`): same slot / theme / emissive pattern where added.

**Targets / drones** (`targets.ts`):

- Trails and symbols use **`top`** slot + emissive + theme opt-out for visibility.
- **`SHOW_DRONE_TRAILS`** flag at top of file: set to **`false`** to disable trail **source + layer** and trail **updates**; set **`true`** to restore.

### 3.6 Mission workspace flags

**`src/components/missions/MissionWorkspace.tsx`**

- **`SHOW_MISSION_SIDE_PANELS`** (default **`false`** in your last request): when **`false`**, **Assets** (left) and **Tracking** (right) rails are **not rendered**; center mission UI (commands, timeline, log, status strip) expands. Set **`true`** to restore both panels.

### 3.7 TypeScript / Mapbox API notes

- **`setStyle` options** typing in Mapbox can require a cast for `{ config }` (second argument).
- **`map.setConfig("basemap", …)`** used for day/night on the same style URL (instead of `updateConfig` where typings differed).

### 3.8 Missions overlay — Figma Mission Control (node 853:9691)

Design reference: [Driif-UI — Missions / Create Mission frame](https://www.figma.com/design/dkRUNmWWxBYeiBAVrMcS26/Driif-UI?node-id=853-9691&m=dev).

- **`MissionSelector` (overlay)** matches the Figma **Missions** panel: `#272727` shell, **Space Grotesk** title (`#D3D3D3`, 18px medium), search row (`#1A1A1A` field, `#535353` border, placeholder “Search Mission....”) with **`/icons/search.svg`** on the right of the field, and **Create Mission** as `#4C5C0B` / `#C6E600` (Primary/100 / Primary/60).
- **Mission cards** use `#404040` fills, 2px corners, 12px padding; primary line `#E6E6E6` (14px), secondary lines `#D3D3D3` 12px at 60% opacity.
- **Status tags** mirror Figma labels (**LIVE OPS**, **TRAINING SIM**, **ACTIVE**, **COMPLETED**, plus **SCHEDULED** for common API shapes) with **text only** (no icons). Pill background `#171717`; text colors `#EEFF30` (live/active), `#F4A30C` (training), `#0CBB58` (completed), `#8A8A8A` (scheduled).
- **Data:** `Mission` now allows optional **`status`** and **`created_at`**. If the API omits them, the tag defaults to **ACTIVE** and the “Created on … IST” line is omitted. **MSN** line is derived from `id` (`MSN-XXXX-YYYY` from the UUID-style id) until the API supplies a dedicated code.
- **Selection:** When a mission is already active, its card shows a subtle **lime inset outline** so the list state matches the shell.
- **Tokens:** `COLOR.missions*` entries in **`src/styles/driifTokens.ts`**; display logic in **`src/utils/missionListUi.ts`**.

---

## 4. File index (quick reference)

| Area | Files (representative) |
|------|-------------------------|
| Dashboard shell | `src/app/dashboard/page.tsx`, `CopShell.tsx`, `CopTopBar.tsx` |
| Map | `MapContainer.tsx`, `missionOverview.ts`, `mapboxBasemapConfig.ts` |
| Glass tokens | `shellStyles.ts`, `TrackingPanel.tsx`, `driifTokens.ts` |
| Layers | `layers/assets.ts`, `layers/targets.ts`, `layers/zones.ts`, `layers/border.ts` |
| Mission UI | `MissionWorkspace.tsx`, `MissionSelector.tsx`, `missionListUi.ts` |
| Feature flags | `SHOW_DRONE_TRAILS` in `targets.ts`; `SHOW_MISSION_SIDE_PANELS` in `MissionWorkspace.tsx` |

---

## 5. How to re-enable hidden features

| Feature | Where to toggle |
|---------|------------------|
| Drone trail lines | `src/components/map/layers/targets.ts` → **`SHOW_DRONE_TRAILS = true`** |
| Assets + Tracking side rails | `src/components/missions/MissionWorkspace.tsx` → **`SHOW_MISSION_SIDE_PANELS = true`** |

---

*Document generated to capture COP meaning and cumulative dashboard/map UI work. Update this file when you add new COP-facing features or change flags.*
