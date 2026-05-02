/**
 * Driif-UI Design Tokens
 *
 * Extracted from Figma (file dkRUNmWWxBYeiBAVrMcS26, node 176:1001)
 * via live figma_execute call — these are exact values from the design.
 *
 * Desktop frame: 1440×1024px
 *
 * PANEL BACKGROUNDS ARE INTENTIONALLY TRANSLUCENT — the map shows through by design.
 */

// ---------------------------------------------------------------------------
// Panel backgrounds (exact rgba from Figma fills)
// ---------------------------------------------------------------------------

export const COLOR = {
  /** Page-level canvas background */
  pageBg: "#0A0A0A",

  /**
   * Nav panel background — darker for icon visibility over map
   * (Figma used rgba(255,255,255,0.12) but icons were too faint)
   */
  navPanelBg: "rgba(18, 18, 18, 0.92)",

  /**
   * Secondary panel background (settings, notification, zoom blocks)
   * Darker for better icon visibility
   */
  panelBg: "rgba(18, 18, 18, 0.92)",

  /**
   * Individual icon button fill — active/selected state
   * Frame 7/Frame 4/Frame 6 fill: rgb(36, 36, 36) = #242424
   */
  iconButtonBg: "#242424",

  /** Hover state for icon buttons (slightly lighter than #242424) */
  iconButtonHover: "#2e2e2e",

  /** Divider / border — very subtle white */
  border: "rgba(255, 255, 255, 0.08)",
  borderMedium: "rgba(255, 255, 255, 0.15)",

  /**
   * Left-edge bar on selected rail item (nav + settings stack — Figma active state)
   */
  navRailActiveEdge: "#FFFFFF",

  /**
   * Icon colors from SVG fills
   * White icons on dark buttons
   */
  iconPrimary: "#FFFFFF",
  iconMuted: "rgba(255, 255, 255, 0.6)",

  /** Brand yellow — Driif logo vectors: rgb(231, 255, 37) = #E7FF25 */
  brandYellow: "#E7FF25",

  /** Accent cyan — active/selected toggle */
  accentCyan: "#06B6D4",
  accentCyanBg: "rgba(6, 182, 212, 0.15)",

  /** Status colors */
  statusOnline: "#22C55E",
  statusWarning: "#F59E0B",
  statusDanger: "#EF4444",

  /**
   * Zone fill / outline colors — match zones.ts priority mapping
   * Extracted from Figma zone ellipse fills
   */
  zoneRed: "#EF4444", // priority 1  — rgba(239,68,68) from TL-1
  zoneAmber: "#F59E0B", // priority 2  — TL-2
  zoneGreen: "#16D969", // priority 3  — Figma Ellipse 4: rgb(22,217,105)
  zonePurple: "#9043F9", // priority 4  — Figma Ellipse 5: rgb(144,67,249)
  zonePink: "#FF30C6", // priority 5  — Figma Vector 3: rgb(255,48,198)
  zoneYellow: "#E2FF00", // priority 6  — Figma Ellipse 1: rgb(226,255,0)
  zoneBlue: "#3B82F6", // default

  /** Target / drone marker colors */
  droneEnemy: "#EF4444",
  droneFriendly: "#22C55E",
  droneUnknown: "#94A3B8",

  /** Asset tower marker color */
  towerActive: "#FBBF24",
  towerInactive: "#64748B",

  /** Assets panel (Frame 34) — Figma node 118:1568 */
  assetCardBg: "rgb(64, 64, 64)",
  assetSearchBg: "rgb(26, 26, 26)",
  addAssetBtn: "rgb(76, 92, 11)",
  sosLandBtn: "rgb(69, 27, 3)",

  /** Missions overlay — Figma node 853:9729 / cards 853:9739 */
  missionsPanelBg: "#272727",
  missionsSearchBg: "#1A1A1A",
  missionsSearchBorder: "#535353",
  missionsCardBg: "#404040",
  missionsTitleMuted: "#D3D3D3",
  missionsSecondaryText: "#8A8A8A",
  missionsBodyText: "#E6E6E6",
  missionsCreateBtnBg: "#4C5C0B",
  missionsCreateBtnText: "#C6E600",
  missionCreateFieldBg: "#1A1A1A",
  missionCreateFieldBorder: "#535353",
  missionCreateFieldText: "#D3D3D3",
  missionCreateFieldPlaceholder: "#8A8A8A",
  missionCreateSectionBg: "#383838",
  missionCreatePrimaryChipBg: "#E6E6E6",
  missionCreatePrimaryChipText: "#171717",
  missionCreateSecondaryChipBg: "#1A1A1A",
  missionCreateSecondaryChipText: "#D3D3D3",
  missionCreateTabActiveBorder: "#D3D3D3",
  missionCreateTabInactiveText: "#D3D3D366",
  missionCreateFenceItemBg: "#535353",
  missionCreateFooterBorder: "#8A8A8A",
  missionCreateDatePickerBg: "#404040",
  missionCreateDatePickerBorder: "#535353",
  missionCreateDatePickerText: "#E6E6E6",
  missionCreateDatePickerMuted: "#B5B5B5",
  missionCreateDatePickerSelection: "#2C74E3",
  missionCreateDatePickerSelectionText: "#FAFAFA",
  missionCreateDatePickerAction: "#D3D3D3",

  /**
   * Create Mission footer — completed draft / ready to open summary (Figma 853:9629).
   * Default incomplete state uses missionsCardBg + missionCreateFooterBorder + missionsTitleMuted.
   */
  missionCreateSubmitReadyBg: "#E7FF25",
  missionCreateSubmitReadyText: "#171717",
  missionCreateSubmitReadyBorder: "#C6D600",

  /** Mission create summary modal surface (Figma 853:10163 — panel on map) */
  missionCreateSummaryModalBg: "#272727",
  missionCreateSummaryModalBorder: "#535353",

  /** Review & Launch checklist — success icon halo (was inline rgba) */
  missionReviewChecklistSuccessHalo: "rgba(34, 197, 94, 0.2)",
  /** Review & Launch checklist — warning icon halo */
  missionReviewChecklistWarningHalo: "rgba(245, 158, 11, 0.2)",

  /**
   * Review & Launch typography (Figma 853:10163 — Frame 1707480942 / summary rows)
   */
  missionReviewChecklistHeading: "#FFFFFF",
  missionReviewChecklistDetail: "#D3D3D3",
  missionReviewSummaryValue: "#FFFFFF",
  missionReviewSummaryLabel: "#D3D3D3",

  /** Selected radar row — status pill (Figma 853:9683–9686, “All Systems OK”) */
  missionCreateRadarStatusPillText: "#67E09C",
  missionCreateRadarStatusPillBg: "rgba(12, 187, 88, 0.2)",
  missionCreateRadarStatusOfflinePillText: "#F59E0B",
  missionCreateRadarStatusOfflinePillBg: "rgba(245, 158, 11, 0.2)",

  /**
   * Map radar / COP overlays (`layers/assets.ts`) — readable on Standard + satellite basemaps.
   * No dedicated Figma node yet for these strokes/fills; values match shipped Driif symbology — swap here when map-overlay tokens land in design.
   */
  mapRadarCoverageActiveFill: "#22C55E",
  mapRadarCoverageInactiveFill: "#64748B",
  mapRadarRingOrange: "#F4A30C",
  mapRadarRingOrangeDeep: "#EA580C",
  mapRadarWarmYellowFill: "rgba(244, 163, 12, 0.16)",
  mapRadarWarmOrangeFill: "rgba(234, 88, 12, 0.1)",
  mapRadarWarmYellowFillSatellite: "rgba(244, 163, 12, 0.28)",
  mapRadarWarmOrangeFillSatellite: "rgba(234, 88, 12, 0.22)",
  /** Decorative range-ring halo behind dashed strokes */
  mapRadarRingHaloLine: "rgba(5, 10, 20, 0.55)",
  mapRadarBreachRedFillCore: "#EF4444",
  mapRadarBreachYellowZoneFill: "rgba(234, 179, 8, 0.26)",
  mapRadarBreachGreenZoneFill: "rgba(16, 185, 129, 0.18)",
  mapRadarBreachGreenStroke: "#10B981",
  mapRadarBreachYellowStroke: "#F59E0B",
  mapRadarBreachRedStroke: "#EF4444",
  mapRadarSweepJammerWedge: "#F59E0B",
  mapRadarSweepDetectionWedge: "#FFFFFF",
  mapRadarLockOnCore: "#EF4444",
  mapRadarLockOnStroke: "#FFFFFF",

  // --- Mission detail HUD overlay (Figma 2308:22935 / 2308:22770 / 2308:22908) ---
  missionHudPanelBg: "#1A1A1A",
  missionHudBorder: "rgba(255, 255, 255, 0.2)",
  missionHudCardBg: "#272727",
  missionHudTabActiveBorder: "#D9D9D9",
  missionHudTabInactiveText: "#8F8F8F",
  missionHudSectionLabel: "#8F8F8F",
  missionHudValueText: "#E6E6E6",
  missionHudTimelineLine: "#404040",
  missionHudEventChipDetectionBg: "rgba(128, 184, 255, 0.1)",
  missionHudEventChipDetectionText: "#80B8FF",
  missionHudEventChipAlertBg: "#290000",
  missionHudEventChipAlertText: "#D93333",
  missionHudEventChipSystemBg: "#272727",
  missionHudEventChipSystemText: "#FFFFFF",
  missionHudEventChipOperatorBg: "rgba(103, 224, 156, 0.1)",
  missionHudEventChipOperatorText: "#67E09C",
  missionHudEditBtnBg: "#404040",
  missionHudEditBtnBorder: "#535353",
  missionHudEditBtnText: "#F5F5F5",
  missionHudStatusActiveBg: "#04381A",
  missionHudStatusActiveText: "#67E09C",
} as const;

