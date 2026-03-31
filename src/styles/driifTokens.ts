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
} as const;

// ---------------------------------------------------------------------------
// Border radius — exact values from Figma cornerRadius
// ---------------------------------------------------------------------------

export const RADIUS = {
  /** Nav panel, icon buttons, all control panels: 2px */
  panel: "2px",

  /** Logo frame: 2px */
  logo: "2px",
} as const;

// ---------------------------------------------------------------------------
// Exact Figma positions (1440×1024 frame)
// All used as CSS absolute positioning offsets
// ---------------------------------------------------------------------------

export const POSITION = {
  /** Logo (Frame 3): left=22, top=20 */
  logoLeft: "22px",
  logoTop: "20px",

  /** Nav panel (Frame 103): left=17, top=76, width=46, height=268 */
  navLeft: "17px",
  navTop: "76px",
  navWidth: "46px",
  navHeight: "268px",

  /** Settings panel (Frame 99): left=16, bottom=40px (1024-896-88=40) */
  settingsLeft: "16px",
  settingsBottom: "40px",
  settingsWidth: "44px",
  settingsHeight: "88px",

  /** Notification bell (Frame 104): right=48px (1440-1348-44=48), top=76 */
  bellRight: "48px",
  bellTop: "76px",
  bellSize: "44px",

  /** Zoom controls (Frame 88): right=16px, bottom=16px */
  zoomRight: "16px",
  zoomBottom: "16px",
  zoomWidth: "42px",

  /** Assets panel (Frame 34): left=79, top=76, size 393×649 */
  assetsLeft: "79px",
  assetsTop: "76px",
  assetsWidth: "393px",
  assetsHeight: "649px",

  /** Missions panel (Figma node 235:3799): left=79, top=77, size 360×394 */
  missionsLeft: "79px",
  missionsTop: "77px",
  missionsWidth: "360px",
  missionsHeight: "auto",

  /** Create Mission panel (Figma node 259:1726): same left/top, 360×520 */
  createMissionLeft: "79px",
  createMissionTop: "77px",
  createMissionWidth: "360px",
  createMissionHeight: "auto",

  /** Select Asset panel (Figma node 235:5039): left=79, top=76, 712×649 */
  selectAssetLeft: "79px",
  selectAssetTop: "76px",
  selectAssetWidth: "712px",
  selectAssetHeight: "auto",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT = {
  family: "Space Grotesk",
  mono: "Geist Mono",
  sizeXs: "10px",
  sizeSm: "12px",
  sizeMd: "14px",
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
} as const;
