"use client";

/**
 * Parent site selector for Create Mission (V2.4.1).
 * Fetches sites via useSitesList; keeps MissionSelector thin.
 */

import { useEffect, type CSSProperties } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { InlineLoadIndicator } from "@/components/ui/InlineLoadIndicator";
import { COLOR, FONT, SPACING } from "@/styles/driifTokens";
import { useSitesList } from "@/hooks/useSites";

export type MissionCreateSiteSelectProps = {
  /** Selected site UUID, or null */
  value: string | null;
  onChange: (siteId: string | null) => void;
  /** Shell styles shared with other create-mission fields */
  fieldShellStyle: CSSProperties;
  fieldTextStyle: CSSProperties;
};

export function MissionCreateSiteSelect({
  value,
  onChange,
  fieldShellStyle,
  fieldTextStyle,
}: MissionCreateSiteSelectProps) {
  const { data: sites = [], isLoading, isError, error } = useSitesList(true);

  // One visible site: preselect so operators are not blocked on an extra click.
  useEffect(() => {
    if (value != null || sites.length !== 1) return;
    onChange(sites[0].id);
  }, [sites, value, onChange]);

  if (isLoading) {
    return (
      <InlineLoadIndicator
        label="Loading sites…"
        minHeight="0"
        spinnerSize={26}
        className="py-2"
        align="start"
      />
    );
  }

  if (isError) {
    return (
      <p
        style={{
          color: COLOR.statusDanger,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
          lineHeight: "17px",
        }}
      >
        {error instanceof Error ? error.message : "Could not load sites."}
      </p>
    );
  }

  if (sites.length === 0) {
    return (
      <p
        style={{
          color: COLOR.statusDanger,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
          lineHeight: "17px",
        }}
      >
        No sites available. Create a site or check site:read scope.
      </p>
    );
  }

  const options = [
    { label: "Select site…", value: "" },
    ...sites.map((s) => ({ label: s.name, value: s.id })),
  ];

  return (
    <div className="flex flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
      <p
        style={{
          color: COLOR.missionsTitleMuted,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeMd,
          fontWeight: FONT.weightMedium,
          lineHeight: "21px",
        }}
      >
        Parent site
      </p>
      <Dropdown
        options={options}
        value={value ?? ""}
        onChange={(id) => onChange(id || null)}
        buttonStyle={fieldShellStyle}
        textStyle={fieldTextStyle}
        menuStyle={{
          background: COLOR.missionCreateFieldBg,
          borderColor: COLOR.missionCreateFieldBorder,
        }}
        optionStyle={{
          background: COLOR.missionCreateFieldBg,
          color: COLOR.missionCreateFieldText,
        }}
        selectedOptionStyle={{
          background: "rgba(230, 230, 230, 0.08)",
          color: COLOR.missionsTitleMuted,
        }}
      />
    </div>
  );
}
