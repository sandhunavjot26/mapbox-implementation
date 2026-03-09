# Backend Requirements & Open Questions

This document consolidates all open questions and requirements for the backend (device-service, command-service, REST API) to support the Counter-UAS situational awareness frontend.

---

## 1. Events WebSocket (`/ws/missions/{mission_id}/events`)

### Message Format

- **Wrapper:** Frontend expects `{ type: "mission_event", event: { id, event_type, mission_id, device_id, ts, payload } }`. Is this the exact structure?
- **Event IDs:** Does each event have a unique `id`? If not, frontend generates one.

### Event Types

- **DETECTED vs TRACK_UPDATE:** Is DETECTED the first sighting and TRACK_UPDATE the continuous stream, or can both appear for the same track?
- **TRACK_LOST:** Does the backend send an event when a track is lost? If yes, what is the `event_type` (e.g. `TRACK_LOST`, `TRACK_END`)? What does the payload look like?
- **Other event types:** Which other `event_type` values are sent (e.g. `JAMMED`, `JAM_STARTED`, `COMMAND_SENT`)? Frontend adds them to the MissionTimeline.

### DETECTED Payload

- **Structure:** Frontend expects `payload.uav` with: `target_uid`, `uav_lat`, `uav_lon`, `alt_asl_m`/`alt_agl_m`, `azimuth_deg`, `distance_m`, `freq_khz`, `signal_db`, `speed_mps`, `confidence`, `rc_lon`, `rc_lat`, `bandwidth_khz`, `target_name`. Are all of these supported?
- **Device ID:** Is `device_id` at event level or `monitor_device_id` in payload? Frontend resolves `monitor_device_id` to `device_id` via mission devices.

### TRACK_UPDATE Payload

- **Structure:** Frontend expects flat payload: `target_uid`, `lat`, `lon`, `target_name`, `speed_mps`, `heading_deg`/`azimuth_deg`, `distance_m`, `confidence`, `source`. Are all of these supported?
- **Altitude:** Does TRACK_UPDATE include altitude (`alt_asl_m`, `alt_agl_m`, or similar)? If yes, what are the field names?
- **Frequency/RSSI:** Does TRACK_UPDATE include `freq_khz`, `signal_db`, `bandwidth_khz`, `rc_lon`, `rc_lat`? If not, frontend keeps values from last DETECTED.

---

## 2. Devices WebSocket (`/ws/missions/{mission_id}/devices`)

### Message Types

- **Supported:** `device_state_update`, `device_online`, `device_offline`. Are these the only types?
- **Payload:** Frontend expects `device_id`, `monitor_device_id`, `status`, `last_seen` (ISO string), `name`, `op_status`.

### Device Discovery

- **New devices:** Does the devices WS ever send new devices with coordinates, or only status updates for devices already in the mission?
- **Device ID:** Does `device_id` match the REST API `Device.id` (UUID)?

### op_status

- **Values:** What values are used (e.g. `WORKING`, `IDLE`, `SCANNING`)? Frontend displays them as-is in asset popup.

---

## 3. Commands WebSocket (`/ws/missions/{mission_id}/commands`)

### Message Types

- **Supported:** `command_update`, `command_status_update`, `command_sent`, `command_response`, `command_failed`, `command_timeout`, `command_requested`. Are all of these sent?
- **Command ID:** Is `command_id` or `command.id` always present and matching the REST `POST /api/v1/commands` response?

### Status Flow

- **Flow:** Frontend expects PENDING_APPROVAL → SENDING → SENT → SUCCEEDED / FAILED / TIMEOUT. Is this correct?
- **Stuck at SENDING:** If commands stay at SENDING, is that due to device offline, backend behavior, or missing WebSocket messages?

### Payload Structure

- **Flat vs nested:** Frontend supports both `{ command_id, status, ... }` and `{ command: { id, status, ... } }`. Which format is used?
- **Status location:** Frontend checks `msg.status`, `msg.command.status`, `msg.payload.status`. Where is status actually sent?
- **Result payload:** For SUCCEEDED, where is the result? `msg.result`, `msg.command.result`, or `msg.payload.result`?

### ATTACK_MODE_QUERY Result

- **Format:** Frontend parses `switch`, `sw`, `switches` (array), or `switch_0`…`switch_11` to derive `jamActive`. What is the exact result schema?

---

## 4. REST API

### Commands

- **POST /api/v1/commands:** Does the response include `id`, `packet_no`, `status`, `required_approvals`, `approved_count`?
- **Approval flow:** For commands requiring approval, does the backend send `command_update` with updated `approved_count` when approvals are received?

### Missions

- **GET /missions/{id}:** Does the response include `devices` with `id`, `monitor_device_id`, `latitude`, `longitude`, `status`, `detection_radius_m`, `jammer_radius_m`?
- **Device IDs:** Are `Device.id` (REST) and `device_id` (WebSocket) the same?

---

## 5. WebSocket Connectivity

### URLs

- **Events:** `wss://<host>/ws/missions/{mission_id}/events?token=<JWT>`
- **Devices:** `wss://<host>/ws/missions/{mission_id}/devices?token=<JWT>`
- **Commands:** `wss://<host>/ws/missions/{mission_id}/commands?token=<JWT>`

Are these endpoints and query params correct? Does the backend accept the same JWT as the REST API?

### Reconnection

- **Behavior:** Frontend reconnects with exponential backoff (3s–60s). Does the backend support reconnects without special handling?

---

## 6. Future Features (Phase 7)

- **Track trail:** Does the backend store or expose historical positions per target, or would this be frontend-only from TRACK_UPDATE history?
- **Smooth interpolation:** Is there a preferred update rate for TRACK_UPDATE (e.g. 1 Hz, 5 Hz) for smooth motion?

---

## Summary Checklist for Backend Team

| Area | Question / Requirement |
|------|------------------------|
| **Events** | TRACK_LOST event type and payload |
| **Events** | TRACK_UPDATE altitude fields |
| **Events** | DETECTED vs TRACK_UPDATE semantics |
| **Events** | Exact event wrapper structure |
| **Devices** | New device discovery vs status-only |
| **Devices** | `op_status` value set |
| **Commands** | Status flow and message types |
| **Commands** | Flat vs nested payload format |
| **Commands** | ATTACK_MODE_QUERY result schema |
| **Commands** | Why commands can stay at SENDING |
| **REST** | Command response fields |
| **WebSocket** | URL and auth format |
