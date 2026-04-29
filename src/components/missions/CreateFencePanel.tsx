"use client";

import Image from "next/image";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import type { SavedFence } from "@/types/aeroshield";
import {
  MissionWorkspaceHeader,
  MissionWorkspacePanel,
} from "@/components/missions/MissionWorkspaceShell";

export type CreateFencePanelProps = {
  fences: SavedFence[];
  onBack: () => void;
  onDeleteFence: (name: string) => void;
};

export function CreateFencePanel({
  fences,
  onBack,
  onDeleteFence,
}: CreateFencePanelProps) {
  return (
    <MissionWorkspacePanel fillHeight={false} className="w-[398px]">
      <MissionWorkspaceHeader title="Create Fence" onBack={onBack} />

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          marginTop: SPACING.missionWorkspaceContentGap,
          gap: SPACING.missionCreateBlockGapSm,
        }}
      >
        {fences.length === 0 ? (
            <p
              className="py-6 text-center italic opacity-50"
              style={{
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.missionWorkspaceEmptyHintSize,
                lineHeight: "21px",
              }}
            >
              No fences added yet. Use the draw tools to create one.
            </p>
          ) : (
            fences.map((fence) => (
              <div
                key={fence.name}
                className="flex items-center justify-between"
                style={{
                  background: COLOR.missionCreateFenceItemBg,
                  borderRadius: RADIUS.panel,
                  paddingLeft: SPACING.missionCreateListItemPadX,
                  paddingRight: SPACING.missionCreateListItemPadX,
                  paddingTop: SPACING.missionCreateListItemPadY,
                  paddingBottom: SPACING.missionCreateListItemPadY,
                }}
              >
                <p
                  style={{
                    color: COLOR.missionsBodyText,
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeMd,
                    lineHeight: "21px",
                  }}
                >
                  {fence.name}
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteFence(fence.name)}
                  className="flex h-4 w-4 shrink-0 items-center justify-center"
                  aria-label="Delete fence"
                >
                  <Image
                    src="/icons/trash.svg"
                    alt=""
                    width={14}
                    height={14}
                  />
                </button>
              </div>
            ))
          )}
      </div>
    </MissionWorkspacePanel>
  );
}
