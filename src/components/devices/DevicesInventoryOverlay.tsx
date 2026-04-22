"use client";

/**
 * Devices inventory as a floating panel over the map — matches Missions overlay tokens + typography.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDevicesList } from "@/hooks/useDevices";
import { useMissionsList } from "@/hooks/useMissions";
import { useProtocolsList } from "@/hooks/useProtocolsList";
import { useDeviceLastSeenMap } from "@/hooks/useDeviceLastSeenMap";
import {
  DeviceFilterBar,
  type DeviceListFilters,
} from "@/components/devices/DeviceFilterBar";
import { DevicesTable } from "@/components/devices/DevicesTable";
import { AssignDeviceDialog } from "@/components/devices/AssignDeviceDialog";
import { EditDeviceModal } from "@/components/devices/EditDeviceModal";
import type { Device } from "@/types/aeroshield";
import { COLOR, FONT, POSITION, SPACING } from "@/styles/driifTokens";
import { missionWorkspaceTitleStyle } from "@/components/missions/MissionWorkspaceShell";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_FILTERS: DeviceListFilters = {
  missionId: "",
  deviceType: "",
  status: "",
  protocol: "",
};

export type DevicesInventoryOverlayProps = {
  onFocusMissionOnMap?: (missionId: string | null) => void;
  onMapDismissLockChange?: (locked: boolean) => void;
};

export function DevicesInventoryOverlay({
  onFocusMissionOnMap,
  onMapDismissLockChange,
}: DevicesInventoryOverlayProps) {
  const [applied, setApplied] = useState<DeviceListFilters>(DEFAULT_FILTERS);
  const [editId, setEditId] = useState<string | null>(null);
  const [assignDevice, setAssignDevice] = useState<Device | null>(null);

  const has = useAuthStore((s) => s.hasPermission);
  const canRead = has("device:read");
  const canUpdate = has("device:update");

  const listParams = useMemo(
    () => ({
      mission_id: applied.missionId || undefined,
      device_type: applied.deviceType || undefined,
      status: applied.status || undefined,
      protocol: applied.protocol || undefined,
    }),
    [applied]
  );

  const { data: devices = [], isLoading, isError } = useDevicesList(
    listParams,
    canRead
  );
  const { data: missions = [] } = useMissionsList();
  const { data: protocols = [] } = useProtocolsList();
  const lastSeen = useDeviceLastSeenMap(devices);

  const missionName = useCallback(
    (id: string | null) => {
      if (!id) return "—";
      return missions.find((m) => m.id === id)?.name ?? id.slice(0, 8) + "…";
    },
    [missions]
  );

  const protocolLabel = useCallback(
    (name: string | undefined) => {
      if (!name) return "";
      return protocols.find((p) => p.name === name)?.display_name ?? name;
    },
    [protocols]
  );

  const modalOpen = !!(editId || assignDevice);
  useEffect(() => {
    onMapDismissLockChange?.(modalOpen);
    return () => onMapDismissLockChange?.(false);
  }, [modalOpen, onMapDismissLockChange]);

  return (
    <div
      className="driif-mission-scrollbar flex max-h-[min(70vh,calc(100vh-120px))] flex-col overflow-hidden rounded-[2px] shadow-2xl"
      style={{
        width: POSITION.devicesInventoryWidth,
        maxWidth: "100%",
        background: COLOR.missionsPanelBg,
        fontFamily: `${FONT.family}, sans-serif`,
        border: `1px solid ${COLOR.missionsSearchBorder}`,
      }}
    >
      <div
        className="flex shrink-0 flex-col"
        style={{
          gap: SPACING.missionListHeaderGap,
          paddingLeft: SPACING.missionWorkspacePadX,
          paddingRight: SPACING.missionWorkspacePadX,
          paddingTop: SPACING.missionWorkspacePadY,
          paddingBottom: SPACING.missionCreateBlockGapSm,
          borderBottom: `1px solid ${COLOR.missionsSearchBorder}`,
        }}
      >
        <div>
          <h2 style={missionWorkspaceTitleStyle()}>Devices</h2>
        </div>
        <p
          style={{
            color: COLOR.missionsSecondaryText,
            fontSize: FONT.sizeSm,
            lineHeight: "17px",
            marginTop: -2,
          }}
        >
          {isLoading ? "…" : `${devices.length} total`}
        </p>
        <DeviceFilterBar
          missions={missions}
          protocols={protocols}
          applied={applied}
          onApply={setApplied}
        />
      </div>

      <div
        className="driif-mission-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-auto"
        style={{
          paddingLeft: SPACING.missionWorkspacePadX,
          paddingRight: SPACING.missionWorkspacePadX,
          paddingTop: SPACING.missionCreateBlockGapSm,
          paddingBottom: SPACING.missionWorkspacePadY,
        }}
      >
        {isError && (
          <p
            className="py-2"
            style={{
              color: COLOR.statusDanger,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Failed to load devices.
          </p>
        )}
        <DevicesTable
          devices={devices}
          lastSeen={lastSeen}
          missionName={missionName}
          protocolLabel={protocolLabel}
          canRead={canRead}
          canUpdate={canUpdate}
          onEdit={(d) => setEditId(d.id)}
          onAssignMission={(d) => setAssignDevice(d)}
        />
      </div>

      <EditDeviceModal
        open={!!editId}
        deviceId={editId}
        onClose={() => setEditId(null)}
        protocols={protocols}
      />

      <AssignDeviceDialog
        open={!!assignDevice}
        onClose={() => setAssignDevice(null)}
        device={assignDevice}
        missions={missions}
      />
    </div>
  );
}
