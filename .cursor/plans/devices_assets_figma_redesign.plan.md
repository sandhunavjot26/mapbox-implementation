# Devices / Assets panel — Figma alignment

## Source design

[Figma Driif-UI node `1893:39114`](https://www.figma.com/design/dkRUNmWWxBYeiBAVrMcS26/Driif-UI?node-id=1893-39114&m=dev): **Assets** panel (header, bulk actions, search, selectable list rows). Reference output from `get_design_context` + project tokens (`driifTokens`), not raw Tailwind from Figma.

## Scope note

The Figma frame matches the **inventory / assets list** surface (`DevicesInventoryOverlay`, `DevicesTable`, `DeviceFilterBar`), not the single-device **`DeviceDetailDrawer`** (live state / config). Implementation should target the overlay/table/filter stack unless a separate drawer frame is provided.

## Hard requirement (user)

When aligning UI to the new Figma design:

- **Do not remove** list filtering by **mission**, **device type**, **status**, and **radar model** (implemented today as **`protocol`** in [`DeviceFilterBar.tsx`](src/components/devices/DeviceFilterBar.tsx), consumed by [`DevicesInventoryOverlay.tsx`](src/components/devices/DevicesInventoryOverlay.tsx) → `useDevicesList` params).

### How to satisfy this

- Keep `DeviceListFilters` / `applied` state and `listParams` wiring unchanged unless explicitly migrating to an equivalent API.
- If Figma shows only a funnel icon (no inline filter controls), implement **Discoverability**: funnel opens the same four dimensions (mission, type, status, protocol/radar) — e.g. popover, sheet, or expandable region — rather than deleting filters.
- **`DeviceDetailDrawer.tsx`**: today has **no** mission/type/status/protocol filters; if any future change merges drawer + list, preserve filter capability at the **overlay / list** layer.

## Implementation todos (when executing)

1. Restyle outer panel + header/actions/search/list per Figma using existing patterns (`deviceAdminStyles`, mission workspace typography).
2. Integrate bulk selection / Send Command / Add Asset only where product agrees (may be phased); filters remain regardless.
3. Map Figma colors to `driifTokens` where possible; add tokens only if truly missing.
