"use client";

/**
 * Driif-UI — Figma pixel-perfect implementation.
 *
 * Layout matches Figma frame "Desktop - 25" (1440×1024) exactly:
 *   - 3 separate left-side floating panels (Logo, Nav, Settings)
 *   - Notification bell — right side
 *   - Zoom controls     — bottom-right
 *   - 2D/3D toggle      — top-right (our addition, not in Figma)
 *
 * All panel backgrounds are intentionally translucent (map shows through).
 * Exact values extracted from Figma via figma_execute.
 *
 * Does NOT modify MapContainer, dashboard flow, or any existing APIs.
 * Design tokens: src/styles/driifTokens.ts
 * Mock data:     src/data/driifUiMockData.ts
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  getDriifUiMapFeatures,
  getDriifUiCachedMission,
  MOCK_TARGETS,
  MOCK_DEVICES,
  MOCK_MISSIONS,
  MOCK_CREATE_FENCES,
  MOCK_CREATE_ASSETS,
  MOCK_SELECT_ASSETS,
  DRIIF_UI_BOUNDS,
} from "@/data/driifUiMockData";
import type { MockMission, MissionStatus } from "@/data/driifUiMockData";
import { useTargetsStore } from "@/stores/targetsStore";
import { useMissionStore } from "@/stores/missionStore";
import { getMap } from "@/components/map/mapController";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
import { COLOR, FONT, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: COLOR.pageBg }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <span className="text-slate-500 text-xs font-mono tracking-widest uppercase">
            Loading Map...
          </span>
        </div>
      </div>
    ),
  },
);

// ---------------------------------------------------------------------------
// Icon lists
// ---------------------------------------------------------------------------

/** 5 nav icons — Frame 103, rows 1-5 */
const NAV_ICONS = [
  { src: "/icons/search.svg",   label: "Search" },
  { src: "/icons/assets.svg",   label: "Assets" },
  { src: "/icons/missions.svg", label: "Missions" },
  { src: "/icons/files.svg",    label: "Files" },
  { src: "/icons/logs.svg",     label: "Logs" },
] as const;

/** 2 bottom icons — Frame 99 */
const SETTINGS_ICONS = [
  { src: "/icons/settings.svg", label: "Settings" },
  { src: "/icons/user.svg",     label: "User" },
] as const;

// ---------------------------------------------------------------------------
// Shared icon button — 36×36, no background (per Figma), icon 24×24
// Hover: subtle highlight only.
// ---------------------------------------------------------------------------

