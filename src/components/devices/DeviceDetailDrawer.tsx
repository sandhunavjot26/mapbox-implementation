"use client";

import { useRouter } from "next/navigation";
import type { Device } from "@/types/aeroshield";
import { useDeviceDetailQueries } from "@/hooks/useDeviceDetail";
import { missionWorkspaceSectionLabelStyle } from "@/components/missions/MissionWorkspaceShell";
import { COLOR, FONT, Z } from "@/styles/driifTokens";
import {
  driifAssetsMutedStatusPill,
  driifAssetsOfflineStatusPill,
  driifAssetsOnlineStatusPill,
  driifAssetsPanelSurface,
  driifDevicePrimaryButton,
  driifDeviceSecondaryButton,
} from "./deviceAdminStyles";
import { InlineLoadIndicator } from "@/components/ui/InlineLoadIndicator";

type Props = {
  open: boolean;
  onClose: () => void;
  device: Device | null;
  onOpenOnMap?: (missionId: string | null) => void;
};

function statusRowStyle(status: string | undefined) {
  if (status === "ONLINE") return driifAssetsOnlineStatusPill;
  if (status === "OFFLINE") return driifAssetsOfflineStatusPill;
  return driifAssetsMutedStatusPill;
}

export function DeviceDetailDrawer({ open, onClose, device, onOpenOnMap }: Props) {
  const router = useRouter();
  const id = open && device ? device.id : null;
  const { deviceQ, stateQ, configQ } = useDeviceDetailQueries(id, open);

  const d = deviceQ.data ?? device;
  const s = stateQ.data;
  const c = configQ.data as
    | {
        ip_port?: { ip: string; port: number };
        gateway_ip?: string;
        band_range?: { enable: number; start: number; end: number; att: number }[];
      }
    | undefined;

  if (!open) return null;

  const drawerAsideStyle = {
    ...driifAssetsPanelSurface,
    borderRadius: 0,
    borderRight: "none",
    borderTop: "none",
    borderBottom: "none",
    boxShadow: "none",
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        style={{ background: "rgba(0,0,0,0.5)", zIndex: Z.modal - 5 }}
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l shadow-2xl"
        style={{
          ...drawerAsideStyle,
          zIndex: Z.modal,
          borderLeft: `1px solid rgba(255,255,255,0.12)`,
          padding: "16px",
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              style={{
                color: COLOR.missionsBodyText,
                fontSize: FONT.missionWorkspaceTitleSize,
                fontWeight: FONT.weightMedium,
                lineHeight: FONT.missionWorkspaceTitleLineHeight,
              }}
            >
              {d?.name ?? "—"}
            </h2>
            <p
              style={{
                fontFamily: FONT.mono,
                fontSize: FONT.sizeXs,
                color: COLOR.missionsSecondaryText,
                marginTop: 4,
              }}
            >
              {d?.monitor_device_id ?? d?.serial_number}
            </p>
            {d && (
              <span
                className="mt-2 inline-block"
                style={{
                  ...statusRowStyle(d.status),
                  textTransform: "capitalize",
                }}
              >
                {d.status === "ONLINE"
                  ? "Online"
                  : d.status === "OFFLINE"
                    ? "Offline"
                    : d.status}
              </span>
            )}
          </div>
          <button type="button" style={driifDeviceSecondaryButton} onClick={onClose}>
            Close
          </button>
        </div>

        <h3 className="mt-6 mb-2" style={missionWorkspaceSectionLabelStyle()}>
          Live state
        </h3>
        {stateQ.isLoading && (
          <InlineLoadIndicator
            label="Loading live state…"
            minHeight="4.5rem"
            spinnerSize={24}
            className="py-3"
            align="start"
          />
        )}
        {s && (
          <ul
            className="space-y-1.5 rounded-[4px] p-3 font-mono text-sm"
            style={{
              color: COLOR.missionsBodyText,
              background: COLOR.missionsPanelBg,
              border: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            <li>last_seen: {s.last_seen ?? "—"}</li>
            <li>battery: {s.battery_pct ?? "—"}%</li>
            <li>power: {s.power_mode ?? "—"}</li>
            <li>temp: {s.temp_c ?? "—"} °C</li>
            <li>humidity: {s.humidity_pct ?? "—"}%</li>
            <li>azimuth: {s.azimuth_deg ?? "—"}°</li>
            <li>elevation: {s.elevation_deg ?? "—"}°</li>
            <li>lat: {s.lat ?? "—"}</li>
            <li>lon: {s.lon ?? "—"}</li>
            <li>alt: {s.alt_m ?? "—"} m</li>
          </ul>
        )}

        <h3 className="mt-6 mb-2" style={missionWorkspaceSectionLabelStyle()}>
          Config
        </h3>
        {c && (
          <div
            className="space-y-1 break-all rounded-[4px] p-3 font-mono text-xs"
            style={{
              color: COLOR.missionsBodyText,
              background: COLOR.missionsPanelBg,
              border: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            <p>ip: {c.ip_port ? `${c.ip_port.ip}:${c.ip_port.port}` : "—"}</p>
            <p>gateway: {c.gateway_ip ?? "—"}</p>
            {c.band_range && c.band_range.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-[11px]">
                {c.band_range.slice(0, 6).map((b, i) => (
                  <li key={i}>
                    {b.enable ? "on" : "off"} {b.start}–{b.end} MHz att {b.att}
                  </li>
                ))}
                {c.band_range.length > 6 && <li>…</li>}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            style={{ ...driifDevicePrimaryButton, width: "100%" }}
            onClick={() => {
              if (onOpenOnMap) {
                onOpenOnMap(d?.mission_id ?? null);
              } else {
                if (d?.mission_id) {
                  router.push(
                    `/dashboard?setMission=${encodeURIComponent(d.mission_id)}`
                  );
                } else {
                  router.push("/dashboard");
                }
              }
              onClose();
            }}
          >
            Open on map
          </button>
        </div>
      </aside>
    </>
  );
}
