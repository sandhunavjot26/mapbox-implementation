"use client";

import Image from "next/image";
import { COLOR, FONT } from "@/styles/driifTokens";
import type { SavedFence } from "@/types/aeroshield";

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
    <div
      className="flex w-[398px] flex-col gap-4 px-4 py-3"
      style={{
        background: COLOR.missionsPanelBg,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-4 w-4 items-center justify-center transition-opacity hover:opacity-85"
        >
          <Image src="/icons/back-icon.svg" alt="Back" width={8} height={8} />
        </button>
        <p
          className="text-[18px] font-medium leading-[26px]"
          style={{ color: COLOR.missionsTitleMuted }}
        >
          Create Fence
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {fences.length === 0 ? (
          <p
            className="py-6 text-center text-[13px] italic leading-5 opacity-50"
            style={{ color: COLOR.missionsBodyText }}
          >
            No fences added yet. Use the draw tools to create one.
          </p>
        ) : (
          fences.map((fence) => (
            <div
              key={fence.name}
              className="flex items-center justify-between rounded-[2px] px-[15px] py-[9px]"
              style={{ background: COLOR.missionCreateFenceItemBg }}
            >
              <p
                className="text-[14px] leading-5"
                style={{ color: COLOR.missionsBodyText }}
              >
                {fence.name}
              </p>
              <button
                type="button"
                onClick={() => onDeleteFence(fence.name)}
                className="flex h-4 w-4 items-center justify-center"
              >
                <Image src="/icons/trash.svg" alt="Delete fence" width={14} height={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
