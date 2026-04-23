"use client";

import type { RadarConfigureDraft } from "@/types/radarMissionDraft";
import {
  clampElevationDeg,
  clampMountHeightM,
  normalizeBearingDeg,
} from "@/types/radarMissionDraft";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { formatBearingDegreesAndCardinalParts } from "@/utils/bearingFormat";
import { RADAR_PAD_ARROW_SRC } from "@/components/missions/configureRadar/radarPadArrowSrc";
import {
  DPAD_ICON_PX,
  DPAD_PX,
  PAD_BEARINGS,
  PAD_DIRS,
  padCellShell,
  PitchElevationGauge,
  PitchElevationSlider,
  PitchNudgeImg,
} from "@/components/missions/configureRadar/radarAimUi";

export type ConfigureRadarDirectionTabContentProps = {
  draft: RadarConfigureDraft;
  onDraftChange: (next: RadarConfigureDraft) => void;
};

/**
 * Figma Driif-UI node 853:10473+ — Direction tab (d-pad, bearing readout, pitch row).
 */
export function ConfigureRadarDirectionTabContent({
  draft,
  onDraftChange,
}: ConfigureRadarDirectionTabContentProps) {
  const fieldShellStyle = {
    background: COLOR.missionCreateFieldBg,
    borderColor: COLOR.missionCreateFieldBorder,
    borderWidth: 1,
    borderStyle: "solid" as const,
  };

  const fieldTextStyle = {
    color: COLOR.missionCreateFieldText,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  const bearingParts = formatBearingDegreesAndCardinalParts(
    draft.horizontalBearingDeg,
  );

  const setBearing = (raw: number) => {
    onDraftChange({
      ...draft,
      horizontalBearingDeg: normalizeBearingDeg(raw),
    });
  };

  const setElevation = (raw: number) => {
    onDraftChange({
      ...draft,
      verticalElevationDeg: clampElevationDeg(raw),
    });
  };

  const setMountHeight = (raw: number) => {
    onDraftChange({
      ...draft,
      mountHeightM: clampMountHeightM(raw),
    });
  };

  const onPadCell = (cell: number | "stop") => {
    if (cell === "stop") {
      onDraftChange({
        ...draft,
        horizontalBearingDeg: 0,
        verticalElevationDeg: 0,
      });
      return;
    }
    setBearing(cell);
  };

  const nudgeElevation = (delta: number) => {
    setElevation(draft.verticalElevationDeg + delta);
  };

  const roundedBearing = Math.round(normalizeBearingDeg(draft.horizontalBearingDeg));
  const elev = clampElevationDeg(draft.verticalElevationDeg);
  const elevRounded = Math.round(elev);
  const elevSign = elevRounded > 0 ? "+" : elevRounded < 0 ? "−" : "";

  return (
    <div
      className="flex flex-col"
      style={{ gap: SPACING.missionCreateFormSectionGap }}
    >
      <div
        className="grid w-full min-w-0"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: SPACING.missionCreateStackGapMd,
        }}
      >
        <div className="flex min-w-0 flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Fine-tune bearing (0°–360°)
          </span>
          <label
            className="flex items-center overflow-hidden px-3"
            style={{
              ...fieldShellStyle,
              minHeight: SPACING.missionCreateFieldRowHeight,
              borderRadius: RADIUS.panel,
            }}
          >
            <input
              type="number"
              min={0}
              max={360}
              step={1}
              value={roundedBearing}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setBearing(v);
              }}
              className="w-full min-w-0 border-0 bg-transparent py-0 outline-none"
              style={{
                ...fieldTextStyle,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
              }}
              aria-label="Fine-tune bearing in degrees"
            />
          </label>
        </div>

        <div className="flex min-w-0 flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Mount height (m)
          </span>
          <label
            className="flex items-center overflow-hidden px-3"
            style={{
              ...fieldShellStyle,
              minHeight: SPACING.missionCreateFieldRowHeight,
              borderRadius: RADIUS.panel,
            }}
          >
            <input
              type="number"
              min={0}
              step={0.1}
              value={draft.mountHeightM}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setMountHeight(v);
              }}
              className="w-full min-w-0 border-0 bg-transparent py-0 outline-none"
              style={{
                ...fieldTextStyle,
                fontSize: FONT.sizeMd,
                lineHeight: "21px",
              }}
              aria-label="Mount height in metres"
            />
          </label>
        </div>
      </div>

      <div
        className="flex min-w-0 flex-col min-[480px]:flex-row"
        style={{
          gap: SPACING.missionCreateStackGapMd,
          rowGap: "24px",
          alignItems: "flex-start",
        }}
      >
        <div
          className="flex shrink-0 flex-col items-center"
          style={{
            gap: SPACING.missionCreateStackGapMd,
            width: "200px",
            maxWidth: "100%",
            alignSelf: "center",
          }}
        >
          <div
            className="grid shrink-0"
            style={{
              width: DPAD_PX,
              height: DPAD_PX,
              gap: "2px",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
            }}
          >
            {PAD_BEARINGS.map((cell, i) => {
              const dir = PAD_DIRS[i];
              const activeArrow =
                typeof cell === "number" && roundedBearing === Math.round(cell);

              if (cell === "stop" || dir === "stop") {
                return (
                  <button
                    key={`pad-stop-${i}`}
                    type="button"
                    onClick={() => onPadCell("stop")}
                    className="border-0 transition-opacity hover:opacity-90"
                    style={padCellShell(false)}
                    aria-label="Stop — reset bearing and pitch"
                  >
                    <span
                      style={{
                        color: COLOR.missionsBodyText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeXs,
                        fontWeight: FONT.weightNormal,
                        lineHeight: "15px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Stop
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={`pad-${i}-${cell}`}
                  type="button"
                  onClick={() => onPadCell(cell)}
                  className="border-0 transition-opacity hover:opacity-90"
                  style={padCellShell(activeArrow)}
                  aria-label={`Set bearing to ${cell} degrees`}
                >
                  <img
                    src={RADAR_PAD_ARROW_SRC[dir]}
                    alt=""
                    width={DPAD_ICON_PX}
                    height={DPAD_ICON_PX}
                    draggable={false}
                    style={{
                      display: "block",
                      flexShrink: 0,
                      maxWidth: "none",
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-col items-center"
            style={{
              gap: SPACING.missionCreateBlockGapMd,
            }}
          >
            <span
              className="w-full text-center"
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              Horizontal bearing
            </span>
            <div
              className="flex w-full flex-col items-stretch"
              style={{ gap: "4px" }}
            >
              <span
                className="w-full text-center tabular-nums"
                style={{
                  color: COLOR.missionReviewChecklistHeading,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: "21px",
                  fontWeight: FONT.weightMedium,
                  lineHeight: "24px",
                }}
              >
                {bearingParts.degrees}
              </span>
              <span
                className="w-full text-center"
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  fontWeight: FONT.weightNormal,
                  lineHeight: "17px",
                }}
              >
                {bearingParts.cardinal}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: SPACING.missionCreateStackGapMd, minWidth: 0 }}
        >
          <div
            className="flex w-full min-w-0 flex-row flex-wrap items-center"
            style={{ gap: "6px", justifyContent: "flex-end" }}
          >
            <div
              className="flex shrink-0 flex-col items-center"
              style={{ width: "88px" }}
            >
              <div className="w-full" style={{ maxWidth: "88px" }}>
                <PitchElevationGauge elevationDeg={draft.verticalElevationDeg} />
              </div>
            </div>
            <div
              className="flex shrink-0 flex-col"
              style={{
                gap: SPACING.missionCreateStackGapMd,
              }}
            >
              <div
                className="flex w-full min-w-0 flex-col items-center"
                style={{ gap: SPACING.missionCreateStackGapMd }}
              >
                <div
                  className="flex w-full min-w-0 flex-wrap items-end justify-center"
                  style={{ gap: "4px", rowGap: "2px", lineHeight: "17px" }}
                >
                  <span
                    className="shrink-0 tabular-nums"
                    style={{
                      color: COLOR.missionReviewChecklistHeading,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: "21px",
                      fontWeight: FONT.weightMedium,
                    }}
                  >
                    {elevRounded === 0
                      ? "0°"
                      : `${elevSign}${Math.abs(elevRounded)}°`}
                  </span>
                  <span
                    className="min-w-0 shrink text-center"
                    style={{
                      color: COLOR.missionsSecondaryText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeSm,
                      fontWeight: FONT.weightNormal,
                    }}
                  >
                    elevation
                  </span>
                </div>
                <div
                  className="flex w-full items-center justify-center"
                  style={{ gap: "4px" }}
                >
                  <PitchNudgeImg
                    src="/icons/ArrowDown.svg"
                    label="Decrease pitch five degrees"
                    onClick={() => nudgeElevation(-5)}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowLeft.svg"
                    label="Decrease pitch one degree"
                    onClick={() => nudgeElevation(-1)}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowRight.svg"
                    label="Increase pitch one degree"
                    onClick={() => nudgeElevation(1)}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowUp.svg"
                    label="Increase pitch five degrees"
                    onClick={() => nudgeElevation(5)}
                  />
                </div>
              </div>
              <p
                className="m-0 w-full text-center"
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                }}
              >
                Pitch (vertical tilt)
              </p>
            </div>
          </div>

          <div
            className="flex min-w-0 flex-col"
            style={{
              gap: "6px",
              width: "82%",
              maxWidth: "220px",
              marginLeft: "auto",
            }}
          >
            <PitchElevationSlider
              value={draft.verticalElevationDeg}
              onChange={setElevation}
            />
            <div
              className="flex w-full justify-between"
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              <span>−40°</span>
              <span>0°</span>
              <span>+90°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
