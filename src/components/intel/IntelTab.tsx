"use client";

import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

function Slot({ title, hint }: { title: string; hint: string }) {
  return (
    <section
      style={{
        background: COLOR.missionCreateSectionBg,
        border: `1px solid ${COLOR.border}`,
        borderRadius: RADIUS.panel,
        padding: SPACING.missionCreateSectionVerticalPad + " " + "12px",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.missionWorkspaceSectionLabelSize,
          letterSpacing: FONT.missionWorkspaceSectionLabelLetterSpacing,
          textTransform: "uppercase",
          color: COLOR.missionsTitleMuted,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: FONT.sizeXs,
          color: COLOR.missionsSecondaryText,
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        {hint}
      </p>
    </section>
  );
}

export function IntelTab() {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      <Slot title="Coverage overlaps" hint="Task 1c: overlaps + activate/stop gating." />
      <Slot title="Swarms" hint="Task 5" />
      <Slot title="Friendlies" hint="Task 4" />
      <Slot title="Jams" hint="Live summary — follow-up." />
    </div>
  );
}
