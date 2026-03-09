/**
 * useMissionSockets — connects to events, devices, commands WebSocket streams.
 * Device-service: events (DETECTED, JAMMED, COMMAND_*), devices (device_state_update, device_online, device_offline).
 * Command-service: commands (command_status_update, command_sent, command_response, command_failed, command_timeout).
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWsStatusStore } from "@/stores/wsStatusStore";
import { useMissionStore } from "@/stores/missionStore";
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
import { useAttackModeStore } from "@/stores/attackModeStore";
import { useEngageOverlayStore } from "@/stores/engageOverlayStore";

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
          RECONNECT_MAX_MS
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
  const token = useAuthStore((s) => s.getToken());
  const missionId = useMissionStore((s) => s.activeMissionId);
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const addOrUpdateTarget = useTargetsStore((s) => s.addOrUpdateTarget);
  const markTargetLost = useTargetsStore((s) => s.markTargetLost);
  const addOrUpdateCommand = useCommandsStore((s) => s.addOrUpdateCommand);
  const setDeviceStatus = useDeviceStatusStore((s) => s.setDeviceStatus);
  const addMissionEvent = useMissionEventsStore((s) => s.addEvent);
  const setAttackMode = useAttackModeStore((s) => s.setAttackMode);
  const setEngageOverlay = useEngageOverlayStore((s) => s.setOverlay);

  const eventsUrl =
    missionId && token ? getEventsWsUrl(missionId, token) : null;
  const devicesUrl =
    missionId && token ? getDevicesWsUrl(missionId, token) : null;
  const commandsUrl =
    missionId && token ? getCommandsWsUrl(missionId, token) : null;

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

      const ev = msg.event;
      const eventType = ev.event_type ?? "";
      const payload = ev.payload ?? {};
      const eventId =
        ev.id ?? `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Add to timeline (DETECTED, JAM_STARTED, COMMAND_*)
      addMissionEvent({
        id: eventId,
        mission_id: ev.mission_id ?? missionId ?? "",
        device_id: ev.device_id ?? null,
        event_type: eventType,
        ts: ev.ts ?? new Date().toISOString(),
        payload: Object.keys(payload).length ? payload : null,
      });

      // DETECTED: add/update target for map (nested payload.uav structure)
      if (eventType === "DETECTED") {
        const uav = payload.uav as Record<string, unknown> | undefined;
        if (uav) {
          // Resolve device_id: event level, or from payload.monitor_device_id via mission devices
          let deviceId = ev.device_id ?? null;
          if (!deviceId && payload.monitor_device_id != null && cachedMission?.devices) {
            const d = cachedMission.devices.find(
              (dev) => dev.monitor_device_id === payload.monitor_device_id
            );
            deviceId = d?.id ?? null;
          }
          const target = uavPayloadToTarget(
            uav as unknown as Parameters<typeof uavPayloadToTarget>[0],
            deviceId,
            eventId,
          );
          addOrUpdateTarget(target);
        }
      }

      // TRACK_UPDATE: continuous position updates (flat payload: lat, lon, target_uid, etc.)
      // Merges with existing target; creates new if track appeared without prior DETECTED
      if (eventType === "TRACK_UPDATE") {
        const trackPayload = payload as unknown as Parameters<typeof trackUpdatePayloadToTarget>[0];
        if (trackPayload.target_uid && trackPayload.lat != null && trackPayload.lon != null) {
          const target = trackUpdatePayloadToTarget(trackPayload);
          addOrUpdateTarget(target);
        }
      }

      // TRACK_LOST: backend signals track loss — mark target as lost (greyed on map)
      if (eventType === "TRACK_LOST" || eventType === "TRACK_END") {
        const targetUid = (payload.target_uid ?? payload.target_id) as string | undefined;
        if (targetUid) {
          markTargetLost(targetUid);
        }
      }
    },
    [missionId, cachedMission, addOrUpdateTarget, addMissionEvent, markTargetLost],
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
      };
      if (
        (msg.type === "device_state_update" ||
          msg.type === "device_online" ||
          msg.type === "device_offline") &&
        msg.device_id
      ) {
        const isOnline = msg.type !== "device_offline";
        setDeviceStatus({
          device_id: msg.device_id,
          monitor_device_id: msg.monitor_device_id,
          status: isOnline ? (msg.status ?? "ONLINE") : "OFFLINE",
          last_seen: msg.last_seen ?? new Date().toISOString(),
          name: msg.name,
          op_status: msg.op_status,
        });
      }
    },
    [setDeviceStatus],
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
      const resultPayload = msg.result ?? msg.command?.result ?? msg.payload?.result;

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
          mission_id: msg.mission_id ?? msg.command?.mission_id ?? missionId ?? "",
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
        if (status === "SUCCEEDED" && cmdType === "ATTACK_MODE_QUERY" && deviceId && resultPayload) {
          setAttackMode(deviceId, resultPayload as Record<string, unknown>);
        }

        // ATTACK_MODE_SET succeeded: show Engage overlay near target
        if (status === "SUCCEEDED" && cmdType === "ATTACK_MODE_SET") {
          const cmd = useCommandsStore.getState().commands.find((c) => c.id === commandId);
          const targetId = cmd?.engaged_target_id ?? undefined;
          if (targetId) {
            const jamActive = resultPayload && (resultPayload.switch === 1 || resultPayload.sw === 1);
            setEngageOverlay({
              targetId,
              message: jamActive ? "Jam active" : "Command delivered",
              expiresAt: 0,
            });
          }
        }
      }
    },
    [missionId, addOrUpdateCommand, addMissionEvent, setAttackMode, setEngageOverlay],
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