// ---------------------------------------------------------------------------
// Spacing — exact pixel values from Figma
// ---------------------------------------------------------------------------

export const SPACING = {
  /** Nav panel width (Frame 103): 46px */
  navPanelWidth: "46px",

  /** Icon row height (inner frame): 52px */
  iconRowHeight: "52px",

  /** Icon button size: 36×36px */
  iconButtonSize: "36px",

  /** Icon button padding: 8px all sides */
  iconButtonPad: "8px",

  /** Icon display size: 24×24px */
  iconSize: "24px",

  /** Panel padding: 4px all sides */
  panelPad: "4px",

  /** Settings panel item spacing: 8px */
  settingsGap: "8px",

  /** Zoom block padding: 10px */
  zoomPad: "10px",

  /** Zoom +/- spacing: 10px */
  zoomGap: "10px",

  /** Create Mission — fence/asset section min height (Figma 853:9629) */
  missionCreateSectionMinHeight: "281px",

  /** Create Mission — list row padding (fence items, asset cards) */
  missionCreateListItemPadX: "15px",
  missionCreateListItemPadY: "9px",

  /** Status indicator dot — device online/offline */
  deviceStatusDotSize: "8px",

  /** Create Mission / Select Assets — header stack spacing */
  missionCreateHeaderPadBottom: "16px",
  missionCreateBlockGapSm: "4px",
  missionCreateBlockGapMd: "8px",
  missionCreateSearchFieldMarginBottom: "12px",

  /** Mission type chips row gap (Figma ~5px) */
  missionCreateChipGap: "5px",

  /** Create Mission — duration column label width */
  missionCreateDurationColWidth: "196px",

  /** Create Mission — primary footer button height */
  missionCreateFooterBtnMinHeight: "40px",

  /** Fence/asset section inner vertical padding (Figma 10px) */
  missionCreateSectionVerticalPad: "10px",

  /** Form stack gap (12px) */
  missionCreateStackGapMd: "12px",

  /** Create Mission — vertical gap between major form blocks (Figma 853:9640 Frame 106 itemSpacing 14) */
  missionCreateFormSectionGap: "14px",
  /**
   * Create Mission — single-line field height: name, command, search row, date triggers
   * (Figma 853:9644 / 853:9671; search toolbar 853:9669)
   */
  missionCreateFieldRowHeight: "32px",
  /** Alias — embedded search row (853:9669) uses same 32px as missionCreateFieldRowHeight */
  missionCreateSearchRowHeight: "32px",

  // --- Mission workspace shell (Create Mission / Fence / Assets / Review) ---
  /** Panel horizontal padding — was `px-4` everywhere */
  missionWorkspacePadX: "16px",
  /** Panel vertical padding — was `py-3` */
  missionWorkspacePadY: "12px",
  /** Back row: gap between back hit and title (8px, same as missionCreateBlockGapMd) */
  missionWorkspaceHeaderGap: "8px",
  /** Back control hit area — matches icon row affordance (Select Assets) */
  missionWorkspaceBackHitSize: "36px",
  /** Back arrow glyph in 8×8 SVG */
  missionWorkspaceBackIconSize: "8px",
  /** Review checklist / summary card inner vertical padding */
  missionReviewChecklistCardPadY: "12px",
  missionReviewSummaryRowPadY: "10px",
  missionReviewSummaryRowMinHeight: "50px",
  /** Status pill in review checklist (20×20) */
  missionReviewStatusIconSize: "20px",
  /** Figma 853:10163 — vertical gap between checklist title + subtitle (itemSpacing 4) */
  missionReviewChecklistStackGap: "4px",
  /** Vertical stack gap below workspace header (Create Fence list block) */
  missionWorkspaceContentGap: "16px",
  /**
   * Mission HUD timeline — rail wide enough for `+H:MM:SS` without bleeding into the title
   * (36px Figma stamp column is too narrow for real offsets).
   */
  missionHudTimelineTimeColWidth: "76px",
  /** Horizontal gap between timeline rail and event body */
  missionHudTimelineRailGap: "12px",
  /** Missions list view — header block vertical rhythm */
  missionListHeaderGap: "14px",
  /** Missions list — gap between mission cards */
  missionListCardStackGap: "10px",
  /** Fence draw toolbar — horizontal gap after fence panel */
  missionFenceToolbarGapFromPanel: "12px",
  /** Fence tool button (32×32) */
  missionFenceToolbarButtonSize: "32px",
  missionFenceToolIconSize: "18px",
  /** Fence metadata popover — horizontal offset from panel inner edge */
  missionFenceMetadataPopoverLeftOffset: "56px",
  /** Between popover field groups + footer */
  missionFencePopoverOuterGap: "14px",
  missionFencePopoverInnerGap: "16px",
  missionFencePopoverFieldStackGap: "8px",
  missionFencePopoverFooterGap: "10px",
  missionFencePopoverButtonHeight: "28px",
  missionFencePopoverButtonWidth: "64px",
} as const;

