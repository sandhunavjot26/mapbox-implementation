# AeroShield REST API & GUI Integration Guide

> Summarized from the official AeroShield integration document for frontend engineering reference.

## 1. Overview

AeroShield is a **mission-centric command centre** for drone detection and jammer operations.
Devices communicate via RMTP/TCP into an RMTP-ingestor. The GUI interacts purely via
REST APIs (auth / device / command services) and renders missions, map overlays, device
inventory, timeline events, command workflows, and admin screens.

## 2. Environments & Base URLs

| Service         | Local / Dev URL             |
| --------------- | --------------------------- |
| Auth Service    | `http://127.0.0.1:8000`    |
| Device Service  | `http://127.0.0.1:8001`    |
| Command Service | `http://127.0.0.1:8002`    |

All GUI API calls require `Authorization: Bearer <JWT>` except internal-only endpoints.

## 3. Authentication & Authorization

### 3.1 Login

`POST /api/v1/auth/login?username=<>&password=<>`

Returns `{ access_token, roles[], permissions[], scopes: { global, missions[], devices[] } }`.

### 3.2 RBAC & Scopes

- Decode JWT client-side (`jwt-decode`) to build a permission matrix.
- Hide/disable controls based on `permissions[]`.
- Filter visible missions/devices based on `scopes`.
- Handle server-side `403` gracefully (display "No access").

## 4. Data Model

### 4.1 Mission

| Field            | Type                    | Notes                              |
| ---------------- | ----------------------- | ---------------------------------- |
| `id`             | UUID                    |                                    |
| `name`           | string                  |                                    |
| `aop`            | string / null           | Area of operations                 |
| `border_geojson` | GeoJSON.Polygon / null  | Mission boundary                   |
| has many         | zones, features, devices, mission_events |                    |

### 4.2 Zone (TL-1 / TL-2)

| Field          | Type                   | Notes                         |
| -------------- | ---------------------- | ----------------------------- |
| `id`           | UUID                   |                               |
| `label`        | string                 | e.g. "TL-1"                  |
| `priority`     | number                 | 1 = highest threat            |
| `zone_geojson` | GeoJSON.Polygon        |                               |
| `action_plan`  | JSON                   | `{ notify, actions, sla_seconds }` |

### 4.3 Feature (roads / rivers / markers / notes)

| Field          | Type                   |
| -------------- | ---------------------- |
| `id`           | UUID                   |
| `feature_type` | string (ROAD, etc.)    |
| `geojson`      | GeoJSON Feature        |
| `properties`   | `{ name, category }` etc. |

### 4.4 Device

| Field                | Type                               |
| -------------------- | ---------------------------------- |
| `id`                 | UUID                               |
| `serial_number`      | string                             |
| `name`               | string                             |
| `monitor_device_id`  | int (from dt1)                     |
| `device_type`        | DETECTION / JAMMER / DETECTION_JAMMER |
| `color`              | string                             |
| `latitude, longitude`| float                              |
| `detection_radius_m` | number                             |
| `jammer_radius_m`    | number                             |
| `status`             | ONLINE / OFFLINE / UNKNOWN         |
| `mission_id`         | UUID / null                        |

### 4.5 Device State Snapshot (from dt1)

`last_seen`, `orientation`, `battery`, `temp`, `humidity`, etc.

### 4.6 Device Config Snapshot

`ip`, `netmask`, `route`, `dns`, `gateway`, `attack_mode` status, `band_range` config.

### 4.7 Mission Events (Timeline)

| Field        | Type     |
| ------------ | -------- |
| `event_type` | DETECTED / COMMAND_SENT / JAM_STARTED / etc. |
| `ts`         | ISO timestamp |
| `payload`    | full context JSON |

### 4.8 Commands

Command-service manages request / approve / reject / send / response correlation.

## 5. Endpoint Catalog

### 5.1 Auth Service

| Method | Endpoint                              | Purpose                        |
| ------ | ------------------------------------- | ------------------------------ |
| POST   | `/api/v1/auth/login`                  | Login, returns JWT             |
| GET    | `/api/v1/users`                       | List users                     |
| POST   | `/api/v1/users`                       | Create user                    |
| PATCH  | `/api/v1/users/{user_id}`             | Update user (enable/disable)   |
| DELETE | `/api/v1/users/{user_id}`             | Delete user                    |
| GET    | `/api/v1/roles`                       | List roles                     |
| POST   | `/api/v1/roles`                       | Create role                    |
| PUT    | `/api/v1/roles/{role_id}/permissions` | Replace role permissions       |
| GET    | `/api/v1/permissions`                 | List all permissions           |
| GET    | `/api/v1/users/{user_id}/scopes`      | User scopes                    |
| POST   | `/api/v1/users/{user_id}/scopes`      | Grant scope                    |
| DELETE | `/api/v1/users/{user_id}/scopes`      | Revoke scope                   |

### 5.2 Device Service (Missions + Devices + Map + Timeline)

#### Missions

