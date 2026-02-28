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
import { useTargetsStore, uavPayloadToTarget } from "@/stores/targetsStore";
import { useCommandsStore } from "@/stores/commandsStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";

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

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        attemptRef.current = 0; // reset backoff on success
      };
      ws.onclose = () => {
        setStatus("closed");
        wsRef.current = null;
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, attemptRef.current),
          RECONNECT_MAX_MS
        );
        attemptRef.current++;
        timeoutId = setTimeout(connect, delay);
      };
      ws.onerror = () => setStatus("error");
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessageRef.current(data);
        } catch {
          // ignore parse errors
        }
      };
    };

    connect();
    return () => {
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
  const addOrUpdateTarget = useTargetsStore((s) => s.addOrUpdateTarget);
  const addOrUpdateCommand = useCommandsStore((s) => s.addOrUpdateCommand);
  const setDeviceStatus = useDeviceStatusStore((s) => s.setDeviceStatus);
  const addMissionEvent = useMissionEventsStore((s) => s.addEvent);

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

      // DETECTED: add/update target for map
      if (eventType === "DETECTED") {
        const uav = payload.uav as Record<string, unknown> | undefined;
        if (uav) {
          // device_id is at the event level, not inside payload (per doc Section 2.2)
          const deviceId = ev.device_id ?? null;
          const target = uavPayloadToTarget(
            uav as unknown as Parameters<typeof uavPayloadToTarget>[0],
            deviceId,
            eventId,
          );
          addOrUpdateTarget(target);
        }
      }
    },
    [missionId, addOrUpdateTarget, addMissionEvent],
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
        op_status?: string;
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
      // Backend sends flat messages: { type, command_id, status, ... }
      // Types: command_status_update, command_sent, command_response, command_failed, command_timeout
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
        };
        // Flat format fields
        mission_id?: string;
        device_id?: string | null;
        command_type?: string;
        status?: string;
        approved_count?: number;
        required_approvals?: number;
        last_error?: string | null;
      };

      const commandTypes = [
        "command_status_update",
        "command_sent",
        "command_response",
        "command_failed",
        "command_timeout",
      ];

      if (!msg.type || !commandTypes.includes(msg.type)) return;

      // Support both flat format (confirmed) and nested format (fallback)
      const commandId = msg.command_id ?? msg.command?.id;
      if (!commandId) return;

      const status =
        msg.status ??
        msg.command?.status ??
        (msg.type === "command_sent"
          ? "SENT"
          : msg.type === "command_failed"
            ? "FAILED"
            : msg.type === "command_timeout"
              ? "TIMEOUT"
              : "PENDING");

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
      });
    },
    [addOrUpdateCommand],
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
