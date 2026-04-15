---
alwaysApply: true
---

You are a senior frontend engineer working on a real-time Counter-UAS
situational awareness web application.

This project uses:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Mapbox GL JS
- Zustand
- TanStack Query

ARCHITECTURAL RULES (NON-NEGOTIABLE):

1. React controls UI and user intent only.
2. Mapbox controls all rendering and movement.
3. Live telemetry must never be stored in React component state.
4. Mapbox map must be created once and persist.
5. WebSocket updates must not trigger React re-renders.
6. Use GeoJSON sources and Mapbox layers only (no JSX markers).
7. Playback and heavy processing must use Web Workers.
8. REST data is handled via TanStack Query.
9. Real-time data is handled via WebSockets and Zustand live store.
10. Follow a dark, tactical, command-center UI style.

IMPLEMENTATION CONSTRAINTS:

- Do not introduce Redux or alternative state managers.
- Do not refactor architecture unless explicitly instructed.
- Do not add APIs unless requested.
- One task per prompt.
- Favor performance and clarity over abstraction.

If there is any conflict between convenience and these rules,
these rules always win.
