"use client";

/**
 * Floating COP chrome — nav rail, logo, settings, top-right notifications (opens detections).
 * Map + mission panels render beneath; this layer uses pointer-events only on controls.
 */

import Image from "next/image";
import { COLOR, FONT, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";
import { COP_GLASS_PANEL } from "@/components/cop-shell/shellStyles";

/** Solid chrome over light basemap — logo, nav rail, settings, notifications */
const COP_SOLID_BG = "#1A1A1A";

const NAV_ITEMS = [
  { key: "search", src: "/icons/search.svg", label: "Search" },
  { key: "assets", src: "/icons/assets.svg", label: "Assets" },
  { key: "missions", src: "/icons/missions.svg", label: "Missions" },
  { key: "files", src: "/icons/files.svg", label: "Files" },
  { key: "logs", src: "/icons/logs.svg", label: "Logs" },
] as const;

const SETTINGS_SLOTS = [
  {
    key: "settings" as const,
    src: "/icons/settings.svg",
    label: "Settings",
    tooltip: "Settings — map, basemap, WebSockets",
  },
  {
    key: "account" as const,
    src: "/icons/user.svg",
    label: "Account",
    tooltip: "Account — profile and preferences",
  },
] as const;

export type CopShellProps = {
  activeNavKey: string | null;
  onNav: (key: string) => void;
  /** Which bottom-left control is selected when the settings panel is open (mirrors nav `activeNavKey`). */
  activeSettingsSlot?: "settings" | "account" | null;
  /** Bottom-left stack: `"settings"` = gear, `"account"` = user icon. Prefer this over separate click props. */
  onSettingsStackSelect?: (slot: "settings" | "account") => void;
  /** @deprecated Use `onSettingsStackSelect` */
  onSettingsClick?: () => void;
  /** @deprecated Use `onSettingsStackSelect` */
  onUserClick?: () => void;
  /** Top-right notifications control — toggles overall detections overlay */
  onBell: () => void;
  /** Whether the overall detections panel is open (accessibility). */
  detectionsOpen?: boolean;
};

export function CopShell({
  activeNavKey,
  onNav,
  activeSettingsSlot = null,
  onSettingsStackSelect,
  onSettingsClick,
  onUserClick,
  onBell,
  detectionsOpen = false,
}: CopShellProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-11">
      <div
        className="pointer-events-auto absolute flex items-center justify-center"
        style={{
          left: POSITION.logoLeft,
          top: POSITION.logoTop,
          borderRadius: RADIUS.logo,
          overflow: "hidden",
          background: COP_SOLID_BG,
          border: COP_GLASS_PANEL.border,
          boxShadow: COP_GLASS_PANEL.boxShadow,
          padding: "6px 8px",
        }}
      >
        <Image
          src="/driif-logo-small.png"
          alt="Driif"
          width={28}
          height={26}
          priority
        />
      </div>

      <nav
        className="pointer-events-auto absolute flex flex-col items-center gap-0 px-0 py-1"
        style={{
          left: POSITION.navLeft,
          top: POSITION.navTop,
          width: POSITION.navWidth,
          boxSizing: "border-box",
          minHeight: POSITION.navHeight,
          background: COP_SOLID_BG,
          border: COP_GLASS_PANEL.border,
          borderRadius: RADIUS.panel,
          boxShadow: COP_GLASS_PANEL.boxShadow,
        }}
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeNavKey === item.key;
          return (
            <div
              key={item.key}
              className="group relative flex shrink-0 flex-col items-center"
            >
              <button
                type="button"
                aria-label={item.label}
                aria-pressed={active}
                onClick={() => onNav(item.key)}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: SPACING.iconRowHeight,
                  height: SPACING.iconRowHeight,
                  padding: SPACING.iconButtonPad,
                  borderRadius: RADIUS.panel,
                  background: active ? COLOR.iconButtonBg : "transparent",
                  boxShadow: active
                    ? `inset 2px 0 0 0 ${COLOR.navRailActiveEdge}`
                    : "none",
                }}
              >
                <Image
                  src={item.src}
                  alt=""
                  width={20}
                  height={20}
                  className={active ? "opacity-100" : "opacity-90"}
                />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-20 -translate-y-1/2 rounded-[2px] border px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                style={{
                  marginLeft: 8,
                  background: COP_SOLID_BG,
                  border: COP_GLASS_PANEL.border,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                  color: COLOR.missionsTitleMuted,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                  whiteSpace: "nowrap",
                }}
                role="tooltip"
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      <div
        className="pointer-events-auto absolute flex flex-col items-center gap-0 px-0 py-1"
        style={{
          left: POSITION.settingsLeft,
          bottom: POSITION.settingsBottom,
          width: POSITION.navWidth,
          boxSizing: "border-box",
          background: COP_SOLID_BG,
          border: COP_GLASS_PANEL.border,
          borderRadius: RADIUS.panel,
          boxShadow: "0px 0px 8px rgba(0,0,0,0.62)",
        }}
        aria-label="Settings and account"
      >
        {SETTINGS_SLOTS.map((item) => {
          const active = activeSettingsSlot === item.key;
          return (
            <div
              key={item.key}
              className="group relative flex shrink-0 flex-col items-center"
            >
              <button
                type="button"
                aria-label={item.label}
                aria-pressed={active}
                onClick={() => {
                  if (onSettingsStackSelect) {
                    onSettingsStackSelect(item.key);
                    return;
                  }
                  if (item.key === "settings") onSettingsClick?.();
                  else onUserClick?.();
                }}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: SPACING.iconRowHeight,
                  height: SPACING.iconRowHeight,
                  padding: SPACING.iconButtonPad,
                  borderRadius: RADIUS.panel,
                  background: active ? COLOR.iconButtonBg : "transparent",
                  boxShadow: active
                    ? `inset 2px 0 0 0 ${COLOR.navRailActiveEdge}`
                    : "none",
                }}
              >
                <Image
                  src={item.src}
                  alt=""
                  width={20}
                  height={20}
                  className={`pointer-events-none ${active ? "opacity-100" : "opacity-90"}`}
                />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-20 -translate-y-1/2 rounded-[2px] border px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                style={{
                  marginLeft: 8,
                  background: COP_SOLID_BG,
                  border: COP_GLASS_PANEL.border,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                  color: COLOR.missionsTitleMuted,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                  whiteSpace: "nowrap",
                }}
                role="tooltip"
              >
                {item.tooltip}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-auto absolute flex items-center"
        style={{
          right: POSITION.bellRight,
          top: POSITION.bellTop,
        }}
      >
        <button
          type="button"
          title={detectionsOpen ? "Hide detections" : "Show detections"}
          aria-label={
            detectionsOpen
              ? "Hide overall detections panel"
              : "Show overall detections panel"
          }
          aria-expanded={detectionsOpen}
          className="flex shrink-0 items-center justify-center p-2"
          style={{
            width: POSITION.bellSize,
            height: POSITION.bellSize,
            background: COP_SOLID_BG,
            border: COP_GLASS_PANEL.border,
            borderRadius: RADIUS.panel,
            boxShadow: "0px 0px 8px rgba(0,0,0,0.62)",
          }}
          onClick={onBell}
        >
          <Image
            src="/icons/notifications.svg"
            alt=""
            width={20}
            height={20}
            className={`pointer-events-none ${detectionsOpen ? "opacity-100" : "opacity-90"}`}
          />
        </button>
      </div>
    </div>
  );
}