function IconButton({
  src,
  label,
  active = false,
  onClick,
}: {
  src: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center justify-center transition-colors"
      style={{
        width:  SPACING.iconButtonSize,  // 36px
        height: SPACING.iconButtonSize,  // 36px
        padding: SPACING.iconButtonPad,  // 8px
        background: active ? COLOR.iconButtonBg : "transparent",
        borderRadius: RADIUS.panel,      // 2px
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = COLOR.iconButtonHover;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        width={24}
        height={24}
        style={{
          width: SPACING.iconSize,
          height: SPACING.iconSize,
          opacity: 1,
          filter: "brightness(1.4)", // Icons use #D3D3D3/#8A8A8A — brighten for visibility
        }}
        className="transition-opacity"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Left panel 1 — Floating logo (Frame 3)
// Figma: x=22 y=20, size 33×26, cornerRadius=2
// ---------------------------------------------------------------------------

function FloatingLogo() {
  return (
    <div
      className="absolute z-10"
      style={{
        left:         POSITION.logoLeft,  // 22px
        top:          POSITION.logoTop,   // 20px
        borderRadius: RADIUS.logo,        // 2px
      }}
    >
      <Image
        src="/driif-logo-small.png"
        alt="Driif"
        width={33}
        height={26}
        className="object-contain"
        priority
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search overlay — floating panel, appears when search icon is clicked
// Figma node 118:773 — search component
// ---------------------------------------------------------------------------

function SearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-20"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Search"
    >
      {/* Subtle overlay — click to close */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.2)" }}
        aria-hidden
      />
      {/* Search bar — positioned next to left icon bar (Figma: near nav) */}
      <div
        className="absolute z-10 rounded px-4 py-3 shadow-lg"
        style={{
          left:       "70px",   // 17 (nav left) + 46 (nav width) + 8 (gap)
          top:        POSITION.navTop,  // 76px — align with nav top
          width:      "min(320px, calc(100vw - 100px))",
          background: COLOR.navPanelBg,
          border:     `1px solid ${COLOR.borderMedium}`,
          borderRadius: RADIUS.panel,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <img
            src="/icons/search.svg"
            alt=""
            width={20}
            height={20}
            className="opacity-70"
          />
          <input
            type="text"
            placeholder="Search locations, assets, zones..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
            style={{ minWidth: 0 }}
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drone detail data — per-target mock telemetry for the click panel
// ---------------------------------------------------------------------------

type DroneDetail = {
  id:           string;
  name:         string;
  battery:      number;     // %
  batteryTime:  string;     // e.g. "4h 55m"
  status:       string;     // e.g. "Loitering"
  assetId:      string;     // e.g. "#01928"
  altitude:     number;     // metres AGL
  lat:          number;
  lng:          number;
  speed:        number;     // km/h
  verticalRate: number;     // km/h
  warnings:     number;     // warning badge count
  screenX:      number;
  screenY:      number;
};

const DRONE_DETAIL_MAP: Record<string, Omit<DroneDetail, "screenX" | "screenY">> = {
  "tgt-1":  { id: "tgt-1",  name: "Aakash Drone",  battery: 74, batteryTime: "4h 55m", status: "Loitering", assetId: "#01928", altitude: 450, lat: 26.75, lng: 73.85, speed: 34, verticalRate: 4,  warnings: 2 },
  "tgt-2":  { id: "tgt-2",  name: "Alpha UAV",     battery: 61, batteryTime: "3h 20m", status: "Transit",   assetId: "#01929", altitude: 320, lat: 26.82, lng: 73.92, speed: 52, verticalRate: 8,  warnings: 0 },
  "tgt-3":  { id: "tgt-3",  name: "Hostile UAS",   battery: 88, batteryTime: "6h 10m", status: "Attacking", assetId: "#01930", altitude: 580, lat: 26.88, lng: 73.78, speed: 78, verticalRate: -6, warnings: 3 },
  "tgt-4":  { id: "tgt-4",  name: "Bravo UAV",     battery: 45, batteryTime: "2h 05m", status: "Hovering",  assetId: "#01931", altitude: 210, lat: 26.95, lng: 74.15, speed: 5,  verticalRate: 0,  warnings: 1 },
  "tgt-5":  { id: "tgt-5",  name: "Recon Drone",   battery: 92, batteryTime: "7h 30m", status: "Scouting",  assetId: "#01932", altitude: 150, lat: 26.65, lng: 74.70, speed: 28, verticalRate: 2,  warnings: 0 },
  "tgt-6":  { id: "tgt-6",  name: "Charlie UAS",   battery: 33, batteryTime: "1h 15m", status: "Landing",   assetId: "#01933", altitude: 90,  lat: 26.12, lng: 74.00, speed: 12, verticalRate: -8, warnings: 1 },
  "tgt-7":  { id: "tgt-7",  name: "Delta UAV",     battery: 57, batteryTime: "3h 45m", status: "Loitering", assetId: "#01934", altitude: 380, lat: 25.80, lng: 73.35, speed: 19, verticalRate: 1,  warnings: 0 },
  "tgt-8":  { id: "tgt-8",  name: "Echo Drone",    battery: 71, batteryTime: "4h 40m", status: "Transit",   assetId: "#01935", altitude: 420, lat: 25.20, lng: 73.60, speed: 44, verticalRate: 5,  warnings: 2 },
  "tgt-9":  { id: "tgt-9",  name: "Foxtrot UAS",   battery: 24, batteryTime: "0h 50m", status: "RTB",       assetId: "#01936", altitude: 510, lat: 27.95, lng: 73.05, speed: 60, verticalRate: -10, warnings: 1 },
  "tgt-10": { id: "tgt-10", name: "Golf UAV",      battery: 83, batteryTime: "5h 55m", status: "Hovering",  assetId: "#01937", altitude: 180, lat: 26.85, lng: 73.72, speed: 3,  verticalRate: 0,  warnings: 0 },
  "tgt-11": { id: "tgt-11", name: "Hotel Drone",   battery: 66, batteryTime: "4h 10m", status: "Loitering", assetId: "#01938", altitude: 200, lat: 26.82, lng: 73.68, speed: 22, verticalRate: 3,  warnings: 0 },
};

// Mock asset rows matching Figma "Aakash Drone" card structure
const MOCK_ASSET_ROWS = MOCK_DEVICES.map((d, i) => ({
  id:        d.id,
  name:      d.serial_number,
  status:    "Loitering" as const,
  battery:   [74, 68, 81, 55][i] ?? 74,
  lat:       d.latitude.toFixed(4),
  lng:       d.longitude.toFixed(4),
  altitude:  [450, 380, 520, 310][i] ?? 450,
  assetId:   `#0${1920 + i + 1}`,
}));

// ---------------------------------------------------------------------------
// Assets overlay — floating panel (Figma Frame 34, node 118:1568)
// Opens when Assets nav icon is clicked. Position: left=79, top=76, 393×649
// ---------------------------------------------------------------------------

function AssetsOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-20"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Assets"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.2)" }}
        aria-hidden
      />
      <div
        className="absolute z-10 flex flex-col overflow-hidden"
        style={{
          left:         POSITION.assetsLeft,
          top:          POSITION.assetsTop,
          width:        POSITION.assetsWidth,
          height:       POSITION.assetsHeight,
          padding:      "12px 16px",
          gap:          "12px",
          background:   "rgba(20, 20, 20, 0.95)",
          border:       `1px solid ${COLOR.borderMedium}`,
          borderRadius: RADIUS.panel,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — "ASSETS" (uppercase) + Filter + Add Asset */}
        <div className="flex items-center justify-between shrink-0">
          <span
            className="uppercase tracking-wide"
            style={{
              fontFamily: FONT.family,
              fontSize:   "18px",
              fontWeight: 500,
              lineHeight: "26px",
              color:      "#f5f5f5",
            }}
          >
            Assets
          </span>
          <div className="flex items-center gap-2">
            {/* Filter button: icon + "Filter" text, bg rgba(255,255,255,0.2) */}
            <button
              type="button"
              className="flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{
                padding:      "4px 8px 4px 4px",
                background:   "rgba(255,255,255,0.2)",
                borderRadius: RADIUS.panel,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <line x1="1" y1="4.38" x2="13" y2="4.38" stroke="#d3d3d3" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="#d3d3d3" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="5.25" y1="9.63" x2="8.75" y2="9.63" stroke="#d3d3d3" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span
                style={{
                  fontFamily: FONT.family,
                  fontSize:   "14px",
                  fontWeight: 500,
                  color:      "#d3d3d3",
                  lineHeight: "16px",
                  letterSpacing: "-0.14px",
                }}
              >
                Filter
              </span>
            </button>
            {/* Add Asset: bg #4c5c0b, text #c6e600, plus icon */}
            <button
              type="button"
              className="flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{
                padding:      "4px 8px 4px 4px",
                background:   "#4c5c0b",
                borderRadius: RADIUS.panel,
                overflow:     "hidden",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <line x1="7" y1="2" x2="7" y2="12" stroke="#c6e600" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="7" x2="12" y2="7" stroke="#c6e600" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span
                style={{
                  fontFamily: FONT.family,
                  fontSize:   "14px",
                  fontWeight: 500,
                  color:      "#c6e600",
                  lineHeight: "16px",
                  letterSpacing: "-0.14px",
                  whiteSpace: "nowrap",
                }}
              >
                Add Asset
              </span>
            </button>
          </div>
        </div>

        {/* Search — bg #1a1a1a, border #535353, icon on RIGHT */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            height:       "32px",
            padding:      "0 12px",
            background:   "#1a1a1a",
            border:       "0.768px solid #535353",
            borderRadius: RADIUS.panel,
          }}
        >
          <input
            type="text"
            placeholder="Search fences...."
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{
              fontFamily: FONT.family,
              fontSize:   "14px",
              color:      "white",
              lineHeight: "20px",
            }}
          />
          <img src="/icons/search.svg" alt="" width={16} height={16} style={{ opacity: 0.5, flexShrink: 0 }} />
        </div>

        {/* Asset list — Figma card structure: checkbox + name/details + status/ID */}
        <div className="flex flex-col gap-[10px] flex-1 overflow-y-auto min-h-0">
          {MOCK_ASSET_ROWS.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-[10px] shrink-0 cursor-pointer"
              style={{
                padding:      "12px",
                background:   "#404040",
                borderRadius: RADIUS.panel,
              }}
            >
              {/* Checkbox (CheckSquare) */}
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width:  20,
                  height: 20,
                  border: "1.5px solid #c6e600",
                  borderRadius: "2px",
                  background: "rgba(198,230,0,0.15)",
                }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                  <path d="M1 4l3 3 5-6" stroke="#c6e600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Left: name + meta row */}
              <div className="flex flex-col flex-1 min-w-0 justify-between self-stretch">
                <span
                  style={{
                    fontFamily: FONT.family,
                    fontSize:   "14px",
                    color:      "#e6e6e6",
                    lineHeight: "20px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.name}
                </span>
                <div className="flex items-center gap-[5px]" style={{ opacity: 0.7 }}>
                  {/* Battery */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <rect x="1" y="4" width="12" height="8" rx="1" stroke="white" strokeWidth="1.2"/>
                    <rect x="13" y="6" width="2" height="4" rx="0.5" fill="white"/>
                    <rect x="2" y="5" width={`${(a.battery / 100) * 10}`} height="6" fill="white"/>
                  </svg>
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", lineHeight: "16px", whiteSpace: "nowrap" }}>
                    {a.battery}%
                  </span>
                  {/* Map pin */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5C2.5 7 6 11 6 11C6 11 9.5 7 9.5 4.5C9.5 2.57 7.93 1 6 1ZM6 5.75C5.31 5.75 4.75 5.19 4.75 4.5C4.75 3.81 5.31 3.25 6 3.25C6.69 3.25 7.25 3.81 7.25 4.5C7.25 5.19 6.69 5.75 6 5.75Z" fill="white"/>
                  </svg>
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", lineHeight: "16px", whiteSpace: "nowrap" }}>
                    {a.lat},{a.lng}
                  </span>
                  {/* Arrows vertical */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <path d="M6 1v10M3 4l3-3 3 3M3 8l3 3 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", lineHeight: "16px", whiteSpace: "nowrap" }}>
                    {a.altitude}m
                  </span>
                </div>
              </div>

              {/* Right: status badge + asset ID */}
              <div className="flex flex-col items-end gap-[6px] shrink-0">
                <div className="flex items-center gap-[10px]">
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: "16px", whiteSpace: "nowrap" }}>
                    {a.status}
                  </span>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      padding:      "4px 8px",
                      background:   "#171717",
                      borderRadius: RADIUS.panel,
                    }}
                  >
                    {/* Broadcast icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Broadcast">
                      <circle cx="7" cy="7" r="1.5" fill="#c6e600"/>
                      <path d="M4.5 4.5a3.5 3.5 0 0 0 0 5" stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                      <path d="M9.5 4.5a3.5 3.5 0 0 1 0 5" stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                      <path d="M2.5 2.5a6.5 6.5 0 0 0 0 9" stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                      <path d="M11.5 2.5a6.5 6.5 0 0 1 0 9" stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily:  FONT.family,
                    fontSize:    "12px",
                    color:       "white",
                    lineHeight:  "16px",
                    opacity:     0.4,
                    textAlign:   "right",
                    width:       "92px",
                  }}
                >
                  {a.assetId}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — HORIZONTAL row: Multi View | Return to base | SOS Land */}
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              padding:      "5px 9px",
              background:   "#404040",
              border:       "1px solid #8a8a8a",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              color:        "#d3d3d3",
              lineHeight:   "20px",
              whiteSpace:   "nowrap",
            }}
          >
            Multi View
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              padding:      "5px 9px",
              background:   "#272727",
              border:       "1px solid #535353",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              color:        "#d3d3d3",
              lineHeight:   "20px",
              whiteSpace:   "nowrap",
            }}
          >
            Return to base
          </button>
          <button
            type="button"
            className="flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              padding:      "5px 9px",
              background:   "#451b03",
              border:       "1px solid #91430f",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              color:        "#f4a30c",
              lineHeight:   "20px",
              whiteSpace:   "nowrap",
            }}
          >
            SOS Land
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Missions overlay — Figma node 235:3799 (missions icon click)
// Header: "Missions" + "Create mission" | Search | Mission list with status badges
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  MissionStatus,
  { label: string; color: string; icon: "hourglass" | "launched" | "broadcast" | "check" }
