"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDevice } from "@/lib/api/devices";
import { deviceDetailKeys } from "@/hooks/useDeviceDetail";
import type { Device, DevicePatch, DeviceType } from "@/types/aeroshield";
import type { ProtocolOut } from "@/types/aeroshield";
import { missionWorkspaceSectionLabelStyle } from "@/components/missions/MissionWorkspaceShell";
import { Dropdown } from "@/components/ui/Dropdown";
import { InlineLoadIndicator } from "@/components/ui/InlineLoadIndicator";
import { useUpdateDevice } from "@/hooks/useDevices";
import { COLOR, FONT, Z } from "@/styles/driifTokens";
import {
  driifDeviceDropdown,
  driifDeviceModalBackdrop,
  driifDeviceModalCard,
  driifDevicePrimaryButton,
  driifDeviceSecondaryButton,
  driifDeviceTextField,
} from "./deviceAdminStyles";

const SWATCHES: { label: string; hex: string | null }[] = [
  { label: "None", hex: null },
  { label: "Cyan", hex: "#22d3ee" },
  { label: "Orange", hex: "#f97316" },
  { label: "Purple", hex: "#a78bfa" },
  { label: "Green", hex: "#22c55e" },
  { label: "Red", hex: "#f87171" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Yellow", hex: "#eab308" },
  { label: "Crimson", hex: "#ef4444" },
];

const ROLES: { label: string; value: DeviceType }[] = [
  { label: "Detection", value: "DETECTION" },
  { label: "Jammer", value: "JAMMER" },
  { label: "Detection + Jammer", value: "DETECTION_JAMMER" },
];

function toBeam(v: number | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function resolveColor(
  f: { color: string | null; customHex: string }
): string | null {
  if (f.color) return f.color;
  const t = f.customHex.trim();
  if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(t)) return t;
  return null;
}

function buildPatch(
  a: Device,
  f: {
    name: string;
    color: string | null;
    customHex: string;
    device_type: DeviceType;
    protocol: string;
    detection_radius_m: string;
    jammer_radius_m: string;
    breach_green_m: string;
    breach_yellow_m: string;
    breach_red_m: string;
    detection_beam: string;
    jammer_beam: string;
    lat: string;
    lon: string;
  }
): DevicePatch {
  const p: DevicePatch = {};
  const color = resolveColor(f);

  if (f.name !== a.name) p.name = f.name;
  if ((color ?? null) !== (a.color ?? null)) p.color = color;
  if (f.device_type !== a.device_type) p.device_type = f.device_type;
  if (f.protocol !== (a.protocol ?? "")) p.protocol = f.protocol;

  const dr = Number(f.detection_radius_m);
  if (!Number.isNaN(dr) && dr !== a.detection_radius_m) p.detection_radius_m = dr;
  const jr = Number(f.jammer_radius_m);
  if (!Number.isNaN(jr) && jr !== a.jammer_radius_m) p.jammer_radius_m = jr;

  const bg = Number(f.breach_green_m);
  if (!Number.isNaN(bg) && bg !== (a.breach_green_m ?? undefined))
    p.breach_green_m = bg;
  const by = Number(f.breach_yellow_m);
  if (!Number.isNaN(by) && by !== (a.breach_yellow_m ?? undefined))
    p.breach_yellow_m = by;
  const br = Number(f.breach_red_m);
  if (!Number.isNaN(br) && br !== (a.breach_red_m ?? undefined))
    p.breach_red_m = br;

  const lat = Number(f.lat);
  if (!Number.isNaN(lat) && lat !== a.latitude) p.latitude = lat;
  const lon = Number(f.lon);
  if (!Number.isNaN(lon) && lon !== a.longitude) p.longitude = lon;

  const db = f.detection_beam.trim();
  const da = a.detection_beam_deg ?? null;
  if (db === "" && da !== null) p.detection_beam_deg = null;
  else if (db !== "") {
    const n = Number(db);
    if (!Number.isNaN(n) && n !== da) p.detection_beam_deg = n;
  }
  const jb = f.jammer_beam.trim();
  const ja = a.jammer_beam_deg ?? null;
  if (jb === "" && ja !== null) p.jammer_beam_deg = null;
  else if (jb !== "") {
    const n = Number(jb);
    if (!Number.isNaN(n) && n !== ja) p.jammer_beam_deg = n;
  }

  return p;
}

type Props = {
  open: boolean;
  deviceId: string | null;
  onClose: () => void;
  protocols: ProtocolOut[];
};

export function EditDeviceModal({ open, deviceId, onClose, protocols }: Props) {
  const update = useUpdateDevice();
  const dd = driifDeviceDropdown;
  const { data: remote, isLoading } = useQuery({
    queryKey: deviceId ? deviceDetailKeys.one(deviceId) : ["devices", "detail", "none"],
    queryFn: () => getDevice(deviceId!),
    enabled: open && !!deviceId,
  });

  const [f, setF] = useState({
    name: "",
    color: null as string | null,
    customHex: "#ff0000",
    device_type: "DETECTION" as DeviceType,
    protocol: "",
    detection_radius_m: "5000",
    jammer_radius_m: "2500",
    breach_green_m: "5000",
    breach_yellow_m: "2500",
    breach_red_m: "1000",
    detection_beam: "",
    jammer_beam: "",
    lat: "0",
    lon: "0",
  });

  useEffect(() => {
    if (!remote) return;
    setF({
      name: remote.name,
      color: remote.color,
      customHex: remote.color && /^#/.test(remote.color) ? remote.color : "#ff0000",
      device_type: remote.device_type,
      protocol: remote.protocol ?? "",
      detection_radius_m: String(remote.detection_radius_m ?? ""),
      jammer_radius_m: String(remote.jammer_radius_m ?? ""),
      breach_green_m: String(remote.breach_green_m ?? "5000"),
      breach_yellow_m: String(remote.breach_yellow_m ?? "2500"),
      breach_red_m: String(remote.breach_red_m ?? "1000"),
      detection_beam: toBeam(remote.detection_beam_deg),
      jammer_beam: toBeam(remote.jammer_beam_deg),
      lat: String(remote.latitude),
      lon: String(remote.longitude),
    });
  }, [remote]);

  const protocolOptions = useMemo(() => {
    const list = protocols.map((p) => ({
      label: p.display_name || p.name,
      value: p.name,
    }));
    if (f.protocol && !list.some((l) => l.value === f.protocol)) {
      return [{ label: f.protocol, value: f.protocol }, ...list];
    }
    return list;
  }, [protocols, f.protocol]);

  if (!open || !deviceId) return null;

  const monId = remote?.monitor_device_id ?? remote?.serial_number ?? "";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4"
      style={{ ...driifDeviceModalBackdrop, zIndex: Z.modal }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="my-8 w-full max-w-lg p-5 shadow-2xl"
        style={driifDeviceModalCard}
      >
        <div
          className="pb-3"
          style={{ borderBottom: `1px solid ${COLOR.missionsSearchBorder}` }}
        >
          <h2
            style={{
              color: COLOR.missionsTitleMuted,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeMd,
              fontWeight: FONT.weightMedium,
              lineHeight: "21px",
            }}
          >
            Edit device
          </h2>
          <p
            className="mt-0.5"
            style={{
              fontFamily: FONT.mono,
              fontSize: FONT.sizeXs,
              color: COLOR.missionsSecondaryText,
              lineHeight: "15px",
            }}
          >
            {monId}
          </p>
        </div>

        {isLoading || !remote ? (
          <InlineLoadIndicator
            className="mt-4 py-6"
            label="Loading device…"
            minHeight="8rem"
            spinnerSize={28}
            align="start"
          />
        ) : (
          <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                Name
              </div>
              <input
                style={driifDeviceTextField}
                value={f.name}
                onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                Colour
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((s) => {
                  const active =
                    s.hex === f.color || (s.hex === null && f.color === null);
                  return (
                    <button
                      key={s.label}
                      type="button"
                      title={s.label}
                      onClick={() => setF((x) => ({ ...x, color: s.hex }))}
                      className="h-7 w-7 rounded border"
                      style={{
                        background: s.hex ?? "transparent",
                        borderColor: active
                          ? COLOR.accentCyan
                          : "rgba(255,255,255,0.2)",
                        boxShadow: active
                          ? `0 0 0 1px ${COLOR.accentCyan}`
                          : "none",
                      }}
                    />
                  );
                })}
                <div className="flex items-center gap-1 pl-1">
                  <span
                    style={{ fontSize: "10px", color: COLOR.missionsSecondaryText }}
                  >
                    custom
                  </span>
                  <input
                    style={{
                      ...driifDeviceTextField,
                      width: "6rem",
                      minHeight: 32,
                      padding: "0 8px",
                      fontFamily: FONT.mono,
                      fontSize: FONT.sizeSm,
                    }}
                    value={f.customHex}
                    onChange={(e) =>
                      setF((x) => ({ ...x, customHex: e.target.value, color: null }))
                    }
                    placeholder="#ff0000"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Device role
                </div>
                <Dropdown
                  options={ROLES.map((r) => ({ label: r.label, value: r.value }))}
                  value={f.device_type}
                  onChange={(v) =>
                    setF((s) => ({ ...s, device_type: v as DeviceType }))
                  }
                  className="border border-solid"
                  buttonStyle={dd.buttonStyle}
                  textStyle={dd.textStyle}
                  menuStyle={dd.menuStyle}
                  optionStyle={dd.optionStyle}
                  selectedOptionStyle={dd.selectedOptionStyle}
                />
              </div>
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Radar model
                </div>
                <Dropdown
                  options={protocolOptions}
                  value={f.protocol}
                  onChange={(v) => setF((s) => ({ ...s, protocol: v }))}
                  className="border border-solid"
                  buttonStyle={dd.buttonStyle}
                  textStyle={dd.textStyle}
                  menuStyle={dd.menuStyle}
                  optionStyle={dd.optionStyle}
                  selectedOptionStyle={dd.selectedOptionStyle}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Detection radius (m)
                </div>
                <input
                  type="number"
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.detection_radius_m}
                  onChange={(e) => setF((s) => ({ ...s, detection_radius_m: e.target.value }))}
                />
              </div>
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Jammer radius (m)
                </div>
                <input
                  type="number"
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.jammer_radius_m}
                  onChange={(e) => setF((s) => ({ ...s, jammer_radius_m: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Detection beam (°)
                </div>
                <input
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  placeholder="blank = protocol default"
                  value={f.detection_beam}
                  onChange={(e) => setF((s) => ({ ...s, detection_beam: e.target.value }))}
                />
                <p
                  className="mt-0.5"
                  style={{ fontSize: "10px", color: COLOR.missionsSecondaryText }}
                >
                  360 = omni · &lt;360 = wedge
                </p>
              </div>
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Jammer beam (°)
                </div>
                <input
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  placeholder="blank = protocol default"
                  value={f.jammer_beam}
                  onChange={(e) => setF((s) => ({ ...s, jammer_beam: e.target.value }))}
                />
                <p
                  className="mt-0.5"
                  style={{ fontSize: "10px", color: COLOR.missionsSecondaryText }}
                >
                  360 = omni · &lt;360 = wedge
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Breach green (m)
                </div>
                <input
                  type="number"
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.breach_green_m}
                  onChange={(e) => setF((s) => ({ ...s, breach_green_m: e.target.value }))}
                />
              </div>
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Breach yellow (m)
                </div>
                <input
                  type="number"
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.breach_yellow_m}
                  onChange={(e) => setF((s) => ({ ...s, breach_yellow_m: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                Breach red (m)
              </div>
              <input
                type="number"
                style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                value={f.breach_red_m}
                onChange={(e) => setF((s) => ({ ...s, breach_red_m: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Latitude
                </div>
                <input
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.lat}
                  onChange={(e) => setF((s) => ({ ...s, lat: e.target.value }))}
                />
              </div>
              <div>
                <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                  Longitude
                </div>
                <input
                  style={{ ...driifDeviceTextField, fontFamily: FONT.mono }}
                  value={f.lon}
                  onChange={(e) => setF((s) => ({ ...s, lon: e.target.value }))}
                />
              </div>
            </div>
            <p
              style={{ fontSize: "11px", color: COLOR.missionsSecondaryText }}
            >
              or drag the radar on the Mission map to reposition
            </p>
            <fieldset disabled className="space-y-2 opacity-50">
              <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
                Connection mode
              </div>
              <label
                className="flex items-center gap-2"
                style={{ fontSize: FONT.sizeSm, color: COLOR.missionsBodyText }}
              >
                <input type="radio" name="conn" defaultChecked readOnly />
                Edge-connector (laptop bridges to cloud)
              </label>
              <label
                className="flex items-center gap-2"
                style={{ fontSize: FONT.sizeSm, color: COLOR.missionsBodyText }}
              >
                <input type="radio" name="conn" readOnly />
                Direct radar (firmware dials cloud)
              </label>
              <p
                style={{ fontSize: "10px", color: COLOR.missionReviewSummaryLabel }}
              >
                Not in device PATCH schema yet — UI only.
              </p>
            </fieldset>
            <div
              className="flex justify-end gap-2 border-t pt-2"
              style={{ borderColor: COLOR.missionsSearchBorder }}
            >
              <button type="button" style={driifDeviceSecondaryButton} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                style={driifDevicePrimaryButton}
                disabled={update.isPending}
                onClick={async () => {
                  const patch = buildPatch(remote, f);
                  if (Object.keys(patch).length === 0) {
                    onClose();
                    return;
                  }
                  await update.mutateAsync({
                    deviceId: deviceId!,
                    body: patch,
                    previousMissionId: remote.mission_id,
                  });
                  onClose();
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