// ---------------------------------------------------------------------------
// Border radius — exact values from Figma cornerRadius
// ---------------------------------------------------------------------------

export const RADIUS = {
  /** Nav panel, icon buttons, all control panels: 2px */
  panel: "2px",

  /** Logo frame: 2px */
  logo: "2px",

  /** Fence metadata popover corners */
  fencePopover: "8px",
} as const;

// ---------------------------------------------------------------------------
// Exact Figma positions (1440×1024 frame)
// All used as CSS absolute positioning offsets
// ---------------------------------------------------------------------------

export const POSITION = {
  /** Logo (Frame 3): left=22, top=20 */
  logoLeft: "17px",
  logoTop: "20px",

  /** Nav panel — width matches icon row (52px) so active fill does not overflow the rail */
  navLeft: "17px",
  navTop: "76px",
  navWidth: "52px",
  navHeight: "268px",

  /** Settings stack — same horizontal inset as primary nav so flyouts share missionsLeft alignment. */
  settingsLeft: "17px",
  settingsBottom: "40px",
  settingsWidth: "44px",
  settingsHeight: "88px",
  /** Gap between any left icon rail and its flyout panel (settings stack uses same value after its width). */
  railToOverlayGap: "8px",
  /** Settings flyout — same left edge as missions/assets (navLeft + navWidth + gap). */
  settingsOverlayLeft: "calc(17px + 52px + 8px)",
  settingsOverlayBottom: "40px",

  /** Top-right cluster (detection + bell): same inset as logo — right edge of bell matches logo’s left inset from the viewport. */
  bellRight: "17px",
  /** Same vertical band as the logo chip (logoTop). */
  bellTop: "20px",
  bellSize: "44px",

  /** Zoom controls (Frame 88): right=16px, bottom=16px */
  zoomRight: "16px",
  zoomBottom: "16px",
  zoomWidth: "42px",

  /** Assets panel — same horizontal inset as missions (nav right + railToOverlayGap) */
  assetsLeft: "calc(17px + 52px + 8px)",
  assetsTop: "76px",
  assetsWidth: "393px",
  assetsHeight: "649px",

  /** Missions panel — gap to primary nav matches settings flyout (8px) */
  missionsLeft: "calc(17px + 52px + 8px)",
  missionsTop: "77px",
  missionsWidth: "360px",
  missionsHeight: "auto",

  /** Devices inventory overlay (map) — wide table, filters */
  devicesInventoryWidth: "700px",

  /** Create Mission panel — aligns with missions/assets map overlays */
  createMissionLeft: "calc(17px + 52px + 8px)",
  createMissionTop: "76px",
  createMissionWidth: "448px",
  /** Configure radar step — Figma 853:10443 outer panel ~534px (avoids horizontal scroll with tabs + Direction row) */
  configureRadarWidth: "534px",
  /** Review & Launch step — panel Frame 1707481060 (Figma 853:10163): 430px */
  createMissionReviewWidth: "430px",
  createMissionHeight: "auto",
  createFenceWorkspaceWidth: "398px",

  /** Fence metadata popover — absolute from workspace (Create Fence flow) */
  missionFenceMetadataPopoverTop: "195px",
  missionFenceMetadataPopoverWidth: "240px",

  /** Select Asset panel — align left edge with missions/assets overlays (same gap from rail). */
  selectAssetLeft: "calc(17px + 52px + 8px)",
  selectAssetTop: "76px",
  selectAssetWidth: "712px",
  selectAssetHeight: "auto",

  /** Mission detail HUD — Figma outer card width (2308:22935) */
  missionHudWidth: "402px",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT = {
  family: "var(--font-geist-sans)",
  mono: "var(--font-geist-mono)",
  sizeXs: "11px",
  sizeSm: "13px",
  sizeMd: "15px",
  /**
   * Step titles: Create Mission, Create Fence, Select Assets, Review & Launch
   * (aligns Mission list heading — was 14px in some screens, 18px in others)
   */
  missionWorkspaceTitleSize: "19px",
  missionWorkspaceTitleLineHeight: "27px",
  /** Uppercase section labels (Pre-launch checklist, Mission summary) */
  missionWorkspaceSectionLabelSize: "11px",
  missionWorkspaceSectionLabelLineHeight: "17px",
  missionWorkspaceSectionLabelLetterSpacing: "0.06em",
  /** Summary row uppercase label (MISSION, RADAR, …) */
  missionWorkspaceSummaryLabelLetterSpacing: "0.04em",
  /** Create Fence empty-state hint */
  missionWorkspaceEmptyHintSize: "14px",
  /** Inline validation under fence fields */
  missionFormFieldErrorTextSize: "12px",
  /** Figma 853:10163 — checklist row title + mission summary value (12px / 16px, w400) */
  missionReviewLine12Size: "13px",
  missionReviewLine12LineHeight: "17px",
  /** Figma 853:10163 — checklist subtitle detail (10px / 12px, w400) */
  missionReviewDetail10Size: "11px",
  missionReviewDetail10LineHeight: "13px",
  weightNormal: "400",
  weightMedium: "500",
  weightBold: "700",
} as const;

// ---------------------------------------------------------------------------
// Z-index
// ---------------------------------------------------------------------------

export const Z = {
  map: 0,
  overlay: 10,
  /** Modals above dashboard panels (e.g. missions z-[12]) */
  modal: 100,
} as const;
