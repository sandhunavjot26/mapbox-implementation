# AeroShield REST & WebSocket API Reference

Audience: GUI / client developers integrating against AeroShield.

This document covers every HTTP endpoint and WebSocket surface exposed
by the three backend services (auth, device, command), plus the common
conventions that apply across all of them. Internal service-to-service
endpoints are included and clearly flagged.

---

## 1. Services and base URLs

| Service          | Default local URL        | Purpose                                 |
|------------------|--------------------------|-----------------------------------------|
| auth-service     | `http://localhost:8000`  | Login, users, roles, permissions, scopes |
| device-service   | `http://localhost:8001`  | Sites, devices, missions, zones, events, WebSockets |
| command-service  | `http://localhost:8002`  | Command workflow, policies, capabilities |

Every REST endpoint is mounted under `/api/v1`. WebSocket endpoints are
mounted directly at `/ws/...` on the relevant service.

In production the GUI typically talks to one gateway/ingress that
routes by service prefix.

## 2. Authentication

All public endpoints (unless explicitly marked "public: none") require a
JSON Web Token issued by `POST /api/v1/auth/login`.

**Header:**

```
Authorization: Bearer <access_token>
```

**Token payload** (HS256, signed with `JWT_SECRET_KEY`):

- `sub` — user UUID (string).
- `roles` — array of role names.
- `permissions` — array of permission codes (`device:read`, `command:request`, ...).
- `scopes` — list of scope grants the user has (see Scopes below).
- `exp` — expiry (UNIX seconds).

The three services share the same signing key, so a token from auth can
be verified by device-service and command-service without an extra hop.

## 3. Permissions

All writes and most reads are gated on a permission code. Permissions
are bundled into roles; roles are assigned to users. Standard codes:

| Group    | Codes                                                              |
|----------|--------------------------------------------------------------------|
| user     | `user:create`, `user:read`, `user:update`, `user:delete`           |
| role     | `role:create`, `role:read`, `role:update`, `role:delete`, `role:assign` |
| other IAM | `permission:read`, `scope:read`, `scope:update`                   |
| audit    | `audit:read`                                                       |
| site     | `site:create`, `site:read`, `site:update`, `site:delete`           |
| device   | `device:create`, `device:read`, `device:update`, `device:delete`   |
| protocol | `protocol:create`, `protocol:read`, `protocol:update`, `protocol:delete` |
| mission  | `mission:create`, `mission:read`, `mission:update`, `mission:delete`, `mission:assign_assets`, `mission:map:update`, `mission:events:read` |
| command  | `command:request`, `command:approve`, `command:execute`, `command:read` |
| policy   | `policy:create`, `policy:read`, `policy:update`, `policy:delete`   |

## 4. Scopes

Each user has one or more scope grants. The backend filters list reads
and rejects writes outside the user's scope.

| Type      | resource_id  | Meaning                                        |
| --------- | ------------ | ---------------------------------------------- |
| `GLOBAL`  | `null`       | Full access. Exclusive - removes other scopes. |
| `MISSION` | mission UUID | Can act on this mission and its devices.       |
| `SITE`    | site UUID    | Can act on devices at this site.               |
| `DEVICE`  | device UUID  | Can act on exactly one device.                 |

## 5. Common conventions

- **Content type**: `application/json` for both request and response.
- **UUIDs**: all resource IDs are lowercase RFC-4122 UUIDs as strings.
- **Timestamps**: ISO-8601 with timezone (`2026-04-18T10:23:45.123Z`).
  The backend persists `timestamptz` in Postgres.
- **Lists** are returned as arrays. A few endpoints return `{items, total}`
  for paginated surfaces — noted explicitly below.
- **Errors** follow FastAPI's standard shape:
  ```json
  { "detail": "human readable message" }
  ```
  Common status codes: `400` (validation / capability gate), `401`
  (missing/invalid token), `403` (scope or permission denied), `404`
  (not found), `409` (conflict — e.g. duplicate serial, friendly-drone
  lockout), `422` (Pydantic validation error, with array of field errors).
- **Internal endpoints** require a shared-secret header:
  ```
  X-Internal-Token: <INTERNAL_API_TOKEN>
  ```
  These are meant for service-to-service traffic. The GUI should not
  depend on them, but they are listed here for transparency.

## 6. WebSockets

Three mission-scoped streams:

| URL                                             | Service         | Purpose                          |
|-------------------------------------------------|-----------------|----------------------------------|
| `/ws/missions/{mission_id}/events`              | device-service  | Live mission events              |
| `/ws/missions/{mission_id}/devices`             | device-service  | Live device state changes        |
| `/ws/missions/{mission_id}/commands`            | command-service | Live command status changes      |

Authenticate via `?token=<jwt>` query param. All messages are JSON with
a `type` discriminator (`mission_event`, `device_state_update`,
`device_online`, `device_offline`, `device_config_update`,
`command_update`).

---

# Part A — Auth Service (`auth-service`, default port 8001)

## A.1 Authentication

### POST `/api/v1/auth/login`

Exchange username + password for a JWT access token.

- **Permission**: public (no token required).
- **Query parameters**:
  | Name       | Type   | Required | Description         |
  |------------|--------|----------|---------------------|
  | `username` | string | yes      | User's username.    |
  | `password` | string | yes      | Plaintext password. |
