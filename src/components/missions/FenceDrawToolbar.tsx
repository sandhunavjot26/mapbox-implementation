"use client";

import Image from "next/image";
import { COLOR } from "@/styles/driifTokens";

export type FenceDrawMode = "line" | "polygon" | "square" | "circle";

const TOOL_OPTIONS: Array<{
  mode: FenceDrawMode;
  icon: string;
  alt: string;
}> = [
  { mode: "polygon", icon: "/icons/polygon.svg", alt: "Polygon" },
  { mode: "square", icon: "/icons/square.svg", alt: "Square" },
  { mode: "circle", icon: "/icons/circle.svg", alt: "Circle" },
];

export type FenceDrawToolbarProps = {
  activeMode: FenceDrawMode | null;
  onModeSelect: (mode: FenceDrawMode) => void;
};

export function FenceDrawToolbar({
  activeMode,
  onModeSelect,
}: FenceDrawToolbarProps) {
  return (
    <div
      className="absolute left-[410px] top-0 flex flex-col gap-2 border p-0"
      style={{
        background: COLOR.missionsPanelBg,
        borderColor: COLOR.missionsPanelBg,
      }}
    >
      {TOOL_OPTIONS.map((tool) => {
        const active = activeMode === tool.mode;

        return (
          <button
            key={tool.mode}
            type="button"
            onClick={() => onModeSelect(tool.mode)}
            className="flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-85"
            style={{
              background: active
                ? COLOR.missionCreateFieldBg
                : COLOR.missionsPanelBg,
            }}
          >
            <Image src={tool.icon} alt={tool.alt} width={18} height={18} />
          </button>
        );
      })}
    </div>
  );
}