| Method | Endpoint                                    | Purpose                    |
| ------ | ------------------------------------------- | -------------------------- |
| GET    | `/api/v1/missions?q=<optional>`             | List missions (+ search)   |
| POST   | `/api/v1/missions`                          | Create mission             |
| GET    | `/api/v1/missions/{id}`                     | Full load (zones, features, devices) |
| PATCH  | `/api/v1/missions/{id}`                     | Update border / name / aop |

#### Zones

| Method | Endpoint                                     | Purpose        |
| ------ | -------------------------------------------- | -------------- |
| POST   | `/api/v1/missions/{id}/zones`                | Create zone    |
| GET    | `/api/v1/missions/{id}/zones`                | List zones     |
| PATCH  | `/api/v1/missions/{id}/zones/{zone_id}`      | Update zone    |
| DELETE | `/api/v1/missions/{id}/zones/{zone_id}`      | Delete zone    |

#### Features

| Method | Endpoint                                         | Purpose           |
| ------ | ------------------------------------------------ | ----------------- |
| POST   | `/api/v1/missions/{id}/features`                 | Create feature    |
| GET    | `/api/v1/missions/{id}/features`                 | List features     |
| DELETE | `/api/v1/missions/{id}/features/{feature_id}`    | Delete feature    |

> No PATCH for features — implement edit as delete + recreate.

#### Device Assignment

| Method | Endpoint                                      | Purpose          |
| ------ | --------------------------------------------- | ---------------- |
| POST   | `/api/v1/missions/{id}/devices/assign`        | Assign devices   |

Payload: `{ "device_ids": ["uuid1", "uuid2"] }`

#### Map Features (GeoJSON)

| Method | Endpoint                                       | Purpose                      |
| ------ | ---------------------------------------------- | ---------------------------- |
| GET    | `/api/v1/missions/{id}/map/features`           | GeoJSON FeatureCollection    |

Returns: border feature, zones, mission features, devices (points with radii in properties).

#### Device Inventory & Live Data

| Method | Endpoint                                            | Purpose              |
| ------ | --------------------------------------------------- | -------------------- |
| GET    | `/api/v1/devices?mission_id=&device_type=&status=`  | List devices         |
| GET    | `/api/v1/devices/states/by-mission/{id}`            | Live state per mission |
| GET    | `/api/v1/devices/configs/by-mission/{id}`           | Config per mission   |

#### Mission Timeline Events

| Method | Endpoint                                                              | Purpose       |
| ------ | --------------------------------------------------------------------- | ------------- |
| GET    | `/api/v1/missions/{id}/events?limit=&offset=&event_type=&from_ts=&to_ts=` | Timeline events |

### 5.3 Command Service

| Method | Endpoint                              | Purpose              |
| ------ | ------------------------------------- | -------------------- |
| POST   | `/api/v1/commands`                    | Create command       |
| POST   | `/api/v1/commands/{id}/approve`       | Approve command      |
| POST   | `/api/v1/commands/{id}/reject`        | Reject command       |
| GET    | `/api/v1/policies`                    | List policies        |

Command payload: `{ mission_id, device_id, command_type, payload }`.
Response includes `status` (PENDING_APPROVAL or SENDING), `required_approvals`, `approved_count`.

## 6. GUI Screen Guidance

### 6.1 Admin Module

- Users: list, create, disable (`PATCH { is_active: false }`), assign roles.
- Roles & Permissions: list roles, edit permissions via `PUT /roles/{id}/permissions`.
- Scopes: grant/revoke mission scopes per user. Show "effective scope" summary.

### 6.2 Missions List + Create

- `GET /missions` with search box.
- Create mission modal -> `POST /missions`.
- On success, navigate to editor.

### 6.3 Mission Editor (Wizard / Builder)

Recommended steps:
1. Create mission (name / AOP)
2. Draw border -> `PATCH /missions/{id}`
3. Create TL zones -> `POST /missions/{id}/zones`
4. Add roads/rivers/markers -> `POST /missions/{id}/features`
5. Assign devices -> `POST /missions/{id}/devices/assign`

### 6.4 Mission Workspace (Operations)

| Panel     | Endpoint                                 | Poll Interval |
| --------- | ---------------------------------------- | ------------- |
| Map       | `GET /missions/{id}/map/features`        | 15-30s        |
| Timeline  | `GET /missions/{id}/events`              | 5s            |
| Devices   | `GET /devices/states/by-mission/{id}` + `/configs/by-mission/{id}` | 5-10s |
| Commands  | `POST /commands`, approve/reject endpoints | On demand   |

## 7. Error Handling

| HTTP Code | Action                          |
| --------- | ------------------------------- |
| 401       | Redirect to login               |
| 403       | Show "insufficient permissions" |
| Empty list| Show "no access or no data"     |

Use toast notifications for: saved border/zone/feature, command requested/approved/sent/failed.

## 8. Minimum Endpoints for Full GUI

Auth login, Missions CRUD (+ border patch), Zones CRUD, Features create/delete,
Assign devices, Map features, Mission events list, Device list + states/configs,
Commands request/approve/reject, Admin user/role/scope/permission.