- **Request body**: none.
- **Response** `200 OK`:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "roles": ["OPERATOR"],
    "permissions": ["device:read", "mission:read", "command:request", "command:read"],
    "scopes": [{ "scope_type": "MISSION", "resource_id": "c4d…" }]
  }
  ```
- **Errors**: `401` if credentials don't match.
- **When to call**: at app start and after token expiry.

## A.2 Users

### POST `/api/v1/users` — Create user
- **Permission**: `user:create`.
- **Body**:
  ```json
  { "username": "operator_a", "password": "<plaintext>", "roles": ["OPERATOR"] }
  ```
- **Response** `201`: `{ id, username, is_active, roles }`.
- **Conflicts**: `409` on duplicate username.

### GET `/api/v1/users` — List users
- **Permission**: `user:read`.
- **Query**: `q` (substring match on username), `limit` (1–200, default 50), `offset` (default 0).
- **Response**: `{ "items": UserOut[], "total": number }`.

### GET `/api/v1/users/me` — Current principal
- **Permission**: any authenticated user.
- **Response**: `{ sub, roles, permissions, scopes }`. Mirrors the JWT payload.

### GET `/api/v1/users/{user_id}`
- **Permission**: `user:read`.
- **Response**: `UserOut` or `404`.

### PATCH `/api/v1/users/{user_id}`
- **Permission**: `user:update`.
- **Body** (all optional):
  ```json
  { "is_active": true, "password": "<new>", "roles": ["OPERATOR", "AUDITOR"] }
  ```
- **Response**: `UserOut`.
- **Note**: attempting to disable or down-role `SUPER_ADMIN` is rejected.

### DELETE `/api/v1/users/{user_id}`
- **Permission**: `user:delete`.
- **Response**: `{ "status": "deleted" }`.
- **Note**: deleting the last SUPER_ADMIN is blocked.

## A.3 Roles

### GET `/api/v1/roles` — List roles
- **Permission**: `role:read`.
- **Response**: `[{ id, name, permissions: string[] }]`.

### POST `/api/v1/roles`
- **Permission**: `role:create`.
- **Body**: `{ "name": "ANALYST" }`.
- **Response**: `{ id, name, permissions: [] }`.

### GET `/api/v1/roles/{role_id}`
- **Permission**: `role:read`.

### DELETE `/api/v1/roles/{role_id}`
- **Permission**: `role:delete`.
- **Note**: the four system roles cannot be deleted.

### PUT `/api/v1/roles/{role_id}/permissions` — Replace role's permissions
- **Permission**: `role:update`.
- **Body**: `{ "permissions": ["device:read", "mission:read"] }`.
- **Note**: non-`SUPER_ADMIN` callers cannot modify `SUPER_ADMIN`.

### POST `/api/v1/roles/{role_id}/permissions` — Add permissions (idempotent)
- **Permission**: `role:update`.
- **Body**: `{ "permissions": ["policy:read"] }`.

## A.4 Permissions

### GET `/api/v1/permissions`
- **Permission**: `permission:read`.
- **Response**: `string[]` — every permission code seeded in the database.
- **Use for**: populating the role editor's permission picker.

## A.5 User-role assignments

### POST `/api/v1/users/{user_id}/roles` — Assign roles
- **Permission**: `role:assign`.
- **Body**: `{ "roles": ["OPERATOR"] }`.
- **Response**: `{ status: "assigned", roles: string[] }` (final set).
- **Idempotent** — duplicates are ignored.

### DELETE `/api/v1/users/{user_id}/roles` — Revoke roles
- **Permission**: `role:assign`.
- **Body**: `{ "roles": ["OPERATOR"] }`.
- **Note**: revoking the last `SUPER_ADMIN` role is blocked.

## A.6 Scopes

### GET `/api/v1/users/{user_id}/scopes`
- **Permission**: `user:read`.
- **Response**: `[{ scope_type, resource_id }]`.

### POST `/api/v1/users/{user_id}/scopes` — Grant
- **Permission**: `user:update`.
- **Body**: `{ "scope_type": "MISSION", "resource_id": "<uuid>" }`.
- **Semantics**: `GLOBAL` is exclusive — granting it removes all other scopes for the user.

### DELETE `/api/v1/users/{user_id}/scopes` — Revoke
- **Permission**: `user:update`.
- **Body**: same shape as POST.
- **Response**: `{ "status": "revoked" }` or `{ "status": "revoked_global" }`.

## A.7 Health

- `GET /health` — `{ status: "ok" }`.
- `GET /ready` — `{ status: "ready" }` after DB connectivity check.

---

# Part B — Device Service (`device-service`, default port 8002)

## B.1 Sites

### POST `/api/v1/sites`
- **Permission**: `site:create`.
- **Body**: `{ name, latitude, longitude }`.
- **Response**: `SiteOut`.

### GET `/api/v1/sites`
- **Permission**: `site:read`. Scope-filtered.

### GET `/api/v1/sites/{site_id}`
- **Permission**: `site:read`.

### PATCH `/api/v1/sites/{site_id}`
- **Permission**: `site:update`.
- **Body**: any of `{ name, latitude, longitude }`.

### DELETE `/api/v1/sites/{site_id}`
- **Permission**: `site:delete`.
- **Effect**: cascades to devices tied to the site.

## B.2 Devices

### POST `/api/v1/devices` — Create
- **Permission**: `device:create`.
- **Body** (`DeviceCreate`):
  ```json
  {
    "name": "Himalaya Ridge A",
    "serial_number": "AS2G-001",
    "mission_id": null,
    "device_type": "DETECTION",
    "protocol": "AS_2.0G",
    "color": "#22d3ee",
    "latitude": 32.246,
    "longitude": 78.018,
    "status": "UNKNOWN",
    "detection_radius_m": 5000,
    "jammer_radius_m": 2000,
    "breach_green_m": 5000,
    "breach_yellow_m": 2500,
    "breach_red_m": 1000,
    "detection_beam_deg": 360,
    "jammer_beam_deg": 120
  }
  ```
- **Field validation**:
  - `device_type` ∈ {`DETECTION`, `JAMMER`, `DETECTION_JAMMER`}.
  - `color` must match `#RRGGBB` or `#RRGGBBAA`.
  - `protocol` must match `^[a-z][a-z0-9\-]{1,62}$`.
  - All radii and beam widths > 0; beams ≤ 360.
- **Response**: `DeviceOut` (same shape + `id`).
- **Conflicts**: `409` on duplicate `serial_number`.

### GET `/api/v1/devices` — List
- **Permission**: `device:read`. Scope-filtered.
- **Query filters** (all optional):
  | Name                | Type   | Description                             |
  |---------------------|--------|-----------------------------------------|
  | `mission_id`        | UUID   | Devices assigned to this mission.       |
  | `device_type`       | enum   | DETECTION / JAMMER / DETECTION_JAMMER.  |
  | `status`            | string | e.g. `ONLINE`.                          |
  | `protocol`          | string | e.g. `AS_2.0G`.                         |
  | `monitor_device_id` | int    | Vendor integer id from dt=1.            |

### GET `/api/v1/devices/{device_id}`
- **Permission**: `device:read`. Scope-checked.

### PATCH `/api/v1/devices/{device_id}`
- **Permission**: `device:update`. Scope-checked.
- **Body**: any subset of creatable fields (empty `mission_id` unassigns).

### DELETE `/api/v1/devices/{device_id}`
- **Permission**: `device:delete`.

### GET `/api/v1/devices/by-monitor-id/{monitor_device_id}`
- **Permission**: `device:read`.
- **Use for**: smoke tests and linking an auto-registered device back to
  the vendor's `monitor_device_id`.

## B.3 Device state and config

### GET `/api/v1/devices/{device_id}/state`
- **Permission**: `device:read`.
- **Response**:
  ```json
  {
    "device_id": "…",
    "monitor_device_id": 10101,
    "last_seen": "2026-04-18T10:00:00Z",
    "remote": { "host": "192.168.137.10", "port": 2001 },
    "op_status": 1,
    "azimuth_deg": 214.5,
    "elevation_deg": 3.2,
    "battery_pct": 84,
    "power_mode": "MAINS",
    "temp_c": 21.0,
    "humidity_pct": 38,
    "lon": 78.018, "lat": 32.246, "alt_m": 3600.0,
    "raw_dt1": "…base64…"
  }
  ```

### GET `/api/v1/devices/states/by-mission/{mission_id}`
- **Permission**: `mission:read` + `device:read`.
- **Response**: `[{ device_id, state: {...} }]`.

### GET `/api/v1/devices/{device_id}/config`
- **Permission**: `device:read`.
- **Response**:
  ```json
  {
    "device_id": "…",
    "monitor_device_id": 10101,
    "updated_at": "…",
    "ip_port": { "ip": "192.168.137.10", "port": 2001 },
    "gateway_ip": "192.168.137.1",
    "attack_mode": { "mode": 1, "switch": 0 },
    "band_range": [{ "enable": 1, "start": 400, "end": 450, "att": 0 }, …],
    "turntable_state": { "azimuth_deg": 215 }
  }
  ```

### GET `/api/v1/devices/configs/by-mission/{mission_id}`
- **Permission**: `mission:read` + `device:read`.

## B.4 Missions

### POST `/api/v1/missions`
- **Permission**: `mission:create`.
- **Body**: `{ name, aop?, border_geojson? }`.
- **Effect**: seeds a default set of zones.
- **Response**: `MissionOut` with `status = "DRAFT"`.

### GET `/api/v1/missions`
- **Permission**: `mission:read`. Scope-filtered.
- **Query**: `q` (substring search on name).

