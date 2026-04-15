REAL-TIME & SIMULATION RULES

1. Live data flow:
   WebSocket → Zustand store → Mapbox source update

2. React must NOT re-render on telemetry updates.

3. For missing APIs:
   - Simulate WebSocket stream
   - Use interval-based updates

4. Simulation must mimic:
   - Drone movement (lat/lng updates)
   - Speed and direction changes
   - Zone entry/exit

5. Simulation must be:
   - Controlled (start/stop)
   - Deterministic (seeded if needed)

6. Never mix simulation logic inside UI components.

7. Use separate store slices:
   - liveTracks
   - simulationState