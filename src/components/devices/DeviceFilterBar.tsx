"use client";

import { useEffect, useState } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { missionWorkspaceSectionLabelStyle } from "@/components/missions/MissionWorkspaceShell";
import { SPACING } from "@/styles/driifTokens";
import {
  driifDeviceDropdown,
  driifDevicePrimaryButton,
} from "./deviceAdminStyles";
import type { Mission } from "@/types/aeroshield";
import type { ProtocolOut } from "@/types/aeroshield";

export type DeviceListFilters = {
  missionId: string;
  deviceType: string;
  status: string;
  protocol: string;
};

const ALL = { label: "All", value: "" };
const TYPES = [
  ALL,
  { label: "Detection", value: "DETECTION" },
  { label: "Jammer", value: "JAMMER" },
  { label: "Detection + Jammer", value: "DETECTION_JAMMER" },
];
const STATUS_OPTS = [
  ALL,
  { label: "ONLINE", value: "ONLINE" },
  { label: "OFFLINE", value: "OFFLINE" },
];

type Props = {
  missions: Mission[];
  protocols: ProtocolOut[];
  applied: DeviceListFilters;
  onApply: (f: DeviceListFilters) => void;
};

export function DeviceFilterBar({ missions, protocols, applied, onApply }: Props) {
  const [draft, setDraft] = useState<DeviceListFilters>(applied);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const missionOptions = [
    { label: "All missions", value: "" },
    ...missions.map((m) => ({ label: m.name, value: m.id })),
  ];
  const protocolOptions = [
    { label: "All", value: "" },
    ...protocols.map((p) => ({ label: p.display_name || p.name, value: p.name })),
  ];

  const dd = driifDeviceDropdown;

  return (
    <div
      className="flex flex-wrap items-end"
      style={{ gap: SPACING.missionCreateStackGapMd }}
    >
      <div className="min-w-[128px] flex-1" style={{ maxWidth: 200 }}>
        <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
          Mission
        </div>
        <Dropdown
          options={missionOptions}
          value={draft.missionId}
          onChange={(v) => setDraft((d) => ({ ...d, missionId: v }))}
          className="border border-solid"
          buttonStyle={dd.buttonStyle}
          textStyle={dd.textStyle}
          menuStyle={dd.menuStyle}
          optionStyle={dd.optionStyle}
          selectedOptionStyle={dd.selectedOptionStyle}
        />
      </div>
      <div className="min-w-[120px] flex-1" style={{ maxWidth: 180 }}>
        <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
          Type
        </div>
        <Dropdown
          options={TYPES}
          value={draft.deviceType}
          onChange={(v) => setDraft((d) => ({ ...d, deviceType: v }))}
          className="border border-solid"
          buttonStyle={dd.buttonStyle}
          textStyle={dd.textStyle}
          menuStyle={dd.menuStyle}
          optionStyle={dd.optionStyle}
          selectedOptionStyle={dd.selectedOptionStyle}
        />
      </div>
      <div className="min-w-[100px] flex-1" style={{ maxWidth: 140 }}>
        <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
          Status
        </div>
        <Dropdown
          options={STATUS_OPTS}
          value={draft.status}
          onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
          className="border border-solid"
          buttonStyle={dd.buttonStyle}
          textStyle={dd.textStyle}
          menuStyle={dd.menuStyle}
          optionStyle={dd.optionStyle}
          selectedOptionStyle={dd.selectedOptionStyle}
        />
      </div>
      <div className="min-w-[160px] flex-[1.2]" style={{ maxWidth: 240 }}>
        <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
          Radar model
        </div>
        <Dropdown
          options={protocolOptions}
          value={draft.protocol}
          onChange={(v) => setDraft((d) => ({ ...d, protocol: v }))}
          className="border border-solid"
          buttonStyle={dd.buttonStyle}
          textStyle={dd.textStyle}
          menuStyle={dd.menuStyle}
          optionStyle={dd.optionStyle}
          selectedOptionStyle={dd.selectedOptionStyle}
        />
      </div>
      <div className="flex shrink-0 items-end" style={{ paddingBottom: 1 }}>
        <button
          type="button"
          style={driifDevicePrimaryButton}
          onClick={() => onApply(draft)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