### GET `/api/v1/missions/{mission_id}`
- **Permission**: `mission:read`.
- **Response**: `MissionLoadOut` — full mission, zones, features, and devices in one payload.
- **Use for**: initial mission workspace load.

### GET `/api/v1/missions/{mission_id}/map`
- **Permission**: `mission:read`.
- **Response**: `{ mission, zones, devices, features }`. Subset of the load endpoint.

### PATCH `/api/v1/missions/{mission_id}`
- **Permission**: `mission:update`.
- **Body**: any of `{ name, aop, border_geojson }`.

### DELETE `/api/v1/missions/{mission_id}`
- **Permission**: `mission:delete`.

### POST `/api/v1/missions/{mission_id}/activate`
- **Permission**: `mission:update`.
- **Effect**: transitions to `ACTIVE`, sets `activated_at`, idempotent.
- **Response**: `MissionOut`.

### POST `/api/v1/missions/{mission_id}/stop`
- **Permission**: `mission:update`.
- **Effect**: transitions to `STOPPED`, sets `stopped_at`, idempotent.

### GET `/api/v1/missions/{mission_id}/overlaps`
- **Permission**: `mission:read`.
- **Response**:
  ```json
  {
    "mission_id": "…",
    "device_count": 3,
    "warning_count": 2,
    "counts": { "CRITICAL": 1, "HIGH": 1, "LOW": 0 },
    "warnings": [
      {
        "severity": "CRITICAL",
        "kind": "jammer_vs_jammer",
        "device_a_id": "…", "device_a_name": "A",
        "device_b_id": "…", "device_b_name": "B",
        "overlap_radius_m": 500,
        "overlap_area_m2": 1500000
      }
    ]
  }
  ```
- **Use for**: the Coverage panel and the activation-blocker toast.

## B.5 Mission zones

### POST `/api/v1/missions/{mission_id}/zones`
- **Permission**: `mission:map:update`.
- **Body**:
  ```json
  {
    "zone_type": "no_fly",
    "device_id": null,
    "label": "Palace buffer",
    "priority": 10,
    "zone_geojson": { "type": "Polygon", "coordinates": [...] },
    "action_plan": "Immediate jam on entry",
    "enabled": true
  }
  ```
- `zone_type` ∈ {`detection`, `defense`, `jamming`, `no_fly`, `restricted`, `safe`}.
- Higher `priority` wins on overlap (UI rendering + rule evaluation).

### GET `/api/v1/missions/{mission_id}/zones`
- **Permission**: `mission:read`. Ordered by priority.

### PATCH `/api/v1/missions/{mission_id}/zones/{zone_id}`
- **Permission**: `mission:map:update`. Any subset of create fields.

### DELETE `/api/v1/missions/{mission_id}/zones/{zone_id}`
- **Permission**: `mission:map:update`.

## B.6 Mission features

### POST `/api/v1/missions/{mission_id}/features`
- **Permission**: `mission:map:update`.
- **Body**: `{ feature_type, geojson, properties }`.

### GET `/api/v1/missions/{mission_id}/features`
- **Permission**: `mission:read`.

### DELETE `/api/v1/missions/{mission_id}/features/{feature_id}`
- **Permission**: `mission:map:update`.

### GET `/api/v1/missions/{mission_id}/map/features`
- **Permission**: `mission:read` + `device:read`.
- **Response**: a single GeoJSON `FeatureCollection` containing zones,
  devices, other features, and the mission border — ready to feed
  straight into Leaflet.

## B.7 Mission ↔ device assignment

### POST `/api/v1/missions/{mission_id}/devices/assign`
- **Permission**: `mission:assign_assets`.
- **Body**: `{ "device_ids": ["…", "…"] }`.
- **Response**: `{ status: "assigned", mission_id, device_ids }`.

### GET `/api/v1/missions/{mission_id}/devices`
- **Permission**: `mission:read` + `device:read`.

## B.8 Mission events (audit timeline)

### GET `/api/v1/missions/{mission_id}/events`
- **Permission**: `mission:read`.
- **Query**:
  | Name         | Type          | Default |
  |--------------|---------------|---------|
  | `limit`      | int (1–1000)  | 200     |
  | `offset`     | int           | 0       |
  | `event_type` | string        | —       |
  | `from_ts`    | ISO datetime  | —       |
  | `to_ts`      | ISO datetime  | —       |
- **Response** (newest-first):
  ```json
  [
    {
      "id": "…",
      "mission_id": "…",
      "device_id": "…" | null,
      "event_type": "DETECTED",
      "ts": "2026-04-18T10:23:45Z",
      "payload": { … }
    }
  ]
  ```
- **Known `event_type`s** the GUI renders today:
  - `DETECTED` / `UAV_DETECTED` — drone sighting (payload.uav has lat/lon/name/uid).
  - `JAMMED` — jammer turned on near a drone.
  - `THREAT_ESCALATION` — UI-side threat score reached HIGH/CRITICAL.
  - `NFZ_BREACH_PREDICTED` — predicted entry into a `no_fly` zone.
  - `BREACH_RING_ENTERED` — track entered a green/yellow/red ring (includes `radar_id` / `radar_name` attribution).
  - `BREACH_UNJAMMED_EXIT` — track left a ring without being jammed.
  - `COMMAND_REQUESTED` / `COMMAND_SENT` / `COMMAND_RESPONSE` / `COMMAND_REJECTED`.
  - `DEVICE_OFFLINE` / `DEVICE_ONLINE`.
  - `DEVICE_AZIMUTH` — change-based azimuth sample (≥ 5° delta).
  - `TRACK_RATED` — operator classification of a drone track (Confirm / Dismiss / False-positive + optional priority override). Written by the UI via `POST /annotations`; see E.1.

## B.8b Operator annotations

Operators (not the ingestor) record custom timeline entries via this
endpoint. Used today for `TRACK_RATED` and `NFZ_BREACH_PREDICTED` —
anything the UI produces that needs to survive a reload as a mission
event. Separate path from the internal `/events` ingest endpoint so
browsers don't need the `X-Internal-Token`.

### POST `/api/v1/missions/{mission_id}/annotations`
- **Permission**: `mission:update`. Scope-checked.
- **Body**:
  ```json
  {
    "event_type": "TRACK_RATED",
    "device_id": null,
    "payload": {
      "target_uid": "SIM10101-1234",
      "status": "CONFIRMED",
      "priority": "HIGH"
    }
  }
  ```
- **Effect**: inserts a `mission_events` row with the given `event_type`
  and payload. Also broadcasts on the events WebSocket stream so other
  tabs see the annotation live.
- **Response**:
  ```json
  {
    "id": "…",
    "mission_id": "…",
    "event_type": "TRACK_RATED",
    "payload": { … },
    "ts": "2026-04-18T10:23:45Z"
  }
  ```
- **Use for**: persisting drone ratings, NFZ-breach predictions, and
  any other operator-initiated timeline entry without opening up the
  general event-ingest endpoint.

## B.9 Swarms

### POST `/api/v1/missions/{mission_id}/swarms`
- **Permission**: `mission:update`.
- **Body**:
  ```json
  {
    "label": "Wave 1",
    "source": "operator",
    "severity": "HIGH",
    "approach_bearing_deg": 274,
    "target_uids": ["SIM10101-1234", "SIM10101-5678"],
    "notes": "Approaching from west ridge"
  }
  ```
