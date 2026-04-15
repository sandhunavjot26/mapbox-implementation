"use client";

import Image from "next/image";
import { COLOR, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";

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
  const toolSize = parseInt(SPACING.missionFenceToolIconSize, 10);

  return (
    <div
      className="absolute top-0 flex flex-col border p-0"
      style={{
        left: `calc(${POSITION.createFenceWorkspaceWidth} + ${SPACING.missionFenceToolbarGapFromPanel})`,
        gap: SPACING.missionCreateBlockGapMd,
        background: COLOR.missionsPanelBg,
        borderColor: COLOR.missionsPanelBg,
        borderRadius: RADIUS.panel,
      }}
    >
      {TOOL_OPTIONS.map((tool) => {
        const active = activeMode === tool.mode;

        return (
          <button
            key={tool.mode}
            type="button"
            onClick={() => onModeSelect(tool.mode)}
            className="flex items-center justify-center transition-opacity hover:opacity-85"
            style={{
              width: SPACING.missionFenceToolbarButtonSize,
              height: SPACING.missionFenceToolbarButtonSize,
              background: active
                ? COLOR.missionCreateFieldBg
                : COLOR.missionsPanelBg,
            }}
          >
            <Image
              src={tool.icon}
              alt={tool.alt}
              width={toolSize}
              height={toolSize}
            />
          </button>
        );
      })}
    </div>
  );
}
