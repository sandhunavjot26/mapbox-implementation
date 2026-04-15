# Figma-first build (Driif Nexus)

1. **Figma is the source of truth for UI** while backend data is incomplete. Use dummy or fixture data that matches Figma copy and layout; wire to APIs later via adapters and props.

2. **Dummy data must stay replaceable**: keep fixtures in `src/data/` or `*.fixtures.ts`, or derive display props in parents. Do not embed mock generators inside map layers or WebSocket handlers.

3. **Respect existing architecture** (React UI, Mapbox rendering, Zustand live, TanStack Query REST). Prefer small presentational components and clear types so swapping fixtures for API responses is a data-layer change only.
