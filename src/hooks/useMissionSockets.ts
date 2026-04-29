/**
 * useMissionSockets — connects to events, devices, commands WebSocket streams.
 * Device-service: events (DETECTED, JAMMED, COMMAND_*), devices (device_state_update, device_online, device_offline).
 * Command-service: commands (command_status_update, command_sent, command_response, command_failed, command_timeout).
 *
 * Live tracks on the map: only `handleMissionEvent` (WS) updates `targetsStore`. REST timeline backfill does not seed targets.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useWsStatusStore } from "@/stores/wsStatusStore";
import { useMissionStore } from "@/stores/missionStore";
import { missionsKeys } from "@/hooks/useMissions";
import {
  getEventsWsUrl,
  getDevicesWsUrl,
  getCommandsWsUrl,
} from "@/lib/ws/missionSockets";
import {
  useTargetsStore,
  uavPayloadToTarget,
  trackUpdatePayloadToTarget,
} from "@/stores/targetsStore";
import { useCommandsStore } from "@/stores/commandsStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { publish as publishMissionEventBus } from "@/stores/missionEventsBus";
import { useAttackModeStore } from "@/stores/attackModeStore";
import { useEngageOverlayStore } from "@/stores/engageOverlayStore";
import type {
  TrackRatedPayload,
  ThreatEscalationPayload,
  DeviceAzimuthPayload,
  DeviceOnlineEventPayload,
  DeviceOfflineEventPayload,
} from "@/types/aeroshield";
import {
  telemetryFromDeviceState,
  readAzimuthFromDeviceStatePayload,
} from "@/utils/deviceHealth";

type WsStatus = "connecting" | "open" | "closed" | "error";

interface UseMissionSocketsResult {
  eventsStatus: WsStatus;
  devicesStatus: WsStatus;
  commandsStatus: WsStatus;
}

const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 60000;

function useWs(
  url: string | null,
  onMessage: (data: unknown) => void,
): WsStatus {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const abortedRef = useRef(false);
  const [status, setStatus] = useState<WsStatus>("closed");
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url) {
      setStatus("closed");
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    attemptRef.current = 0;
    abortedRef.current = false;

    const connect = () => {
      if (abortedRef.current) return;
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (abortedRef.current) {
          ws.close();
          return;
        }
        setStatus("open");
        attemptRef.current = 0;
      };
      ws.onclose = () => {
        wsRef.current = null;
        if (abortedRef.current) return;
        setStatus("closed");
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, attemptRef.current),
          RECONNECT_MAX_MS,
        );
        attemptRef.current++;
        timeoutId = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        if (!abortedRef.current) setStatus("error");
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessageRef.current(data);
        } catch {
          // ignore parse errors
        }
      };
    };

    // Defer initial connect to avoid "closed before established" in React Strict Mode
    // (effect runs twice in dev; cleanup closes the first socket before it opens)
    const initialId = setTimeout(connect, 0);
    return () => {
      abortedRef.current = true;
      clearTimeout(initialId);
      clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("closed");
    };
  }, [url]);

  return status;
}

export function useMissionSockets(): UseMissionSocketsResult {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.getToken());
  const missionId = useMissionStore((s) => s.activeMissionId);
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const addOrUpdateTarget = useTargetsStore((s) => s.addOrUpdateTarget);
  const markTargetLost = useTargetsStore((s) => s.markTargetLost);
  const applyTrackRating = useTargetsStore((s) => s.applyTrackRating);
  const applyThreatEscalation = useTargetsStore((s) => s.applyThreatEscalation);
  const addOrUpdateCommand = useCommandsStore((s) => s.addOrUpdateCommand);
  const setDeviceStatus = useDeviceStatusStore((s) => s.setDeviceStatus);
  const updateDeviceAzimuth = useDeviceStatusStore(
    (s) => s.updateDeviceAzimuth,
  );
  const addMissionEvent = useMissionEventsStore((s) => s.addEvent);
  const setAttackMode = useAttackModeStore((s) => s.setAttackMode);
  const setEngageOverlay = useEngageOverlayStore((s) => s.setOverlay);

  const eventsUrl =
    missionId && token ? getEventsWsUrl(missionId, token) : null;
  const devicesUrl =
    missionId && token ? getDevicesWsUrl(missionId, token) : null;
  const commandsUrl =
    missionId && token ? getCommandsWsUrl(missionId, token) : null;

  const handleMissionEvent = useCallback(
    (ev: {
      id?: string;
      event_type?: string;
      mission_id?: string;
      device_id?: string | null;
      ts?: string;
      payload?: Record<string, unknown>;
    }) => {
      const eventType = ev.event_type ?? "";
      const payload = ev.payload ?? {};
      const eventId =
        ev.id ?? `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Timeline: one place that sees every mission_event
      addMissionEvent({
        id: eventId,
        mission_id: ev.mission_id ?? missionId ?? "",
        device_id: ev.device_id ?? null,
        event_type: eventType,
        ts: ev.ts ?? new Date().toISOString(),
        payload: Object.keys(payload).length ? payload : null,
      });

      switch (eventType) {
        case "DETECTED":
        case "UAV_DETECTED": {
          const raw = payload.uav as Record<string, unknown> | undefined;
          if (raw) {
            const mon = payload.monitor_device_id ?? raw.monitor_device_id;
            const uav = {
              ...raw,
              monitor_device_id: raw.monitor_device_id ?? mon,
            } as unknown as Parameters<typeof uavPayloadToTarget>[0];
            let deviceId = ev.device_id ?? null;
            if (!deviceId && mon != null && cachedMission?.devices) {
              const d = cachedMission.devices.find(
                (dev) => dev.monitor_device_id === mon,
              );
              deviceId = d?.id ?? null;
            }
            const target = uavPayloadToTarget(uav, deviceId, eventId);
            addOrUpdateTarget(target);
          }
          break;
        }
        case "TRACK_UPDATE": {
          const trackPayload = payload as unknown as Parameters<
            typeof trackUpdatePayloadToTarget
          >[0];
          if (
            trackPayload.target_uid &&
            trackPayload.lat != null &&
            trackPayload.lon != null
          ) {
            const target = trackUpdatePayloadToTarget(trackPayload);
            addOrUpdateTarget(target);
          }
          break;
        }
        case "TRACK_LOST":
        case "TRACK_END": {
          const targetUid = (payload.target_uid ?? payload.target_id) as
            | string
            | undefined;
          if (targetUid) {
            markTargetLost(targetUid);
          }
          break;
        }
        case "TRACK_RATED": {
          const p = payload as Partial<TrackRatedPayload>;
          if (
            typeof p.target_uid === "string" &&
            typeof p.status === "string"
          ) {
            applyTrackRating(p.target_uid, p as TrackRatedPayload);
          }
          break;
        }
        case "THREAT_ESCALATION": {
          const p = payload as Partial<ThreatEscalationPayload>;
          if (
            typeof p.target_uid === "string" &&
            p.level != null &&
            typeof p.score === "number" &&
            Array.isArray(p.reasons)
          ) {
            applyThreatEscalation(p.target_uid, p as ThreatEscalationPayload);
          }
          break;
        }
        case "SWARM_DETECTED": {
          publishMissionEventBus("SWARM_DETECTED", payload);
          break;
        }
        case "DEVICE_ONLINE": {
          const p = payload as Partial<DeviceOnlineEventPayload> & {
            last_seen?: string;
          };
          if (p.device_id) {
            setDeviceStatus({
              device_id: p.device_id,
              monitor_device_id: p.monitor_device_id,
              status: "ONLINE",
              last_seen: p.last_seen ?? new Date().toISOString(),
              name: p.name,
            });
          }
          break;
        }
        case "DEVICE_OFFLINE": {
          const p = payload as Partial<DeviceOfflineEventPayload> & {
            last_seen?: string;
          };
          if (p.device_id) {
            setDeviceStatus({
              device_id: p.device_id,
              monitor_device_id: p.monitor_device_id,
              status: "OFFLINE",
              last_seen: p.last_seen ?? new Date().toISOString(),
              name: p.name,
            });
          }
          break;
        }
        case "DEVICE_AZIMUTH": {
          const p = payload as Partial<DeviceAzimuthPayload>;
          if (p.device_id != null && typeof p.azimuth_deg === "number") {
            updateDeviceAzimuth(p.device_id, {
              azimuth_deg: p.azimuth_deg,
              elevation_deg: p.elevation_deg,
              monitor_device_id: p.monitor_device_id,
            });
          }
          break;
        }
        case "MISSION_ACTIVATED":
        case "MISSION_STOPPED":
        case "MISSION_AUTO_JAM_STOP": {
          const mid = ev.mission_id ?? missionId;
          if (mid) {
            void queryClient.invalidateQueries({
              queryKey: missionsKeys.detail(mid),
            });
          }
          void queryClient.invalidateQueries({ queryKey: missionsKeys.all });
          break;
        }
        // NFZ_BREACH, ZONE_*, BREACH_*, NFZ_BREACH_PREDICTED — timeline only (P0)
        default:
          break;
      }
    },
    [
      missionId,
      cachedMission,
      addOrUpdateTarget,
      addMissionEvent,
      markTargetLost,
      applyTrackRating,
      applyThreatEscalation,
      setDeviceStatus,
      updateDeviceAzimuth,
      queryClient,
    ],
  );

  const onEvent = useCallback(
    (data: unknown) => {
      const msg = data as {
        type?: string;
        event?: {
          id?: string;
          event_type?: string;
          mission_id?: string;
          device_id?: string | null;
          ts?: string;
          payload?: Record<string, unknown>;
        };
      };
      if (msg.type !== "mission_event" || !msg.event) return;
      handleMissionEvent(msg.event);
    },
    [handleMissionEvent],
  );

  const onDevice = useCallback(
    (data: unknown) => {
      const msg = data as {
        type?: string;
        device_id?: string;
        monitor_device_id?: number;
        status?: string;
        last_seen?: string;
        name?: string;
        op_status?: string | number;
        state?: unknown;
      };
      if (
        (msg.type === "device_state_update" ||
          msg.type === "device_online" ||
          msg.type === "device_offline") &&
        msg.device_id
      ) {
        const isOnline = msg.type !== "device_offline";
        const tel =
          msg.type === "device_state_update"
            ? telemetryFromDeviceState(msg.state)
            : {};
        setDeviceStatus({
          device_id: msg.device_id,
          monitor_device_id: msg.monitor_device_id,
          status: isOnline ? (msg.status ?? "ONLINE") : "OFFLINE",
          last_seen:
            (typeof tel.last_seen === "string" ? tel.last_seen : undefined) ??
            msg.last_seen ??
            new Date().toISOString(),
          name: msg.name,
          op_status: tel.op_status ?? msg.op_status,
          ...tel,
        });
        if (msg.type === "device_state_update") {
          const azi = readAzimuthFromDeviceStatePayload(msg.state);
          if (azi) {
            updateDeviceAzimuth(msg.device_id, {
              azimuth_deg: azi.azimuth_deg,
              elevation_deg: azi.elevation_deg,
              monitor_device_id: msg.monitor_device_id,
            });
          }
        }
      }
    },
    [setDeviceStatus, updateDeviceAzimuth],
  );

  const onCommand = useCallback(
    (data: unknown) => {
      // Backend sends: command_update, command_sent, command_response, command_failed, command_timeout
      // Supports both flat and nested { command: { id, status, ... } } formats
      const msg = data as {
        type?: string;
        command_id?: string;
        command?: {
          id?: string;
          mission_id?: string;
          device_id?: string | null;
          command_type?: string;
          status?: string;
          approved_count?: number;
          required_approvals?: number;
          last_error?: string | null;
          packet_no?: number | null;
          result?: Record<string, unknown>;
        };
        mission_id?: string;
        device_id?: string | null;
        command_type?: string;
        status?: string;
        approved_count?: number;
        required_approvals?: number;
        last_error?: string | null;
        packet_no?: number | null;
        result?: Record<string, unknown>;
        payload?: { status?: string; result?: Record<string, unknown> };
      };

      const commandTypes = [
        "command_update",
        "command_status_update",
        "command_sent",
        "command_response",
        "command_failed",
        "command_timeout",
        "command_requested",
      ];

      if (!msg.type || !commandTypes.includes(msg.type)) return;

      const commandId = msg.command_id ?? msg.command?.id;
      if (!commandId) return;

      // Status can be in: msg.status, msg.command.status, msg.payload.status
      const status =
        msg.status ??
        msg.command?.status ??
        msg.payload?.status ??
        (msg.type === "command_sent"
          ? "SENT"
          : msg.type === "command_failed"
            ? "FAILED"
            : msg.type === "command_timeout"
              ? "TIMEOUT"
              : "PENDING");

      // Dev: check console — if only SENDING, backend may not send SENT/SUCCEEDED (device offline?)
      if (process.env.NODE_ENV === "development") {
        console.debug("[Commands WS]", msg.type, "→", status, "id:", commandId);
      }

      const packetNo = msg.packet_no ?? msg.command?.packet_no;
      const resultPayload =
        msg.result ?? msg.command?.result ?? msg.payload?.result;

      addOrUpdateCommand({
        id: commandId,
        mission_id: msg.mission_id ?? msg.command?.mission_id,
        device_id: msg.device_id ?? msg.command?.device_id ?? null,
        command_type: msg.command_type ?? msg.command?.command_type ?? "",
        status,
        approved_count: msg.approved_count ?? msg.command?.approved_count,
        required_approvals:
          msg.required_approvals ?? msg.command?.required_approvals,
        last_error: msg.last_error ?? msg.command?.last_error,
        packet_no: packetNo ?? undefined,
        result_payload: resultPayload ?? undefined,
      });

      // Add command completion to MissionTimeline when status is terminal
      const terminalStatuses = ["SUCCEEDED", "FAILED", "TIMEOUT"];
      if (terminalStatuses.includes(status)) {
        const eventType =
          status === "SUCCEEDED"
            ? "COMMAND_SUCCEEDED"
            : status === "FAILED"
              ? "COMMAND_FAILED"
              : "COMMAND_TIMEOUT";
        addMissionEvent({
          id: `cmd-${commandId}-${status}`,
          mission_id:
            msg.mission_id ?? msg.command?.mission_id ?? missionId ?? "",
          device_id: msg.device_id ?? msg.command?.device_id ?? null,
          event_type: eventType,
          ts: new Date().toISOString(),
          payload: {
            command_id: commandId,
            command_type: msg.command_type ?? msg.command?.command_type,
            status,
            ...(resultPayload && { result: resultPayload }),
          },
        });

        // ATTACK_MODE_QUERY succeeded: update attack mode store for device badge
        const cmdType = msg.command_type ?? msg.command?.command_type;
        const deviceId = msg.device_id ?? msg.command?.device_id;
        if (
          status === "SUCCEEDED" &&
          cmdType === "ATTACK_MODE_QUERY" &&
          deviceId &&
          resultPayload
        ) {
          setAttackMode(deviceId, resultPayload as Record<string, unknown>);
        }

        // ATTACK_MODE_SET succeeded: show Engage overlay near target
        if (status === "SUCCEEDED" && cmdType === "ATTACK_MODE_SET") {
          const cmd = useCommandsStore
            .getState()
            .commands.find((c) => c.id === commandId);
          const targetId = cmd?.engaged_target_id ?? undefined;
          if (targetId) {
            const jamActive =
              resultPayload &&
              (resultPayload.switch === 1 || resultPayload.sw === 1);
            setEngageOverlay({
              targetId,
              message: jamActive ? "Jam active" : "Command delivered",
              expiresAt: 0,
            });
          }
        }
      }
    },
    [
      missionId,
      addOrUpdateCommand,
      addMissionEvent,
      setAttackMode,
      setEngageOverlay,
    ],
  );

  const eventsStatus = useWs(eventsUrl, onEvent);
  const devicesStatus = useWs(devicesUrl, onDevice);
  const commandsStatus = useWs(commandsUrl, onCommand);

  // Sync statuses to shared store so DashboardPage header can read without duplicate connections
  const setStatuses = useWsStatusStore((s) => s.setStatuses);
  useEffect(() => {
    setStatuses({ eventsStatus, devicesStatus, commandsStatus });
  }, [eventsStatus, devicesStatus, commandsStatus, setStatuses]);

  return { eventsStatus, devicesStatus, commandsStatus };
}