- **Source values**: `"operator"` (manual tag) or `"auto"` (detection-service clustering). Operator routes always stamp `"operator"` — the caller's value is ignored. Defaults to `"operator"` when omitted.
- **Side effect (every member)** — a `TRACK_RATED` mission_event is inserted per `target_uid` with `status=CONFIRMED`, `priority=HIGH`, `rated_by="system:swarm-tag"`. Drone icons recolour to HIGH threat styling immediately; operator ratings written later via the map popup still win (last write wins).
- **Response**: `SwarmOut` (all fields + timestamps + `created_by`).

### GET `/api/v1/missions/{mission_id}/swarms`
- **Permission**: `mission:read`.
- **Query**: `include_closed` (default `true`).

### PATCH `/api/v1/missions/{mission_id}/swarms/{swarm_id}`
- **Permission**: `mission:update`.
- **Body**: any of `{ label, severity, approach_bearing_deg, target_uids, notes, closed, closed_reason }`. Setting `closed: true` closes the swarm and stamps `closed_at`; `closed: false` reopens (clears `closed_at` and `closed_reason`).

### POST `/api/v1/internal/missions/{mission_id}/swarms`  *(internal — `X-Internal-Token`)*
- **Auth**: service-to-service shared secret (not JWT). Used exclusively by detection-service's clustering pass.
- **Body**: same shape as the operator route. `source` is forced to `"auto"` and `created_by` is stamped `"system:auto-swarm"` regardless of input.
- **Dedupe**: if an active (`closed_at IS NULL`) auto-swarm with the exact same sorted `target_uids` already exists for this mission, the existing row is returned with `last_seen_at` refreshed; no duplicate row is created.
- **Side effects**:
  - Inserts a `SWARM_DETECTED` mission_event with payload `{source, swarm_id, label, severity, approach_bearing_deg, target_uids, notes, size}`. Drives the timeline chip bar and CSV export.
  - Inserts one `TRACK_RATED` mission_event per member at `priority=HIGH` (same rule as the operator route).
- **Re-detection after close**: device-service's dedupe only matches against active swarms. If detection-service re-posts after the operator closed the previous AUTO swarm, a brand-new row is created with a new id. detection-service compares that id to its cached `last_swarm_id[signature]` and logs a fresh `swarm_detected_auto` event with `redetected=true`; the operator sees a new AUTO card appear within `SWARM_REPOST_EVERY_N_TICKS × step_seconds` (default ≈ 20 s).

## B.10 Friendly drones

### POST `/api/v1/missions/{mission_id}/friendlies`
- **Permission**: `mission:update`.
- **Body**:
  ```json
  {
    "target_uid": "MAVIC-0042",
    "label": "Blue 1",
    "freq_khz": 2400000,
    "notes": "Call sign: Blue"
  }
  ```
- **Effect**: the device-service will block jam commands targeting this UID (or same band) until the friendly is marked inactive, unless the operator sends `override_friendly: true`.

### GET `/api/v1/missions/{mission_id}/friendlies`
- **Permission**: `mission:read`.
- **Query**: `include_inactive` (default `false`).
- **Response**: `FriendlyOut[]`.

### PATCH `/api/v1/missions/{mission_id}/friendlies/{friendly_id}`
- **Permission**: `mission:update`.
- **Body**: any of `{ label, freq_khz, notes, active }`. Setting `active=false` unmarks (stamps `unmarked_at`).

## B.11 Protocol (Radar Model) catalogue

Full CRUD. The catalogue row is only half of adding a new radar model —
an edge-connector plugin matching `edge_plugin` must also ship before
devices assigned to the new model will actually decode on the wire.

### GET `/api/v1/protocols`
- **Permission**: any authenticated user (used by every device form).
- **Response**:
  ```json
  {
    "protocols": [
      {
        "id": "…",
        "name": "AS_2.0G",
        "display_name": "AeroShield 2.0G RMTP",
        "description": "…",
        "edge_plugin": "aeroshield_rmtp",
        "capabilities": ["JAM_START", "JAM_STOP", "IP_QUERY", …],
        "enabled": true,
        "default_breach_green_m": 5000,
        "default_breach_yellow_m": 2500,
        "default_breach_red_m": 1000,
        "default_detection_beam_deg": 360,
        "default_jammer_beam_deg": 120
      }
    ]
  }
  ```
- **Use for**: protocol dropdown + showing inherited defaults on the device form.

### POST `/api/v1/protocols` — Create a radar model
- **Permission**: `protocol:create` (superadmin-only by default).
- **Body**:
  ```json
  {
    "name": "AS_3.0",
    "display_name": "AeroShield 3.0 RMTP",
    "description": "Next-gen phased array; S-band.",
    "edge_plugin": "aeroshield_3_0",
    "capabilities": ["JAM_START", "JAM_STOP", "ATTACK_MODE_SET", "RESTART"],
    "enabled": true,
    "default_breach_green_m": 6000,
    "default_breach_yellow_m": 3000,
    "default_breach_red_m": 1200,
    "default_detection_beam_deg": 360,
    "default_jammer_beam_deg": 120
  }
  ```
- **Response** `201`: the full protocol object (same shape as GET).
- **Conflicts**: `409` if `name` already exists.
- **Validation**: beam widths must be in `(0, 360]`; breach radii must be non-negative.

### PATCH `/api/v1/protocols/{protocol_id}` — Update
- **Permission**: `protocol:update`.
- **Body**: any subset of `{ display_name, description, edge_plugin, capabilities, enabled, default_breach_* , default_*_beam_deg }`.
- **Immutable**: `name` cannot be changed (too many downstream references — device rows, NATS subjects, command routing).

### DELETE `/api/v1/protocols/{protocol_id}` — Delete
- **Permission**: `protocol:delete`.
- **Effect**: `204 No Content`.
- **Conflicts**: `409` if any device still references this model — delete or reassign the devices first.

## B.12 WebSockets

### WebSocket `/ws/missions/{mission_id}/events`
- **Auth**: `?token=<jwt>`.
- **Messages** (`type` discriminator):
  - `{ "type": "mission_event", "event": { "id", "event_type", "ts", "payload", "device_id" } }`
- **Event types broadcast on this stream** (non-exhaustive):
  - `DETECTED` — every `dt=56` drone detection
  - `ZONE_ENTER` / `ZONE_EXIT` / `NFZ_BREACH` — zone-breach pass output
  - `TRACK_RATED` — operator drone ratings **and** system-generated ratings written when a swarm is tagged (`rated_by="system:swarm-tag"`)
  - `SWARM_DETECTED` — fired by the internal auto-swarm promote endpoint (including re-detections after a closed AUTO swarm is re-promoted)
  - `DEVICE_AZIMUTH`, `MISSION_ACTIVATED`, `MISSION_STOPPED`, `MISSION_AUTO_JAM_STOP`
- **Client behaviour note (swarm rings)** — the swarms list itself is HTTP-polled on a 10 s cadence via `GET /api/v1/missions/{id}/swarms`; the WS only pushes the *event*, not the new swarm row. The reference UI uses the `SWARM_DETECTED` WS event as a trigger to immediately re-fetch the swarms list so map halo rings + sidebar cards appear within sub-second instead of up to 10 s later. Any client that renders swarm membership should do the same.

