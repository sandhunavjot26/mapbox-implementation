"use client";

/**
 * Devices inventory as a floating Assets panel over the map — Driif-UI Figma node 2203:31885.
 * Mission / type / status / radar model filters remain available (toggle via filter icon).
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDevicesList } from "@/hooks/useDevices";
import { useMissionsList } from "@/hooks/useMissions";
import { useProtocolsList } from "@/hooks/useProtocolsList";
import { useDeviceLastSeenMap } from "@/hooks/useDeviceLastSeenMap";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import {
  DeviceFilterBar,
  type DeviceListFilters,
} from "@/components/devices/DeviceFilterBar";
import { DevicesTable } from "@/components/devices/DevicesTable";
import { AssignDeviceDialog } from "@/components/devices/AssignDeviceDialog";
import { EditDeviceModal } from "@/components/devices/EditDeviceModal";
import type { Device } from "@/types/aeroshield";
import { COLOR, FONT, POSITION, SPACING } from "@/styles/driifTokens";
import { useAuthStore } from "@/stores/authStore";
import { InlineLoadIndicator } from "@/components/ui/InlineLoadIndicator";
import {
  driifAssetsAddButton,
  driifAssetsBulkChip,
  driifAssetsIconButton,
  driifAssetsPanelSurface,
  driifAssetsSearchShell,
} from "./deviceAdminStyles";

const DEFAULT_FILTERS: DeviceListFilters = {
  missionId: "",
  deviceType: "",
  status: "",
  protocol: "",
};

export type DevicesInventoryOverlayProps = {
  onFocusMissionOnMap?: (missionId: string | null) => void;
  onMapDismissLockChange?: (locked: boolean) => void;
  onRequestAddAsset?: () => void;
};

export function DevicesInventoryOverlay({
  onMapDismissLockChange,
  onRequestAddAsset,
}: DevicesInventoryOverlayProps) {
  const [applied, setApplied] = useState<DeviceListFilters>(DEFAULT_FILTERS);
  const [editId, setEditId] = useState<string | null>(null);
  const [assignDevice, setAssignDevice] = useState<Device | null>(null);
  /* Filters hidden by default — toggled by the filter icon */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const liveStatusById = useDeviceStatusStore((s) => s.byDeviceId);

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

  const { data: devicesData, isLoading, isError } = useDevicesList(
    listParams,
    canRead,
  );
  const devices = devicesData ?? [];
  /** Initial fetch (no cached list yet) — avoids an empty-looking overlay while the API is slow. */
  const assetsListLoading = canRead && !isError && isLoading;
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

  const searchFilteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => {
      const blob = [
        d.name,
        d.serial_number,
        String(d.monitor_device_id ?? ""),
        d.protocol ?? "",
        missionName(d.mission_id),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [devices, searchQuery, missionName]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(searchFilteredDevices.map((d) => d.id)));
  }, [searchFilteredDevices]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const modalOpen = !!(editId || assignDevice);
  useEffect(() => {
    onMapDismissLockChange?.(modalOpen);
    return () => onMapDismissLockChange?.(false);
  }, [modalOpen, onMapDismissLockChange]);

  /* Drop stale selection ids when list changes */
  useEffect(() => {
    const ids = new Set(devices.map((d) => d.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [devices]);

  return (
    <div
      className="driif-mission-scrollbar flex max-h-[min(85vh,calc(100vh-120px))] flex-col overflow-hidden"
      style={{
        ...driifAssetsPanelSurface,
        width: POSITION.assetsWidth,
        maxWidth: "min(96vw, 420px)",
        fontFamily: `${FONT.family}, sans-serif`,
        gap: "14px",
        paddingLeft: SPACING.missionWorkspacePadX,
        paddingRight: SPACING.missionWorkspacePadX,
        paddingTop: SPACING.missionWorkspacePadY,
        paddingBottom: SPACING.missionWorkspacePadY,
      }}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2
          style={{
            color: "#F5F5F5",
            fontSize: "18px",
            fontWeight: FONT.weightMedium,
            lineHeight: "26px",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Assets
        </h2>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            style={{
              ...driifAssetsIconButton,
              outline: filtersOpen
                ? `1px solid ${COLOR.missionsSearchBorder}`
                : undefined,
            }}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Image
              src="/icons/filter.svg"
              alt="Filter"
              width={14}
              height={14}
              unoptimized
            />
          </button>

          {/* Add Asset */}
          <button
            type="button"
            className="shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
            style={driifAssetsAddButton}
            disabled={!onRequestAddAsset}
            onClick={() => onRequestAddAsset?.()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 256 256"
              fill="none"
              aria-hidden
            >
              <path
                d="M120 56v64H56v16h64v64h16v-64h64v-16h-64V56h-16z"
                fill={COLOR.missionsCreateBtnText}
              />
            </svg>
            Add Asset
          </button>
        </div>
      </div>

      {/* ── Select / Deselect chips ── */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          style={driifAssetsBulkChip}
          onClick={selectAllVisible}
        >
          Select All
        </button>
        <button
          type="button"
          style={driifAssetsBulkChip}
          onClick={clearSelection}
        >
          Deselect All
        </button>
      </div>

      {/* ── Search bar ── */}
      <div
        className="flex shrink-0 w-full items-center"
        style={driifAssetsSearchShell}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Assets...."
          aria-label="Search assets"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8F8F8F]"
          style={{
            fontFamily: `var(--font-geist-mono), monospace`,
            fontSize: "14px",
            lineHeight: "20px",
            color: COLOR.missionsBodyText,
          }}
        />
        <Image
          src="/icons/search.svg"
          alt=""
          width={16}
          height={16}
          unoptimized
          aria-hidden
        />
      </div>

      {/* ── Filters drawer (hidden by default, shown on filter click) ── */}
      {filtersOpen && (
        <div
          className="flex shrink-0 flex-col gap-2 border-t border-solid pt-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p
            style={{
              color: COLOR.missionsSecondaryText,
              fontSize: FONT.sizeXs,
              margin: 0,
            }}
          >
            {assetsListLoading ? "Loading…" : `${devices.length} total`}
          </p>
          <DeviceFilterBar
            missions={missions}
            protocols={protocols}
            applied={applied}
            onApply={setApplied}
          />
        </div>
      )}

      {!filtersOpen && (
        <p
          className="shrink-0"
          style={{
            color: COLOR.missionsSecondaryText,
            fontSize: FONT.sizeXs,
            margin: 0,
          }}
        >
          {assetsListLoading ? "Loading…" : `${devices.length} total`}
        </p>
      )}

      {/* ── Device list ── */}
      <div className="driif-mission-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
        {assetsListLoading ? (
          <InlineLoadIndicator label="Loading assets…" />
        ) : (
          <DevicesTable
            devices={searchFilteredDevices}
            liveStatusById={liveStatusById}
            lastSeen={lastSeen}
            missionName={missionName}
            protocolLabel={protocolLabel}
            canRead={canRead}
            canUpdate={canUpdate}
            onEdit={(d) => setEditId(d.id)}
            onAssignMission={(d) => setAssignDevice(d)}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}
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
