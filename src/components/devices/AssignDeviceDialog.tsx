"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { missionWorkspaceSectionLabelStyle } from "@/components/missions/MissionWorkspaceShell";
import { FONT, Z } from "@/styles/driifTokens";
import {
  driifDeviceDropdown,
  driifDeviceModalBackdrop,
  driifDeviceModalCard,
  driifDevicePrimaryButton,
  driifDeviceSecondaryButton,
} from "./deviceAdminStyles";
import type { Device } from "@/types/aeroshield";
import type { Mission } from "@/types/aeroshield";
import { useUpdateDevice } from "@/hooks/useDevices";
import { COLOR } from "@/styles/driifTokens";

const UNASSIGNED = "— Unassigned —";

type Props = {
  open: boolean;
  onClose: () => void;
  device: Device | null;
  missions: Mission[];
};

export function AssignDeviceDialog({
  open,
  onClose,
  device,
  missions,
}: Props) {
  const [value, setValue] = useState<string>("");
  const update = useUpdateDevice();
  const dd = driifDeviceDropdown;

  useEffect(() => {
    if (!open || !device) return;
    setValue(device.mission_id ?? "");
  }, [open, device]);

  if (!open || !device) return null;

  const monId = device.monitor_device_id ?? device.serial_number;
  const options = [
    { label: UNASSIGNED, value: "" },
    ...missions.map((m) => ({ label: m.name, value: m.id })),
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ ...driifDeviceModalBackdrop, zIndex: Z.modal }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md p-5 shadow-2xl"
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
            Assign device to mission
          </h2>
        </div>
        <p
          className="mt-4"
          style={{
            color: COLOR.missionsBodyText,
            fontSize: FONT.sizeSm,
            fontFamily: `${FONT.family}, sans-serif`,
            lineHeight: "17px",
          }}
        >
          Device:{" "}
          <span style={{ fontFamily: FONT.mono, color: COLOR.missionsTitleMuted }}>
            {monId}
          </span>
        </p>
        <div className="mt-4">
          <div className="mb-1" style={missionWorkspaceSectionLabelStyle()}>
            Mission
          </div>
          <Dropdown
            options={options}
            value={value}
            onChange={setValue}
            className="border border-solid"
            buttonStyle={dd.buttonStyle}
            textStyle={dd.textStyle}
            menuStyle={dd.menuStyle}
            optionStyle={dd.optionStyle}
            selectedOptionStyle={dd.selectedOptionStyle}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" style={driifDeviceSecondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={driifDevicePrimaryButton}
            disabled={update.isPending}
            onClick={async () => {
              const next = value === "" ? null : value;
              await update.mutateAsync({
                deviceId: device.id,
                body: { mission_id: next },
                previousMissionId: device.mission_id,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
