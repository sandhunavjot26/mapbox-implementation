MAPBOX RULES (STRICT)

1. All map visuals must use:
   - GeoJSON sources
   - Mapbox layers

2. NEVER:
   - Use React components for markers
   - Store map state in React

3. All updates must:
   - Update GeoJSON source directly
   - Not recreate layers

4. Layer types:
   - Radars → circle layers
   - Detection zones → fill + opacity
   - Jamming zones → smaller radius fill
   - Flight paths → line layers
   - Drones → symbol or circle layers

5. Performance:
   - Batch updates
   - Avoid frequent source re-creation
   - Use feature IDs for updates

6. Map instance must persist across route changes.

7. All coordinates must follow:
   [longitude, latitude]

8. Use separate sources:
   - radar-source
   - drone-source
   - zone-source
   - path-source