### WebSocket `/ws/missions/{mission_id}/devices`
- **Auth**: `?token=<jwt>`.
- **Messages**:
  - `{ "type": "device_state_update", "device_id", "monitor_device_id", "status", "state" }`
  - `{ "type": "device_online", "device_id", "monitor_device_id", "name", "last_seen" }`
  - `{ "type": "device_offline", "device_id", "monitor_device_id" }`
  - `{ "type": "device_config_update", "device_id", "config" }`

## B.13 Internal endpoints (service-to-service)

All require `X-Internal-Token: <INTERNAL_API_TOKEN>`.

- `POST /api/v1/missions/{mission_id}/events` — ingest events from
  internal services. Body: `{ device_id?, event_type, payload }`.
- `GET /api/v1/internal/missions` — list missions.
- `GET /api/v1/internal/missions/{mission_id}/zones` — zones.
- `GET /api/v1/internal/devices/{device_id}` — device lookup.
- `GET /api/v1/internal/devices/by-monitor-id/{monitor_device_id}` — device by vendor id.
- `GET /api/v1/missions/{mission_id}/friendlies/internal-active` —
  active friendlies (used by command-service's jam lockout gate).

## B.14 Health

- `GET /health`.
- `GET /ready` — checks DB + NATS availability.

---

# Part C — Command Service (`command-service`, default port 8003)

## C.1 Command lifecycle

Rows transition through:

`PENDING_APPROVAL` → `SENDING` → `SENT` → `SUCCEEDED`
                 ↘  `REJECTED`            ↘ `FAILED`
                                            ↘ `TIMEOUT`

The backend drives transitions from approvals, NATS acks
(`rmtp.cmd.sent`), device replies (`rmtp.cmd.*.response`), and the
timeout sweeper.

## C.2 Endpoints

### GET `/api/v1/commands/capabilities`
- **Permission**: public.
- **Response**:
  ```json
  { "protocols": { "AS_2.0G": ["JAM_START", "JAM_STOP", …], "json-lines": [...] } }
  ```
- **Use for**: populating the command-type dropdown based on the target device's protocol.

### GET `/api/v1/commands` — Audit list
- **Permission**: `command:read`.
- **Query** (all optional):
  | Name             | Type  | Default | Description                                   |
  |------------------|-------|---------|-----------------------------------------------|
  | `mission_id`     | UUID  | —       | Filter by mission.                            |
  | `device_id`      | UUID  | —       | Filter by device.                             |
  | `requested_by`   | UUID  | —       | Filter by operator UUID (JWT `sub`).          |
  | `status`         | enum  | —       | `PENDING_APPROVAL`, `SENDING`, `SENT`, `SUCCEEDED`, `FAILED`, `TIMEOUT`, `REJECTED`. |
  | `command_type`   | string| —       | e.g. `JAM_START`.                             |
  | `since_minutes`  | int   | —       | Rolling window — minutes back from now.       |
  | `limit`          | int   | 200     | 1–1000.                                       |
- **Response** (newest-first):
  ```json
  [
    {
      "id": "…",
      "mission_id": "…",
      "device_id": "…",
      "monitor_device_id": 10101,
      "command_type": "JAM_START",
      "datatype": 100,
      "protocol": "AS_2.0G",
      "packet_no": 42,
      "status": "SUCCEEDED",
      "required_approvals": 0,
      "approved_count": 0,
      "requested_by": "…",
      "request_payload": { "mode": 1, "switch": 1, "override_friendly": false },
      "last_error": null,
      "created_at": "…", "sent_at": "…", "completed_at": "…"
    }
  ]
  ```
- **Use for**: the Command Audit panel and compliance reports.

### POST `/api/v1/commands` — Request a command
- **Permission**: `command:request`.
- **Body**:
  ```json
  {
    "mission_id": "…",
    "device_id": "…",
    "command_type": "JAM_START",
    "payload": { "mode": 1, "switch": 1, "override_friendly": false }
  }
  ```
- **Effect**:
  1. Resolves the device via `GET /internal/devices/{id}` on device-service to find its `monitor_device_id`, mission binding, `protocol`, and `device_type`.
  2. Validates `command_type` against the protocol's capability list (400 with supported list on mismatch).
  3. Validates `command_type` against the device's role. JAM-family commands (`JAM_START`, `JAM_STOP`, `ATTACK_MODE_SET`, `ATTACK_MODE_QUERY`) are rejected when `device_type = DETECTION` with `400 {error:"command_not_valid_for_device_type", allowed_types:["JAMMER","DETECTION_JAMMER"]}`.
  4. For jam-like commands, calls `GET /missions/{id}/friendlies/internal-active` — if there's an active friendly on the same band and `override_friendly` is not set, returns `409`.
  5. Looks up the policy for `command_type`; if `required_approvals > 0`, creates the command in `PENDING_APPROVAL`. Otherwise publishes to `rmtp.cmd.{protocol}.send` and creates it in `SENDING`.
  6. Writes a `COMMAND_REQUESTED` mission_event.
- **Response**: `CommandOut` (same shape as the audit rows).
- **Error cases**:
  - `400` — unknown `command_type` / protocol mismatch / device-role mismatch (see step 3).
  - `404` — device or mission not found.
  - `409` — friendly-drone lockout (payload includes the friendly's info).

### POST `/api/v1/commands/{command_id}/approve`
- **Permission**: `command:approve`.
- **Body**: `{ "reason": "Breach imminent" }` (optional).
- **Effect**: increments `approved_count`; if threshold reached, publishes to NATS and transitions to `SENDING`.
- **Response**: `{ status: "ok", approved_count, required, command_status }`.

### POST `/api/v1/commands/{command_id}/reject`
- **Permission**: `command:approve`.
- **Body**: `{ "reason": "Friendly in area" }` (required).
- **Response**: `{ status: "rejected" }`.

## C.3 Policies (per command_type)

### GET `/api/v1/policies`
- **Permission**: `policy:read`.
- **Response**: `PolicyOut[]`.

### GET `/api/v1/policies/{command_type}`
- **Permission**: `policy:read`.

### POST `/api/v1/policies`
- **Permission**: `policy:create`.
- **Body**:
  ```json
  {
    "command_type": "JAM_START",
    "datatype": 100,
    "required_approvals": 2,
    "timeout_seconds": 15,
    "auto_send": false,
    "required_roles": ["OPERATOR", "ORG_ADMIN"]
  }
  ```
- **Invariant**: `required_approvals == 0` implies `auto_send == true`, and vice versa.

### PATCH `/api/v1/policies/{command_type}`
- **Permission**: `policy:update`. Same invariant enforced.

## C.4 WebSocket

### WebSocket `/ws/missions/{mission_id}/commands`
- **Auth**: `?token=<jwt>`.
- **Messages**:
  - `{ "type": "command_update", "command": { "id", "status", "approved_count", "required_approvals" } }`

## C.5 Health

- `GET /health`.
- `GET /ready` — DB + NATS check.

---

# Part D — Command Payloads Reference

Every `POST /api/v1/commands` request takes a `payload` object whose
shape depends on the `command_type`. The UI's Commands panel
auto-populates a sensible default per command_type; this table is the
source of truth. Shapes correspond directly to the AS_2.0G protocol
spec (§3.2).

| `command_type`        | Wire dt | Payload shape                                                   | Notes                                                                                |
|-----------------------|---------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------|
| `JAM_START`           | 100     | `{"mode":1,"switch":1}`                                         | Convenience alias; same wire code as ATTACK_MODE_SET.                                |
| `JAM_STOP`            | 100     | `{"mode":1,"switch":0}`                                         | Convenience alias.                                                                   |
| `ATTACK_MODE_SET`     | 100     | `{"mode":1,"switch":1}`                                         | `mode`: 1 = attack, 0 = passive. `switch`: 1 = on, 0 = off.                          |
| `ATTACK_MODE_QUERY`   | 102     | `{}`                                                            | Read jammer mode + on/off state.                                                     |
| `BAND_RANGE_SET`      | 96      | array of 12 `{"enable":0\|1,"start":<mhz>,"end":<mhz>,"att":<db>}` | Replaces the whole 12-slot frequency plan. Disabled slots must still appear.         |
| `BAND_RANGE_QUERY`    | 98      | `{}`                                                            | Read current plan.                                                                   |
| `IP_QUERY`            | 27      | `{}`                                                            | Read device IP + RMTP listen port.                                                   |
| `IP_SET`              | 25      | `{"ip":"<ipv4>","port":<1..65535>}`                             | Changes the radar's network config. Radar will reconnect.                            |
| `GATEWAY_QUERY`       | 54      | `{}`                                                            | Read device gateway IP.                                                              |
| `TURNTABLE_POINT`     | 144     | `{"azimuth_deg":<0..360>}`                                      | Slew the turntable to a compass bearing (0=N, 90=E). Both detection and jammer beams share the radar's azimuth. |
| `TURNTABLE_DIR`       | 142     | `{"direction":"left"\|"right"\|"stop"}`                         | Discrete ±15° jog per click (sim); `stop` releases the manual lock and resumes auto-slew. |
| `RESTART`             | 29      | `{}`                                                            | Reboot the radar firmware. ~30 s downtime.                                           |
| `ALARM_HISTORY_QUERY` | 116     | `{}`                                                            | Returns up to 47 recent alarm entries (see dt=117).                                  |
| `PING`                | —       | `{}`                                                            | Generic plugin liveness for `json-lines` radars. Not supported on `AS_2.0G`.          |

## D.0 Optional payload flags (accepted by all command_types)

- `override_friendly: true` — bypass the friendly-drone lockout. Only
  honoured after a first attempt returned `409 friendly_drone_active`;
  the override + the active friendlies are written to the mission
  timeline as part of the `COMMAND_REQUESTED` event.

## D.1 Worked examples

**Start jamming:**
```http
POST /api/v1/commands
{
  "mission_id": "…",
  "device_id":  "…",
  "command_type": "JAM_START",
  "payload": { "mode": 1, "switch": 1 }
}
```

**Slew turntable to 215°:**
```http
POST /api/v1/commands
{
  "mission_id": "…",
  "device_id":  "…",
  "command_type": "TURNTABLE_POINT",
  "payload": { "azimuth_deg": 215 }
}
```

**Replace band plan (3 active slots, rest disabled):**
```http
POST /api/v1/commands
{
  "mission_id": "…",
  "device_id":  "…",
  "command_type": "BAND_RANGE_SET",
  "payload": [
    { "enable": 1, "start": 2400, "end": 2450, "att": 0 },
    { "enable": 1, "start": 2450, "end": 2500, "att": 0 },
    { "enable": 1, "start": 5800, "end": 5850, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 },
    { "enable": 0, "start": 0, "end": 0, "att": 0 }
  ]
}
```

## D.2 Validation order

`POST /commands` validates in this order; the first failure returns the error:

1. **Auth** — `command:request` permission + mission scope.
2. **Device lookup** — `404` if the device is not known to device-service. Also 400 if `monitor_device_id` is unset or the device isn't bound to the submitted `mission_id`.
3. **Capability gate** — `400 {error:"command_not_supported_by_protocol", supported:[…]}` if the target device's protocol doesn't support the command_type.
4. **Device-role gate** — `400 {error:"command_not_valid_for_device_type", allowed_types:[…]}` for JAM-family commands sent to a DETECTION-only radar.
5. **Friendly-drone lockout** — `409 {error:"friendly_drone_active", friendlies:[…]}` unless `override_friendly: true`.
6. **Policy lookup** — loads the `CommandPolicy` row for this command_type to determine `required_approvals` and `auto_send`.
7. **Publish** — either auto-publishes to `rmtp.cmd.{protocol}.send` or queues in `PENDING_APPROVAL`.

---

# Part E — Event and Message Payload Reference

## E.1 `mission_event.payload` shapes by `event_type`

- `DETECTED` / `UAV_DETECTED`:
  ```json
  {
    "uav": {
      "target_uid": "…",
      "target_name": "DJI Mavic 3",
      "uav_lat": 32.246, "uav_lon": 78.018,
      "alt_agl_m": 85,
      "distance_m": 1200,
      "azimuth_deg": 220,
      "freq_khz": 2400000,
      "strength_db": -48,
      "confidence": 92
    }
  }
  ```
- `JAMMED`:
  ```json
  { "uav": { "target_uid": "…", "target_name": "…" } }
  ```
- `THREAT_ESCALATION`:
  ```json
  { "target_uid", "target_name", "level": "HIGH" | "CRITICAL", "score": 0–1, "reasons": ["…"] }
  ```
- `NFZ_BREACH_PREDICTED`:
  ```json
  { "target_uid", "target_name", "head": [lat, lon], "n_fixes": 12 }
  ```
- `BREACH_RING_ENTERED`:
  ```json
  {
    "target_uid", "target_name",
    "ring": "GREEN" | "YELLOW" | "RED",
    "position": [lat, lon],
    "radar_id": "…",
    "radar_name": "Himalaya Ridge B"
  }
  ```
  `radar_id` / `radar_name` identify the radar whose ring was breached
  so the operator can attribute the alert to a specific perimeter.
- `BREACH_UNJAMMED_EXIT`:
  ```json
  { "target_uid", "worst_ring", "resolution": "track_ended_without_jam" }
  ```
- `COMMAND_REQUESTED` / `COMMAND_SENT` / `COMMAND_RESPONSE` / `COMMAND_REJECTED`:
  ```json
  { "command_id", "command_type", "status", "requested_by", "device_id" }
  ```
- `DEVICE_OFFLINE`:
  ```json
  { "device_id", "monitor_device_id", "serial_number", "name",
    "last_seen_age_seconds": 73, "threshold_seconds": 60 }
  ```
- `DEVICE_ONLINE`:
  ```json
  { "device_id", "monitor_device_id", "serial_number", "name" }
  ```
- `DEVICE_AZIMUTH`:
  ```json
  { "device_id", "monitor_device_id", "azimuth_deg": 215.4, "elevation_deg": 3.2, "delta_deg": 6.1 }
  ```
- `TRACK_RATED`:
  ```json
  {
    "target_uid": "SIM10101-1234",
    "target_name": "DJI Mavic 3",
    "status": "CONFIRMED" | "DISMISSED" | "FALSE_POSITIVE" | "UNRATED",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null
  }
  ```
  The UI folds the latest TRACK_RATED per `target_uid` to rebuild the
  per-mission ratings map on load. `status=UNRATED` with `priority=null`
  clears a previous rating.

## E.2 Device health rollup (client-side)

The GUI library (`utils/deviceHealth.ts`) computes a 4-level status:

| Status     | Triggers                                                         |
| ---------- | ---------------------------------------------------------------- |
| `ONLINE`   | Everything OK.                                                   |
| `DEGRADED` | Heartbeat 30-60 s old, battery 10-25 %, or temperature 70-85 °C. |
| `ALARM`    | Any dt=117 alarm flag, battery < 10 %, or temperature > 85 °C.   |
| `OFFLINE`  | Heartbeat > 60 s old (aligned with `OFFLINE_THRESHOLD_SECONDS`). |

Precedence: `OFFLINE` > `ALARM` > `DEGRADED` > `ONLINE`. The backend
flips `device.status` to `OFFLINE` on the server-side threshold; the
rest of the rollup is derived from `DeviceState` fields.

## E.3 NATS subjects (for reference)

Not directly consumed by the GUI, but useful when debugging:

| Subject                           | Direction           | Payload                                  |
|-----------------------------------|---------------------|------------------------------------------|
| `rmtp.device.status`              | ingestor → device   | Normalised dt=1 heartbeat.               |
| `rmtp.device.uav`                 | ingestor/detection → | Normalised dt=56 UAV detection.          |
| `rmtp.cmd.{protocol}.send`        | command → ingestor  | Outbound device command.                 |
| `rmtp.cmd.sent`                   | ingestor → command  | Transport-level ack.                     |
| `rmtp.cmd.{protocol}.response`    | ingestor → command  | Device reply tied to `packet_no`.        |

---

# Part F — Error and Quota Cheatsheet

| Status | Cause                                                          | Typical GUI handling                                          |
|--------|----------------------------------------------------------------|---------------------------------------------------------------|
| 400    | Validation failure / capability gate / invalid UUID             | Show `detail` as toast; inline error on the form field.       |
| 401    | Missing / invalid / expired JWT                                 | Redirect to login; clear stored token.                        |
| 403    | Permission or scope denied                                      | Hide the control; show "you don't have access".               |
| 404    | Resource not found (or not in scope)                            | Show empty state; offer to create.                            |
| 409    | Duplicate serial, friendly-drone lockout, state conflict        | For jam lockout, offer a confirm-and-retry with `override_friendly: true`. |
| 422    | Pydantic body validation                                        | Parse `detail` array (`[{loc, msg}]`) and surface per field.  |
| 5xx    | Backend fault — log, retry with backoff                         | Retry 2–3 × with exponential backoff, then show banner.       |

---

# Part G — Quickstart (copy-paste)

```bash
# 1. Log in
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login?username=superadmin&password=driif123!@%23" \
  | jq -r .access_token)

# 2. List missions
curl -s http://localhost:8001/api/v1/missions \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Load mission workspace data
curl -s http://localhost:8001/api/v1/missions/$MID \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Subscribe to events (wscat)
wscat -c "ws://localhost:8001/ws/missions/$MID/events?token=$TOKEN"

# 5. Request a command
curl -s -X POST http://localhost:8002/api/v1/commands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mission_id": "'$MID'",
    "device_id":  "'$DID'",
    "command_type": "JAM_START",
    "payload": { "mode": 1, "switch": 1 }
  }' | jq

# 6. Audit recent commands
curl -s "http://localhost:8002/api/v1/commands?mission_id=$MID&since_minutes=60&limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Appendix: V1 Complete API additions

These endpoints landed in the V1-complete milestone and are the
contract GUI / mobile / AAR-report developers should build against.

### Events audit — extended filters

`GET /api/v1/missions/{mission_id}/events`

Filters (all optional, combinable):

| Param        | Form                                        | Effect                                         |
| ------------ | ------------------------------------------- | ---------------------------------------------- |
| `event_type` | `NFZ_BREACH` or CSV `NFZ_BREACH,ZONE_ENTER` | OR-match on type                               |
| `from_ts`    | ISO-8601                                    | inclusive lower bound                          |
| `to_ts`      | ISO-8601                                    | inclusive upper bound                          |
| `device_id`  | UUID                                        | device the event is tagged to                  |
| `target_uid` | string                                      | drone; matches flat + `payload.uav.target_uid` |
| `zone_id`    | UUID                                        | the zone (for zone-sourced events)             |
| `source`     | `zone-breach` / `rmtp-ingestor` / `ui`      | emitter identity                               |
| `limit`      | 1..1000, default 200                        | page size                                      |
| `offset`     | default 0                                   | page start                                     |

Response header `X-Total-Count` carries the total row count before
limit/offset, so a client can render "showing 50 of 1,243" without
a second call.

### Events audit — counts and types helpers

`GET /api/v1/missions/{mission_id}/events/counts`

Returns `{"counts": [{"event_type": "DETECTED", "count": 1243}, ...]}`.
Respects all filters above except `event_type` itself (grouped-on).

`GET /api/v1/missions/{mission_id}/events/types`

Returns `{"event_types": ["DETECTED", "NFZ_BREACH", ...]}`. Distinct
types that have actually fired in this mission.

### AAR export — streamed CSV + NDJSON

`GET /api/v1/missions/{mission_id}/events.csv`

Streaming CSV. Columns: `ts, event_type, device_id, payload_json`.
Respects all `/events` filters so the export matches the current
admin view.

`GET /api/v1/missions/{mission_id}/events.ndjson`

Streaming NDJSON (one JSON object per line) — for analysts /
downstream pipelines that prefer structured records.

Both return `Content-Disposition: attachment` with a sensible default
filename; auth is the standard `mission:read` gate.

### Zone breaches — events

Emitted by detection-service on drone-in-zone transitions. Payload
shape (all are `mission_events` rows):

```json
{
  "event_type": "NFZ_BREACH",   // or ZONE_ENTER / ZONE_EXIT
  "device_id": null,
  "ts": "2026-04-19T14:32:05Z",
  "payload": {
    "source": "zone-breach",
    "mission_id": "…",
    "target_uid": "dji-1234",
    "target_name": "Hawk-3",
    "zone_id": "…",
    "zone_label": "TL-2",
    "zone_type": "no_fly",
    "uav_lat": 34.12345,
    "uav_lon": -118.54321
  }
}
```

### Zone breaches — active roster

`GET /api/v1/missions/{mission_id}/zone-breaches/active`

Returns the current active-breach list (one row per
`(mission, zone, target)` pair) with server-computed
`dwell_seconds`. Optional `stale_seconds` filters out rows whose
`last_seen_at` is older than N seconds:

```json
[
  {
    "id": "…",
    "mission_id": "…",
    "zone_id": "…",
    "target_uid": "dji-1234",
    "target_name": "Hawk-3",
    "zone_type": "no_fly",
    "zone_label": "TL-2",
    "entered_at": "2026-04-19T14:32:05Z",
    "last_seen_at": "2026-04-19T14:36:22Z",
    "dwell_seconds": 257,
    "last_lat": 34.12345,
    "last_lon": -118.54321
  }
]
```

Internal endpoints (X-Internal-Token) used by detection-service:

- `POST /api/v1/internal/missions/{mid}/zone-breaches/upsert`
- `POST /api/v1/internal/missions/{mid}/zone-breaches/clear`

### Command policies — per-protocol + payload_schema

All single-row routes are scoped on `(protocol, command_type)`:

- `GET /api/v1/policies` — list; optional `?protocol=` filter.
- `GET /api/v1/policies/{protocol}/{command_type}` — single row.
- `POST /api/v1/policies` — body carries `protocol` + `command_type`.
- `PATCH /api/v1/policies/{protocol}/{command_type}`.
- `DELETE /api/v1/policies/{protocol}/{command_type}`.

Row fields: `protocol`, `command_type`, `datatype`,
`required_approvals`, `timeout_seconds`, `auto_send`, `required_roles`,
`description`, `fields_help`, `default_payload`, **`payload_schema`**.

`payload_schema` shape (consumed by the UI's generic `SchemaForm`):

```json
{
  "fields": [
    {"key": "mode", "label": "Mode", "type": "enum_labeled",
     "options": [{"value": 1, "label": "attack"},
                 {"value": 0, "label": "passive"}]},
    {"key": "switch", "label": "Switch", "type": "bool_int"}
  ]
}
```

Supported `type`s: `int`, `int_range` (+ `min`/`max`), `string` (+
`placeholder`), `enum` (flat `options`), `enum_labeled`
(`[{value,label}]`), `bool_int` (checkbox emitting 0/1), `text`.

### Commands — idempotency

`POST /api/v1/commands` accepts an optional `idempotency_key`
(string, max 128 chars). When present, a second POST with the same
`(mission_id, device_id, idempotency_key)` returns the existing row
instead of creating a duplicate.

Operator-issued commands leave the key null (the UI does). V2 ROE
auto-fired commands should set it to something like
`breach_<zone_id>_<target_uid>_<cycle>` so NATS retries and
rule re-fires collapse into a single command row.

### Internal device endpoint — now carries radii + beam widths

`GET /api/v1/internal/devices/by-monitor-id/{monitor_device_id}`
(requires `X-Internal-Token`) now additionally returns the radar's
geometry so the simulator and the edge-connector can track operator
edits in the UI without reading the DB directly:

- `detection_radius_m`
- `jammer_radius_m`
- `detection_beam_deg`
- `jammer_beam_deg`

The simulator polls this endpoint on connect and every 15 seconds
thereafter; a change to a radar's radius in the Devices admin takes
effect on the next sim jam-hit check without restarting the
container. Env variables `JAMMER_RADIUS_M` / `DETECTION_RADIUS_M`
stay as a fallback for offline demos.

### Migration references

| Component       | Revision                     | Adds                                                              |
| --------------- | ---------------------------- | ----------------------------------------------------------------- |
| command-service | `c0ps_per_proto_schema`      | per-`(protocol, command_type)` keying + `payload_schema` column   |
| command-service | `c1id_command_idempotency`   | `idempotency_key` column + partial unique index                   |
| device-service  | `i4br_zone_breach_active`    | `zone_breach_active` table                                        |
| device-service  | `h3bw_beam_widths`           | default beam widths (AS\_2.0G: detection=360°, jammer=30°)        |

---

## V1.2 additions — Command Trace endpoints

These endpoints power the admin Command Trace page and the related
bulk-cleanup workflow. All require a JWT; permissions listed per row.

### `GET /api/v1/commands/{command_id}/responses`

Returns every `CommandResponse` row correlated to this command
(ordered by `received_at` ascending). Use when a command's top-level
`status` alone isn't enough — e.g. a SUCCEEDED row whose payload
carries a warning, or a FAILED row whose `parse_error` you need to
forward to the firmware team.

Permission: `command:read`.

Response: array of

| Field                | Type         | Notes                                              |
| -------------------- | ------------ | -------------------------------------------------- |
| `id`                 | UUID string  | Response row id                                    |
| `command_id`         | UUID string  | Back-reference to the `commands` row               |
| `response_datatype`  | int          | dt from the wire (101, 103, 115, 127, 143, 145, …) |
| `packet_no`          | int          | Per-connection sequence id (matches command)       |
| `monitor_device_id`  | int          | Vendor id of the radar that replied                |
| `payload`            | object       | Parsed response JSON (`result`, `parse_error`, …)  |
| `result`             | string\|null | `SUCCEED` / `FAILURE` lifted from `payload.result` |
| `received_at`        | ISO8601      | When command-service stored the row                |

### `DELETE /api/v1/commands/{command_id}`

Hard-delete one command row. `command_responses` cascade via FK.
Refuses if the row is in-flight (`PENDING_APPROVAL`, `APPROVED`,
`SENT`) with 409 `{error: "command_in_flight", status: "<current>"}`
so a live side effect can't be orphaned. `SENDING` is *not* blocked
— it's the stuck-state bucket and should be deletable (see §24.2 in
FEATURES.md).

Permission: `command:delete` (new in V1.2; seeded to SUPER\_ADMIN).

Response: `{status: "deleted", id: "<uuid>"}`.

### `POST /api/v1/commands/cleanup`

Bulk-delete command rows matching a filter. Always excludes in-flight
statuses, so a cleanup sweep cannot strand a live command.

Permission: `command:delete`.

Body (`application/json`):

| Field                 | Type         | Notes                                                                       |
| --------------------- | ------------ | --------------------------------------------------------------------------- |
| `older_than_minutes`  | int\|null    | Delete rows with `created_at < now - N minutes`                             |
| `status_in`           | string\[\]   | Intersect with the safe-to-delete pool                                      |
| `command_type`        | string\|null | e.g. `TURNTABLE_POINT`                                                      |
| `monitor_device_id`   | int\|null    | Delete only this radar's rows                                               |
| `mission_id`          | UUID\|null   | Delete only this mission's rows                                             |
| `confirm_all`         | bool         | Allow empty-filter purge. Rejected unless true when all other filters null |

Safe-to-delete pool (both endpoints): `SUCCEEDED`, `FAILED`, `TIMEOUT`,
`REJECTED`, `REQUESTED`, `SENDING`. Never touches `PENDING_APPROVAL`,
`APPROVED`, `SENT`.

Response: `{deleted: <count>}`.

Typical payloads:

| Intent                              | Body                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Clear stuck SENDING rows >10m       | `{older_than_minutes: 10, status_in: ["SENDING"]}`                                                     |
| Purge >24h finished rows            | `{older_than_minutes: 1440, status_in: ["SUCCEEDED","TIMEOUT","FAILED","REJECTED"]}`                   |
| Wipe one device's dial-test history | `{command_type: "TURNTABLE_POINT", monitor_device_id: 1}`                                              |
| Purge everything finished           | `{confirm_all: true}`                                                                                  |

Error: 400 `{error: "filter_required"}` when the body has no filter
and `confirm_all != true`.

### New permission

| Code              | Granted to    | Purpose                                              |
| ----------------- | ------------- | ---------------------------------------------------- |
| `command:delete`  | SUPER\_ADMIN  | Per-row delete + bulk cleanup on the Command Trace   |

Upgrade step for existing deployments: auth-service runs
`bootstrap_superadmin` on startup, which upserts the permission
catalogue and grants the new code to SUPER\_ADMIN. Log out and back
in after the auth-service restart so your JWT carries the new
permission.

### New config knobs

| Env                   | Service          | Default | Purpose                                                                                  |
| --------------------- | ---------------- | ------- | ---------------------------------------------------------------------------------------- |
| `SENDING_MAX_SECONDS` | command-service  | 60      | Max time a row may sit in SENDING (no `sent_at`) before the watcher flips it to TIMEOUT  |
| `LOG_FRAMES`          | edge-connector   | false   | When false, commands (dt=100..145) log at INFO and telemetry drops to DEBUG              |

### New events

| Event                 | Payload (key fields)                                            | Trigger                                                                |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `RADAR_GPS_MISSING`   | `monitor_device_id`, `radar_lat`, `radar_lon`, `last_derived_at`| Throttled once/10min per mission\|device when radar reports uav\_lat/lon=0 |
| Command audit `CLEANUP` | `deleted`, `filter`                                           | Emitted by `POST /commands/cleanup`; carries the input body + deleted count |
