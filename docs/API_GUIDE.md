# AeroShield API Guide

> Complete guide for GUI developers, backend integrators, and SOC/SIEM
> engineers who want to build **their own UI or headless integration**
> against AeroShield instead of using the built-in React UI.

**Audience**: anyone building directly against AeroShield's REST, NATS,
or WebSocket surfaces.

**Last updated**: 2026-04-23 (covers V2.2 + V2.2.1 + V2.2.5 + V2.2.6 + V2.2.7 + V2.2.8).

**Related docs** (read these for other concerns — this guide
deliberately does not duplicate them):

- `DEVELOPER_GUIDE.md` — architecture internals, service code layout,
  how to run the stack locally, how to add a new event type.
- `INFRA_GUIDE.md` — deployment, Docker / k8s, environment variables,
  TLS, secret rotation.
- `USER_GUIDE.md` — end-user reference for the built-in React UI.
- `RADAR_OPERATOR_GUIDE.md` — edge bring-up, radar cabling, connection
  mode selection, on-site diagnostics.
- `RELEASE_NOTES_V2.md` — full change log for V2.x.

---

## Table of contents

1. [When to use the API vs the built-in UI](#1-when-to-use-the-api-vs-the-built-in-ui)
2. [Architecture from an integrator's perspective](#2-architecture-from-an-integrators-perspective)
3. [Services and base URLs](#3-services-and-base-urls)
4. [Authentication](#4-authentication)
5. [Common conventions](#5-common-conventions)
6. [REST endpoint reference](#6-rest-endpoint-reference)
    - 6.1 Auth (users, roles, permissions, scopes, me)
    - 6.2 Sites
    - 6.3 Devices
    - 6.4 Missions (create, activate, stop)
    - 6.5 Zones
    - 6.6 Mission features
    - 6.7 Mission events / AAR export
    - 6.8 Active zone breach roster
    - 6.9 Commands (create, list, approve, reject, trace)
    - 6.10 Command policies (per-protocol, payload_schema)
    - 6.11 Protocols / Radar Models
    - 6.12 ROE rules and decisions
    - 6.13 Feature flags (V2.2.1)
    - 6.14 Commander overview (V2 multi-mission rollup)
    - 6.15 Swarms
    - 6.16 Friendly drones
    - 6.17 Diagnostics
    - 6.18 Edge-connector id allocation (V2.2.7) + bootstrap token admin (V2.2.8)
7. [WebSocket endpoints](#7-websocket-endpoints)
8. [NATS topic catalog](#8-nats-topic-catalog)
9. [Permissions reference](#9-permissions-reference)
10. [Mission event types and payload shapes](#10-mission-event-types-and-payload-shapes)
11. [Integration recipes](#11-integration-recipes)
12. [V2.2 / V2.2.1 / V2.2.5–V2.2.8 delta](#12-v22--v221--v225v228-delta)
13. [Rate limits and best practices](#13-rate-limits-and-best-practices)
14. [End-to-end curl walkthrough](#14-end-to-end-curl-walkthrough)

---

## 1. When to use the API vs the built-in UI

AeroShield ships with a full React operator UI (covered in
`USER_GUIDE.md`). It's the right answer for most deployments. This API
guide exists because there are plenty of cases where the built-in UI is
the wrong answer — and you should build your own surface against the
same backend.

### 1.1 Decision table

| You want to…                                                                 | Use       | Why                                                                                                       |
|------------------------------------------------------------------------------|-----------|-----------------------------------------------------------------------------------------------------------|
| Run a mission with a typical operator at a control desk                      | Built-in UI | The React UI already covers it — map, events, commands, zones, AAR. No reason to rebuild it.             |
| Embed AeroShield into an **existing** TAK/C2/ops console                      | API       | The operator already has their primary surface. You want mission events + commands routed into it.      |
| Deliver a **different visual style** or branded UI                            | API       | The built-in UI is themed for dark-room operators. A customer who needs a different palette / layout builds their own. |
| **Headless** integration — SOC, SIEM, ticketing, dispatch                     | API + NATS | No human-facing surface needed. Subscribe to NATS for near-zero-latency events; REST for lookups.      |
| ROE evaluation **without a map** — e.g. scripted range-safety bot              | API       | Hit the ROE endpoints + subscribe to `ROE_DECISION` events. You don't need a GUI at all.                |
| **Custom alert routing** — page a phone, post to Slack, hit PagerDuty         | API + NATS subscribe | Subscribe to `rmtp.device.uav` / `NFZ_BREACH` / `ROE_DECISION` from your own consumer. No polling.|
| Mobile app for a commander on the move                                       | API       | The built-in UI is desktop-first; mobile teams always build their own client against the API.            |
| AAR / compliance reports in the customer's BI stack                          | API (`events.csv` / `events.ndjson`) | Stream exports directly into Snowflake / Splunk / Elastic.                        |
| Pre-mission planning in a GIS tool you already own                           | API       | Draw zones in your GIS; POST them to `/missions/{id}/zones`.                                              |
| Drive a hardware-only kiosk (physical button that fires `JAM_START`)          | API       | One endpoint, one auth header, done.                                                                      |
| Let end-users bring their own phones (BYOD)                                  | API       | You need a thin phone app; the React bundle is too heavy for this.                                        |
| Swap out the drone-tracking UX entirely (e.g. Cesium 3D instead of Leaflet 2D) | API       | Use the WebSocket streams + map FeatureCollection endpoints. The built-in UI is Leaflet-only.            |

### 1.2 What you give up when you leave the built-in UI

- **Coverage overlap visualisation** — the red/yellow/green
  overlap-warning panel is a pure UI concern; the `/overlaps` endpoint
  returns the data but you render it.
- **ROE rule builder** — the built-in UI has a DSL-aware editor
  (`zone_type IN (...)`, `altitude > ...`); against the API you POST a
  rule body directly.
- **Drag-to-move devices** — PATCH `/devices/{id}` handles it server-side
  but you have to wire the drag handles.
- **Free-draw zones** — same story; you send the GeoJSON.
- **Pre-built SchemaForm** for command payloads — the built-in UI reads
  `payload_schema` and renders a form. You can do the same thing
  against the same field.

### 1.3 What you get for free

Everything the backend does is still yours:

- Auth, RBAC, scopes, JWT refresh.
- Mission state machine + activation invariants.
- Friendly-drone lockout.
- Command approval workflow.
- ROE evaluation + auto-response / escalation pipeline.
- NATS fan-out for near-zero-latency event delivery.
- Audit trail and AAR export.
- Coverage overlap computation.
- Timestamp normalisation (UTC with `Z` suffix).

### 1.4 Hybrid pattern (most common)

A lot of customers run both:

- Built-in UI for the range-safety officer at the desk.
- Custom headless consumer that tails NATS / WebSocket and forwards to
  Slack / PagerDuty / SIEM.
- Custom commander dashboard that embeds `/commander/overview` into an
  existing multi-mission ops picture.

The backend does not care how many clients are connected — the three
WebSocket fan-outs and NATS subjects are multi-subscriber by design.

---

## 2. Architecture from an integrator's perspective

You only need to care about three services, one message bus, and
three WebSocket endpoints. Everything else (edge connectors, radar
plugins, simulator, ingestor) is behind the API.

<!--
mermaid
flowchart LR
    subgraph Edge
      R1[Radar + edge-connector]
      R2[Radar + edge-connector]
      SIM[Simulator]
    end
    R1 -- RMTP --> ING[rmtp-ingestor]
    R2 -- RMTP --> ING
    SIM -- RMTP --> ING
    ING -- rmtp.device.* --> NATS[(NATS)]
    NATS --> DET[detection-service]
    NATS --> DEV[device-service :8001]
    NATS --> CMD[command-service :8002]
    DET -- rmtp.roe.action.fire --> CMD
    AUTH[auth-service :8000] <-.JWT verify.-> DEV
    AUTH <-.JWT verify.-> CMD
    DEV -- WebSocket fan-out --> Client[Your UI / integration]
    CMD -- WebSocket fan-out --> Client
    DEV <-- REST --> Client
    CMD <-- REST --> Client
    AUTH <-- REST --> Client
    NATS -. subscribe .- Client
-->

```text
              +----------------+
              |  auth-service  |  :8000  (login, users, roles, scopes)
              +----------------+
                     ^
                     | JWT verify
                     |
+------------+   +----+----+   +----------------+
|  device-   |<--+  NATS   +-->| command-       |
|  service   |   +----+----+   | service        |
|   :8001    |        ^        |   :8002        |
+-----+------+        |        +--------+-------+
      |               |                 |
      |  REST + WS    |  rmtp.*         |  REST + WS
      |               |                 |
      |          +----+----+            |
      |          |   edge  |            |
      |          | plugins |            |
      |          |  (IT4)  |            |
      |          +---------+            |
      v                                 v
   +-------------------------------------------+
   |             Your UI / integration          |
   +-------------------------------------------+
                       ^
                       | NATS subscribe (optional, for low-latency feeds)
                       v
                    +------+
                    | NATS |
                    +------+
```

**Three REST hosts.** Your client talks to `auth-service` for login,
`device-service` for the world-model (missions, devices, zones,
events, friendlies, swarms, ROE, feature flags, commander overview),
and `command-service` for the command pipeline (create, approve,
reject, audit, policies, capabilities).

**Three WebSocket fan-outs**, all mission-scoped:
`/ws/missions/{id}/events`, `/ws/missions/{id}/devices`,
`/ws/missions/{id}/commands`.

**One message bus (NATS).** Optional for pure REST clients. Required
if you want sub-second notifications without polling — `rmtp.device.*`,
`rmtp.cmd.*`, `rmtp.roe.*`.

**Edge plane is invisible.** The simulator, ingestor, and
edge-connector plugins all sit behind NATS. You never talk to them
directly from a UI or a headless integrator. Radar bring-up is a
separate concern documented in `RADAR_OPERATOR_GUIDE.md`.

---

## 3. Services and base URLs

| Service         | Default local URL       | Purpose                                         |
|-----------------|-------------------------|-------------------------------------------------|
| auth-service    | `http://localhost:8000` | Login, users, roles, permissions, scopes.       |
| device-service  | `http://localhost:8001` | Sites, devices, missions, zones, events, ROE, feature flags, WebSockets, friendlies, swarms, commander. |
| command-service | `http://localhost:8002` | Command workflow, policies, capabilities, trace. |

Every REST endpoint is mounted under `/api/v1`. WebSocket endpoints
are mounted at `/ws/...` on the relevant service (see §7).

**In production** the GUI / integrator typically talks to a single
gateway / ingress that routes by service prefix. Whether you split
the three services onto three DNS names or one depends on your
deployment (see `INFRA_GUIDE.md`). Client code in this guide uses
the three-port local layout for clarity.

---

## 4. Authentication

### 4.1 Login

```bash
curl -s -X POST \
  "http://localhost:8000/api/v1/auth/login?username=operator_a&password=<plaintext>" \
  | jq
```

Response:

```jsonc
{
  "access_token": "eyJhbGciOi...",     // HS256 JWT
  "token_type": "bearer",
  "roles": ["OPERATOR"],                // denormalised for client convenience
  "permissions": [                      // denormalised — don't use for gating,
    "device:read",                      // verify against /users/me instead
    "mission:read",
    "command:request",
    "command:read"
  ],
  "scopes": {                          // V2.4.1 — object, not a list
    "global":   false,
    "missions": ["c4d…"],
    "devices":  [],
    "sites":    []
  }
}
```

`401` is returned on bad credentials.

### 4.2 Bearer token usage

Attach the token on every subsequent request:

```text
Authorization: Bearer eyJhbGciOi...
```

The three services share the same signing key, so a token from
`auth-service` is verified locally by `device-service` and
`command-service` without an extra network hop.

### 4.3 Token payload

HS256-signed, claims:

- `sub` — user UUID (string).
- `username` — login name (denormalised for client convenience).
- `roles` — array of role names. Use these client-side to gate menu
  visibility, not for security decisions; the server re-checks
  permissions on every protected route.
- `permissions` — flat array of permission codes (e.g. `device:read`,
  `command:request`).
- `scopes` — **object**, not a list:

  ```jsonc
  {
    "global":   false,
    "missions": ["c4d12345-…", "…"],     // explicit MISSION grants
    "devices":  [],                       // explicit DEVICE grants
    "sites":    ["s1234abcd-…"]           // explicit SITE grants (V2.4.1)
  }
  ```

  Each list holds bare UUIDs. `global: true` is a wildcard — the
  caller bypasses scope filters entirely. `sites` is V2.4.1; older
  tokens omit the key (treat as empty). Server-side, a SITE-scoped
  caller is resolved to the union of missions inside that site at
  request time (`scope_deps.resolve_visible_mission_ids`).
- `exp` — expiry (UNIX seconds).

### 4.4 Token lifetime and refresh pattern

Access tokens are short-lived (default 60 min — see
`AUTH_TOKEN_TTL_SECONDS` in `INFRA_GUIDE.md`). **There is no refresh
token endpoint**; when you get a `401` with an expired `exp`, just
call `/api/v1/auth/login` again with the stored credentials.

Recommended client pattern:

```jsonc
// pseudocode
if (now > exp - 60_seconds) {
  // refresh proactively before it dies mid-request
  token = await login(stored_credentials);
}
```

If you can't store credentials (e.g. browser SPA after password entry),
fall back to prompting the user on `401`. The built-in UI does the
latter.

### 4.5 Password operations (V2.4.1)

Two endpoints — one self-service, one admin-driven. Both go to
`auth-service`.

#### `POST /api/v1/auth/change-password` — self-service

The logged-in user rotates their own password. **Requires
authentication only** — no `user:update` permission needed. The
caller must prove they know the current password before the new one
lands, which defends against drive-by token theft.

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"hunter2", "new_password":"correcthorse-batterystaple"}'
```

Body (`ChangePasswordIn`):

```jsonc
{
  "old_password": "<current plaintext>",
  "new_password": "<new plaintext, 8+ chars>"
}
```

Response on success:

```jsonc
{ "status": "password_changed" }
```

Errors:

- `401 Invalid token` — JWT missing or malformed.
- `401 Invalid credentials` — `old_password` doesn't match. **Same
  shape as login failure** so password-crackers can't use the
  endpoint to enumerate users.
- `400 password_too_short` — `new_password` shorter than the policy
  minimum (8 chars).

The existing JWT stays valid after a successful change — the server
doesn't auto-revoke. The UI's recommended pattern is to issue a fresh
login if it wants the new credentials baked into the active token.

#### `PATCH /api/v1/users/{user_id}` — admin force-reset

An admin resets another user's password. Reuses the existing
user-update endpoint with the V2.4.1 `password` field added.

```bash
curl -s -X PATCH http://localhost:8000/api/v1/users/$TARGET_UID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "temporary-Password!42"}'
```

Permission rules:

- Caller needs `user:update`.
- **Tier-checked**: the target's effective tier must be **strictly
  below** the caller's. Two commanders can't reset each other's
  passwords; a director can reset commanders below them but not other
  directors. See §9.4 for the tier table.

Response is the updated `UserOut`. The target's existing JWTs stay
valid (no auto-revoke); the next login uses the new password.

### 4.6 `X-Internal-Token` (service-to-service)

A handful of endpoints are flagged **internal**. They use a shared
secret instead of JWT:

```text
X-Internal-Token: <INTERNAL_API_TOKEN>
```

**When you use it:**

- You're writing another backend service that talks to device-service
  (e.g. a custom ingestor, a migration script, a batch AAR builder).
- You're writing a CLI that needs to bypass user scopes.

**When you don't:**

- Anything running in a browser. The secret must never ship to a
  browser.
- Anything your operators touch.

**Security model.** The secret is a single, shared HMAC-grade string
stored in `INTERNAL_API_TOKEN` env on every service that might call
each other. Rotating it requires a rolling restart — see
`INFRA_GUIDE.md §Secret rotation`. Unlike JWTs, there is no scope,
no user, no audit `requested_by` — writes hit the DB as the service
itself. For that reason, **avoid internal endpoints in human-facing
integrations** and prefer a JWT with a dedicated service account + a
limited role.

The endpoints available over `X-Internal-Token` are:

- `GET /api/v1/internal/feature-flags[/{key}]`
- `GET /api/v1/internal/missions`
- `GET /api/v1/internal/missions/{mid}/zones`
- `GET /api/v1/internal/devices/{id}`
- `GET /api/v1/internal/devices/by-monitor-id/{monitor_device_id}`
- `GET /api/v1/missions/{mid}/friendlies/internal-active`
- `POST /api/v1/missions/{mid}/events` (event ingest)
- `POST /api/v1/internal/missions/{mid}/swarms` (auto-swarm promote)
- `POST /api/v1/internal/missions/{mid}/zone-breaches/upsert`
- `POST /api/v1/internal/missions/{mid}/zone-breaches/clear`

### 4.7 `EDGE_BOOTSTRAP_TOKEN` (edge-connector self-registration)

One internal route — `POST /api/v1/internal/edge-connector/allocate-id`
(V2.2.7) — accepts a dedicated bearer token instead of
`X-Internal-Token`:

```text
Authorization: Bearer <EDGE_BOOTSTRAP_TOKEN>
```

The separate secret exists because the token ships inside every
edge-connector installer binary + .env bundle that leaves the
office. Leaking it grants the holder one capability only: allocate a
virtual monitor id from a dedicated range. It cannot read missions,
read devices, or fire commands. Rotating `EDGE_BOOTSTRAP_TOKEN` does
not disrupt running edge-connectors (they cache their allocated id
locally; the allocation call runs once per install). See §6.18 for
the endpoint contract.

---

## 5. Common conventions

### 5.1 Content type

`application/json` for both request and response.

### 5.2 Identifiers

All resource IDs are lowercase RFC-4122 UUIDs as strings. `monitor_device_id`
is the vendor's integer id (from `dt=1`) — distinct from the UUID and
used for RMTP routing. Both are stable; the UUID is the primary key.

### 5.3 Timestamps

ISO-8601 with timezone, e.g. `2026-04-18T10:23:45.123Z`.

**V2.2.1 contract change**: every timestamp the API emits is
guaranteed UTC with a `Z` suffix. Clients that used to parse naive
timestamps as local time should no longer need defensive handling.
The pre-V2.2.1 "5h-ago" UI bug on multi-timezone deployments is
fixed at source.

### 5.4 Pagination

Three different conventions live across the codebase — honest
summary:

- **Paginated `{items, total}`** — `/users`, `/commands/{id}/responses`.
- **Flat array** — `/roles`, `/devices`, `/missions/{id}/zones`,
  `/missions/{id}/friendlies`, `/missions/{id}/swarms`.
- **Flat array + `X-Total-Count` header** — `/missions/{id}/events`
  (so a client can show "50 of 1,243" without a second call).

`/events` supports `limit` (default 200, max 1000) and `offset`.
`/users` uses `limit` (default 50, max 200) + `offset`.
`/commands` supports `limit` (default 200, max 1000) and no `offset`
— order is newest-first, so you page by `since_minutes` or by clamping
`limit`.

### 5.5 Filtering

Filters are always query parameters, not request bodies. For
`/events`, `event_type` accepts a CSV (`NFZ_BREACH,ZONE_ENTER`) for
OR-match. `from_ts` / `to_ts` are inclusive ISO-8601. See §6.7.

### 5.6 Error shape

FastAPI's standard:

```jsonc
{ "detail": "human readable message" }
```

For `422` (Pydantic body validation), `detail` is an array of
`{loc, msg, type}` so you can surface errors per field.

### 5.7 Status codes

| Status | Cause                                                   | Typical client handling                                         |
|--------|---------------------------------------------------------|-----------------------------------------------------------------|
| 400    | Validation failure, capability gate, invalid UUID       | Surface `detail` inline on the form field.                      |
| 401    | Missing / invalid / expired JWT                         | Re-login. Clear stored token.                                   |
| 403    | Permission or scope denied                              | Hide the control; show "you don't have access".                 |
| 404    | Resource not found (or not in scope)                    | Show empty state; offer to create.                              |
| 402    | License feature gate (V2.8) — current tier doesn't unlock the feature, OR seat budget exhausted on allocate-id, OR license is in read-only mode | Show "Upgrade required" with the response body's `next_tier` hint. See §6.19 + §12.13. |
| 409    | Duplicate serial, friendly-drone lockout, state conflict | For jam lockout, offer confirm-and-retry with `override_friendly: true`. |
| 422    | Pydantic body validation                                | Parse `detail` array (`[{loc, msg}]`).                           |
| 5xx    | Backend fault                                           | Retry 2–3× with exponential backoff, then show banner.           |

---

## 6. REST endpoint reference

### 6.1 Auth (users, roles, permissions, scopes, me)

#### Users

##### `POST /api/v1/users` — Create user
- Permission: `user:create`.
- Body: `{ "username": "operator_a", "password": "<plaintext>", "roles": ["OPERATOR"] }`.
- Response `201`: `{ id, username, is_active, roles }`.
- `409` on duplicate username.

##### `GET /api/v1/users` — List users
- Permission: `user:read`.
- Query: `q` (substring), `limit` (1–200, default 50), `offset`.
- Response: `{ "items": UserOut[], "total": number }`.

##### `GET /api/v1/users/me` — Current principal
- Permission: any authenticated user.
- Response: `{ sub, roles, permissions, scopes }`. Mirrors the JWT payload.
- **Use for** source-of-truth authorisation in the UI — never trust
  stored role/permission state after the login response.

##### `GET /api/v1/users/{user_id}`
- Permission: `user:read`.
- Response: `UserOut` or `404`.

##### `PATCH /api/v1/users/{user_id}`
- Permission: `user:update`.
- Body (all optional): `{ is_active, password, roles }`.
- Disabling or down-roling `SUPER_ADMIN` is rejected.

##### `DELETE /api/v1/users/{user_id}`
- Permission: `user:delete`.
- Response: `{ "status": "deleted" }`.
- Deleting the last `SUPER_ADMIN` is blocked.

#### Roles

##### `GET /api/v1/roles`
- Permission: `role:read`.
- Response: `[{ id, name, permissions: string[] }]`.

##### `POST /api/v1/roles`
- Permission: `role:create`.
- Body: `{ "name": "ANALYST" }`.
- Response: `{ id, name, permissions: [] }`.

##### `GET /api/v1/roles/{role_id}`
- Permission: `role:read`.

##### `DELETE /api/v1/roles/{role_id}`
- Permission: `role:delete`.
- The four system roles (`SUPER_ADMIN`, `ORG_ADMIN`, `COMMANDER`,
  `OPERATOR`, `AUDITOR`) cannot be deleted.

##### `PUT /api/v1/roles/{role_id}/permissions` — Replace
- Permission: `role:update`.
- Body: `{ "permissions": ["device:read", "mission:read"] }`.
- Non-`SUPER_ADMIN` callers cannot modify `SUPER_ADMIN`.

##### `POST /api/v1/roles/{role_id}/permissions` — Add (idempotent)
- Permission: `role:update`.
- Body: `{ "permissions": ["policy:read"] }`.

#### Permissions

##### `GET /api/v1/permissions`
- Permission: `permission:read`.
- Response: `string[]` — every permission code seeded in the database.
- **Use for** populating the role editor's permission picker.

#### User-role assignments

##### `POST /api/v1/users/{user_id}/roles` — Assign
- Permission: `role:assign`.
- Body: `{ "roles": ["OPERATOR"] }`.
- Response: `{ status: "assigned", roles: string[] }`.
- Idempotent.

##### `DELETE /api/v1/users/{user_id}/roles` — Revoke
- Permission: `role:assign`.
- Body: `{ "roles": ["OPERATOR"] }`.
- Revoking the last `SUPER_ADMIN` role is blocked.

#### Scopes

##### `GET /api/v1/users/{user_id}/scopes`
- Permission: `user:read`.
- Response: `[{ scope_type, resource_id }]`.

##### `POST /api/v1/users/{user_id}/scopes` — Grant
- Permission: `user:update`.
- Body: `{ "scope_type": "MISSION", "resource_id": "<uuid>" }`.
- **Semantics**: `GLOBAL` is exclusive — granting it removes all other
  scopes for the user.

##### `DELETE /api/v1/users/{user_id}/scopes` — Revoke
- Permission: `user:update`.
- Response: `{ "status": "revoked" }` or `{ "status": "revoked_global" }`.

#### Scope types

| Type      | `resource_id` | Meaning                                       |
|-----------|---------------|-----------------------------------------------|
| `GLOBAL`  | `null`        | Full access. Exclusive — removes other scopes.|
| `MISSION` | mission UUID  | Can act on this mission and its devices.      |
| `SITE`    | site UUID     | Can act on devices at this site.              |
| `DEVICE`  | device UUID   | Can act on exactly one device.                |

---

### 6.2 Sites (V2.4.1)

A Site is the AOP perimeter for one location. Every mission has
exactly one parent Site (FK on `missions.site_id`) and the mission's
`border_geojson` is validated to lie inside the parent Site's
`border_geojson` at create time. Multi-row replaces the V2.4.0
singleton `/api/v1/site-boundary` endpoint, which now lives as a
deprecated shim until UI cutover is complete.

#### `SiteCreate` (request body)

```jsonc
{
  "name": "Spiti Valley AOP",
  "border_geojson": {              // GeoJSON Polygon, not lat/lon point
    "type": "Polygon",
    "coordinates": [[
      [78.10, 32.20], [78.30, 32.20],
      [78.30, 32.40], [78.10, 32.40],
      [78.10, 32.20]               // ring must close (first == last)
    ]]
  }
}
```

`name` is required, 1–128 chars. `border_geojson` must be a valid
closed GeoJSON Polygon (shapely-validated server-side; non-polygon or
self-intersecting shapes return `400`).

#### `SiteOut` (response shape)

```jsonc
{
  "id":             "s1234abcd-…",  // UUID, server-issued
  "name":           "Spiti Valley AOP",
  "border_geojson": { /* polygon */ },
  "centre_lat":     32.30,           // server-computed centroid
  "centre_lon":     78.20,           //   from the polygon
  "created_by":     "u9876fedc-…",  // JWT sub at create time
  "created_at":     "2026-04-23T12:00:00Z",
  "updated_at":     "2026-04-23T12:00:00Z"
}
```

`created_by` is server-owned — populated from the JWT `sub` so callers
can't forge ownership. `centre_lat` / `centre_lon` are computed at
write time from the polygon centroid; the client doesn't supply them.

#### Endpoints

##### `POST /api/v1/sites`

Create a new site. Body: `SiteCreate`. Response: `SiteOut` (201).
Permission: `site:create`. **Default-seeded roles with this perm:**
SUPER_ADMIN and DIRECTOR. ORG_ADMIN deliberately does **not** get
site-write — sites are created top-down (by SUPER_ADMIN at install)
or by site-owning Directors (V2.4.1), not by org-admins. The site
router has no additional tier check; the perm gate is the only
authorization. See §9.5 for the full site/mission write matrix.

##### `GET /api/v1/sites`

List sites visible to the caller. Response: `SiteOut[]`. Permission:
`site:read`. **Scope-filtered**: SITE-scoped callers see only their
sites; mission-scoped callers see the parent sites of their missions
via union; `global: true` callers see everything.

##### `GET /api/v1/sites/{site_id}`

Single site. Response: `SiteOut`. Permission: `site:read`. Returns
`404` when the caller's scope doesn't cover the site (same shape as
"doesn't exist" — no scope-leak via 403/404 distinction).

##### `PATCH /api/v1/sites/{site_id}`

Partial update. Body: `SiteUpdate` — any subset of `{ name,
border_geojson }`. Response: `SiteOut`. Permission: `site:update`.

**Containment re-check on polygon update**: when `border_geojson`
changes, the server re-runs containment across every mission already
attached to this site. If any mission polygon would no longer lie
inside the new site polygon, the request is rejected with `409
mission_outside_new_boundary` and a list of offending mission IDs.
Same rule as the V2.4.0 upsert pre-flight.

##### `DELETE /api/v1/sites/{site_id}`

Permission: `site:delete`. **Refuses** when missions still reference
the site (FK-constrained — clear them first or reassign). Devices at
the site are unassigned via the mission cascade, not directly.

---

### 6.3 Devices

Devices are the physical radar/jammer units. `connection_mode`
(server / client / listen, see `RADAR_OPERATOR_GUIDE.md`) is set at
edge-connector bring-up and surfaced back through device state; the
API treats devices uniformly.

##### `POST /api/v1/devices` — Create
- Permission: `device:create`.
- Body (`DeviceCreate`):

```jsonc
{
  "name": "Himalaya Ridge A",
  "serial_number": "AS2G-001",
  "mission_id": null,                    // null = unassigned
  "device_type": "DETECTION",            // DETECTION | JAMMER | DETECTION_JAMMER
  "protocol": "AS_2.0G",                 // must be an enabled Protocol row
  "color": "#22d3ee",                    // #RRGGBB or #RRGGBBAA
  "latitude": 32.246, "longitude": 78.018,
  "status": "UNKNOWN",
  "detection_radius_m": 5000,
  "jammer_radius_m": 2000,
  "breach_green_m": 5000,                // outer warn ring
  "breach_yellow_m": 2500,               // mid ring
  "breach_red_m": 1000,                  // innermost ring
  "detection_beam_deg": 360,
  "jammer_beam_deg": 120
}
```

- Validation: `device_type` ∈ {`DETECTION`, `JAMMER`, `DETECTION_JAMMER`};
  `color` must match hex regex; `protocol` must match
  `^[a-z][a-z0-9\-]{1,62}$`; radii > 0; beams in `(0, 360]`.
- Response: `DeviceOut`.
- `409` on duplicate `serial_number`.

##### `GET /api/v1/devices` — List
- Permission: `device:read`. Scope-filtered.
- Query filters (all optional):

| Name                | Type   | Description                            |
|---------------------|--------|----------------------------------------|
| `mission_id`        | UUID   | Devices assigned to this mission.      |
| `device_type`       | enum   | DETECTION / JAMMER / DETECTION_JAMMER. |
| `status`            | string | e.g. `ONLINE`.                         |
| `protocol`          | string | e.g. `AS_2.0G`.                        |
| `monitor_device_id` | int    | Vendor integer id from dt=1.           |

##### `GET /api/v1/devices/{device_id}`
- Permission: `device:read`. Scope-checked.

##### `PATCH /api/v1/devices/{device_id}`
- Permission: `device:update`. Scope-checked.
- Body: any subset of creatable fields (empty `mission_id` unassigns).
- **Drag-to-move**: this endpoint is what the built-in UI PATCHes when
  an operator drags a radar icon on the map. Your custom UI does the
  same thing — send `{ latitude, longitude }` only.
- **V2.2.4 — `aim_enabled`**: boolean. When `false`, this radar is
  skipped by the ROE dispatcher's `AUTO_AIM` and `AUTO_AIM_AND_JAM`
  picker AND by any operator Aim-at-drone action. `AUTO_JAM` is
  unaffected. Default `true`. Example:
  ```jsonc
  { "aim_enabled": false }
  ```
  Returns the refreshed `DeviceOut` including the new value.

**Example DeviceOut shape (relevant V2.2+ fields):**

```jsonc
{
  "id": "…",
  "name": "Sentinel-02",
  "serial_number": "AS2G-001",
  "mission_id": "c4d…",              // null when unassigned
  "monitor_device_id": 10101,        // V2.4.1 — vendor int id from dt=1.
                                     //   Nullable: edge-connector
                                     //   registrations may issue this
                                     //   lazily on first frame, and
                                     //   direct-radar setups can leave
                                     //   it unset. Surfaced here so
                                     //   cross-service callers (e.g.
                                     //   command-service audit list)
                                     //   can correlate device UUID ↔
                                     //   monitor_device_id without a
                                     //   second round-trip.
  "device_type": "DETECTION_JAMMER",
  "protocol": "AS_2.0G",
  "latitude": 28.559, "longitude": 77.410,
  "status": "online",
  "aim_enabled": true,               // V2.2.4
  "connection_mode": "EDGE_CONNECTOR",
  "strike_band_plan": [ /* … 12 slots … */ ],
  // …
}
```

##### `DELETE /api/v1/devices/{device_id}`
- Permission: `device:delete`.

##### `GET /api/v1/devices/by-monitor-id/{monitor_device_id}`
- Permission: `device:read`.
- Use for smoke tests and linking an auto-registered device back to
  the vendor's `monitor_device_id`.

#### Device state and config

##### `GET /api/v1/devices/{device_id}/state`
- Permission: `device:read`.

```jsonc
{
  "device_id": "…",
  "monitor_device_id": 10101,
  "last_seen": "2026-04-18T10:00:00Z",
  "remote": { "host": "192.168.137.10", "port": 2001 },
  "op_status": 1,
  "azimuth_deg": 214.5,
  "elevation_deg": 3.2,
  "battery_pct": 84,
  "power_mode": "MAINS",            // MAINS | BATTERY
  "temp_c": 21.0,
  "humidity_pct": 38,
  "lon": 78.018, "lat": 32.246, "alt_m": 3600.0,
  "raw_dt1": "…base64…"             // last dt=1 frame, for diagnostics
}
```

##### `GET /api/v1/devices/states/by-mission/{mission_id}`
- Permission: `mission:read` + `device:read`.
- Response: `[{ device_id, state: {...} }]`.

##### `GET /api/v1/devices/{device_id}/config`
- Permission: `device:read`.

```jsonc
{
  "device_id": "…",
  "monitor_device_id": 10101,
  "updated_at": "…",
  "ip_port": { "ip": "192.168.137.10", "port": 2001 },
  "gateway_ip": "192.168.137.1",
  "attack_mode": { "mode": 1, "switch": 0 },
  "band_range": [
    { "enable": 1, "start": 400, "end": 450, "att": 0 }
    // … 12 slots total
  ],
  "turntable_state": { "azimuth_deg": 215 }
}
```

##### `GET /api/v1/devices/configs/by-mission/{mission_id}`
- Permission: `mission:read` + `device:read`.

---

### 6.4 Missions

The mission is the primary workspace. Zones, devices, events, swarms,
friendlies, and ROE rules are all scoped to a mission.

#### Lifecycle states

`DRAFT` → `ACTIVE` (`activate`) → `STOPPED` (`stop`).

Only `ACTIVE` missions fan-out live events on WebSockets and
participate in ROE evaluation.

##### `POST /api/v1/missions`
- Permission: `mission:create`. Body: `{ name, aop?, border_geojson? }`.
- Seeds a default set of zones.
- Response: `MissionOut` with `status = "DRAFT"`.

##### `GET /api/v1/missions`
- Permission: `mission:read`. Scope-filtered.
- Query: `q` (substring on name).

##### `GET /api/v1/missions/{mission_id}`
- Permission: `mission:read`.
- Response: `MissionLoadOut` — full mission, zones, features, and
  devices in one payload.
- Use for initial mission workspace load.

##### `GET /api/v1/missions/{mission_id}/map`
- Permission: `mission:read`.
- Response: `{ mission, zones, devices, features }`. Subset of the
  load endpoint — use when you already have mission metadata cached.

##### `GET /api/v1/missions/{mission_id}/map/features`
- Permission: `mission:read` + `device:read`.
- Response: a single GeoJSON `FeatureCollection` containing zones,
  devices, other features, and the mission border — ready to feed
  straight into Leaflet / Mapbox / Cesium.

##### `PATCH /api/v1/missions/{mission_id}`
- Permission: `mission:update`.
- Body: any of `{ name, aop, border_geojson }`.

##### `DELETE /api/v1/missions/{mission_id}`
- Permission: `mission:delete`.

##### `POST /api/v1/missions/{mission_id}/activate`
- Permission: `mission:update`.
- Effect: transitions to `ACTIVE`, sets `activated_at`, idempotent.
- Response: `MissionOut`.
- **Activation invariants** — the endpoint will refuse activation if:
  - The mission has no border (`border_geojson` is null).
  - There are no devices assigned.
  - Any coverage-overlap warning is `CRITICAL` severity (the UI surfaces
    the `/overlaps` payload as a blocking toast — your integration must
    either call `/overlaps` first or be ready to parse the `400`).

##### `POST /api/v1/missions/{mission_id}/stop`
- Permission: `mission:update`.
- Effect: transitions to `STOPPED`, sets `stopped_at`, idempotent.

##### `GET /api/v1/missions/{mission_id}/overlaps`
- Permission: `mission:read`.

```jsonc
{
  "mission_id": "…",
  "device_count": 3,
  "warning_count": 2,
  "counts": { "CRITICAL": 1, "HIGH": 1, "LOW": 0 },
  "warnings": [
    {
      "severity": "CRITICAL",
      "kind": "jammer_vs_jammer",      // or "detection_vs_detection", etc.
      "device_a_id": "…", "device_a_name": "A",
      "device_b_id": "…", "device_b_name": "B",
      "overlap_radius_m": 500,
      "overlap_area_m2": 1500000
    }
  ]
}
```

- Use for the Coverage panel and the activation-blocker toast.

##### `POST /api/v1/missions/{mission_id}/devices/assign`
- Permission: `mission:assign_assets`.
- Body: `{ "device_ids": ["…", "…"] }`.
- Response: `{ status: "assigned", mission_id, device_ids }`.

##### `GET /api/v1/missions/{mission_id}/devices`
- Permission: `mission:read` + `device:read`.

---

### 6.5 Zones

Zones are polygon/circle/rectangle/free-draw shapes that drive breach
detection and ROE evaluation. `priority` breaks ties when a drone is
inside multiple overlapping zones (higher wins).

##### `POST /api/v1/missions/{mission_id}/zones`
- Permission: `mission:map:update`.

```jsonc
{
  "zone_type": "no_fly",              // detection | defense | jamming | no_fly | restricted | safe
  "device_id": null,                  // null = mission-wide; UUID = zone follows a specific device
  "label": "Palace buffer",
  "priority": 10,                     // higher wins on overlap
  "zone_geojson": {                   // any GeoJSON Geometry the frontend draws:
    "type": "Polygon",                //   Polygon (free-draw or rectangle)
    "coordinates": [                  //   LineString + buffer (rendered as polygon)
      /* GeoJSON ring */
    ]                                 //   Point + radius_m property (circle)
  },
  "action_plan": "Immediate jam on entry",
  "enabled": true
}
```

**`zone_type` picker.** The six values each carry a different
rendering/behaviour contract:

- `detection` — radar surveillance area; drives distance scoring.
- `defense` — owned perimeter; a track here triggers breach ring events.
- `jamming` — where jammers are allowed to fire.
- `no_fly` — operator-flagged NFZ; triggers `NFZ_BREACH`.
- `restricted` — predicted entry triggers `NFZ_BREACH_PREDICTED`.
- `safe` — suppresses alerts inside this polygon.

**Circles and rectangles** are just Polygons in GeoJSON terms. A
circle is typically a 64-vertex polygon approximation buffered to
`radius_m`; a rectangle is a 5-vertex closed ring. The backend does
not care which — it stores whatever GeoJSON Geometry the caller sends.

##### `GET /api/v1/missions/{mission_id}/zones`
- Permission: `mission:read`. Ordered by priority descending.

##### `PATCH /api/v1/missions/{mission_id}/zones/{zone_id}`
- Permission: `mission:map:update`. Any subset of create fields.

##### `DELETE /api/v1/missions/{mission_id}/zones/{zone_id}`
- Permission: `mission:map:update`.

---

### 6.6 Mission features

Custom map decorations (waypoints, arrows, annotations) that you
want persisted with the mission but which do not drive detection or
ROE.

##### `POST /api/v1/missions/{mission_id}/features`
- Permission: `mission:map:update`.
- Body: `{ feature_type, geojson, properties }`.

##### `GET /api/v1/missions/{mission_id}/features`
- Permission: `mission:read`.

##### `DELETE /api/v1/missions/{mission_id}/features/{feature_id}`
- Permission: `mission:map:update`.

---

### 6.7 Mission events (audit timeline)

##### `GET /api/v1/missions/{mission_id}/events` — Paginated, newest-first
- Permission: `mission:read`.
- Query filters (all optional, combinable):

| Param         | Form                                              | Effect                                                 |
|---------------|---------------------------------------------------|--------------------------------------------------------|
| `event_type`  | `NFZ_BREACH` or CSV `NFZ_BREACH,ZONE_ENTER`       | OR-match on event type.                                |
| `from_ts`     | ISO-8601                                          | Inclusive lower bound.                                 |
| `to_ts`       | ISO-8601                                          | Inclusive upper bound.                                 |
| `device_id`   | UUID                                              | Device the event is tagged to.                         |
| `target_uid`  | string                                            | Drone; matches flat + `payload.uav.target_uid`.        |
| `zone_id`     | UUID                                              | Zone (for zone-sourced events).                        |
| `source`      | `zone-breach` / `rmtp-ingestor` / `ui`            | Emitter identity.                                      |
| `limit`       | 1..1000                                           | Page size (default 200).                               |
| `offset`      | int                                               | Page start (default 0).                                |

Response header `X-Total-Count` carries the total row count before
limit/offset (use for "showing 50 of 1,243" without a second call).

Response body (newest-first):

```jsonc
[
  {
    "id": "…",
    "mission_id": "…",
    "device_id": "…" | null,
    "event_type": "DETECTED",
    "ts": "2026-04-18T10:23:45Z",
    "payload": { /* shape depends on event_type — see §10 */ }
  }
]
```

##### `GET /api/v1/missions/{mission_id}/events/counts`
- Permission: `mission:read`.
- Returns `{ "counts": [{"event_type": "DETECTED", "count": 1243}, ...] }`.
- Respects all filters above except `event_type` (grouped-on).

##### `GET /api/v1/missions/{mission_id}/events/types`
- Returns `{ "event_types": ["DETECTED", "NFZ_BREACH", ...] }`.
- Distinct types that have actually fired in this mission.

#### AAR export — streamed CSV + NDJSON

##### `GET /api/v1/missions/{mission_id}/events.csv`
- Permission: `mission:read`.
- Streaming CSV. Columns: `ts, event_type, device_id, payload_json`.
- Respects all `/events` filters so the export matches the current admin view.
- Returns `Content-Disposition: attachment` with a sensible filename.

##### `GET /api/v1/missions/{mission_id}/events.ndjson`
- Permission: `mission:read`.
- Streaming NDJSON (one JSON object per line) — for analysts /
  downstream pipelines that prefer structured records.

#### Operator annotations (write-side of the timeline)

Browsers do not have the `X-Internal-Token`, so this is the route you
use to persist operator-generated timeline entries (track ratings,
NFZ-breach predictions, anything the UI produces that must survive
a reload).

##### `POST /api/v1/missions/{mission_id}/annotations`
- Permission: `mission:update`. Scope-checked.

```jsonc
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

- Effect: inserts a `mission_events` row with the given `event_type`
  and payload. Also broadcasts on the events WebSocket stream so other
  tabs / clients see the annotation live.
- Response: the created event row.

---

### 6.7.1 DVR replay (V2.3 — new)

Two endpoints for the time-scrub replay UI. The paired
`dvr/events` + `dvr/state` shape is deliberate — one returns the
raw chronological stream for forward-play animation, the other
returns a fully-reconstructed snapshot for any single moment.
See `V2_3_MISSION_DVR_DESIGN.md` §4 for the design rationale.

##### `GET /api/v1/missions/{mission_id}/dvr/events`

NDJSON stream of mission_events in a half-open time window.
Used by the UI's playback engine for the forward-play animation
buffer, and by the density-strip fetcher in the scrubber.

- Permission: `mission:read`.
- Query:
  - `from_ts` — ISO timestamp, **inclusive** lower bound.
    Required. Z-suffixed or naive UTC both accepted.
  - `to_ts` — ISO timestamp, **exclusive** upper bound. Required.
    Must be strictly greater than `from_ts`; inverted window
    rejected with `400`.
  - `limit` — 1 to 10 000, default 10 000.
  - `event_type` — CSV list for OR-filtering (e.g.
    `JAM_START,JAM_STOP,NFZ_BREACH`). The density-strip fetcher
    narrows to notable events only; the playback engine passes
    no filter and consumes everything.
  - `device_id`, `target_uid` — scope to a single device / drone.
  - `after_ts` + `after_id` — continuation token from a previous
    page. Pass both or neither. A half-pair is rejected with
    `400`.

Response: `application/x-ndjson`. One JSON object per line.
Final line may be a continuation marker of shape
`{"_continuation": true, "after_ts": "...", "after_id": "..."}`
if the query hit its `limit`.

```jsonc
{"id":"…","ts":"2026-04-19T14:32:05.871000","event_type":"DETECTED","mission_id":"…","device_id":"…","payload":{…}}
{"id":"…","ts":"2026-04-19T14:32:05.923000","event_type":"DETECTED","mission_id":"…","device_id":"…","payload":{…}}
…
{"_continuation":true,"after_ts":"2026-04-19T14:32:11.500000","after_id":"01JBR…"}
```

To page forward, re-fire the same query with `after_ts` +
`after_id` set from the continuation marker. Safe to run
indefinitely — the window is half-open so you'll never double-
count a row across pages.

Errors:

- `400 Invalid datetime: <s>` — `from_ts` or `to_ts` didn't parse.
- `400 Inverted window` — `to_ts <= from_ts`.
- `400 Continuation requires both after_ts and after_id` —
  half-pair paging.
- `404 Mission not found`.

##### `GET /api/v1/missions/{mission_id}/dvr/state`

Reconstructed state snapshot at a single moment. Used by the UI
when the scrubber is paused (every drag fires a debounced fetch)
and as the anchor frame when play starts.

- Permission: `mission:read`.
- Query:
  - `at_ts` — ISO timestamp, the moment to reconstruct. Required.
  - `lookback_s` — aliveness window. Default 30, max 3600.
    Drones not seen within the last `lookback_s` seconds of
    `at_ts` are dropped. Same filter applies to
    active_zone_breaches (breach attributed to a gone drone is
    treated as gone).

Response (truncated example):

```jsonc
{
  "at_ts": "2026-04-19T14:32:05Z",
  "lookback_s": 30,
  "drones": [
    {
      "target_uid": "dji-1234",
      "target_name": "Hawk-3",
      "lat": 34.12345,
      "lon": -118.54321,
      "altitude_m": 120.5,
      "heading_deg": 87.2,
      "speed_m_s": 14.1,
      "rating": "HIGH",
      "confidence": 82,
      "friendly": false,
      "last_seen_ts": "2026-04-19T14:32:04.912000",
      "trail": [
        [34.12000, -118.54500, "2026-04-19T14:31:55"],
        [34.12200, -118.54400, "2026-04-19T14:32:00"]
      ],
      "rc_lat": 34.11987,
      "rc_lon": -118.54600
    }
  ],
  "devices": [
    {
      "device_id": "…",
      "azimuth_deg": 142.0,
      "pitch_deg": 3.5,
      "last_azimuth_ts": "2026-04-19T14:32:05.712000",
      "source": "DEVICE_AZIMUTH"
    }
  ],
  "active_jams": [
    {"device_id": "…", "started_ts": "2026-04-19T14:31:50"}
  ],
  "active_zone_breaches": [
    {
      "zone_id": "…",
      "target_uid": "dji-1234",
      "zone_label": "TL-2",
      "zone_type": "no_fly",
      "entered_ts": "2026-04-19T14:31:58"
    }
  ]
}
```

Shape notes:

- `source` on devices is `DEVICE_AZIMUTH` when a fresh event
  landed, `device_state_fallback` when the snapshot had to read
  from the device_state table (no recent events), or `none` when
  no azimuth data exists for the device in this mission.
- `rc_lat` / `rc_lon` nullable — many radar protocols don't
  report Ground Control Station coords.
- `trail` is `[lat, lon, ts]` triples, newest last. Pre-trimmed
  to 60 s of history so the payload stays bounded.
- `active_zone_breaches` is alive-drone filtered — a breach
  whose target_uid has timed out doesn't appear, preventing the
  unbounded breach drift that early testing hit (ZONE_EXIT
  isn't always emitted for jammed-out drones).

Errors:

- `400 Invalid datetime: <s>` — `at_ts` didn't parse.
- `400 lookback_s must be between 1 and 3600`.
- `404 Mission not found`.

##### Integrator note — timezone handling

Both endpoints accept Z-suffixed (`2026-04-19T14:32:05Z`) or
naive (`2026-04-19T14:32:05`) ISO strings; all are interpreted
as UTC and converted to naive for the `mission_events.ts` column
binding. Do not mix. The UI normalizes every timestamp through a
`parseBackendTs()` helper before sending — external integrators
should pick one and stick with it.

The `ts` values returned inside payloads are naive Python
`isoformat()` strings (no `Z`, microseconds when non-zero).
Treat them as UTC when parsing.

##### Smoke test

```bash
python3 scripts/smoke_dvr.py \
  --base http://127.0.0.1:8001 \
  --auth http://127.0.0.1:8000 \
  --mission-id <mission-uuid>
```

Six stdlib-only checks covering basic fetch, inverted window,
half-pair continuation, paging round-trip, state snapshot, and
oversized lookback rejection. Rebuild device-service (not just
restart) after any backend change — code is baked into the image.

---

### 6.8 Active zone breach roster

Distinct from the `/events` timeline — this is the **current active**
state of every (mission, zone, target) tuple. Use it to drive a "what
is currently breaching my NFZs?" sidebar.

##### `GET /api/v1/missions/{mission_id}/zone-breaches/active`
- Permission: `mission:read`.
- Query: `stale_seconds` (optional) — filters out rows whose
  `last_seen_at` is older than N seconds.

```jsonc
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

Internal routes used by detection-service:

- `POST /api/v1/internal/missions/{mid}/zone-breaches/upsert`
- `POST /api/v1/internal/missions/{mid}/zone-breaches/clear`

---

### 6.9 Commands

#### Lifecycle

```text
PENDING_APPROVAL → SENDING → SENT → SUCCEEDED
                ↘  REJECTED         ↘ FAILED
                                     ↘ TIMEOUT
```

The backend drives transitions from approvals, NATS acks
(`rmtp.cmd.sent`), device replies (`rmtp.cmd.*.response`), and the
timeout sweeper. Your client reacts to the `command_update`
WebSocket stream (see §7) — do not poll `GET /commands/{id}`.

##### `GET /api/v1/commands/capabilities`
- Permission: public.
- Response:

```jsonc
{
  "protocols": {
    "AS_2.0G":    ["JAM_START", "JAM_STOP", "IP_QUERY", /* ... */],
    "json-lines": ["PING", /* ... */]
  }
}
```

- Use for populating the command-type dropdown based on the target
  device's protocol. Call once on app start and cache.

##### `GET /api/v1/commands` — Audit list
- Permission: `command:read`.
- Query (all optional):

| Name            | Type   | Default | Description                                                       |
|-----------------|--------|---------|-------------------------------------------------------------------|
| `mission_id`    | UUID   | —       | Filter by mission.                                                |
| `device_id`     | UUID   | —       | Filter by device.                                                 |
| `requested_by`  | UUID   | —       | Filter by operator UUID (JWT `sub`).                              |
| `status`        | enum   | —       | `PENDING_APPROVAL`, `SENDING`, `SENT`, `SUCCEEDED`, `FAILED`, `TIMEOUT`, `REJECTED`. |
| `command_type`  | string | —       | e.g. `JAM_START`.                                                 |
| `since_minutes` | int    | —       | Rolling window — minutes back from now.                           |
| `limit`         | int    | 200     | 1–1000.                                                           |

Response (newest-first):

```jsonc
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
    "requested_by": "…",                          // user UUID or "ROE"
    "request_payload": { "mode": 1, "switch": 1, "override_friendly": false },
    "idempotency_key": null,                      // see §D below
    "last_error": null,
    "created_at": "…", "sent_at": "…", "completed_at": "…"
  }
]
```

##### `POST /api/v1/commands` — Request a command
- Permission: `command:request`.

```jsonc
{
  "mission_id":    "…",
  "device_id":     "…",
  "command_type":  "JAM_START",
  "payload":       { "mode": 1, "switch": 1, "override_friendly": false },
  "idempotency_key": "breach_<zone_id>_<target_uid>_<cycle>"  // optional
}
```

**Effect** (validation order — first failure returns the error):

1. **Auth** — `command:request` permission + mission scope.
2. **Device lookup** — `404` if unknown. `400` if `monitor_device_id`
   unset or device not bound to the submitted `mission_id`.
3. **Capability gate** — `400 {error:"command_not_supported_by_protocol", supported:[…]}`
   if the device's protocol doesn't support the `command_type`.
4. **Device-role gate** — `400 {error:"command_not_valid_for_device_type", allowed_types:[…]}`
   for JAM-family (`JAM_START`, `JAM_STOP`, `ATTACK_MODE_SET`,
   `ATTACK_MODE_QUERY`) sent to a `DETECTION`-only radar.
5. **Friendly-drone lockout** — `409 {error:"friendly_drone_active", friendlies:[…]}`
   unless `override_friendly: true` is in the payload.
6. **Policy lookup** — loads the `CommandPolicy` row for
   `(protocol, command_type)` to determine `required_approvals`,
   `timeout_seconds`, `auto_send`.
7. **Publish** — either auto-publishes to `rmtp.cmd.{protocol}.send`
   (→ `SENDING`) or queues in `PENDING_APPROVAL`.

Also writes a `COMMAND_REQUESTED` mission_event.

**Idempotency.** If you POST with the same
`(mission_id, device_id, idempotency_key)` as an existing row,
you get the existing row back instead of a duplicate. Max key
length 128. Operator UIs leave the key null. **ROE-auto-fired
commands** should set it to something like
`breach_<zone_id>_<target_uid>_<cycle>` so NATS retries and rule
re-fires collapse into a single row. V2.2 additionally incorporates
`bearing_deg` for `TURNTABLE_POINT` into the idempotency key bucket
(`h<bucket>`) so operator slews don't collapse.

**Response**: `CommandOut` (same shape as audit rows).

##### `POST /api/v1/commands/{command_id}/approve`
- Permission: `command:approve`.
- Body: `{ "reason": "Breach imminent" }` (optional).
- Effect: increments `approved_count`; if threshold reached, publishes
  to NATS and transitions to `SENDING`.
- Response: `{ status: "ok", approved_count, required, command_status }`.

##### `POST /api/v1/commands/{command_id}/reject`
- Permission: `command:approve`.
- Body: `{ "reason": "Friendly in area" }` (required).
- Response: `{ status: "rejected" }`.

#### Command trace (V1.2)

##### `GET /api/v1/commands/{command_id}/responses`
- Permission: `command:read`.
- Returns every `CommandResponse` row correlated to this command
  (ordered by `received_at` ascending). Use when a command's top-level
  `status` alone isn't enough — e.g. a SUCCEEDED row whose payload
  carries a warning, or a FAILED row whose `parse_error` you need to
  forward to the firmware team.

Response: array of

| Field               | Type         | Notes                                              |
|---------------------|--------------|----------------------------------------------------|
| `id`                | UUID string  | Response row id.                                   |
| `command_id`        | UUID string  | Back-reference to the `commands` row.              |
| `response_datatype` | int          | dt from the wire (101, 103, 115, 127, 143, 145, …).|
| `packet_no`         | int          | Per-connection sequence id (matches command).      |
| `monitor_device_id` | int          | Vendor id of the radar that replied.               |
| `payload`           | object       | Parsed response JSON (`result`, `parse_error`, …). |
| `result`            | string\|null | `SUCCEED` / `FAILURE` lifted from `payload.result`.|
| `received_at`       | ISO-8601     | When command-service stored the row.               |

##### `DELETE /api/v1/commands/{command_id}`
- Permission: `command:delete` (seeded to `SUPER_ADMIN`).
- Hard-delete one command row. `command_responses` cascade via FK.
- Refuses if the row is in-flight (`PENDING_APPROVAL`, `APPROVED`,
  `SENT`) with `409 {error: "command_in_flight", status: "<current>"}`.
  `SENDING` is **not** blocked — it is the stuck-state bucket and
  should be deletable.
- Response: `{ status: "deleted", id: "<uuid>" }`.

#### Command payloads by `command_type`

| `command_type`        | Wire dt | Payload shape                                                     | Notes                                                                                   |
|-----------------------|---------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `JAM_START`           | 100     | `{"mode":1,"switch":1}`                                           | Convenience alias; same wire code as `ATTACK_MODE_SET`.                                 |
| `JAM_STOP`            | 100     | `{"mode":1,"switch":0}`                                           | Convenience alias.                                                                      |
| `ATTACK_MODE_SET`     | 100     | `{"mode":1,"switch":1}`                                           | `mode`: 1 = attack, 0 = passive. `switch`: 1 = on, 0 = off.                             |
| `ATTACK_MODE_QUERY`   | 102     | `{}`                                                              | Read jammer mode + on/off state.                                                        |
| `BAND_RANGE_SET`      | 96      | array of 12 `{"enable":0\|1,"start":<mhz>,"end":<mhz>,"att":<db>}` | Replaces the whole 12-slot frequency plan. Disabled slots must still appear.            |
| `BAND_RANGE_QUERY`    | 98      | `{}`                                                              | Read current plan.                                                                      |
| `IP_QUERY`            | 27      | `{}`                                                              | Read device IP + RMTP listen port.                                                      |
| `IP_SET`              | 25      | `{"ip":"<ipv4>","port":<1..65535>}`                               | Changes the radar's network config. Radar will reconnect.                               |
| `GATEWAY_QUERY`       | 54      | `{}`                                                              | Read device gateway IP.                                                                 |
| `TURNTABLE_POINT`     | 144     | `{"azimuth_deg":<0..360>, "bearing_deg": <0..360>?}`              | Slew to a compass bearing. `bearing_deg` (V2.2) is used to bucket the idempotency key.  |
| `TURNTABLE_DIR`       | 142     | `{"direction":"left"\|"right"\|"stop"}`                           | Discrete ±15° jog per click. `stop` releases the manual lock.                           |
| `RESTART`             | 29      | `{}`                                                              | Reboot the radar firmware. ~30 s downtime.                                              |
| `ALARM_HISTORY_QUERY` | 116     | `{}`                                                              | Returns up to 47 recent alarm entries (see dt=117).                                     |
| `PING`                | —       | `{}`                                                              | Generic plugin liveness for `json-lines` radars. Not supported on `AS_2.0G`.            |

**Optional flags** accepted by all `command_type`s:

- `override_friendly: true` — bypass the friendly-drone lockout. Only
  honoured after a first attempt returned `409 friendly_drone_active`;
  the override + the active friendlies are written to the mission
  timeline as part of the `COMMAND_REQUESTED` event.

**datatype labels.** The wire-level `datatype` integer is surfaced on
the `CommandOut` row as `datatype`. The UI presents a human label
(`JAM_START`) and the wire datatype (`100`) side-by-side; do the same
in your client if you care about protocol-level debugging.

---

### 6.10 Command policies (per-protocol + payload_schema)

Policies are keyed on `(protocol, command_type)` (V2+). A JAM_START
on `AS_2.0G` can require two approvals while the same command on
`json-lines` can be auto-sent.

##### `GET /api/v1/policies`
- Permission: `policy:read`.
- Query: `protocol=` (optional).
- Response: `PolicyOut[]`.

##### `GET /api/v1/policies/{protocol}/{command_type}`
- Permission: `policy:read`.

##### `POST /api/v1/policies`
- Permission: `policy:create`.

```jsonc
{
  "protocol":           "AS_2.0G",
  "command_type":       "JAM_START",
  "datatype":           100,
  "required_approvals": 2,                    // 0 == auto-send
  "timeout_seconds":    15,
  "auto_send":          false,
  "required_roles":     ["OPERATOR", "ORG_ADMIN"],
  "description":        "Start active jamming",
  "fields_help":        "Mode 1 = attack; switch 1 = on",
  "default_payload":    { "mode": 1, "switch": 1 },
  "payload_schema":     { /* see below */ }
}
```

**Invariant** (enforced on POST and PATCH):
`required_approvals == 0` iff `auto_send == true`.

##### `PATCH /api/v1/policies/{protocol}/{command_type}`
- Permission: `policy:update`. Same invariant enforced.

##### `DELETE /api/v1/policies/{protocol}/{command_type}`
- Permission: `policy:delete`.

#### `payload_schema` shape

```jsonc
{
  "fields": [
    {
      "key": "mode",
      "label": "Mode",
      "type": "enum_labeled",
      "options": [
        { "value": 1, "label": "attack" },
        { "value": 0, "label": "passive" }
      ]
    },
    { "key": "switch", "label": "Switch", "type": "bool_int" }
  ]
}
```

Supported `type`s:

| `type`         | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `int`          | Plain integer.                                                      |
| `int_range`    | Plus `min` / `max` for slider-style input.                           |
| `string`       | Plus optional `placeholder`.                                         |
| `enum`         | Flat `options` array, e.g. `["left","right","stop"]`.                |
| `enum_labeled` | `[{value, label}]` for mapping ints to display strings.              |
| `bool_int`     | Checkbox emitting `0` / `1`.                                         |
| `text`         | Multi-line text.                                                     |

The built-in UI's `SchemaForm` renders this generically. Your custom
UI can do the same — fetch the policy, iterate `fields`, render
appropriate controls.

---

### 6.11 Protocols / Radar Models

The protocol catalogue is where a new radar model is registered. The
catalogue row is only half of adding a new model — an edge-connector
plugin matching `edge_plugin` must also ship before devices assigned
to the new model actually decode on the wire (see
`DEVELOPER_GUIDE.md §Adding a protocol`).

##### `GET /api/v1/protocols`
- Permission: any authenticated user.

```jsonc
{
  "protocols": [
    {
      "id": "…",
      "name": "AS_2.0G",
      "display_name": "AeroShield 2.0G RMTP",
      "description": "…",
      "edge_plugin": "aeroshield_rmtp",
      "capabilities": ["JAM_START", "JAM_STOP", "IP_QUERY", /* ... */],
      "enabled": true,
      "default_breach_green_m":     5000,
      "default_breach_yellow_m":    2500,
      "default_breach_red_m":       1000,
      "default_detection_beam_deg": 360,
      "default_jammer_beam_deg":    120
    }
  ]
}
```

##### `POST /api/v1/protocols` — Create a radar model
- Permission: `protocol:create` (superadmin-only by default).

```jsonc
{
  "name": "AS_3.0",
  "display_name": "AeroShield 3.0 RMTP",
  "description": "Next-gen phased array; S-band.",
  "edge_plugin": "aeroshield_3_0",
  "capabilities": ["JAM_START", "JAM_STOP", "ATTACK_MODE_SET", "RESTART"],
  "enabled": true,
  "default_breach_green_m":     6000,
  "default_breach_yellow_m":    3000,
  "default_breach_red_m":       1200,
  "default_detection_beam_deg": 360,
  "default_jammer_beam_deg":    120
}
```

- Response `201`: full protocol object.
- `409` if `name` already exists.
- Validation: beam widths in `(0, 360]`; breach radii non-negative.

##### `PATCH /api/v1/protocols/{protocol_id}`
- Permission: `protocol:update`.
- Body: any subset of `{ display_name, description, edge_plugin,
  capabilities, enabled, default_breach_*, default_*_beam_deg }`.
- **Immutable**: `name` cannot be changed — too many downstream
  references (device rows, NATS subjects, command routing).

##### `DELETE /api/v1/protocols/{protocol_id}`
- Permission: `protocol:delete`.
- Response: `204 No Content`.
- `409` if any device still references this model — delete or
  reassign the devices first.

---

### 6.12 ROE rules and decisions (V2)

Rules of Engagement — the auto-response engine. Rules match on drone
/ zone / target attributes and fire actions (jam / aim / escalate
to operator).

#### Rule scope precedence

`DEVICE` > `MISSION` > `SITE` > `GLOBAL`.

For a given evaluation, only the most specific rule that matches is
fired.

#### Rule DSL

Rules use a small JSON-expression DSL in the `where` clause, e.g.

```jsonc
{
  "and": [
    { "eq": ["zone_type", "no_fly"] },
    { "gt": ["altitude_m", 60] },
    { "in": ["target_name", ["DJI Mavic 3", "Autel EVO"]] }
  ]
}
```

See `DEVELOPER_GUIDE.md §ROE DSL` for the complete operator list.

##### `POST /api/v1/roe/rules` — Create a rule
- Permission: `roe:write` (scope = MISSION / SITE / DEVICE), or
  `roe:write:global` (scope = GLOBAL).

```jsonc
{
  "name":        "Auto-JAM on palace NFZ",
  "enabled":     true,
  "priority":    100,
  "scope_type":  "MISSION",            // GLOBAL | SITE | MISSION | DEVICE
  "scope_id":    "<mission-uuid>",      // null for GLOBAL
  "where":       { "eq": ["zone_type", "no_fly"] },
  "action":      "AUTO_JAM",            // AUTO_JAM | AUTO_AIM | AUTO_AIM_AND_JAM
                                        // ESCALATE_TO_OPERATOR | NOTIFY | DENY | SKIP
  "then_payload": {                    // optional — forwarded to fired command
    "mode": 1, "switch": 1, "power_pct": 80
  },
  "reason":      "Palace NFZ auto-response"
}
```

**V2.2 actions added**: `AUTO_AIM`, `AUTO_AIM_AND_JAM`,
`ESCALATE_TO_OPERATOR`. The latter drafts a `PENDING_APPROVAL`
command and fans it out as `rmtp.cmd.approval.requested`.

##### `GET /api/v1/roe/rules`
- Permission: `roe:read`. Scope-filtered.

##### `PATCH /api/v1/roe/rules/{rule_id}`
- Permission: `roe:write`.

##### `DELETE /api/v1/roe/rules/{rule_id}`
- Permission: `roe:write`.

##### `GET /api/v1/roe/decisions` — Audit log (V2.2)
- Permission: `roe:read`.
- Query: `mission_id`, `monitor_id`, `action`, `from_ts`, `to_ts`,
  `limit` (default 200, max 1000), `offset`.
- Mirrors the `ROE_DECISION` mission events with richer filters.

```jsonc
[
  {
    "id": "…",
    "occurred_at": "2026-04-20T11:02:17.412Z",
    "mission_id": "…",
    "monitor_id": "…",
    "rule_id":    "…",
    "action":     "AUTO_JAM",
    "scope":      "MISSION",
    "reason":     "zone_type=no_fly && altitude_m>60",
    "target_uid": "SIM10101-1234",
    "result":     "FIRED"  // FIRED | ESCALATED | SKIPPED | DENIED | NOTIFIED
  }
]
```

---

#### V2.11 — engine walk trace ("Why did this fire?")

V2.11 persists the engine's per-step reasoning alongside every firing row and surfaces it via a single read endpoint that powers the operator-facing trace modal. Three integration points:

##### `GET /api/v1/roe/firings/{firing_id}/trace` — Engine walk trace for one firing
- Permission: `roe:read` (mirrors the firings list).
- No license gate — the auto-fire feature flag (`feature.roe_autofire`) gates *authoring* AUTO_* policies, not *reading* the engine's reasoning for past firings.
- Status codes: `200` always when the firing exists (`trace: dict` for V2.11+ rows, `trace: null` for pre-V2.11 rows where the column was added but the engine that wrote the row didn't populate it); `404` if the firing id is unknown; `400` on malformed UUID.

```jsonc
// 200 OK — V2.11+ firing
{
  "firing_id":   "8d91c989-c743-44fc-b9e2-03de3141b633",
  "policy_id":   "1195b553-4556-4329-9214-5ee9d0dd51b5",
  "policy_name": "global.high-threat-autojam",
  "matched_at":  "2026-04-28T03:14:07.412Z",
  "dry_run":     false,
  "trace": {
    "trace_version": 1,
    "trigger": {
      "target_uid": "SIM10101-1234",
      "mission_id": "…", "device_id": "…",
      "zone_id":    "…", "protocol":  "AS_2.0G"
    },
    "policies_considered": 3,
    "policies_matched":    1,
    "per_policy": [
      {
        "policy_id": "…", "name": "global.high-threat-autojam",
        "scope_type": "GLOBAL", "scope_ref": null,
        "priority": 1000, "then_action": "AUTO_JAM", "dry_run": false,
        "when_expr_match": true,        // true | false | "malformed"
        "reason": "when_expr matched"
      }
      // … one entry per fetched policy
    ],
    "deny_phase": {
      "scope_walked": ["GLOBAL", "PROTOCOL", "DEVICE", "MISSION", "ZONE"],
      "deny_winner":     null,
      "short_circuited": false,
      "reason":          "no DENY rule matched"
    },
    "allow_phase": {
      "scope_walked": ["ZONE", "MISSION", "DEVICE", "PROTOCOL", "GLOBAL"],
      "allow_winner":  "1195b553-…",
      "tiebreak_pool": 1,
      "reason":        "allow winner at GLOBAL: global.high-threat-autojam (tiebreak pool size 1, priority 1000)"
    },
    "cooldown": {
      "target_key":   "target_uid",
      "target_value": "SIM10101-1234",
      "cooldown_s":   60,
      "suppressed":   false
    },
    "final": {
      "action":    "AUTO_JAM",      // RoeAction | "COOLDOWN_SUPPRESSED" | null
      "policy_id": "…",
      "dry_run":   false,
      "reason":    "AUTO_JAM at GLOBAL: global.high-threat-autojam"
    }
  }
}
```

```jsonc
// 200 OK — pre-V2.11 firing (modal renders empty-state)
{
  "firing_id":   "…", "policy_id": "…", "policy_name": "…",
  "matched_at":  "2026-04-15T11:02:17.412Z",
  "dry_run":     false,
  "trace":       null
}
```

The shape is informal (engine is the producer, modal is the consumer) but versioned via `trace_version`. Clients should fall back to a "raw JSON" view if `trace_version > 1` rather than crashing on a partial-shape trace.

##### `GET /api/v1/roe/policies` — operator-list now decorated with last-fired
- Same permission + filters as before.
- Each row in the response now carries two optional V2.11 fields:

```jsonc
{
  "policies": [
    {
      "id": "…", "name": "global.high-threat-autojam",
      "scope_type": "GLOBAL", /* … existing fields … */,

      // V2.11 — both null until the policy fires for the first time.
      // Pair them: when last_fired_at is non-null, last_fired_id always
      // points to the firing row whose matched_at matches.
      "last_fired_at": "2026-04-28T03:14:07.412Z",
      "last_fired_id": "8d91c989-c743-44fc-b9e2-03de3141b633"
    }
  ]
}
```

The same two fields appear on `GET /api/v1/roe/policies/{policy_id}`. They are populated by a single `DISTINCT ON (policy_id) … ORDER BY matched_at DESC` query against the FK-indexed `roe_firings` table — O(N policies) regardless of how many firings each policy has accumulated. **Internal-surface paths (`POST` create, `PATCH` update, `/internal/roe/policies` consumed by detection-service) leave these fields null** since just-created policies haven't fired and the engine doesn't need the decoration.

##### `POST /api/v1/internal/roe/firings` — `walk_trace` optional body field
- Permission: `X-Internal-Token` header (same as before).
- The body now accepts an **optional** `walk_trace: dict` field. detection-service (the canonical caller) populates it on every new firing; pre-V2.11 callers omit it and the server stores `NULL`.

```jsonc
{
  "policy_id":     "…",
  "dry_run":       false,
  "trigger_event": { /* … existing payload … */ },
  "mission_id":    "…",  "device_id": "…",  "target_uid": "…",
  "notes":         "…",

  // V2.11 — optional. Same shape returned by GET /firings/:id/trace.
  // Older detection-service deploys can omit this; device-service
  // stores NULL and the modal renders the empty-state for that row.
  "walk_trace": { /* trace_version, trigger, per_policy, … */ }
}
```

The wire is backward-compat: `Optional[dict] = None` in the Pydantic schema; the HTTP body only carries `walk_trace` when present.

---

### 6.13 Feature flags (V2.2.1)

Runtime knobs you can flip without a redeploy. Covers everything from
event-ingest throttles to experimental UI features.

##### `GET /api/v1/admin/feature-flags`
- Permission: `feature_flag:manage`.
- Response: `[{ key, type, value, default, description }]`.

##### `GET /api/v1/admin/feature-flags/{key}`
- Permission: `feature_flag:manage`.

##### `PATCH /api/v1/admin/feature-flags/{key}`
- Permission: `feature_flag:manage`.
- Body: `{ "value": <T>, "description": "…"? }`.
- Writes immediately (optimistic). All running services re-read at
  their next flag-refresh cycle.

##### `POST /api/v1/admin/feature-flags/{key}/reset`
- Permission: `feature_flag:manage`.
- Resets to seeded default.

##### Internal read (service-to-service)

- `GET /api/v1/internal/feature-flags` (`X-Internal-Token`)
- `GET /api/v1/internal/feature-flags/{key}` (`X-Internal-Token`)

Used by other backend services to avoid each one re-implementing a
DB read.

---

### 6.14 Commander overview (V2 multi-mission rollup)

##### `GET /api/v1/commander/overview`
- Permission: `mission:read`.
- Response: multi-mission rollup — one row per active/recent mission
  with event counts, active-breach counts, device online/offline
  ratios. Drives the Commander View.

```jsonc
{
  "missions": [
    {
      "mission_id":    "…",
      "name":          "Op. Himalaya",
      "status":        "ACTIVE",
      "activated_at":  "…",
      "device_counts": { "online": 6, "offline": 1, "alarm": 0 },
      "active_breaches": 3,
      "events_last_1h": { "DETECTED": 42, "NFZ_BREACH": 4, "JAMMED": 2 }
    }
  ]
}
```

Use for a commander dashboard that fans across every mission the
caller has read-scope on.

---

### 6.15 Swarms

Swarms are clusters of coordinated drones — either operator-tagged
(`source = "operator"`) or detection-service-clustered (`source =
"auto"`). Tagging a drone into a swarm boosts its threat rating
automatically.

##### `POST /api/v1/missions/{mission_id}/swarms` — Operator tag
- Permission: `mission:update`.

```jsonc
{
  "label": "Wave 1",
  "source": "operator",          // "auto" is forced to "operator" on this route
  "severity": "HIGH",
  "approach_bearing_deg": 274,
  "target_uids": ["SIM10101-1234", "SIM10101-5678"],
  "notes": "Approaching from west ridge"
}
```

**Side effect** — for every `target_uid`, a `TRACK_RATED` mission_event
is inserted with `status=CONFIRMED`, `priority=HIGH`,
`rated_by="system:swarm-tag"`. Drone icons recolour immediately.
Operator ratings written later via the map popup still win
(last write wins).

##### `GET /api/v1/missions/{mission_id}/swarms`
- Permission: `mission:read`.
- Query: `include_closed` (default `true`).
- Response: `SwarmOut[]`.

##### `PATCH /api/v1/missions/{mission_id}/swarms/{swarm_id}`
- Permission: `mission:update`.
- Body: any of `{ label, severity, approach_bearing_deg, target_uids,
  notes, closed, closed_reason }`. Setting `closed: true` closes the
  swarm (stamps `closed_at`); `closed: false` reopens.

##### `POST /api/v1/internal/missions/{mission_id}/swarms` — Auto-swarm promote
- Auth: `X-Internal-Token`. Used exclusively by detection-service's
  clustering pass.
- Same body shape; `source` is forced to `"auto"` and `created_by`
  stamped `"system:auto-swarm"`.
- Dedupe: if an active (`closed_at IS NULL`) auto-swarm with the
  exact same sorted `target_uids` already exists for this mission,
  the existing row is returned with `last_seen_at` refreshed.
- Inserts a `SWARM_DETECTED` mission_event (drives the timeline chip
  bar). Also inserts one `TRACK_RATED` per member.
- **Re-detection after close**: if detection-service re-posts after
  the operator closed the previous AUTO swarm, a brand-new row is
  created with a new id. Operators see a new AUTO card within
  `SWARM_REPOST_EVERY_N_TICKS × step_seconds` (default ≈ 20 s).

---

### 6.16 Friendly drones

Marking a drone as friendly prevents jam commands from firing against
it (or the same band) until the friendly is deactivated. Operators
can still force-fire with `override_friendly: true`.

##### `POST /api/v1/missions/{mission_id}/friendlies`
- Permission: `mission:update`.

```jsonc
{
  "target_uid": "MAVIC-0042",
  "label":      "Blue 1",
  "freq_khz":   2400000,
  "notes":      "Call sign: Blue"
}
```

##### `GET /api/v1/missions/{mission_id}/friendlies`
- Permission: `mission:read`.
- Query: `include_inactive` (default `false`).
- Response: `FriendlyOut[]`.

##### `PATCH /api/v1/missions/{mission_id}/friendlies/{friendly_id}`
- Permission: `mission:update`.
- Body: any of `{ label, freq_khz, notes, active }`. `active=false`
  unmarks (stamps `unmarked_at`).

**Lockout semantics on command-service.** When you
`POST /api/v1/commands` for a jam-family command, command-service
calls the internal friendlies route and returns
`409 {error:"friendly_drone_active", friendlies:[…]}` if there's
a match. Your client then offers a "Confirm and override" button
that resubmits with `override_friendly: true`. The override + the
active friendlies are written to the mission timeline as part of
`COMMAND_REQUESTED`.

---

### 6.17 Diagnostics

#### Alarm history

`ALARM_HISTORY_QUERY` is a command (§6.9) that asks the radar for
its last 47 alarm entries. The reply arrives via the command
response stream (`GET /api/v1/commands/{id}/responses`). Use
`payload.alarms[]` from the response row.

#### Attack mode

Current attack mode is in `GET /api/v1/devices/{id}/config →
attack_mode`. Flip it with `command_type=ATTACK_MODE_SET`. Query
it with `ATTACK_MODE_QUERY`.

#### Network config

Device IP / port / gateway are in `GET /api/v1/devices/{id}/config`.
Change with `IP_SET` / `GATEWAY_QUERY` commands.

#### Device health rollup (client-side)

The built-in UI computes a four-level health status from the
`DeviceState` fields. If you're building a custom UI you'll want
the same rule set:

| Status     | Triggers                                                         |
|------------|------------------------------------------------------------------|
| `ONLINE`   | Everything OK.                                                   |
| `DEGRADED` | Heartbeat 30–60 s old, battery 10–25 %, or temperature 70–85 °C. |
| `ALARM`    | Any dt=117 alarm flag, battery < 10 %, or temperature > 85 °C.   |
| `OFFLINE`  | Heartbeat > 60 s old (aligned with `OFFLINE_THRESHOLD_SECONDS`). |

Precedence: `OFFLINE` > `ALARM` > `DEGRADED` > `ONLINE`. The backend
flips `device.status` to `OFFLINE` on the server-side threshold;
everything else is derived from `DeviceState` fields.

#### Health endpoints

Every service exposes:

- `GET /health` — `{ status: "ok" }`.
- `GET /ready` — `{ status: "ready" }` once DB (and NATS, for
  device/command services) connectivity is verified.

Use `/ready` for readiness gates; use `/health` for liveness.

---

### 6.18 Edge-connector id allocation + bootstrap token admin

Three endpoints cover the self-registration flow an edge-connector
performs at first boot, plus the admin surface for rotating the
token that authenticates it.

##### `POST /api/v1/internal/edge-connector/allocate-id` (V2.2.7)

- Internal. Auth: `Authorization: Bearer <EDGE_BOOTSTRAP_TOKEN>`
  (not `X-Internal-Token`; see §4.7).
- Body:

    ```jsonc
    {
      "fingerprint": "…",         // 32-hex-char client-computed hash
                                  // of (hostname, radar_host, radar_port)
      "hostname":    "field-laptop-03",
      "radar_host":  "192.168.1.10"
    }
    ```

- The fingerprint is generated by the edge-connector at startup —
  `sha256(f"{hostname}|{radar_host}|{radar_port}")[:32]` — so the
  same laptop + radar pairing always resolves to the same
  `virtual_monitor_id`. The backend does not regenerate it.
- Response `200`:

    ```jsonc
    {
      "virtual_monitor_id": 1000042,        // allocated from range 1,000,001+
      "allocated_at":       "2026-04-23T09:12:33.410Z",
      "reused":             false           // true on repeat calls (idempotent)
    }
    ```

- `virtual_monitor_id` is drawn from the reserved range `1,000,001+`
  so it cannot collide with vendor-reported `monitor_device_id`
  values (those are 16-bit).
- **Idempotency.** Repeat calls with the same `fingerprint` return
  the already-allocated id with `reused=true`. Safe to retry on
  network flap.
- `401` if the bearer token mismatches the stored bootstrap token.
- `503` if the DB row is empty (migration skipped; see
  `INFRA_GUIDE.md §Admin settings`).

##### `GET /api/v1/admin/system-settings/edge-bootstrap-token` (V2.2.8)

- JWT + permission `bootstrap_token:manage`.
- Response:

    ```jsonc
    {
      "value":      "a1b2c3…",                // 64-hex-char token
      "updated_at": "2026-04-23T09:12:33.410Z"
    }
    ```

- Returns the current token verbatim for the admin UI to copy into
  installer bundles.

##### `POST /api/v1/admin/system-settings/edge-bootstrap-token/rotate` (V2.2.8)

- JWT + permission `bootstrap_token:manage`.
- Rotates the token to a freshly generated `secrets.token_hex(32)`.
- Response: same shape as the `GET` above — new `{value, updated_at}`.
- **Running edge-connectors are unaffected.** They cached their
  allocated `virtual_monitor_id` locally on first install and never
  call the allocation endpoint again. Only installer bundles built
  before the rotation become invalid; rebuild and re-ship.

---

### 6.19 License (V2.8 — commercial readiness)

V2.8 adds Ed25519-signed license keys that gate features and seat counts. Four endpoints, all on **device-service** except where noted. Activation fans out — POSTing to any service's activate endpoint applies the license to all three.

#### `GET /api/v1/license`

Returns the current license state. **No auth required** when called from loopback (used by the install bundle's `/ready` chain). JWT required from remote callers.

```json
{
  "tier": "Pro",
  "source": "file",
  "is_trial": false,
  "is_unlicensed": false,
  "read_only": false,
  "installation_id": "4e1dd125-e9f7-40ea-a1c1-3f10f39fe83c",
  "tenant_id": "0f3a…",
  "tenant_name": "Acme Corp",
  "license_id": "lic_2026_acme_pro_001",
  "issued_at": "2026-04-26T10:00:00Z",
  "expires_at": "2027-04-26T10:00:00Z",
  "max_radars": 32,
  "features": ["feature.dvr", "feature.dvr_full_lifetime", "feature.roe_autofire", "feature.voice_alerts", "feature.retention_archive", "feature.multi_site", "feature.planner"],
  "unknown_features": [],
  "reason": "loaded from /etc/aeroshield/license.txt"
}
```

`source` is one of `file` (real license loaded), `trial` (30-day fallback), `starter_readonly` (trial expired). `read_only=true` puts the install in read-only mode (writes return 402 via `LicenseReadOnlyMiddleware`).

#### `GET /api/v1/license/seats`

Current seat usage. Permission: `license:read`.

```json
{
  "max": 32,
  "used": 7,
  "available": 25,
  "next_tier": "Enterprise"
}
```

`next_tier` is the upgrade target advertised when the seat budget is exhausted; `null` once at Enterprise. The `used` count is a live `SELECT COUNT(*) FROM devices WHERE deleted_at IS NULL`.

#### `POST /api/v1/license/activate`

Verify, write, refresh — fans out to all three services in parallel via `Promise.all` from the UI (or call all three directly from a script). Permission: `license:manage`.

Request:
```json
{
  "license_string": "<base64url(payload)>.<base64url(sig)>"
}
```

Response (per-service status):
```json
{
  "ok": true,
  "license": { /* same shape as GET /api/v1/license */ },
  "services": [
    { "service": "auth",    "ok": true, "status": "activated" },
    { "service": "device",  "ok": true, "status": "activated" },
    { "service": "command", "ok": true, "status": "activated" }
  ]
}
```

Activation hot-reloads `app.state.license` via `refresh_license_state(app)` — no service restart. Failures are typed: `400 license invalid` (bad signature, wrong installation_id, expired, schema mismatch — message in `detail`), `403` (missing `license:manage`), `5xx` (transient).

#### `POST /api/v1/internal/license/refresh`

Internal-only. Re-reads `/etc/aeroshield/license.txt` and updates `app.state.license` without verifying a posted string. Used by the `process_license_activation` fan-out — not normally called from outside. Auth: `X-Internal-Token`.

#### License-related response shapes from other endpoints

When a feature gate fires, the gated endpoint returns `402` with:
```json
{
  "detail": {
    "error": "feature_disabled",
    "feature": "feature.dvr_full_lifetime",
    "current_tier": "Trial",
    "next_tier": "Pro"
  }
}
```

When a seat budget is exhausted (allocate-id endpoint), `402`:
```json
{
  "detail": {
    "error": "seat_budget_exhausted",
    "used": 4,
    "max": 4,
    "next_tier": "Starter"
  }
}
```

When the install is in read-only mode (`license.read_only=true`, e.g. trial expired), every non-GET method on a guarded route returns `402`:
```json
{
  "detail": {
    "error": "license_read_only",
    "tier": "Starter",
    "reason": "trial expired — Starter read-only (trial: -3 day(s) remaining ...)"
  }
}
```

The UI consumes `next_tier` to populate the upgrade-prompt link target; integrators should do the same.

---

## 7. WebSocket endpoints

Three mission-scoped streams, all fan-out:

| URL                                      | Service         | Purpose                      |
|------------------------------------------|-----------------|------------------------------|
| `/ws/missions/{mission_id}/events`       | device-service  | Live mission events.         |
| `/ws/missions/{mission_id}/devices`      | device-service  | Live device state changes.   |
| `/ws/missions/{mission_id}/commands`     | command-service | Live command status changes. |

**Auth.** JWT is passed as a query parameter because browsers cannot
set `Authorization` headers on WebSocket upgrades:

```text
ws://localhost:8001/ws/missions/{mid}/events?token=<jwt>
```

**Frame envelope.** All messages are JSON. Every message carries a
`type` discriminator so a single WS socket can multiplex several
conceptual streams.

### 7.1 `/ws/missions/{mid}/events`

```jsonc
{
  "type": "mission_event",
  "event": {
    "id": "…",
    "event_type": "DETECTED",
    "ts": "2026-04-18T10:23:45Z",
    "payload": { /* shape depends on event_type — see §10 */ },
    "device_id": "…" | null
  }
}
```

**Event types broadcast on this stream** (non-exhaustive):

- `DETECTED` — every `dt=56` drone detection.
- `ZONE_ENTER` / `ZONE_EXIT` / `NFZ_BREACH` — zone-breach pass output.
- `TRACK_RATED` — operator drone ratings + system-generated ratings
  (e.g. `rated_by="system:swarm-tag"`).
- `SWARM_DETECTED` — fired by the internal auto-swarm promote (including
  re-detections).
- `DEVICE_AZIMUTH`, `MISSION_ACTIVATED`, `MISSION_STOPPED`,
  `MISSION_AUTO_JAM_STOP`.
- `ROE_DECISION`, `AUTO_RESPONSE_FIRED`, `AUTO_RESPONSE_ESCALATED`,
  `AUTO_RESPONSE_DENIED`, `AUTO_RESPONSE_SKIPPED`,
  `AUTO_RESPONSE_NOTIFIED`, `AUTO_RESPONSE_VOICE_ALERT`.

**Client behaviour note (swarm rings).** The swarms list itself is
HTTP-polled on a 10 s cadence via `GET /swarms`; the WS only pushes
the *event*, not the new swarm row. The built-in UI uses
`SWARM_DETECTED` as a trigger to immediately re-fetch the swarms
list so halo rings + sidebar cards appear within sub-second instead
of up to 10 s later. Any client that renders swarm membership should
do the same.

### 7.2 `/ws/missions/{mid}/devices`

```jsonc
{ "type": "device_state_update",  "device_id": "…", "monitor_device_id": 10101,
  "status": "ONLINE", "state": { /* DeviceState */ } }

{ "type": "device_online",  "device_id": "…", "monitor_device_id": 10101,
  "name": "Himalaya Ridge A", "last_seen": "2026-04-18T10:00:00Z" }

{ "type": "device_offline", "device_id": "…", "monitor_device_id": 10101 }

{ "type": "device_config_update", "device_id": "…",
  "config": { /* see §6.3 — GET /devices/{id}/config */ } }
```

### 7.3 `/ws/missions/{mid}/commands`

```jsonc
{
  "type": "command_update",
  "command": {
    "id": "…",
    "status": "SENDING",
    "approved_count": 1,
    "required_approvals": 2
  }
}
```

Use for a live command status pill in the operator UI.

### 7.4 Reconnection

There's no explicit ping/pong message defined by the backend; FastAPI's
default WebSocket keepalive applies. If the socket drops, re-open and
replay recent history via `GET /missions/{mid}/events?from_ts=<last_ts>`
to bridge the gap. The built-in UI uses a 2-second exponential-backoff
reconnect with a 30-second cap.

---

## 8. NATS topic catalog

If you want sub-second notifications without the WebSocket stateful
connection, subscribe to NATS directly. This is the recommended
pattern for SOC / SIEM / headless integrators.

### 8.1 Connection

NATS runs in the cluster at the URL configured by `NATS_URL`. See
`INFRA_GUIDE.md §NATS` for cluster setup, NATS TLS, and JWT-based
NATS auth for external subscribers.

Subjects are **not** mission-partitioned — a single subscriber sees
all missions. Filter on `payload.mission_id` client-side.

### 8.2 Topics

| Topic                            | Publisher                                | Subscriber                                       | Payload shape                                                                             |
|----------------------------------|------------------------------------------|--------------------------------------------------|-------------------------------------------------------------------------------------------|
| `rmtp.device.status`             | rmtp-ingestor                            | device-service                                   | Normalised dt=1 heartbeat (`{monitor_device_id, op_status, battery_pct, temp_c, …}`).     |
| `rmtp.device.uav`                | rmtp-ingestor / detection-service        | device-service, detection-service, anyone        | Normalised dt=56 UAV detection (`{monitor_device_id, uav: {target_uid, uav_lat, …}}`).    |
| `rmtp.cmd.{protocol}.send`       | command-service                          | rmtp-ingestor → radar                            | Outbound device command (`{command_id, monitor_device_id, command_type, payload, packet_no}`). |
| `rmtp.cmd.sent`                  | rmtp-ingestor                            | command-service                                  | Transport-level ack (`{command_id, packet_no, sent_at}`).                                 |
| `rmtp.cmd.{protocol}.response`   | rmtp-ingestor                            | command-service                                  | Device reply tied to `packet_no` (`{command_id, response_datatype, payload, result}`).    |
| `rmtp.roe.action.fire`           | detection-service (dispatcher)           | command-service (`roe_fire_consumer`)            | `{monitor_id, action, target_device_id, bearing_deg?, then_payload?, reason, rule_id}`.   |
| `rmtp.roe.decision.recorded`     | detection-service                        | device-service (audit writer)                    | `{monitor_id, action, rule_id, scope, reason}`.                                           |
| `rmtp.cmd.approval.requested`    | command-service (ESCALATE branch)        | UI via WS fan-out                                | `{command_id, monitor_id, suggested_action, created_by: "ROE"}`.                          |

### 8.3 What to subscribe to (integrator cheat sheet)

- **SIEM / SOC, raw detections** — `rmtp.device.uav`. Contains every
  UAV sighting.
- **ROE decision log** — `rmtp.roe.decision.recorded`. Equivalent to
  polling `/roe/decisions` but push-based.
- **Command audit pipeline** — subscribe to `rmtp.cmd.sent` +
  `rmtp.cmd.*.response`. Feed into your compliance stack.
- **Pending approval queue** — `rmtp.cmd.approval.requested`. Drives
  custom approval UIs.
- **Device health** — `rmtp.device.status`. Push to your NOC / paging
  stack.

### 8.4 NATS vs WebSocket — which to use

|                      | NATS                                               | WebSocket                                                 |
|----------------------|----------------------------------------------------|-----------------------------------------------------------|
| Shape                | Subject-per-topic                                  | Multiplexed `{type, ...}` per mission.                    |
| Who can subscribe    | Anything with NATS credentials.                    | JWT-bearing clients only.                                 |
| Filtering            | Wildcards (`rmtp.cmd.*.response`).                 | Mission-scoped by URL.                                    |
| Use case             | Headless integration, SIEM, cross-mission rollups. | Per-mission UI.                                           |
| Auth                 | NATS credentials (separate from JWT).              | JWT query param.                                          |
| Good for             | Multi-tenant fan-out, audit pipeline.              | Browser tabs, single-mission dashboards.                  |

Rule of thumb: if it's a browser, use WebSocket. If it's a backend,
use NATS.

---

## 9. Permissions reference

### 9.1 Code list

| Group            | Codes                                                                                                                                                                             |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| user             | `user:create`, `user:read`, `user:update`, `user:delete`                                                                                                                          |
| role             | `role:create`, `role:read`, `role:update`, `role:delete`, `role:assign`                                                                                                           |
| other IAM        | `permission:read`, `scope:read`, `scope:update`                                                                                                                                   |
| audit            | `audit:read`                                                                                                                                                                      |
| site             | `site:create`, `site:read`, `site:update`, `site:delete`                                                                                                                          |
| site boundary    | `site_boundary:manage` (V2.4.0 — gates create/update/delete on the installation perimeter polygon; GET is open to any authenticated principal)                                    |
| device           | `device:create`, `device:read`, `device:update`, `device:delete`                                                                                                                  |
| protocol         | `protocol:create`, `protocol:read`, `protocol:update`, `protocol:delete`                                                                                                          |
| mission          | `mission:create`, `mission:read`, `mission:update`, `mission:delete`, `mission:assign_assets`, `mission:map:update`, `mission:events:read`                                        |
| command          | `command:request`, `command:approve`, `command:execute`, `command:read`, `command:delete` (V1.2)                                                                                  |
| policy           | `policy:create`, `policy:read`, `policy:update`, `policy:delete`                                                                                                                  |
| ROE (V2.1)       | `roe:read`, `roe:write`, `roe:manage`, `roe:global_override` — four-tier split: read = inspect; write = author / edit at PROTOCOL/DEVICE/MISSION/ZONE scope; manage = promote dry-run, expires_at, delete; global_override = touch the GLOBAL safety floor (SUPER_ADMIN only by default) |
| feature flags    | `feature_flag:manage` (V2.2.1)                                                                                                                                                    |
| bootstrap token  | `bootstrap_token:manage` (V2.2.8)                                                                                                                                                 |
| license (V2.8)   | `license:read` (view tier + seats + features — granted to ORG_ADMIN+, all admin roles), `license:manage` (paste a new license string + activate — SUPER_ADMIN + tier-Owner role)   |

### 9.2 Seeded role grants

Six seeded system roles. Source of truth:
`services/auth-service/app/bootstrap_superadmin.py` —
`BASE_ROLES` dict. The matrix below is generated from that
dictionary; if you change a seed, update the matrix in the same
commit so the doc never lies.

| Permission              | SUPER_ADMIN | ORG_ADMIN | DIRECTOR | COMMANDER | OPERATOR | AUDITOR |
|-------------------------|:-----------:|:---------:|:--------:|:---------:|:--------:|:-------:|
| `user:create`           | yes         | yes       | yes      |           |          |         |
| `user:read`             | yes         | yes       | yes      | yes       |          | yes     |
| `user:update`           | yes         | yes       | yes      | yes       |          |         |
| `user:delete`           | yes         | yes       | yes      |           |          |         |
| `role:read`             | yes         | yes       | yes      | yes       |          | yes     |
| `role:assign`           | yes         | yes       | yes      |           |          |         |
| `role:create/update/delete` | yes     |           |          |           |          |         |
| `permission:read`       | yes         | yes       | yes      |           |          | yes     |
| `scope:read`            | yes         | yes       | yes      | yes       |          | yes     |
| `scope:update`          | yes         | yes       | yes      |           |          |         |
| `audit:read`            | yes         |           |          |           |          | yes     |
| `site:read`             | yes         | yes       | yes      | yes       | yes      | yes     |
| `site:create`           | yes         |           | yes      |           |          |         |
| `site:update`           | yes         |           | yes      |           |          |         |
| `site:delete`           | yes         |           | yes      |           |          |         |
| `site_boundary:manage`  | yes         |           | yes      | yes       |          |         |
| `device:read`           | yes         | yes       | yes      | yes       | yes      | yes     |
| `device:update`         | yes         |           | yes      | yes       |          |         |
| `device:create/delete`  | yes         |           |          |           |          |         |
| `protocol:read`         | yes         | yes       | yes      | yes       | yes      | yes     |
| `protocol:*` (write)    | yes         |           |          |           |          |         |
| `mission:read`          | yes         | yes       | yes      | yes       | yes      | yes     |
| `mission:create`        | yes         |           | yes      | yes       |          |         |
| `mission:update`        | yes         |           | yes      | yes       |          |         |
| `mission:delete`        | yes         |           | yes      |           |          |         |
| `mission:assign_assets` | yes         |           | yes      | yes       |          |         |
| `mission:map:update`    | yes         |           | yes      | yes       |          |         |
| `mission:events:read`   | yes         | yes       | yes      | yes       | yes      | yes     |
| `command:read`          | yes         | yes       | yes      | yes       | yes      | yes     |
| `command:request`       | yes         |           | yes      | yes       | yes      |         |
| `command:approve`       | yes         |           | yes      | yes       |          |         |
| `command:execute`       | yes         |           |          |           |          |         |
| `command:delete`        | yes         |           |          |           |          |         |
| `policy:read`           | yes         | yes       | yes      | yes       |          | yes     |
| `policy:*` (write)      | yes         |           |          |           |          |         |
| `roe:read`              | yes         | yes       | yes      | yes       | yes      | yes     |
| `roe:write`             | yes         |           | yes (non-GLOBAL) | yes (non-GLOBAL) |   |         |
| `roe:manage`            | yes         |           | yes (non-GLOBAL) | yes (non-GLOBAL) |   |         |
| `roe:global_override`   | yes         |           |          |           |          |         |
| `feature_flag:manage`   | yes         | yes       |          |           |          |         |
| `bootstrap_token:manage`| yes         | yes       |          |           |          |         |

**Notes.**
- `command:execute` (direct-fire, bypasses approvals) and
  `command:delete` (audit-row purge) are SUPER_ADMIN-only by default.
  Add explicitly via `/api/v1/roles/{id}/permissions` if a deployment
  wants COMMANDER-tier execute or DIRECTOR-tier delete.
- `roe:global_override` is a SUPER_ADMIN-only permission. The GLOBAL
  safety floor (civil-airspace, friendly-drone, default autojam) sits
  outside even DIRECTOR / COMMANDER reach. See `ROE_ARCHITECTURE.md §5` for
  the 5-scope precedence model.
- `AUDITOR` is read-only across the board; useful for compliance
  accounts that must not be able to write. Notably AUDITOR has
  `audit:read` which **no other role except SUPER_ADMIN gets** — even
  ORG_ADMIN doesn't read the audit log by default.
- `protocol:create/update/delete` is SUPER_ADMIN-only because adding
  a radar model has implications for edge-connector plugin loading
  and command routing. ORG_ADMIN does not get write here.
- ORG_ADMIN is the **deployment-posture** role: full user-management,
  feature flags, bootstrap-token rotation. **Not** an operational
  role — they cannot author missions, create sites, run commands, or
  edit ROE. Treat ORG_ADMIN like a "tenant owner" who provisions
  Directors + Commanders and stays out of tactical work.
- DIRECTOR is the **multi-site** role (V2.4.1). COMMANDER perms +
  full site CRUD + mission delete + full user-management chain.
  ORG_ADMIN's deployment-posture perms (feature_flag, bootstrap
  token) deliberately stay out of DIRECTOR's grant — those are
  org-wide concerns, not site-level.
- COMMANDER (V2.4.1) gained `user:read`, `user:update`, `role:read`,
  `scope:read` so they can manage operators below them. Notably **no**
  `role:assign` or `scope:update` — commanders can edit users in
  their tier but can't grant new roles or scopes. The role-tier
  hierarchy in §9.4 enforces the "below them" part.

### 9.3 Scope vs permission

Permissions say **what** you can do. Scopes say **where**. For a
write to succeed you need both: `mission:update` permission AND a
scope (`scopes.global`, `scopes.missions`, or — V2.4.1 —
`scopes.sites` resolved to the mission's parent site) that covers
the target.

Scope filtering is applied server-side on list endpoints — a scoped
OPERATOR never sees missions outside their scope even without an
explicit filter. SITE-scoped callers are resolved to the union of
missions inside their granted sites at request time
(`scope_deps.resolve_visible_mission_ids` on each service that
needs to filter).

### 9.4 Role-tier hierarchy (V2.4.1)

Permissions answer "can I write?" Scopes answer "where can I write?"
The **tier** answers "**who** can I act on?" The role-tier rule
prevents commanders from resetting each other's passwords, peers
from seeing each other in the user list, and operators from editing
their own roles.

Every role has a numeric tier:

| Role         | Tier |
|--------------|:----:|
| SUPER_ADMIN  | 100  |
| ORG_ADMIN    |  80  |
| DIRECTOR     |  70  |
| COMMANDER    |  60  |
| AUDITOR      |  40  |
| OPERATOR     |  20  |

Source of truth: `services/auth-service/app/core/role_tier.py`. UI
mirror: `ui/aeroshield-ui/src/app/utils/roleTier.ts`. A user's
**effective tier** is the maximum tier across their role grants.

Two strict-greater-than rules govern cross-user actions on every
auth-service write endpoint (`POST /users`, `PATCH /users/{id}`,
`POST /users/{id}/roles`, `DELETE /users/{id}/roles/{rid}`,
`POST /users/{id}/scopes`, etc.):

| Rule              | Comparison                              | What it stops                                      |
|-------------------|-----------------------------------------|----------------------------------------------------|
| `can_see_target`  | caller's tier **>** target's tier       | Two commanders can't see each other in `/users`. Commanders can't see themselves. |
| `can_edit_target` | caller's tier **>** target's tier       | One commander can't reset another commander's password. A director can reset commanders below them but not other directors. |

**Strict, not non-strict.** A SUPER_ADMIN can act on anyone (every
target's tier is below 100). A COMMANDER (60) can see + edit
OPERATORs (20) and AUDITORs (40), but not other COMMANDERs (60),
DIRECTORs (70), or anyone above. The list endpoint also drops the
caller's own row — commanders don't appear in their own user list.

**Role-assign tier check.** When granting a role, the role's tier
must be strictly below the caller's. A COMMANDER can grant OPERATOR
(20 < 60); a DIRECTOR can grant COMMANDER (60 < 70); nobody but
SUPER_ADMIN can grant ORG_ADMIN. This blocks privilege escalation
via role grants.

**HTTP responses.** A blocked write returns `403 forbidden_by_tier`
with `{detail: {error: "tier_violation", reason, caller_tier,
target_tier}}`. Reads (e.g. `GET /users`) return a filtered list —
no error, just fewer rows.

### 9.5 Who can create / modify sites and missions?

The two questions integrators ask first, answered with the seed
defaults. **Permissions can be granted explicitly** via
`/api/v1/roles/{id}/permissions` — the matrix below is just the
bootstrap baseline.

#### Sites (`/api/v1/sites/*`)

| Action     | Permission     | Roles with the perm by default       |
|------------|----------------|--------------------------------------|
| Read       | `site:read`    | every seeded role                    |
| Create     | `site:create`  | **SUPER_ADMIN, DIRECTOR**            |
| Update     | `site:update`  | **SUPER_ADMIN, DIRECTOR**            |
| Delete     | `site:delete`  | **SUPER_ADMIN, DIRECTOR**            |

ORG_ADMIN deliberately does not get site-write — sites map to
physical installations and are owned by the Director(s) running
those installations. The site router has no tier check beyond the
permission gate.

#### Missions (`/api/v1/missions/*`)

| Action          | Permission                | Roles with the perm by default       |
|-----------------|---------------------------|--------------------------------------|
| Read            | `mission:read`            | every seeded role                    |
| Create          | `mission:create`          | SUPER_ADMIN, DIRECTOR, **COMMANDER** |
| Update          | `mission:update`          | SUPER_ADMIN, DIRECTOR, **COMMANDER** |
| Delete          | `mission:delete`          | **SUPER_ADMIN, DIRECTOR**            |
| Assign devices  | `mission:assign_assets`   | SUPER_ADMIN, DIRECTOR, COMMANDER     |
| Edit map shapes | `mission:map:update`      | SUPER_ADMIN, DIRECTOR, COMMANDER     |

A COMMANDER **can** create + edit + run missions but **cannot delete**
them — delete is reserved for DIRECTOR and above. This is
deliberate: a delete cascades to mission_events / commands / etc and
is more consequential than the routine create/update churn a
commander does.

ORG_ADMIN cannot create or edit missions at all — they only read.
If you need an "ops manager" who can run missions, give them
DIRECTOR (which is COMMANDER + user-management) rather than
ORG_ADMIN.

**Scope filter on top.** Even with the permission, the caller's
scope (§9.3) decides which missions they can act on. A
mission-scoped COMMANDER with `mission:update` can only edit the
missions in `scopes.missions`; a site-scoped COMMANDER can edit
every mission inside `scopes.sites`. SUPER_ADMIN's `global: true`
bypasses the filter.

---

## 10. Mission event types and payload shapes

Every mission event is a row in `mission_events` with `{ id,
mission_id, device_id?, event_type, ts, payload }`. Here is the
authoritative payload shape per `event_type`.

### 10.1 Detection events

- `DETECTED` / `UAV_DETECTED`:

```jsonc
{
  "uav": {
    "target_uid":        "…",
    "target_name":       "DJI_Mini3_Pro",
    "uav_lat":           32.246, "uav_lon": 78.018,
    "alt_agl_m":         85,
    "distance_m":        1200,
    "azimuth_deg":       220,
    "freq_khz":          2400000,
    "strength_db":       -48,
    "confidence":        92,

    // V2.2.2 — GCS (remote controller) geolocation, when the radar
    // reports it. (0,0) means "not reported"; some radars always
    // emit (0,0) and surface the GCS as a separate positionless
    // track named "<brand>" / "<brand>_CONTROL" instead.
    "rc_lat":            32.2465,
    "rc_lon":            78.0168,

    // Electronic-ID fields — parsed from every dt=56 frame. Closest
    // thing AS_2.0G carries to a per-contact serial / barcode.
    // Surfaced in the built-in UI's GCS marker tooltip; integrators
    // can use them to distinguish two identically-named contacts.
    "drone_number":        42,           // uint16
    "identify_timestamp":  1714038225    // uint32 (seconds since epoch)
  }
}
```

GCS shadow tracks arrive as their own `DETECTED` events with:
- `target_uid`: `SYN-<monitor_id>-<brand>` or `SYN-<monitor_id>-<brand>_CONTROL`
- `target_uid_synthesised: true`
- `uav_lat` / `uav_lon` = `0` (positionless)
- Otherwise the same shape

A V2.2.2+ UI pairs brand/brand_CONTROL shadows to the positioned
drone of matching brand on the same `monitor_device_id` — same
heuristic your custom UI should apply if you want the single-marker
rendering.

- `JAMMED`: `{ "uav": { "target_uid": "…", "target_name": "…" } }`.
- `THREAT_ESCALATION`: `{ "target_uid", "target_name", "level":
  "HIGH"|"CRITICAL", "score": 0..1, "reasons": ["…"] }`.

### 10.2 Zone breach events

- `NFZ_BREACH_PREDICTED`: `{ "target_uid", "target_name", "head":
  [lat, lon], "n_fixes": 12 }`.
- `BREACH_RING_ENTERED`:

```jsonc
{
  "target_uid":  "…",
  "target_name": "…",
  "ring":        "GREEN" | "YELLOW" | "RED",
  "position":    [lat, lon],
  "radar_id":    "…",                // radar whose ring was breached
  "radar_name":  "Himalaya Ridge B"  // so the operator attributes the alert
}
```

- `BREACH_UNJAMMED_EXIT`: `{ "target_uid", "worst_ring", "resolution":
  "track_ended_without_jam" }`.
- `ZONE_ENTER` / `ZONE_EXIT` / `NFZ_BREACH`:

```jsonc
{
  "source":       "zone-breach",
  "mission_id":   "…",
  "target_uid":   "dji-1234",
  "target_name":  "Hawk-3",
  "zone_id":      "…",
  "zone_label":   "TL-2",
  "zone_type":    "no_fly",
  "uav_lat":      34.12345,
  "uav_lon":      -118.54321
}
```

### 10.3 Command lifecycle events

- `COMMAND_REQUESTED` / `COMMAND_SENT` / `COMMAND_RESPONSE` /
  `COMMAND_REJECTED`: `{ "command_id", "command_type", "status",
  "requested_by", "device_id" }`.

### 10.4 Device lifecycle events

- `DEVICE_OFFLINE`: `{ "device_id", "monitor_device_id", "serial_number",
  "name", "last_seen_age_seconds": 73, "threshold_seconds": 60 }`.
- `DEVICE_ONLINE`: `{ "device_id", "monitor_device_id", "serial_number",
  "name" }`.
- `DEVICE_AZIMUTH`: `{ "device_id", "monitor_device_id", "azimuth_deg":
  215.4, "elevation_deg": 3.2, "delta_deg": 6.1 }`.

### 10.5 Operator-driven events

- `TRACK_RATED`:

```jsonc
{
  "target_uid":  "SIM10101-1234",
  "target_name": "DJI Mavic 3",
  "status":      "CONFIRMED" | "DISMISSED" | "FALSE_POSITIVE" | "UNRATED",
  "priority":    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null,
  "rated_by":    "<user-uuid>" | "system:swarm-tag"
}
```

The UI folds the latest `TRACK_RATED` per `target_uid` to rebuild
the per-mission ratings map on load. `status=UNRATED` with
`priority=null` clears a previous rating.

### 10.6 Swarm events

- `SWARM_DETECTED`:

```jsonc
{
  "source":                "auto" | "operator",
  "swarm_id":              "…",
  "label":                 "Wave 1",
  "severity":              "HIGH",
  "approach_bearing_deg":  274,
  "target_uids":           ["…"],
  "notes":                 "Approaching from west ridge",
  "size":                  2
}
```

### 10.7 ROE events (V2.2)

- `ROE_DECISION` — emitted on every ROE evaluation (even skipped).
- `AUTO_RESPONSE_FIRED` — AUTO_JAM / AUTO_AIM / AUTO_AIM_AND_JAM path.
- `AUTO_RESPONSE_ESCALATED` — ESCALATE_TO_OPERATOR path, carries the
  `command_id` of the `PENDING_APPROVAL` draft.
- `AUTO_RESPONSE_DENIED` / `AUTO_RESPONSE_SKIPPED` /
  `AUTO_RESPONSE_NOTIFIED` / `AUTO_RESPONSE_VOICE_ALERT` — non-firing
  actions.

All follow the standard `MissionEvent` shape (`event_type`, `payload`,
`occurred_at`).

### 10.8 Mission lifecycle events

- `MISSION_ACTIVATED` / `MISSION_STOPPED` / `MISSION_AUTO_JAM_STOP` —
  self-explanatory. Payload carries the mission id and `reason` for
  auto-stop.

---

## 11. Integration recipes

### 11.1 Fire an auto-JAM when a drone crosses my custom NFZ

1. Draw the zone:

    ```bash
    curl -X POST "http://localhost:8001/api/v1/missions/$MID/zones" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{
        "zone_type": "no_fly",
        "label":     "Custom palace buffer",
        "priority":  100,
        "zone_geojson": { "type": "Polygon", "coordinates": [...] },
        "enabled":  true
      }'
    ```

2. Author the ROE rule:

    ```bash
    curl -X POST "http://localhost:8001/api/v1/roe/rules" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{
        "name":       "Auto-JAM on custom palace NFZ",
        "enabled":    true,
        "priority":   100,
        "scope_type": "MISSION",
        "scope_id":   "'$MID'",
        "where":      { "eq": ["zone_type", "no_fly"] },
        "action":     "AUTO_JAM",
        "then_payload": { "mode": 1, "switch": 1 },
        "reason":     "Custom palace NFZ auto-response"
      }'
    ```

3. Nothing else. Detection-service will evaluate on every `dt=56`
   detection; command-service will fire when the rule matches; your
   client sees `AUTO_RESPONSE_FIRED` on the events WebSocket or
   `rmtp.cmd.sent` on NATS.

### 11.2 Subscribe to ZONE_BREACH events

**Via WebSocket** (simplest — per mission):

```text
ws://localhost:8001/ws/missions/$MID/events?token=$TOKEN
```

Filter client-side on `event.event_type IN ("ZONE_ENTER", "ZONE_EXIT", "NFZ_BREACH")`.

**Via NATS** (cross-mission, no JWT):

```text
subject: rmtp.zone.breach          # hypothetical; route currently via events WS
```

Today, zone breaches fan out through the **mission event** path, not
a dedicated NATS subject. Subscribe to the WS events stream, or poll
`GET /missions/{mid}/events?event_type=NFZ_BREACH,ZONE_ENTER,ZONE_EXIT`
with an incrementing `from_ts`.

### 11.3 Build a custom approval UI

1. Poll pending commands (or subscribe to `rmtp.cmd.approval.requested`
   on NATS):

    ```bash
    curl "http://localhost:8002/api/v1/commands?status=PENDING_APPROVAL&limit=50" \
      -H "Authorization: Bearer $TOKEN"
    ```

2. Render one card per command (`command_type`, `requested_by`,
   `approved_count`/`required_approvals`, `request_payload`).

3. On approve:

    ```bash
    curl -X POST "http://localhost:8002/api/v1/commands/$CID/approve" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{ "reason": "Breach imminent" }'
    ```

4. On reject:

    ```bash
    curl -X POST "http://localhost:8002/api/v1/commands/$CID/reject" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{ "reason": "Friendly in area" }'
    ```

5. Subscribe to `/ws/missions/$MID/commands` to get live
   `command_update` messages as the row transitions
   `PENDING_APPROVAL → SENDING → SENT → SUCCEEDED`.

### 11.4 Stream detection frames to my SIEM

Subscribe directly to NATS:

```text
subject: rmtp.device.uav
```

Payload is the normalised dt=56 detection. Your consumer forwards
the JSON body verbatim to Splunk / Elastic / Chronicle. No REST
involvement, no polling — sub-second delivery.

If your SIEM speaks HTTP, wrap the NATS subscriber in a tiny forwarder
service; do not poll `/events` at mission scale (see §13).

### 11.5 Export an AAR CSV

```bash
# All events for the mission:
curl -o aar.csv "http://localhost:8001/api/v1/missions/$MID/events.csv" \
  -H "Authorization: Bearer $TOKEN"

# Narrowed — breaches only, last 24 h:
FROM=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ")
curl -o breaches.csv \
  "http://localhost:8001/api/v1/missions/$MID/events.csv?event_type=NFZ_BREACH,ZONE_ENTER&from_ts=$FROM" \
  -H "Authorization: Bearer $TOKEN"
```

Columns: `ts, event_type, device_id, payload_json`. Streaming — safe
for missions with hundreds of thousands of rows.

For downstream pipelines use `events.ndjson` instead — one JSON
object per line, no CSV escaping ambiguity.

### 11.6 Auto-allocate an id for my custom edge-connector

If you are shipping your own edge-connector binary (instead of the
one in `edge-connector/`) and want it to self-register, call the
allocation endpoint once at startup. The backend will hand back a
`virtual_monitor_id` from the reserved 1,000,001+ range, persist
the mapping keyed on `fingerprint`, and return `reused=true` on
every subsequent call from the same install.

```bash
curl -X POST https://aero.example.com/api/v1/internal/edge-connector/allocate-id \
  -H "Authorization: Bearer $EDGE_BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"<sha256 hex>","hostname":"my-laptop","radar_host":"192.168.1.10"}'
```

Response:

```jsonc
{
  "virtual_monitor_id": 1000042,
  "allocated_at":       "2026-04-23T09:12:33.410Z",
  "reused":             false
}
```

Cache the returned `virtual_monitor_id` to disk (e.g. alongside
your `.env`). On every subsequent boot, read the cached value
first; only re-call the endpoint if the file is missing or
unreadable. That way a rotated `EDGE_BOOTSTRAP_TOKEN` does not
break existing installations.

Compute `fingerprint` as a 32-hex-char prefix of
`sha256(f"{hostname}|{radar_host}|{radar_port}")` — same shape the
shipped edge-connector uses, so the same install always resolves to
the same allocation row even if you ship a different binary later.

---

## 12. V2.2 / V2.2.1 / V2.2.5–V2.2.8 / V2.3 / V2.4.1 delta

Brief summary; full release notes in `RELEASE_NOTES_V2.md`.

### 12.1 New endpoints

| Method  | Path                                       | Service | Auth                           | Purpose                                                                                                        |
|---------|--------------------------------------------|---------|--------------------------------|----------------------------------------------------------------------------------------------------------------|
| `GET`   | `/api/v1/admin/feature-flags`              | device  | JWT + `feature_flag:manage`    | List all flags with key, type, value, default, description.                                                    |
| `GET`   | `/api/v1/admin/feature-flags/{key}`        | device  | JWT + `feature_flag:manage`    | Fetch one flag.                                                                                                |
| `PATCH` | `/api/v1/admin/feature-flags/{key}`        | device  | JWT + `feature_flag:manage`    | Set `value` (and optionally `description`). Optimistic; writes immediately.                                    |
| `POST`  | `/api/v1/admin/feature-flags/{key}/reset`  | device  | JWT + `feature_flag:manage`    | Reset flag to seeded default.                                                                                  |
| `GET`   | `/api/v1/internal/feature-flags`           | device  | `X-Internal-Token`             | Service-to-service read of all flags.                                                                          |
| `GET`   | `/api/v1/internal/feature-flags/{key}`     | device  | `X-Internal-Token`             | Service-to-service read of one flag.                                                                           |
| `POST`  | `/api/v1/roe/rules`                        | device  | JWT + `roe:write`              | Create ROE rule. `action` now includes `AUTO_AIM`, `AUTO_AIM_AND_JAM`, `ESCALATE_TO_OPERATOR`.                 |
| `GET`   | `/api/v1/roe/decisions`                    | device  | JWT + `roe:read`               | Paginated ROE decision log (mirrors `ROE_DECISION` mission events).                                            |
| `GET`   | `/api/v1/commander/overview`               | device  | JWT + `mission:read`           | Multi-mission rollup consumed by the Commander View.                                                            |
| `POST`  | `/api/v1/internal/edge-connector/allocate-id` | device | `Authorization: Bearer <EDGE_BOOTSTRAP_TOKEN>` | V2.2.7 — allocates a `virtual_monitor_id` from the 1,000,001+ range; idempotent on `fingerprint`. |
| `GET`   | `/api/v1/admin/system-settings/edge-bootstrap-token` | device | JWT + `bootstrap_token:manage` | V2.2.8 — read current edge-bootstrap token + `updated_at`.                                       |
| `POST`  | `/api/v1/admin/system-settings/edge-bootstrap-token/rotate` | device | JWT + `bootstrap_token:manage` | V2.2.8 — rotate the edge-bootstrap token. Running edge-connectors are unaffected.               |

### 12.2 Existing endpoints with new payload fields

- **`POST /api/v1/commands`** accepts optional `bearing_deg: float`
  inside the payload for `TURNTABLE_POINT`. When the server sees
  `bearing_deg`, it is incorporated into the idempotency key as
  `h<bucket>` so bearing changes don't collapse into a prior key.
- **`POST /api/v1/roe/rules`** accepts `then_payload: object?`,
  forwarded verbatim to the command that the ROE engine fires.
  Used today for `ATTACK_MODE_SET` after-aim, or to override
  `POWER_PCT` on `JAM_START`.

### 12.3 New NATS topics

| Topic                         | Publisher                         | Subscriber                             | Payload shape                                                                              |
|-------------------------------|-----------------------------------|----------------------------------------|--------------------------------------------------------------------------------------------|
| `rmtp.roe.action.fire`        | detection-service (dispatcher)    | command-service (`roe_fire_consumer`)  | `{monitor_id, action, target_device_id, bearing_deg?, then_payload?, reason, rule_id}`     |
| `rmtp.roe.decision.recorded`  | detection-service                 | device-service (audit writer)          | `{monitor_id, action, rule_id, scope, reason}`                                             |
| `rmtp.cmd.approval.requested` | command-service (ESCALATE branch) | UI via WS fan-out                      | `{command_id, monitor_id, suggested_action, created_by: "ROE"}`                            |

### 12.4 New permissions

| Permission             | Seeded on       | Granted to                                                |
|------------------------|-----------------|-----------------------------------------------------------|
| `roe:read`             | auth bootstrap  | OPERATOR, COMMANDER, ORG_ADMIN, SUPER_ADMIN, AUDITOR      |
| `roe:write`            | auth bootstrap  | COMMANDER (non-GLOBAL), ORG_ADMIN, SUPER_ADMIN            |
| `roe:write:global`     | auth bootstrap  | SUPER_ADMIN only                                          |
| `feature_flag:manage`  | auth bootstrap  | ORG_ADMIN, SUPER_ADMIN                                    |
| `bootstrap_token:manage` | auth bootstrap (V2.2.8) | ORG_ADMIN, SUPER_ADMIN                            |

### 12.5 New mission event types

`ROE_DECISION`, `AUTO_RESPONSE_FIRED`, `AUTO_RESPONSE_ESCALATED`,
`AUTO_RESPONSE_DENIED`, `AUTO_RESPONSE_SKIPPED`,
`AUTO_RESPONSE_NOTIFIED`, `AUTO_RESPONSE_VOICE_ALERT`.

See §10.7 for payload shapes.

### 12.6 Timestamp contract (V2.2.1 tz fix)

As of V2.2.1 every timestamp the API emits is ISO-8601 with a `Z`
suffix (UTC). Clients that parsed naive timestamps as local time
should no longer need defensive handling; the pre-V2.2.1 5h-ago UI
bug on multi-timezone deployments is fixed at source.

### 12.7 V2.2.5 — Monitor-id collision banner

Device-service now flags two devices that share the same
`monitor_device_id` with a UI banner on the Devices admin page and
on the Mission Workspace. No API shape change; the collision detector
reads `GET /api/v1/devices` and compares the integer column
client-side. Custom UIs should apply the same check when rendering
a device list.

### 12.8 V2.2.6 — Edge-connector monitor_device_id virtualization

No external API shape change. For integrators this matters only if
you are writing your own ingestor: dt=1 frames arriving from an
edge-connector already carry the server-allocated
`virtual_monitor_id` in the first 4 bytes of the payload; the
connector rewrites the frame in transit. See
`DEVELOPER_GUIDE.md §12` for the wire-level detail and
`frame_codec.build_frame()` contract.

### 12.9 V2.2.7 — Edge-connector self-registration

`POST /api/v1/internal/edge-connector/allocate-id` (see §6.18).
Allocates from the reserved `1,000,001+` range, idempotent on
fingerprint, authenticated by `EDGE_BOOTSTRAP_TOKEN`.

### 12.10 V2.2.8 — DB-backed bootstrap token + admin surface

`GET` / rotate endpoints for `edge-bootstrap-token` under
`/api/v1/admin/system-settings/…`, plus a new permission
`bootstrap_token:manage` granted to SUPER_ADMIN + ORG_ADMIN. The
source of truth moves from an env var (`EDGE_BOOTSTRAP_TOKEN=…` in
`.env`) to the `system_settings` DB table, auto-seeded at migration
time with `secrets.token_hex(32)`. The backend still accepts the
value over `Authorization: Bearer` on the allocation route (§4.7);
the admin UI is at `/admin/edge-connector-setup` (see
`INFRA_GUIDE.md §Admin settings`).

### 12.11 V2.3 — Mission DVR

Two new endpoints on device-service for replay; full contracts in
§6.7.1 (DVR replay):

- `GET /api/v1/missions/{id}/dvr/events` — NDJSON stream of
  mission_events in `[from_ts, to_ts)` with tuple-continuation
  paging (`after_ts` + `after_id`).
- `GET /api/v1/missions/{id}/dvr/state?at_ts=&lookback_s=` —
  reconstructed snapshot (drones, devices, active jams, active zone
  breaches) at any historical moment.

Backed by a new composite index `(mission_id, ts)` on
`mission_events`. Snapshot reconstruction obeys a `lookback_s`
staleness gate (default 30 s) so DVR replays match LIVE behaviour.

Operator-facing: `?mode=dvr&from_ts=&to_ts=&at_ts=` deep-link on
`/missions/{id}` opens MissionWorkspace directly in DVR with the
scrubber + event-density timeline narrowed to the shared window
(V2.3.4). See `USER_GUIDE.md §4.13` for the operator walkthrough.

Smoke: `scripts/smoke_dvr.py` exercises six cases — basic fetch,
inverted-window rejection, half-pair continuation rejection, paging
round-trip, state snapshot, oversized lookback rejection.

### 12.12 V2.4.1 — Multi-site + RBAC tier hierarchy + password ops

The biggest IAM-shape change since V1. Six things shipped together;
each described in detail above.

**New `/api/v1/sites` CRUD router** (§6.2). Replaces the V2.4.0
singleton `/api/v1/site-boundary` endpoint with a multi-row resource.
Every mission has a parent Site (`missions.site_id` FK), and the
mission's `border_geojson` is server-validated to lie inside the
parent Site's polygon. The V2.4.0 endpoint still works as a
deprecation shim until UI cutover finishes.

**JWT scopes shape changed** (§4.3). The `scopes` claim is now an
**object** — `{global: bool, missions: [], devices: [], sites: []}`
— not the V1.x list of `{scope_type, resource_id}` records. Add
`scopes.sites` is the new V2.4.1 SITE-scope grant; the server
resolves SITE grants to the missions inside those sites at request
time via `scope_deps.resolve_visible_mission_ids`. **Backward-
incompatible** for clients that introspect the JWT claims directly;
clients that only consume the `permissions` array are unaffected.

**Password operations** (§4.5). New `POST /api/v1/auth/change-password`
for self-service rotation (auth-only, no `user:update` needed) and
the existing `PATCH /api/v1/users/{id}` accepts a `password` field
for admin force-reset. Both return early on tier violations (see
§9.4).

**Role-tier hierarchy** (§9.4). Six tiers — SUPER_ADMIN=100,
ORG_ADMIN=80, **DIRECTOR=70 (new)**, COMMANDER=60, AUDITOR=40,
OPERATOR=20 — govern who can see/edit whom on every auth-service
write. Strict greater-than rule: peers can't see or edit each other,
nobody can edit themselves via the admin endpoints. Role-assign
also tier-checked, so privilege escalation via role grants is
blocked.

**`DeviceOut.monitor_device_id`** (§6.3). Was always on the DB row,
finally surfaced in the JSON response. Cross-service callers (most
notably command-service's audit list) now correlate device UUID ↔
`monitor_device_id` from the list endpoint instead of N×
`/devices/by-monitor-id/{...}` round-trips.

**Cross-service header convention.** Internal calls from
command-service to device-service must use header `X-Internal-Token`
(not `X-Internal-Api-Token`). The wrong header silently 401s and
the SITE-scope mission-resolution cache stays empty, which used to
make site-scoped commanders see an empty Command Trace despite
their site having commands. If you're writing a new cross-service
call, follow §4.6 verbatim.

---

### 12.13 V2.8 — Commercial readiness (licensing + binary distribution)

V2.8 ships Ed25519-signed license keys that gate features and seat counts. Integrators that consume the AeroShield API need to handle the new responses cleanly.

**New endpoints** (see §6.19 for full payloads):

| Method | Path                             | Permission                  |
|--------|----------------------------------|-----------------------------|
| GET    | `/api/v1/license`                | none (loopback) / `license:read` (remote) |
| GET    | `/api/v1/license/seats`          | `license:read`              |
| POST   | `/api/v1/license/activate`       | `license:manage`            |
| POST   | `/api/v1/internal/license/refresh` | `X-Internal-Token` only   |

The activate endpoint is mounted on **all three services** (auth, device, command). The UI POSTs to all three in parallel via `Promise.all`; integrators can fan out the same way or POST to just `device-service` and rely on the loader's `process_license_activation` to fan out internally — both produce the same on-disk state.

**New 402 Payment Required response shape**:

Every endpoint guarded by a feature flag, the `LicenseReadOnlyMiddleware`, or seat enforcement returns 402 with one of three `detail.error` values:

- `feature_disabled` — the requested feature isn't in the current license's `features` array. Body includes `feature` + `current_tier` + `next_tier`.
- `seat_budget_exhausted` — fresh allocate-id call hit the `max_radars` cap. Body includes `used` + `max` + `next_tier`. Existing-fingerprint allocates stay free; only NEW allocations count.
- `license_read_only` — the loader returned `read_only=true` (trial expired with no license, or explicit Starter read-only tier). Every non-GET method on a guarded route returns this. Body includes `tier` + `reason`.

Integrators should:

1. Check `error` first; map each to a different in-app prompt. Never lump all 402s together as "upgrade required" — the `seat_budget_exhausted` case is fixable by deleting unused devices, not by upgrading.
2. Use `next_tier` to populate upgrade-prompt links. `null` means already at Enterprise.
3. Cache `GET /api/v1/license` on app start; refresh on every successful `POST /license/activate` and on app foreground (license refreshes hot, no service restart needed).

**New permissions**:

- `license:read` — granted to ORG_ADMIN+ tier roles. Lets the user see the License admin page + call the GET endpoints.
- `license:manage` — SUPER_ADMIN + tier-Owner only. Required to POST `/license/activate`.

**Feature flag list** (string constants — payload's `features` array contains these):

```
feature.dvr                    feature.multi_site
feature.dvr_full_lifetime      feature.planner
feature.roe_autofire           feature.fleet_mgmt    (V3.0)
feature.voice_alerts           feature.ml_inference  (V3.1)
feature.retention_archive      feature.ha_ingestor   (V2.14)
                               feature.audit_export  (V3.2)
```

Each is a free-form string; the loader doesn't validate against an enum. Integrators that want to be future-proof: treat unknown flags as "no opinion" rather than "denied". The license payload's `unknown_features` array surfaces flags the binary doesn't recognise (forward-compat for newer license issuers shipping flags older binaries don't gate on yet).

**Trial mode + Installation ID**:

Fresh installs run in Trial mode (30 days, all features, 4-radar cap) until a license file is activated. The Installation ID is per-install, generated atomically on first boot, and never changes — minted licenses are bound to it. `GET /api/v1/license` returns it as `installation_id`. Integrators that script license rollout should read this once and cache it.

See `LICENSING.md` for the operator + dev workflows; `RELEASE_NOTES_V2.md §V2.8` for the sub-phase changelog; `services/shared/aeroshield_shared/license/{loader,gates}.py` for the authoritative implementation.

---

## 13. Rate limits and best practices

### 13.1 Rate limits

Backend services **do not** enforce per-client rate limits today. In
production, a gateway / WAF in front of the three services applies
per-IP throttling (see `INFRA_GUIDE.md §Gateway`). Assume:

- Soft cap: ~50 req/s per client on the REST surface.
- Hard cap: whatever your gateway enforces (typically 200 req/s).
- NATS subscribers: no cap, but fair-queue on the subscriber side
  to avoid lagging the producer.

### 13.2 Don't poll what you can subscribe to

**Anti-pattern** — polling `GET /missions/{id}/events` on a 1-second
timer. This is O(missions × clients × 1Hz) against the DB and blows
out quickly.

**Pattern** — open `/ws/missions/{id}/events`, replay with `from_ts`
on reconnect. Or subscribe to NATS `rmtp.device.uav` +
`rmtp.roe.decision.recorded` if you need cross-mission data.

### 13.3 Idempotency keys are cheap

Always set `idempotency_key` on auto-fired commands (ROE, custom
rule engines, retry loops). The partial unique index on
`(mission_id, device_id, idempotency_key)` makes "at-least-once
dispatcher + exactly-one command row" trivial.

### 13.4 Cache `/capabilities` and `/protocols`

These change only when an admin updates a radar-model catalogue
row, and the built-in UI caches them for the session. A long cache
TTL (e.g. 5 min with manual invalidation) is safe in custom clients
too.

### 13.5 Gate all writes client-side on `GET /users/me`

Don't trust the `permissions` array in the login response
indefinitely — a role change at the server doesn't revoke an
existing JWT. Re-fetch `/users/me` whenever the UI becomes
foreground or on a 5-minute timer.

### 13.6 Handle `409 friendly_drone_active` specifically

The friendly-drone lockout is a soft gate designed for operator
confirmation. Your UI should surface the returned `friendlies`
array and offer a "Confirm and override" button that POSTs the same
command body plus `override_friendly: true`.

### 13.7 Scope-filter on the client too

Even though the backend scope-filters list responses, your UI
should defensively filter to avoid rendering stale rows after a
scope change. Example: after `DELETE /users/{me}/scopes` the server
immediately restricts subsequent reads, but any in-flight page
render of the old list should be reconciled.

### 13.8 WebSocket reconnect gap

Use `from_ts` = "last event seen" to replay via `/events` on
reconnect. Do NOT rely on the WS alone to have delivered every
event — the stream is **best-effort**, not a durable queue.

---

## 14. End-to-end curl walkthrough

A full login-to-jam walkthrough you can paste into a shell.

```bash
# 1. Log in
TOKEN=$(curl -s -X POST \
  "http://localhost:8000/api/v1/auth/login?username=superadmin&password=driif123!@%23" \
  | jq -r .access_token)

echo "Token: $TOKEN"

# 2. List missions (scope-filtered)
curl -s http://localhost:8001/api/v1/missions \
  -H "Authorization: Bearer $TOKEN" | jq '.'

MID="<mission-uuid>"    # paste one from the list

# 3. Load full mission workspace data (mission + zones + features + devices)
curl -s http://localhost:8001/api/v1/missions/$MID \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 4. Activate the mission (sets status=ACTIVE, fails on CRITICAL overlaps)
curl -s -X POST http://localhost:8001/api/v1/missions/$MID/activate \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Pick a device assigned to it
DID=$(curl -s "http://localhost:8001/api/v1/missions/$MID/devices" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
echo "Device: $DID"

# 6. Subscribe to events (wscat required — npm i -g wscat)
wscat -c "ws://localhost:8001/ws/missions/$MID/events?token=$TOKEN" &

# 7. Request a jam command (will need approval if policy requires it)
CID=$(curl -s -X POST http://localhost:8002/api/v1/commands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mission_id": "'$MID'",
    "device_id":  "'$DID'",
    "command_type": "JAM_START",
    "payload":    { "mode": 1, "switch": 1 }
  }' | jq -r .id)
echo "Command: $CID"

# 8. Approve it (if required_approvals > 0)
curl -s -X POST "http://localhost:8002/api/v1/commands/$CID/approve" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "reason": "Breach imminent" }' | jq '.'

# 9. Inspect responses (after the radar replies)
curl -s "http://localhost:8002/api/v1/commands/$CID/responses" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 10. Audit recent commands for this mission
curl -s "http://localhost:8002/api/v1/commands?mission_id=$MID&since_minutes=60&limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 11. Export the AAR CSV for the whole mission
curl -o aar.csv "http://localhost:8001/api/v1/missions/$MID/events.csv" \
  -H "Authorization: Bearer $TOKEN"
echo "Wrote aar.csv ($(wc -l < aar.csv) rows)"

# 12. Stop the mission
curl -s -X POST "http://localhost:8001/api/v1/missions/$MID/stop" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Further reading**

- `DEVELOPER_GUIDE.md` — how the backend is wired, how to add an
  event type, ROE DSL reference, NATS internals.
- `INFRA_GUIDE.md` — deployment, TLS, NATS auth for external
  subscribers, secret rotation.
- `USER_GUIDE.md` — what the built-in React UI does (read if you're
  implementing a UI and want parity).
- `RADAR_OPERATOR_GUIDE.md` — radar / edge-connector bring-up.
- `RELEASE_NOTES_V2.md` — full change log.

---

## Edge-Bundle Generator (V2.9)

The edge-bundle endpoints mint a per-radar turnkey zip containing the
edge-connector binary, a fully pre-baked `.env`, and the install
scripts. The flow replaces V2.2.x's "edit the .env on-site, paste the
bootstrap token, configure systemd" with one extract + one installer
invocation.

### Permissions

| Permission | Granted by default to | Gates |
|---|---|---|
| `edge_bundle:create` | SUPER_ADMIN, ORG_ADMIN | `POST /api/v1/admin/edge-bundle` |
| `edge_bundle:list` | SUPER_ADMIN, ORG_ADMIN | `GET  /api/v1/admin/edge-bundle/tokens` |
| `edge_bundle:revoke` | SUPER_ADMIN, ORG_ADMIN | `DELETE /api/v1/admin/edge-bundle/tokens/{id}` |
| `edge_bundle:purge` | SUPER_ADMIN, ORG_ADMIN | `DELETE /api/v1/admin/edge-bundle/tokens/{id}/purge` (V2.9.2+) |

The split between `revoke` (soft-delete; sets `revoked_at`) and
`purge` (hard-delete; removes the row) is deliberate. A read-only
support tier can be granted `list` without either of the others.

### POST /api/v1/admin/edge-bundle

Mint a new bundle for one radar. Two response modes via `?format=`:

| `?format` | Returns | Used by |
|---|---|---|
| `zip` (default) | `application/zip` body, browser triggers Save | Admin GUI |
| `json` | small JSON summary (includes the secret token) | Tests, CLI |

**Request body** (V2.9.3 fields marked):

```json
{
  "name": "Bastion-North-1",
  "serial_number": "RDR-001",
  "protocol": "AS_2.0G",
  "device_type": "DETECTION",
  "radar_ip": "192.168.1.50",
  "radar_port": 9001,
  "cloud_url": "tcp://aeroshield.customer.com:9000",
  "latitude": 31.5,
  "longitude": 78.2,
  "expires_at": null,
  "site_id": null,
  "target_os": "linux",
  "environment_label": "production"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Human-readable. Stored on the Device row. |
| `serial_number` | no | Optional from V2.9.1. Blank → auto-assigns `EDGE-<8hex>`. |
| `protocol` | yes | Must match a row in `protocols` table (e.g. `AS_2.0G`, `D20`). |
| `device_type` | no | DETECTION / JAMMER / DETECTION_JAMMER. Default DETECTION. |
| `radar_ip` | yes | LAN-side address the field laptop dials. |
| `radar_port` | no | Default 9001. |
| `cloud_url` | yes | Cloud ingestor TCP/9000 endpoint. |
| `latitude` / `longitude` | no | Default 0/0. Operator can update later. |
| `expires_at` | no | Optional UTC datetime. Default NULL = no expiry. |
| `site_id` | no | UUID of a site for filtering / audit. |
| `target_os` | no (V2.9.3+) | `linux` (default) or `windows`. Selects which binary the zip embeds. |
| `environment_label` | no (V2.9.3+) | Up to 64 chars. Canonical: `production`, `staging`, `test`, `ngrok-dev`. Free text accepted. Baked into the `.env`; tagged on every connector log line as `[env=<value>]`. |

**Zip-mode response headers:**

| Header | Meaning |
|---|---|
| `Content-Disposition: attachment; filename=...` | Standard. |
| `X-Edge-Bundle-Filename` | Same as Content-Disposition's filename — separate header for fetch wrappers that don't parse Content-Disposition. |
| `X-Edge-Bundle-Token-Id` | Integer id of the token row, lets the GUI navigate straight to the tokens list. |
| `X-Edge-Bundle-Skipped` | Comma-separated paths intentionally omitted from the zip. With V2.9.3 OS-split this carries `windows/* (target_os=linux)` or `linux/* (target_os=windows)`. |

**JSON-mode response:**

```json
{
  "device_id": "11111111-...",
  "monitor_device_id": 1000042,
  "token": "ec_<64-hex>",
  "bundle_filename": "aeroshield-edge-RDR-001-linux-v2.9.3.zip"
}
```

The `token` is the raw secret. It is only returned in JSON mode +
inside the zip's `.env`; never echoed via the list endpoint.

**Errors:**

| Status | Cause |
|---|---|
| 409 | Serial number collision (a different device already uses it). |
| 500 | Backend deployment is missing the connector binary or templates. Bundle is rolled back; no half-provisioned device row left behind. |

### GET /api/v1/admin/edge-bundle/tokens

List all tokens with their lifecycle state. Never re-emits the secret.

**Query params:**

| Param | Values | Default | Notes |
|---|---|---|---|
| `status` | `active`, `redeemed`, `revoked`, `expired`, `all` | `all` | Filter chip mirror. |
| `device_id` | UUID | — | Show only this device's tokens. |

**Response — array of:**

```json
{
  "id": 42,
  "device_id": "11111111-...",
  "device_name": "Bastion-North-1",
  "device_serial": "RDR-001",
  "protocol": "AS_2.0G",
  "cloud_url": "tcp://aeroshield.customer.com:9000",
  "radar_ip": "192.168.1.50",
  "radar_port": 9001,
  "created_at": "2026-04-27T10:11:12+00:00",
  "expires_at": null,
  "redeemed_at": "2026-04-27T10:13:45+00:00",
  "last_session_started_at": "2026-04-27T11:02:18+00:00",
  "revoked_at": null,
  "revoke_reason": null,
  "status": "redeemed",
  "target_os": "linux",
  "environment_label": "production",
  "download_count": 1,
  "last_downloaded_at": "2026-04-27T10:11:12+00:00"
}
```

Pre-V2.9.3 token rows back-fill with `target_os: "linux"`,
`download_count: 1`, `last_downloaded_at` ≈ `created_at`,
`environment_label: null`.

### DELETE /api/v1/admin/edge-bundle/tokens/{id}

Soft-delete the token. Idempotent — revoking an already-revoked
token returns 200 with the existing state.

**Body** (optional):

```json
{ "revoke_reason": "field engineer reported lost laptop" }
```

**Response:** the same row shape as the list endpoint, with `status:
"revoked"` and the `revoked_at` / `revoked_by_user_id` /
`revoke_reason` columns populated.

The ingestor reads `revoked_at IS NOT NULL` on every TCP-hello;
flipping the column is the only thing that needs to happen — no NATS
broadcast, no cache invalidation. Active connections that previously
redeemed this token continue until the connector reconnects, at
which point the V2.9.3 close-frame is sent (see below) and the
connector backs off to 5min retries.

### DELETE /api/v1/admin/edge-bundle/tokens/{id}/purge (V2.9.2+)

Hard-delete a revoked token row. Refused 409 unless the row is
already revoked — operators must revoke first; deleting an active
credential silently is a footgun.

**Response:**

```json
{ "status": "purged", "token_id": 42 }
```

The Device row is unaffected — only the credential's audit row is
removed. Use this to clean up smoke-test bundles + abandoned drafts
without keeping them in the tokens-list view forever.

### TCP-hello close-frame protocol (V2.9.3)

When the ingestor refuses a hello, it now sends a single JSON line
ending in `\n` immediately before closing the socket:

```
{"error_code": "TOKEN_REVOKED", "error_message": "token_revoked"}\n
```

Six possible `error_code` values:

| Code | Connector action |
|---|---|
| `TOKEN_NOT_FOUND` | Banner; back off to `AUTH_FAIL_BACKOFF_SECONDS` (default 300s). |
| `TOKEN_REVOKED` | Banner; back off. Operator path: Mint replacement. |
| `TOKEN_EXPIRED` | Banner; back off. Operator path: Mint replacement. |
| `TOKEN_REDEEMED_ELSEWHERE` | Banner; back off. Either move the other deployment off, or re-mint. |
| `MALFORMED_HELLO` | Banner; back off. This is a connector bug — capture the `.env` (token redacted) and email AeroShield. |
| `DEVICE_SERVICE_UNREACHABLE` | Treated as transient — keeps the normal 5s reconnect. AeroShield ops aware. |

Pre-V2.9.3 connectors ignore the close-frame harmlessly (the socket
closes either way) — fully backward-compatible. V2.9.3+ connectors
parse it and emit a clear actionable banner per code instead of
spamming reconnects.

---

## Retention (V2.3.8)

DB retention + archive endpoints. The retention scheduler runs in-process inside `device-service` and `command-service`; these HTTP routes let admins inspect policies, edit them, trigger an immediate run, and read the audit history. The two services have parallel routers under different base paths (each owns its tables) but the route shapes match.

| Service | Base | Tables it manages |
|---|---|---|
| device-service | `/api/v1/retention` | `mission_events`, `device_states`, `zone_breach_active`, `friendlies`, `swarms`, `edge_connect_tokens` (audit-only purge), … |
| command-service | `/api/v1/retention` | `commands`, `command_responses`, `audit_events`, `command_idempotency` |

### Permissions

| Permission | Granted by default to | Gates |
|---|---|---|
| `retention:read` | SUPER_ADMIN, ORG_ADMIN | `GET /policies`, `GET /runs` |
| `retention:write` | SUPER_ADMIN, ORG_ADMIN | `PATCH /policies/{table_name}` |
| `retention:run` | SUPER_ADMIN | `POST /run` (kept above `:write` because an unscheduled run can move a lot of bytes) |

### GET /api/v1/retention/policies

List every retention policy row. Returned newest-first by table_name. Always includes the full set; rows for tables not currently registered with the in-process scheduler are flagged.

**Response — array of:**

```json
{
  "id": 17,
  "table_name": "mission_events",
  "description": "Mission timeline events; archived to S3 nightly.",
  "retain_days": 90,
  "enabled": true,
  "archive_enabled": true,
  "archive_destination": "s3://aeroshield-archive/mission_events/",
  "last_run_at": "2026-04-27T02:00:00+00:00",
  "last_run_status": "ok",
  "last_run_summary": "deleted=1240 archived=1240 elapsed_ms=8421",
  "created_at": "2026-04-15T12:00:00+00:00",
  "updated_at": "2026-04-27T02:00:00+00:00",
  "registered": true
}
```

`registered: false` means the row is in the DB but the scheduler's `TABLE_REGISTRY` doesn't include it — typically a leftover from a deleted feature, or a forward-compat row written by a newer service version. The retention sweeper skips unregistered rows. Operators should either delete the row or wait for the corresponding service version to land.

### PATCH /api/v1/retention/policies/{table_name}

Edit an existing policy. Partial update — only the fields you send change.

**Body** (any subset of the writable fields):

```json
{
  "retain_days": 180,
  "enabled": true,
  "archive_enabled": false,
  "archive_destination": null,
  "description": "Bumped to 180 days for the customer audit window."
}
```

**Response:** the updated row (same shape as the list endpoint).

**Errors:**

| Status | Cause |
|---|---|
| 404 | `table_name` doesn't exist in the policies table. Use the list endpoint to find the canonical name. |
| 422 | Validation — `retain_days` must be ≥ 1, `archive_destination` required when `archive_enabled=true`. |

### POST /api/v1/retention/run

Trigger an immediate retention sweep. Synchronous — returns when the run completes. Use sparingly; the scheduler's nightly run (default 02:00 local) is the normal path.

**Body** (optional):

```json
{
  "table_name": "mission_events",
  "dry_run": false
}
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `table_name` | string \| null | null | If null → run every enabled policy. If set → only that one. |
| `dry_run` | bool | false | If true, computes the would-delete + would-archive counts but doesn't touch any rows. Useful before a big retention-window change. |

**Response:**

```json
{
  "started_at": "2026-04-27T14:32:11+00:00",
  "finished_at": "2026-04-27T14:32:19+00:00",
  "elapsed_ms": 8421,
  "tables": [
    {
      "table_name": "mission_events",
      "deleted": 1240,
      "archived": 1240,
      "skipped": 0,
      "status": "ok",
      "summary": "deleted=1240 archived=1240 elapsed_ms=8421",
      "error": null
    }
  ],
  "dry_run": false
}
```

On a per-table failure the entry's `status` is `"error"` and `error` carries the message; the overall run continues for the remaining tables. The endpoint returns 200 even if individual tables fail — caller inspects per-table status.

### GET /api/v1/retention/runs

Recent retention sweep history. Paginated by `limit` + `offset`; returns newest-first.

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `limit` | 50 | Max 500. |
| `offset` | 0 | |
| `table_name` | — | Filter to a single policy. |
| `status` | — | `ok` / `error` / `dry_run`. |

**Response — array of:**

```json
{
  "id": 4823,
  "policy_id": 17,
  "table_name": "mission_events",
  "started_at": "2026-04-27T02:00:00+00:00",
  "finished_at": "2026-04-27T02:00:08+00:00",
  "elapsed_ms": 8421,
  "deleted": 1240,
  "archived": 1240,
  "skipped": 0,
  "status": "ok",
  "summary": "deleted=1240 archived=1240 elapsed_ms=8421",
  "error": null,
  "triggered_by": "scheduler",
  "actor_user_id": null
}
```

`triggered_by` is `"scheduler"` (nightly run) or `"manual"` (POST /run). When manual, `actor_user_id` is the requesting user's UUID.

---

## ROE — Rules of Engagement (V2.10)

The V2.10 ROE surface ships in two halves: **policies** (live rules the engine evaluates against detections) and **playbooks** (curated rule packs operators import from). 16 endpoints total. The policy editor in the UI calls all of them; an integrator with `roe:*` and `playbook:*` permissions can replicate the same flows over HTTP.

For the underlying design + decision rationale see `ROE_ARCHITECTURE.md`. For code-level extension recipes see `ROE_DEVELOPER_GUIDE.md`. For operator-facing concepts see `ROE_USER_GUIDE.md`.

### A. Permission catalog (V2.10 additions)

Two new permissions on top of the V2.1 set:

| Permission | Granted to | What it gates |
|---|---|---|
| `playbook:read` | every operator-tier role | List playbooks, fetch a playbook's rules, see the import dropdown |
| `playbook:manage` | COMMANDER, DIRECTOR, SUPER_ADMIN | Create, edit, delete playbooks and their rules |

The V2.1 `roe:*` permissions are unchanged: `roe:read`, `roe:write`, `roe:manage`, `roe:global_override`.

### B. The DSL — when_expr shape

Every policy carries a `when_expr` JSON tree. Three node kinds:

```json
{"all": [<expr>, <expr>, ...]}     // logical AND
{"any": [<expr>, <expr>, ...]}     // logical OR
{"op": "<name>", "value": <v>}    // leaf operator
```

Empty `all` = True (vacuous). Empty `any` = False. Combinators nest. The visual builder caps depth at 1; integrators authoring through the API can write deeper trees but must hand-format.

**The 9 leaf operators** (3 V2.1 + 6 V2.10 Pass 8):

| Operator | Value shape | Reads from runtime context |
|---|---|---|
| `zone_type_is` | string | `zone.type` |
| `drone_friendly_is` | bool | `drone.friendly` |
| `drone_rating_gte` | "LOW" \| "MEDIUM" \| "HIGH" \| "CRITICAL" | `drone.rating` |
| `time_of_day_in_range` | `{"start": "HH:MM", "end": "HH:MM"}` UTC | system clock at evaluation time |
| `drone_speed_gte` | number (m/s) | `drone.speed_mps` |
| `loiter_seconds_gte` | number (s) | `drone.loiter_seconds` |
| `swarm_count_gte` | number (defaults to 1 for lone drones) | `swarm.count` |
| `device_protocol_is` | string (e.g. "AS_2.0G", "D20") | `device.protocol` |
| `range_to_asset_lt` | number (metres, strict less-than) | `drone.range_to_asset_m` |

The evaluator is **lenient on missing context keys** (returns false; rule doesn't match) and **strict on bad value type** (raises `RoeDslError`, route returns 400 with a JSON-path-qualified message like `"at $.all[1]: drone_speed_gte value must be a number"`).

### C. POLICY endpoints

All policy routes are under `/api/v1/roe/`. Permissions noted per-endpoint.

#### C.1 GET /api/v1/roe/policies — list

Lists policies visible to the caller. Server returns sorted by priority DESC, then created_at DESC.

**Permission:** `roe:read`.

**Query parameters:** all optional; stack with AND.

| Param | Type | Filter |
|---|---|---|
| `scope_type` | enum | One of GLOBAL / PROTOCOL / DEVICE / MISSION / ZONE |
| `scope_ref` | string | Exact match (UUID or protocol name) |
| `enabled` | bool | True / false |
| `dry_run` | bool | True / false |

**Response 200:**

```json
{
  "policies": [
    {
      "id": "9d3f...",
      "scope_type": "ZONE",
      "scope_ref": "0a44...",
      "name": "stadium-vip-bubble-escalate",
      "priority": 200,
      "dry_run": true,
      "when_expr": {"all": [...]},
      "then_action": "ESCALATE_TO_OPERATOR",
      "then_payload": {"notes": "VIP bubble breach — match-day commander approves"},
      "cooldown_s": 30,
      "target_key": "target_uid",
      "expires_at": null,
      "created_at": "2026-04-27T10:00:00Z"
    }
  ]
}
```

#### C.2 GET /api/v1/roe/policies/{id} — single fetch

**Permission:** `roe:read`. Returns the same `RoePolicy` shape as the list endpoint, just one row.

#### C.3 POST /api/v1/roe/policies — create

**Permission:** `roe:write`. Creating a GLOBAL policy additionally requires `roe:global_override`.

**Body:**

```json
{
  "scope_type": "ZONE",
  "scope_ref": "0a44...",
  "name": "my-rule",
  "description": "Free-text",
  "priority": 100,
  "dry_run": true,
  "enabled": true,
  "when_expr": {"op": "zone_type_is", "value": "no_fly"},
  "then_action": "NOTIFY_ONLY",
  "then_payload": {"notes": "..."},
  "cooldown_s": 60,
  "target_key": "target_uid",
  "expires_at": null
}
```

`name` is required, must be unique per (scope_type, scope_ref). Server validates the DSL via `dsl_evaluate(when_expr, {})` before INSERT — malformed trees return 400 with `RoeDslError` detail.

**Response 201:** the created `RoePolicy`.

#### C.4 PATCH /api/v1/roe/policies/{id} — update

**Permission:** `roe:manage`. Editing a GLOBAL policy additionally requires `roe:global_override`.

Body is partial — any field omitted is left unchanged. `scope_type` and `scope_ref` are immutable (the route refuses changes; clone-and-delete the policy instead).

#### C.5 DELETE /api/v1/roe/policies/{id} — delete

**Permission:** `roe:manage`.

Refuses to delete the three seeded GLOBAL safety-floor policies by name (`global.civil-airspace-deny`, `global.friendly-protect`, `global.default-autojam`). Other GLOBAL policies are deletable with `roe:global_override`.

#### C.6 POST /api/v1/roe/policies/evaluate — Test-expression

**Permission:** `roe:read`.

Evaluates a `when_expr` against a synthetic context the caller supplies. Used by the editor's **Test expression** button.

**Body:**

```json
{
  "when_expr": {"all": [{"op": "drone_rating_gte", "value": "HIGH"}, ...]},
  "context": {
    "drone": {"rating": "HIGH", "friendly": false, "speed_mps": 22},
    "zone": {"type": "no_fly"},
    "device": {"protocol": "AS_2.0G"}
  }
}
```

Alternative: pass `policy_id` instead of `when_expr` to evaluate a stored policy.

**Response 200:**

```json
{"matched": true, "error": null}
```

Or on bad DSL:

```json
{"matched": false, "error": "at $.all[1]: drone_rating_gte value must be one of ['CRITICAL', 'HIGH', 'LOW', 'MEDIUM'], got 'EXTREME'"}
```

The evaluator's errors come back inside the response body (HTTP 200) so the UI can render them inline rather than handle 4xx for syntax issues.

#### C.7 POST /api/v1/roe/policies/preview-live — Predictive Preview (V2.10 Pass 3)

**Permission:** `roe:read`.

Evaluates a `when_expr` against **every drone currently in flight** within the caller's accessible missions. Returns a per-drone matched/not-matched table. Used by the editor's **Predictive Preview** card before saving a new rule.

**Body:**

```json
{
  "when_expr": {"all": [...]},
  "mission_ids": ["uuid", "uuid"],
  "freshness_window_s": 120
}
```

`mission_ids` is optional — omit to scan every accessible mission. `freshness_window_s` defaults to 120 (skip drones older than 2 minutes).

**Response 200:**

```json
{
  "evaluated_at": "2026-04-28T14:23:01.000Z",
  "window_s": 120,
  "total_active_drones": 7,
  "matched_count": 3,
  "results": [
    {
      "target_uid": "abc1234567890def",
      "target_name": "DJI-3 #4",
      "mission_id": "0a44...",
      "mission_name": "LAX-Approach-Mar2026",
      "zone_id": "...",
      "zone_type": "approach_corridor",
      "zone_label": "Runway 24R approach",
      "drone_friendly": false,
      "last_seen_at": "2026-04-28T14:22:45.123Z",
      "matched": true,
      "error": null
    }
  ],
  "warnings": []
}
```

Data source is the `zone_breach_active` materialised roster — drones whose most recent ZONE_ENTER hasn't been followed by a ZONE_EXIT and whose last update is within the freshness window.

#### C.8 GET /api/v1/roe/policies/{id}/firings — paginated firings

**Permission:** `roe:read`.

Returns recent firings (matched evaluations) for one policy. Cursor-paginated.

**Query:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `before` | ISO-8601 timestamp | now | Cursor — omit on first page; pass `next_cursor` from previous response on subsequent |
| `limit` | int | 50 | Max 200 |

**Response 200:**

```json
{
  "firings": [
    {
      "id": "f3a4...",
      "policy_id": "9d3f...",
      "policy_name": "stadium-vip-bubble-escalate",
      "mission_id": "0a44...",
      "device_id": "9c81...",
      "target_uid": "abc1234567890def",
      "matched_at": "2026-04-28T14:23:01.000Z",
      "dry_run": false,
      "command_id": "f001...",
      "notes": "VIP bubble breach — match-day commander approves"
    }
  ],
  "next_cursor": "2026-04-28T14:00:00.000Z"
}
```

`next_cursor` is the `matched_at` of the oldest row in this page; pass it as `before` on the next call. `null` means the stream is exhausted.

### D. PLAYBOOK endpoints (V2.10 Pass 5)

All playbook routes are under `/api/v1/roe-playbooks/` and `/api/v1/roe-playbook-rules/`.

#### D.1 GET /api/v1/roe-playbooks — list

**Permission:** `playbook:read`.

Returns all playbooks with rule counts. Sorted by `sort_order` ASC, then vertical name ASC.

**Response 200:**

```json
{
  "playbooks": [
    {
      "id": "p1...",
      "vertical": "Airport perimeter",
      "scenario": "Civil airspace coverage with strict ATC coordination...",
      "sort_order": 10,
      "rule_count": 4,
      "created_at": "2026-04-27T19:30:00Z",
      "updated_at": "2026-04-27T19:30:00Z"
    }
  ]
}
```

#### D.2 GET /api/v1/roe-playbooks/{id} — fetch with rules

**Permission:** `playbook:read`.

Returns one playbook with its rules embedded. Used by the editor's import dropdown after the operator picks a vertical.

**Response 200:**

```json
{
  "id": "p1...",
  "vertical": "Airport perimeter",
  "scenario": "...",
  "sort_order": 10,
  "created_at": "...",
  "updated_at": "...",
  "rules": [
    {
      "id": "r1...",
      "name": "airport-civil-airspace-deny",
      "description": "Tenant-wide DENY inside civil_airspace zones...",
      "scope_type": "GLOBAL",
      "when_expr": {"op": "zone_type_is", "value": "civil_airspace"},
      "then_action": "DENY",
      "then_payload": {},
      "priority": 100,
      "cooldown_s": 0,
      "target_key": "global",
      "dry_run": false,
      "position": 0
    }
  ]
}
```

#### D.3 POST /api/v1/roe-playbooks — create vertical

**Permission:** `playbook:manage`.

**Body:**

```json
{
  "vertical": "Wind farm — turbine inspection",
  "scenario": "One-paragraph description...",
  "sort_order": 220
}
```

`vertical` must be 2–128 chars and unique (DB unique constraint). `sort_order` is optional, default 100.

**Response 201:** the created `Playbook` (with empty `rules` array).

#### D.4 PATCH /api/v1/roe-playbooks/{id} — update vertical metadata

**Permission:** `playbook:manage`. Body is partial; any of `vertical`, `scenario`, `sort_order` can be set.

#### D.5 DELETE /api/v1/roe-playbooks/{id} — delete vertical

**Permission:** `playbook:manage`. Cascades to delete all rules in the playbook. Policies already imported out of this playbook are NOT affected (they're independent rows once imported).

#### D.6 POST /api/v1/roe-playbooks/{id}/rules — add rule to vertical

**Permission:** `playbook:manage`.

**Body:**

```json
{
  "name": "airport-overnight-strict",
  "description": "Free-text",
  "scope_type": "MISSION",
  "when_expr": {"all": [...]},
  "then_action": "ESCALATE_TO_OPERATOR",
  "then_payload": {"notes": "Overnight curfew — duty controller decides immediately"},
  "priority": 180,
  "cooldown_s": 30,
  "target_key": "target_uid",
  "dry_run": true,
  "position": 2
}
```

Server validates the DSL via `dsl_evaluate(when_expr, {})` before INSERT. `name` must be unique per playbook (`(playbook_id, name)` unique constraint).

**Response 201:** the created `PlaybookRule`.

#### D.7 PATCH /api/v1/roe-playbook-rules/{rule_id} — update rule

**Permission:** `playbook:manage`. Note the path is **flat** (top-level `/roe-playbook-rules/`), not nested — operators don't need the parent `playbook_id` at edit time. Body is partial.

#### D.8 DELETE /api/v1/roe-playbook-rules/{rule_id} — delete rule

**Permission:** `playbook:manage`.

### E. Common errors

| Status | When |
|---|---|
| 400 | Body fails Pydantic validation (response `detail` has the field). DSL is malformed (response `detail` has the JSON path). |
| 401 | JWT missing or expired. |
| 403 | Caller's role lacks the required permission (e.g. `roe:write`, `playbook:manage`, or `roe:global_override` for GLOBAL scope). |
| 404 | Policy / playbook / rule not found. |
| 409 | Unique constraint violation: duplicate vertical name on POST playbook, duplicate `(playbook_id, name)` on POST playbook rule, or trying to delete a seeded GLOBAL policy. |

### F. Recipe: integrate a custom UI with the ROE backend

A different UI team (or scripted automation) replicating the AeroShield ROE pages would call these endpoints in roughly this order:

1. **Authoring a new policy from scratch** — `GET /api/v1/protocols` (for PROTOCOL scope picker), `GET /api/v1/missions` (for MISSION scope), per-mission `GET /api/v1/missions/{id}/zones` (for ZONE scope two-step), then `POST /api/v1/roe/policies/evaluate` to test the tree before saving, then `POST /api/v1/roe/policies` to save.
2. **Importing from a playbook** — `GET /api/v1/roe-playbooks` for the vertical list, `GET /api/v1/roe-playbooks/{id}` for the chosen vertical's rules, then merge the picked rule into the form, then save as a normal `POST /api/v1/roe/policies`.
3. **Predictive Preview** — `POST /api/v1/roe/policies/preview-live` with the in-progress `when_expr` against currently-airborne drones; render the per-drone match table.
4. **Toggling dry-run / enabled** — `PATCH /api/v1/roe/policies/{id}` with just the changed boolean. Optimistic UI render.
5. **Audit drawer** — `GET /api/v1/roe/policies/{id}/firings` cursor-paginated; render rows with action, target, command status.
6. **Curating playbooks (admin)** — full CRUD on `/api/v1/roe-playbooks/*` and `/api/v1/roe-playbook-rules/*`.

For UI implementation specifics (component structure, state shapes, interaction patterns), see `GUI_IMPLEMENTATION_GUIDE.md §7`.