> = {
  STAGED:    { label: "STAGED",    color: "#8a8a8a", icon: "hourglass" },
  LAUNCHED:  { label: "LAUNCHED", color: "#f4a30c", icon: "launched" },
  ACTIVE:    { label: "ACTIVE",    color: "#eeff30", icon: "broadcast" },
  COMPLETED: { label: "COMPLETED", color: "#0cbb58", icon: "check" },
};

function MissionsOverlay({
  isOpen,
  onClose,
  onCreateMissionClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateMissionClick?: () => void;
}) {
  const [search, setSearch] = useState("");
  const filteredMissions = MOCK_MISSIONS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-20"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Missions"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.2)" }}
        aria-hidden
      />
      <div
        className="absolute z-10 flex flex-col overflow-hidden"
        style={{
          left:         POSITION.missionsLeft,
          top:          POSITION.missionsTop,
          width:        POSITION.missionsWidth,
          height:       POSITION.missionsHeight,
          padding:      "12px 16px",
          gap:          "14px",
          background:   "rgba(0,0,0,0.64)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border:       `1px solid ${COLOR.borderMedium}`,
          borderRadius: RADIUS.panel,
          boxShadow:    "0px 4px 8px 0px rgba(0,0,0,0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — "Missions" + "Create mission" button */}
        <div className="flex items-center justify-between shrink-0 gap-2">
          <span
            style={{
              fontFamily: FONT.family,
              fontSize:   "18px",
              fontWeight: 500,
              lineHeight: "26px",
              color:      "#d3d3d3",
              flex:       "1 0 0",
            }}
          >
            Missions
          </span>
          <button
            type="button"
            onClick={onCreateMissionClick}
            className="flex items-center gap-1 shrink-0 transition-opacity hover:opacity-90"
            style={{
              padding:      "8px 12px 8px 4px",
              background:   "#4c5c0b",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              fontWeight:   500,
              color:        "#c6e600",
              lineHeight:   "16px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create mission
          </button>
        </div>

        {/* Search — bg rgba(0,0,0,0.4), border #404040 */}
        <div
          className="flex items-center shrink-0"
          style={{
            height:       "32px",
            padding:      "0 12px",
            background:   "rgba(0,0,0,0.4)",
            border:       "1px solid #404040",
            borderRadius: RADIUS.panel,
          }}
        >
          <input
            type="text"
            placeholder="Search Missions...."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{
              fontFamily: FONT.family,
              fontSize:   "14px",
              color:      "white",
              lineHeight: "20px",
            }}
          />
          <img src="/icons/search.svg" alt="" width={16} height={16} style={{ opacity: 0.5, flexShrink: 0 }} />
        </div>

        {/* Mission list — scrollable */}
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
          {filteredMissions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
          {filteredMissions.length === 0 && (
            <div
              style={{
                fontFamily: FONT.family,
                fontSize:   "12px",
                color:      "#8a8a8a",
                padding:    "12px",
              }}
            >
              No missions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({ mission }: { mission: MockMission }) {
  const cfg = STATUS_CONFIG[mission.status];
  return (
    <div
      className="flex flex-col items-start shrink-0 cursor-pointer transition-opacity hover:opacity-90"
      style={{
        padding:      "12px",
        background:   "rgba(0,0,0,0.4)",
        border:       `1px solid ${COLOR.borderMedium}`,
        borderRadius: RADIUS.panel,
        width:        "100%",
      }}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span
            style={{
              fontFamily: FONT.family,
              fontSize:   "14px",
              fontWeight: 400,
              lineHeight: "20px",
              color:      "#e6e6e6",
            }}
          >
            {mission.name}
          </span>
          <span
            style={{
              fontFamily: FONT.family,
              fontSize:   "12px",
              lineHeight: "16px",
              color:      "#d3d3d3",
              opacity:    0.6,
            }}
          >
            Created on {mission.createdAt}
          </span>
        </div>
        <div
          className="flex items-center gap-2 shrink-0"
          style={{
            padding:      "4px 8px",
            background:   "#171717",
            borderRadius: RADIUS.panel,
            color:       cfg.color,
          }}
        >
          <StatusIcon type={cfg.icon} />
          <span
            style={{
              fontFamily: FONT.family,
              fontSize:   "12px",
              lineHeight: "16px",
              whiteSpace: "nowrap",
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ type }: { type: "hourglass" | "launched" | "broadcast" | "check" }) {
  const size = 14;
  if (type === "hourglass") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M4 2h6v2.5L7 7l3 2.5V12H4V9.5L7 7 4 4.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    );
  }
  if (type === "launched") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M7 1.5v10M4 4.5l3-3 3 3M4 9.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    );
  }
  if (type === "broadcast") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
        <path d="M4.5 4.5a3.5 3.5 0 0 0 0 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <path d="M9.5 4.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <path d="M2.5 2.5a6.5 6.5 0 0 0 0 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <path d="M11.5 2.5a6.5 6.5 0 0 1 0 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Select Asset view — Figma node 235:5039
// Opens when "ASSIGN ASSET" is clicked in Create Mission dialog
// Back button returns to Create Mission
// ---------------------------------------------------------------------------

function SelectAssetView({
  onBack,
  onAssignAsset,
}: {
  onBack: () => void;
  onAssignAsset: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_SELECT_ASSETS[0]?.id ?? null);

  return (
    <div
      className="absolute z-10 flex flex-col overflow-hidden"
      style={{
        left:         POSITION.selectAssetLeft,
        top:          POSITION.selectAssetTop,
        width:        POSITION.selectAssetWidth,
        height:       POSITION.selectAssetHeight,
        padding:      "12px 16px",
        gap:          "14px",
        background:   "rgba(0,0,0,0.64)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border:       `1px solid ${COLOR.borderMedium}`,
        borderRadius: RADIUS.panel,
        boxShadow:    "0px 4px 8px 0px rgba(0,0,0,0.24)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — Back + "Select Asset" */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 size-8 flex items-center justify-center transition-opacity hover:opacity-80"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>
        <span
          style={{
            fontFamily: FONT.family,
            fontSize:   "18px",
            fontWeight: 500,
            lineHeight: "26px",
            color:      "#d3d3d3",
            flex:       "1 0 0",
          }}
        >
          Select Asset
        </span>
      </div>

      {/* Content — two columns: asset list (left) + config (right) */}
      <div
        className="flex gap-4 flex-1 min-h-0 overflow-hidden"
        style={{ background: "rgba(0,0,0,0.4)", borderRadius: RADIUS.panel, padding: 8 }}
      >
        {/* Left — asset list */}
        <div className="flex flex-col gap-2 w-[328px] shrink-0 overflow-y-auto">
          {MOCK_SELECT_ASSETS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="text-left shrink-0"
              style={{
                padding:      "12px 8px",
                background:   "rgba(0,0,0,0.4)",
                border:       selectedId === a.id ? "1px solid #c6e600" : "1px solid transparent",
                borderRadius: RADIUS.panel,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="shrink-0 size-5 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", borderRadius: 2 }}>
                      <DroneIconSmall />
                    </div>
                    <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "#e6e6e6" }}>{a.name}</span>
                    <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{a.assetId}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ opacity: 0.7 }}>
                    <BatteryIcon />
                    <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white" }}>{a.battery}%</span>
                    <MapPinIcon />
                    <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white" }}>{a.coords}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                      Payload: {a.payload}
                    </span>
                    <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
                      GNSS {a.gnssValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                </div>
                <BroadcastIcon />
              </div>
            </button>
          ))}
        </div>

        {/* Right — config placeholder + ASSIGN ASSET button */}
        <div className="flex flex-col flex-1 min-w-0 gap-4">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.64)" }}>Asset Task</span>
            <div
              style={{
                height:       "32px",
                padding:      "0 12px",
                background:   "rgba(0,0,0,0.4)",
                border:       "1px solid #404040",
                borderRadius: RADIUS.panel,
                fontFamily:   FONT.family,
                fontSize:     "14px",
                color:        "#8a8a8a",
                display:      "flex",
                alignItems:   "center",
              }}
            >
              Surveillance
            </div>
            <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.64)" }}>Payload</span>
            <div
              style={{
                height:       "32px",
                padding:      "0 12px",
                background:   "rgba(0,0,0,0.4)",
                border:       "1px solid #404040",
                borderRadius: RADIUS.panel,
                fontFamily:   FONT.family,
                fontSize:     "14px",
                color:        "#8a8a8a",
                display:      "flex",
                alignItems:   "center",
              }}
            >
              EOS Camera
            </div>
          </div>
          <button
            type="button"
            onClick={onAssignAsset}
            className="w-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-90"
            style={{
              padding:      "12px 16px",
              background:   "white",
              border:       "none",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              fontWeight:   500,
              color:        "#171717",
              lineHeight:   "20px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ASSIGN ASSET
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Mission modal — Figma node 235:3866 / 259:1726
// Opens when "Create mission" is clicked in Missions overlay
// ---------------------------------------------------------------------------

const MISSION_TYPES = ["Surveillance", "Interception", "Patrol"] as const;

type CreateMissionView = "create" | "assignAsset";

function CreateMissionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<CreateMissionView>("create");
  const [missionName, setMissionName] = useState("");
  const [missionType, setMissionType] = useState<(typeof MISSION_TYPES)[number]>("Surveillance");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [fences, setFences] = useState(MOCK_CREATE_FENCES);
  const [assets, setAssets] = useState(MOCK_CREATE_ASSETS);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "assignAsset") {
          setView("create");
        } else {
          setTypeDropdownOpen(false);
          onClose();
        }
      }
    },
    [onClose, view],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "assignAsset") {
          setView("create");
        } else {
          setTypeDropdownOpen(false);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, view]);

  if (!isOpen) return null;

  // Select Asset view — Figma node 235:5039
  if (view === "assignAsset") {
    return (
      <div
        className="absolute inset-0 z-30"
        onClick={() => setView("create")}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="Select Asset"
      >
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} aria-hidden />
        <SelectAssetView
          onBack={() => setView("create")}
          onAssignAsset={() => setView("create")}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-30"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Create Mission"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.3)" }}
        aria-hidden
      />
      <div
        className="absolute z-10 flex flex-col overflow-hidden"
        style={{
          left:         POSITION.createMissionLeft,
          top:          POSITION.createMissionTop,
          width:        POSITION.createMissionWidth,
          height:       POSITION.createMissionHeight,
          padding:      "12px 16px",
          gap:          "14px",
          background:   "rgba(0,0,0,0.64)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border:       `1px solid ${COLOR.borderMedium}`,
          borderRadius: RADIUS.panel,
          boxShadow:    "0px 4px 8px 0px rgba(0,0,0,0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — "Create Mission" + X close */}
        <div className="flex items-center justify-between shrink-0 gap-2">
          <span
            style={{
              fontFamily: FONT.family,
              fontSize:   "18px",
              fontWeight: 500,
              lineHeight: "26px",
              color:      "#d3d3d3",
              flex:       "1 0 0",
            }}
          >
            Create Mission
          </span>
          <button
            type="button"
            className="shrink-0 size-8 flex items-center justify-center transition-opacity hover:opacity-80"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Form — Mission Name, Mission Type, Fence, Assets */}
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          {/* Mission Name */}
          <div
            className="flex items-center shrink-0"
            style={{
              height:       "32px",
              padding:      "0 12px",
              background:   "rgba(0,0,0,0.4)",
              border:       "1px solid #404040",
              borderRadius: RADIUS.panel,
            }}
          >
            <input
              type="text"
              placeholder="Mission Name"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              className="flex-1 bg-transparent outline-none min-w-0"
              style={{
                fontFamily: FONT.family,
                fontSize:   "14px",
                color:     "white",
                lineHeight: "20px",
              }}
            />
          </div>

          {/* Mission Type dropdown */}
          <div className="flex flex-col gap-2 shrink-0">
            <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.64)" }}>
              Mission Type
            </span>
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between shrink-0"
                style={{
                  height:       "32px",
                  padding:      "0 12px",
                  background:   "rgba(0,0,0,0.4)",
                  border:       "1px solid #404040",
                  borderRadius: RADIUS.panel,
                }}
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              >
                <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "#8a8a8a" }}>
                  {missionType}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 4.5l3 3 3-3" />
                </svg>
              </button>
              {typeDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-10"
                  style={{
                    background:   "rgba(26,26,26,0.98)",
                    border:       `1px solid ${COLOR.borderMedium}`,
                    borderRadius: RADIUS.panel,
                    overflow:     "hidden",
                  }}
                >
                  {MISSION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="w-full text-left px-3 py-2 transition-colors hover:bg-white/10"
                      style={{ fontFamily: FONT.family, fontSize: "14px", color: "#e6e6e6" }}
                      onClick={() => {
                        setMissionType(t);
                        setTypeDropdownOpen(false);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fence section */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.64)" }}>
                Fence
              </span>
              <button
                type="button"
                className="flex items-center gap-1 transition-opacity hover:opacity-90"
                style={{
                  padding:      "2px 8px",
                  fontFamily:   FONT.family,
                  fontSize:     "12px",
                  fontWeight:   500,
                  color:        "#c6e600",
                  lineHeight:   "16px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="7" y1="2" x2="7" y2="12" />
                  <line x1="2" y1="7" x2="12" y2="7" />
                </svg>
                NEW FENCE
              </button>
            </div>
            <div
              className="flex flex-col shrink-0"
              style={{
                background:   "rgba(0,0,0,0.4)",
                padding:      "0 8px",
                borderRadius: RADIUS.panel,
              }}
            >
              {fences.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2"
                  style={{
                    padding:      "12px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="shrink-0 rounded-full"
                      style={{ width: 8, height: 8, background: f.color }}
                    />
                    <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "rgba(255,255,255,0.64)", whiteSpace: "nowrap",
 overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 size-4 flex items-center justify-center transition-opacity hover:opacity-80"
                    onClick={() => setFences((prev) => prev.filter((x) => x.id !== f.id))}
                    aria-label={`Remove ${f.label}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
              {fences.length === 0 && (
                <div style={{ padding: "12px 8px", fontFamily: FONT.family, fontSize: "12px", color: "#8a8a8a" }}>
                  No fences added
                </div>
              )}
            </div>
          </div>

          {/* Assets section */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.64)" }}>
                Assets
              </span>
              <button
                type="button"
                onClick={() => setView("assignAsset")}
                className="flex items-center gap-1 transition-opacity hover:opacity-90"
                style={{
                  padding:      "2px 8px",
                  fontFamily:   FONT.family,
                  fontSize:     "12px",
                  fontWeight:   500,
                  color:        "#c6e600",
                  lineHeight:   "16px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="7" y1="2" x2="7" y2="12" />
                  <line x1="2" y1="7" x2="12" y2="7" />
                </svg>
                ASSIGN ASSET
              </button>
            </div>
            <div
              className="flex flex-col shrink-0"
              style={{
                background:   "rgba(0,0,0,0.4)",
                padding:      "0 8px",
                borderRadius: RADIUS.panel,
              }}
            >
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-end justify-between gap-2"
                  style={{
                    padding:      "12px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="shrink-0 size-5 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.4)", borderRadius: 2 }}
                      >
                        <DroneIconSmall />
                      </div>
                      <div className="flex items-center gap-1">
                        <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "#e6e6e6" }}>{a.name}</span>
                        <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{a.assetId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" style={{ opacity: 0.7 }}>
                      <BatteryIcon />
                      <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white" }}>{a.battery}%</span>
                      <MapPinIcon />
                      <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white" }}>{a.coords}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BroadcastIcon />
                    <button
                      type="button"
                      className="shrink-0 size-4 flex items-center justify-center transition-opacity hover:opacity-80"
                      onClick={() => setAssets((prev) => prev.filter((x) => x.id !== a.id))}
                      aria-label={`Remove ${a.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
              {assets.length === 0 && (
                <div style={{ padding: "12px 8px", fontFamily: FONT.family, fontSize: "12px", color: "#8a8a8a" }}>
                  No assets assigned
                </div>
              )}
            </div>
          </div>

          {/* CREATE MISSION button */}
          <button
            type="button"
            className="w-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-90"
            style={{
              padding:      "12px 16px",
              background:   "#171717",
              border:       "1px solid rgba(255,255,255,0.12)",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              fontWeight:   500,
              color:        "white",
              lineHeight:   "20px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
            onClick={() => onClose()}
          >
            CREATE MISSION
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M7 7v4M9 7v4M11 4v8a1 1 0 01-1 1H6a1 1 0 01-1-1V4" />
    </svg>
  );
}

function DroneIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
      <path d="M8 2v4M4 6l4 4 4-4M8 10v4" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="1" y="4" width="11" height="8" rx="1" />
      <rect x="12" y="6" width="2" height="4" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M6 1a6 6 0 00-6 6c0 4 6 6 6 6s6-2 6-6a6 6 0 00-6-6z" clipRule="evenodd" />
      <circle cx="6" cy="6" r="2" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      <path d="M4.5 4.5a3.5 3.5 0 0 0 0 5" />
      <path d="M9.5 4.5a3.5 3.5 0 0 1 0 5" />
      <path d="M2.5 2.5a6.5 6.5 0 0 0 0 9" />
      <path d="M11.5 2.5a6.5 6.5 0 0 1 0 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Drone detail panel — Figma node 5:530 / Component 1 (node I33:543;33:447)
// Appears when a drone marker is clicked on the map.
// Width: 316px, bg #272727. Positioned near the clicked marker.
// ---------------------------------------------------------------------------

function DroneDetailPanel({
  drone,
  onClose,
}: {
  drone: DroneDetail;
  onClose: () => void;
}) {
  const PANEL_W = 316;
  const PANEL_H = 520; // approximate

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Clamp position so panel stays within viewport
  const left = Math.min(drone.screenX + 16, window.innerWidth  - PANEL_W - 16);
  const top  = Math.max(8, Math.min(drone.screenY - 60, window.innerHeight - PANEL_H - 16));

  return (
    <div
      className="absolute inset-0 z-30"
      onClick={onClose}
    >
      <div
        className="absolute flex flex-col overflow-hidden"
        style={{
          left:         left,
          top:          top,
          width:        PANEL_W,
          background:   "#272727",
          borderRadius: RADIUS.panel,
          boxShadow:    "0px 4px 8px 0px rgba(0,0,0,0.24)",
          padding:      "12px 16px",
          gap:          14,
          display:      "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Row 1: Status badges ─────────────────────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Broadcast badge */}
          <div
            className="flex items-center justify-center"
            style={{ padding: "4px 8px", background: "#171717", borderRadius: RADIUS.panel }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Signal">
              <circle cx="7" cy="7" r="1.5" fill="#c6e600"/>
              <path d="M4.5 4.5a3.5 3.5 0 0 0 0 5"  stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M9.5 4.5a3.5 3.5 0 0 1 0 5"  stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M2.5 2.5a6.5 6.5 0 0 0 0 9"  stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M11.5 2.5a6.5 6.5 0 0 1 0 9" stroke="#c6e600" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          {/* Warning badge (only when warnings > 0) */}
          {drone.warnings > 0 && (
            <div
              className="flex items-center gap-1 justify-center"
              style={{ padding: "4px 8px", background: "#150000", borderRadius: RADIUS.panel }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Warning">
                <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="#cf0000" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
                <line x1="7" y1="5.5" x2="7" y2="8.5" stroke="#cf0000" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.6" fill="#cf0000"/>
              </svg>
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "#cf0000", lineHeight: "16px" }}>
                {drone.warnings}
              </span>
            </div>
          )}
          {/* GNSS Valid badge */}
          <div
            className="flex items-center gap-1 justify-center"
            style={{ padding: "4px 8px", background: "#1a1a1a", borderRadius: RADIUS.panel }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Link">
              <path d="M5.5 8.5L8.5 5.5" stroke="#8a8a8a" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M4 6L3 7a2.5 2.5 0 0 0 3.54 3.54l1-1" stroke="#8a8a8a" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M10 8l1-1A2.5 2.5 0 0 0 7.46 3.46l-1 1" stroke="#8a8a8a" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
            <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "#8a8a8a", lineHeight: "16px", whiteSpace: "nowrap" }}>
              GNSS Valid
            </span>
          </div>
        </div>

        {/* ── Row 2: Name / battery + Status / ID ──────────────── */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-start justify-between">
            {/* Left: name + battery */}
            <div className="flex flex-col gap-[5px]" style={{ width: 129 }}>
              <span style={{ fontFamily: FONT.family, fontSize: "14px", fontWeight: 500, color: "white", lineHeight: "20px" }}>
                {drone.name}
              </span>
              <div className="flex items-center gap-1" style={{ opacity: 0.7 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <rect x="1" y="4" width="11" height="8" rx="1" stroke="white" strokeWidth="1.2"/>
                  <rect x="12" y="6" width="2" height="4" rx="0.5" fill="white"/>
                  <rect x="2" y="5" width={`${(drone.battery / 100) * 9}`} height="6" rx="0.5" fill="white"/>
                </svg>
                <span style={{ fontFamily: FONT.family, fontSize: "10px", color: "white", lineHeight: "12px", whiteSpace: "nowrap" }}>
                  {drone.battery}%, {drone.batteryTime} remaining
                </span>
              </div>
            </div>
            {/* Right: status + ID */}
            <div className="flex flex-col items-end gap-1">
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", lineHeight: "16px" }}>
                {drone.status}
              </span>
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", lineHeight: "16px", opacity: 0.4, textAlign: "right" }}>
                {drone.assetId}
              </span>
            </div>
          </div>

          {/* Stats grid: bg rgba(36,36,36,0.46), px-8 py-12, gap-12 */}
          <div
            className="flex flex-col gap-3"
            style={{
              padding:      "12px 8px",
              background:   "rgba(36,36,36,0.46)",
              borderRadius: RADIUS.panel,
            }}
          >
            {/* Row 1: ALT / Lat / Long */}
            <div className="flex items-center justify-between">
              {[
                { label: "ALT (AGL)", value: `${drone.altitude}m` },
                { label: "Lat",       value: drone.lat.toFixed(6) },
                { label: "Long",      value: drone.lng.toFixed(6) },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-[5px]">
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", opacity: 0.6, lineHeight: "16px" }}>{label}</span>
                  <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "white", lineHeight: "20px" }}>{value}</span>
                </div>
              ))}
            </div>
            {/* Row 2: Speed / Vertical rate */}
            <div className="flex items-center gap-11">
              {[
                { label: "Speed",         value: `${drone.speed}km/h` },
                { label: "Vertical rate", value: `${Math.abs(drone.verticalRate)}km/h` },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-[5px]">
                  <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "white", opacity: 0.6, lineHeight: "16px" }}>{label}</span>
                  <span style={{ fontFamily: FONT.family, fontSize: "14px", color: "white", lineHeight: "20px" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Sensor feeds ───────────────────────────────── */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* IR Sensor Feed — collapsed */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "8px", height: 32, background: "#404040", borderRadius: RADIUS.panel }}
          >
            <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "#e6e6e6", lineHeight: "16px", whiteSpace: "nowrap" }}>
              IR Sensor Feed
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 4l4 4 4-4" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Camera Feed — expanded */}
          <div style={{ background: "#404040", borderRadius: RADIUS.panel, overflow: "hidden" }}>
            {/* Header */}
            <div className="flex items-center justify-between" style={{ padding: "8px 8px 4px" }}>
              <span style={{ fontFamily: FONT.family, fontSize: "12px", color: "#e6e6e6", lineHeight: "16px" }}>
                Camera Feed
              </span>
              {/* Caret up */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ transform: "scaleY(-1)" }}>
                <path d="M2 4l4 4 4-4" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Image + tabs */}
            <div className="flex flex-col gap-1" style={{ padding: 4 }}>
              {/* Camera image placeholder — dark gradient */}
              <div
                style={{
                  height:       176,
                  borderRadius: RADIUS.panel,
                  background:   "linear-gradient(to bottom, #2a3a2a 0%, #1a2a1a 60%, rgba(0,0,0,0.7) 100%)",
                  overflow:     "hidden",
                  position:     "relative",
                }}
              >
                <div
                  style={{
                    position:   "absolute",
                    inset:      0,
                    background: "radial-gradient(ellipse at 40% 35%, rgba(40,70,30,0.8) 0%, rgba(10,20,10,0.9) 100%)",
                  }}
                />
                <div style={{ position: "absolute", bottom: 8, right: 8 }}>
                  <span style={{ fontFamily: FONT.mono ?? "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
                    LIVE ●
                  </span>
                </div>
              </div>
              {/* Sensor tabs */}
              <div className="flex items-center gap-1">
                {[
                  { label: "EO Sensor", active: true  },
                  { label: "Sensor 2",  active: false },
                  { label: "Sensor 3",  active: false },
                  { label: "Multi-view",active: false },
                ].map(({ label, active }) => (
                  <button
                    key={label}
                    type="button"
                    className="transition-opacity hover:opacity-90"
                    style={{
                      padding:      "2px 6px",
                      background:   active ? "#e6e6e6" : "#1a1a1a",
                      borderRadius: RADIUS.panel,
                      fontFamily:   FONT.family,
                      fontSize:     "12px",
                      color:        active ? "#171717" : "#a3a3a3",
                      lineHeight:   "16px",
                      whiteSpace:   "nowrap",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Actions ───────────────────────────────────── */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* Control Drone — full width */}
          <button
            type="button"
            className="w-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              padding:      "5px 9px",
              background:   "#404040",
              border:       "1px solid #8a8a8a",
              borderRadius: RADIUS.panel,
              fontFamily:   FONT.family,
              fontSize:     "14px",
              color:        "#d3d3d3",
              lineHeight:   "20px",
            }}
          >
            Control Drone
          </button>
          {/* Bottom row: Return to base + SOS Land + Abort */}
          <div className="flex gap-1">
            <button
              type="button"
              className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                padding:      "5px 9px",
                background:   "#272727",
                border:       "1px solid #535353",
                borderRadius: RADIUS.panel,
                fontFamily:   FONT.family,
                fontSize:     "14px",
                color:        "#d3d3d3",
                lineHeight:   "20px",
                whiteSpace:   "nowrap",
              }}
            >
              Return to base
            </button>
            <button
              type="button"
              className="flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                padding:      "5px 9px",
                background:   "#451b03",
                border:       "1px solid #923d1a",
                borderRadius: RADIUS.panel,
                fontFamily:   FONT.family,
                fontSize:     "14px",
                color:        "#f4a30c",
                lineHeight:   "20px",
                whiteSpace:   "nowrap",
              }}
            >
              SOS Land
            </button>
            <button
              type="button"
              className="flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                padding:      "5px 9px",
                background:   "#150000",
                border:       "1px solid #7c0000",
                borderRadius: RADIUS.panel,
                fontFamily:   FONT.family,
                fontSize:     "14px",
                color:        "#cf0000",
                lineHeight:   "20px",
                whiteSpace:   "nowrap",
              }}
            >
              Abort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left panel 2 — Nav icons (Frame 103)
// Figma: x=17 y=76, size 46×268, bg rgba(255,255,255,0.12), padding=4,
//        VERTICAL layout, 5 icon rows (38×52 each), cornerRadius=2, border 1px gradient
// ---------------------------------------------------------------------------

function FloatingNav({
  onSearchClick,
  onAssetsClick,
  onMissionsClick,
  activeNav,
}: {
  onSearchClick?: () => void;
  onAssetsClick?: () => void;
  onMissionsClick?: () => void;
  activeNav?: "Search" | "Assets" | "Missions" | null;
}) {
  return (
    <nav
      className="absolute z-10 flex flex-col items-center"
      style={{
        left:         POSITION.navLeft,    // 17px
        top:          POSITION.navTop,     // 76px
        width:        POSITION.navWidth,   // 46px
        height:       POSITION.navHeight,  // 268px
        padding:      "4px",
        background:   COLOR.navPanelBg,
        borderRadius: RADIUS.panel,        // 2px
        border:       `1px solid ${COLOR.borderMedium}`,
        gap:          0,
      }}
    >
      {NAV_ICONS.map(({ src, label }) => {
        const onClick =
          label === "Search" ? onSearchClick :
          label === "Assets" ? onAssetsClick :
          label === "Missions" ? onMissionsClick : undefined;
        const active = activeNav === label;
        return (
          <div
            key={label}
            className="flex items-center justify-center"
            style={{ width: "38px", height: "52px", flexShrink: 0 }}
          >
            <IconButton src={src} label={label} onClick={onClick} active={active} />
          </div>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Left panel 3 — Settings + User (Frame 99)
// Figma: x=16 y=896, size 44×88, bg rgba(255,255,255,0.08), padding=4,
//        itemSpacing=8, cornerRadius=2, border 1px gradient
// ---------------------------------------------------------------------------

function FloatingSettings() {
  return (
    <div
      className="absolute z-10 flex flex-col items-center"
      style={{
        left:         POSITION.settingsLeft,    // 16px
        bottom:       POSITION.settingsBottom,  // 40px
        width:        POSITION.settingsWidth,   // 44px
        height:       POSITION.settingsHeight,  // 88px
        padding:      "4px",
        gap:          SPACING.settingsGap,      // 8px
        background:   COLOR.panelBg,            // rgba(255,255,255,0.08)
        borderRadius: RADIUS.panel,             // 2px
        border:       `1px solid ${COLOR.borderMedium}`,
      }}
    >
      {SETTINGS_ICONS.map(({ src, label }) => (
        <IconButton key={label} src={src} label={label} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right — 2D / 3D mode toggle (our addition — not in Figma)
// Positioned top-right to not overlap Figma elements
// ---------------------------------------------------------------------------

function MapModeToggle({
  mapMode,
  onChange,
}: {
  mapMode: "2D" | "3D";
  onChange: (mode: "2D" | "3D") => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      {/* Dashboard link — sits directly left of the 2D/3D toggle */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{
          padding:      "5px 10px",
          background:   COLOR.iconButtonBg,
          border:       `1px solid ${COLOR.borderMedium}`,
          borderRadius: RADIUS.panel,
          fontFamily:   FONT.family,
          fontSize:     "12px",
          color:        "#d3d3d3",
          lineHeight:   "16px",
          whiteSpace:   "nowrap",
          textDecoration: "none",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        Dashboard
      </Link>

      {/* 2D / 3D toggle */}
      <div
        className="flex overflow-hidden"
        style={{
          background:   COLOR.iconButtonBg,
          borderRadius: RADIUS.panel,
          border:       `1px solid ${COLOR.borderMedium}`,
        }}
      >
        {(["2D", "3D"] as const).map((mode, i) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="px-3 py-1.5 text-xs font-mono transition-colors"
            style={{
              borderLeft: i > 0 ? `1px solid ${COLOR.borderMedium}` : "none",
              background: mapMode === mode ? COLOR.accentCyan : "transparent",
              color:      mapMode === mode ? "#fff" : "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              if (mapMode !== mode) e.currentTarget.style.background = COLOR.iconButtonHover;
            }}
            onMouseLeave={(e) => {
              if (mapMode !== mode) e.currentTarget.style.background = "transparent";
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right — Notification bell (Frame 104)
// Figma: x=1348 y=76 on 1440-wide frame → right=48px, top=76px
// Size: 44×44, bg rgba(255,255,255,0.08), padding=4, cornerRadius=2
// ---------------------------------------------------------------------------

function NotificationButton() {
  return (
    <div
      className="absolute z-10 flex items-center justify-center"
      style={{
        right:        POSITION.bellRight,  // 48px
        top:          POSITION.bellTop,    // 76px
        width:        POSITION.bellSize,   // 44px
        height:       POSITION.bellSize,   // 44px
        padding:      "4px",
        background:   COLOR.panelBg,
        borderRadius: RADIUS.panel,
        border:       `1px solid ${COLOR.borderMedium}`,
      }}
    >
      <IconButton src="/icons/notifications.svg" label="Notifications" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right — Zoom controls (Frame 88)
// Figma: x=1382 y=877 on 1440×1024 → right=16px, bottom=16px
// Two stacked blocks: Compass (42×48) + Plus/Minus (42×70), gap=12
// ---------------------------------------------------------------------------

function ZoomControls() {
  const handleZoomIn  = useCallback(() => getMap()?.zoomIn({ duration: 300 }), []);
  const handleZoomOut = useCallback(() => getMap()?.zoomOut({ duration: 300 }), []);

  return (
    <div
      className="absolute z-10 flex flex-col"
      style={{
        right:  POSITION.zoomRight,   // 16px
        bottom: POSITION.zoomBottom,  // 16px
        width:  POSITION.zoomWidth,   // 42px
        gap:    "12px",
      }}
    >
      {/* Compass block — 42×48, padding=10 */}
      <div
        className="flex items-center justify-center"
        style={{
          width:        "42px",
          height:       "48px",
          padding:      SPACING.zoomPad,  // 10px
          background:   COLOR.panelBg,
          borderRadius: RADIUS.panel,
          border:       `1px solid ${COLOR.borderMedium}`,
        }}
      >
        {/* Simple compass indicator */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-label="Compass"
        >
          <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <polygon points="10,2 12,10 10,9 8,10" fill="rgba(255,255,255,0.8)" />
          <polygon points="10,18 8,10 10,11 12,10" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>

      {/* Plus / Minus block — 42×70, padding=10, gap=10 between buttons */}
      <div
        className="flex flex-col items-center"
        style={{
          width:        "42px",
          height:       "70px",
          padding:      SPACING.zoomPad,  // 10px
          gap:          SPACING.zoomGap,  // 10px
          background:   COLOR.panelBg,
          borderRadius: RADIUS.panel,
          border:       `1px solid ${COLOR.borderMedium}`,
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={handleZoomIn}
          className="flex items-center justify-center transition-opacity"
          style={{
            width: "20px",
            height: "20px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "18px",
            fontWeight: 300,
            lineHeight: 1,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={handleZoomOut}
          className="flex items-center justify-center transition-opacity"
          style={{
            width: "20px",
            height: "20px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "18px",
            fontWeight: 300,
            lineHeight: 1,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
        >
          −
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DriifUiPage() {
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isCreateMissionOpen, setIsCreateMissionOpen] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState<DroneDetail | null>(null);
  const mapFeatures   = useMemo(() => getDriifUiMapFeatures(), []);
  const setTargets    = useTargetsStore((s) => s.setTargets);
  const clearTargets  = useTargetsStore((s) => s.clearTargets);
  const setCachedMission = useMissionStore((s) => s.setCachedMission);

  /**
   * On mount: populate mock targets and cached mission.
   * Cached mission makes MapContainer's cinematic intro fly to Rajasthan
   * (our mock devices) instead of Jammu (DEFAULT_FLY_CENTER).
   *
   * On unmount: clear both to avoid polluting stores when navigating away.
   */
  useEffect(() => {
    setTargets(MOCK_TARGETS);
    setCachedMission(getDriifUiCachedMission());
    return () => {
      clearTargets();
      setCachedMission(null);
    };
  }, [setTargets, clearTargets, setCachedMission]);

  /**
   * After MapContainer intro completes, fit bounds so all zones are visible.
   *
   * Strategy: poll for map.getLayer("assets-coverage") — that layer exists
   * only after the cinematic intro finishes. Then fitBounds to DRIIF_UI_BOUNDS
   * (encompasses devices, zones, targets) with padding.
   *
   * No changes to MapContainer required.
   */
  useEffect(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 30 seconds max

    const tryFit = () => {
      const map = getMap();
      if (map?.getLayer("assets-coverage")) {
        map.fitBounds(DRIIF_UI_BOUNDS, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          pitch: 0,
          bearing: 0,
          duration: 2000,
          maxZoom: 12,
          essential: true,
        });
        return;
      }
      if (++attempts < MAX_ATTEMPTS) setTimeout(tryFit, 500);
    };

    const timer = setTimeout(tryFit, 500);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Wire click listener on the "targets-symbols" Mapbox layer.
   * Clicking a drone marker opens the DroneDetailPanel at the click position.
   * Clicking anywhere else on the map closes it.
   * Poll until the layer exists (created after cinematic intro).
   */
  useEffect(() => {
    let pollAttempts = 0;
    const MAX_POLL = 120; // 60 seconds

    const setup = () => {
      const map = getMap();
      if (!map?.getLayer("targets-symbols")) {
        if (++pollAttempts < MAX_POLL) setTimeout(setup, 500);
        return;
      }

      const handleDroneClick = (
        e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] },
      ) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const targetId = feature.properties?.id as string | undefined;
        if (!targetId) return;
        const detail = DRONE_DETAIL_MAP[targetId];
        if (!detail) return;
        const point = map.project(e.lngLat);
        setSelectedDrone({ ...detail, screenX: point.x, screenY: point.y });
        // Prevent the map click handler below from immediately closing
        (e as unknown as { _droneHandled: boolean })._droneHandled = true;
      };

      const handleMapClick = (e: mapboxgl.MapMouseEvent & { _droneHandled?: boolean }) => {
        if (!e._droneHandled) setSelectedDrone(null);
      };

      const handleMouseEnter = () => { map.getCanvas().style.cursor = "pointer"; };
      const handleMouseLeave = () => { map.getCanvas().style.cursor = ""; };

      map.on("click", "targets-symbols", handleDroneClick);
      map.on("click", handleMapClick);
      map.on("mouseenter", "targets-symbols", handleMouseEnter);
      map.on("mouseleave", "targets-symbols", handleMouseLeave);

      return () => {
        map.off("click", "targets-symbols", handleDroneClick);
        map.off("click", handleMapClick);
        map.off("mouseenter", "targets-symbols", handleMouseEnter);
        map.off("mouseleave", "targets-symbols", handleMouseLeave);
        map.getCanvas().style.cursor = "";
      };
    };

    const timer = setTimeout(setup, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/*
       * Hide Mapbox default NavigationControl (top-right) on this page only.
       * Custom zoom controls are rendered at bottom-right via ZoomControls.
       * Scoped to #driif-ui-map wrapper — no other pages affected.
       */}
      <style>{`
        #driif-ui-map .mapboxgl-ctrl-top-right .mapboxgl-ctrl-group { display: none !important; }
      `}</style>

      <div
        id="driif-ui-map"
        className="relative h-screen w-full overflow-hidden"
        style={{ background: COLOR.pageBg }}
      >
        {/* Map fills the entire screen */}
        <div className="absolute inset-0">
          <MapContainer
            mapMode={mapMode}
            missionId="driif-demo"
            mapFeatures={mapFeatures}
          />
        </div>

        {/* ── Left side: 3 separate floating panels ─────────────────────── */}
        <FloatingLogo />
        <FloatingNav
          onSearchClick={() => setIsSearchOpen(true)}
          onAssetsClick={() => setIsAssetsOpen(true)}
          onMissionsClick={() => setIsMissionsOpen(true)}
          activeNav={
            isSearchOpen ? "Search" :
            isAssetsOpen ? "Assets" :
            isMissionsOpen ? "Missions" : null
          }
        />
        <FloatingSettings />

        {/* ── Search overlay (opens when search icon clicked) ───────────── */}
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* ── Assets overlay (opens when Assets icon clicked) ─────────── */}
        <AssetsOverlay isOpen={isAssetsOpen} onClose={() => setIsAssetsOpen(false)} />

        {/* ── Missions overlay (opens when Missions icon clicked) ─────── */}
        <MissionsOverlay
          isOpen={isMissionsOpen}
          onClose={() => setIsMissionsOpen(false)}
          onCreateMissionClick={() => setIsCreateMissionOpen(true)}
        />

        {/* ── Create Mission modal (opens when Create mission clicked) ── */}
        <CreateMissionModal
          isOpen={isCreateMissionOpen}
          onClose={() => setIsCreateMissionOpen(false)}
        />

        {/* ── Drone detail panel (opens when a drone marker is clicked) ── */}
        {selectedDrone && (
          <DroneDetailPanel drone={selectedDrone} onClose={() => setSelectedDrone(null)} />
        )}

        {/* ── Right side: notification + 2D/3D + zoom ───────────────────── */}
        <MapModeToggle mapMode={mapMode} onChange={setMapMode} />
        <NotificationButton />
        <ZoomControls />

      </div>
    </>
  );
}
