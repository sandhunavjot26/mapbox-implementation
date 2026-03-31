"use client";

/**
 * Floating COP chrome — nav rail, logo, settings, notifications (Figma bell).
 * Map + mission panels render beneath; this layer uses pointer-events only on controls.
 */

import Image from "next/image";
import { COLOR, POSITION, RADIUS, SPACING } from "@/styles/driifTokens";
import { COP_GLASS_PANEL } from "@/components/cop-shell/shellStyles";

const NAV_ITEMS = [
  { key: "search", src: "/icons/search.svg", label: "Search" },
  { key: "assets", src: "/icons/assets.svg", label: "Assets" },
  { key: "missions", src: "/icons/missions.svg", label: "Missions" },
  { key: "files", src: "/icons/files.svg", label: "Files" },
  { key: "logs", src: "/icons/logs.svg", label: "Logs" },
] as const;

const SETTINGS_ICONS = [
  { src: "/icons/settings.svg", label: "Settings" },
  { src: "/icons/user.svg", label: "User" },
] as const;

export type CopShellProps = {
  activeNavKey: string | null;
  onNav: (key: string) => void;
  hasMission: boolean;
  /** Top-right bell: exit mission or close overlays */
  onBell: () => void;
};

export function CopShell({
  activeNavKey,
  onNav,
  hasMission,
  onBell,
}: CopShellProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-11">
      <div
        className="pointer-events-auto absolute"
        style={{
          left: POSITION.logoLeft,
          top: POSITION.logoTop,
          borderRadius: RADIUS.logo,
          overflow: "hidden",
        }}
      >
        <Image
          src="/driif-logo-small.png"
          alt="Driif"
          width={33}
          height={26}
          priority
        />
      </div>

      <nav
        className="pointer-events-auto absolute flex flex-col items-center gap-0 p-1"
        style={{
          left: POSITION.navLeft,
          top: POSITION.navTop,
          width: POSITION.navWidth,
          minHeight: POSITION.navHeight,
          background: COP_GLASS_PANEL.background,
          border: COP_GLASS_PANEL.border,
          borderRadius: RADIUS.panel,
          boxShadow: COP_GLASS_PANEL.boxShadow,
          backdropFilter: COP_GLASS_PANEL.backdropFilter,
        }}
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeNavKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => onNav(item.key)}
              className="flex items-center justify-center shrink-0 transition-colors"
              style={{
                width: SPACING.iconRowHeight,
                height: SPACING.iconRowHeight,
                padding: SPACING.iconButtonPad,
                borderRadius: RADIUS.panel,
                background: active ? COLOR.iconButtonBg : "transparent",
              }}
            >
              <Image
                src={item.src}
                alt=""
                width={20}
                height={20}
                className="opacity-90"
              />
            </button>
          );
        })}
      </nav>

      <div
        className="pointer-events-auto absolute flex flex-col items-center gap-2 p-1"
        style={{
          left: POSITION.settingsLeft,
          bottom: POSITION.settingsBottom,
          width: POSITION.settingsWidth,
          background: COP_GLASS_PANEL.background,
          border: COP_GLASS_PANEL.border,
          borderRadius: RADIUS.panel,
          boxShadow: "0px 0px 8px rgba(0,0,0,0.62)",
          backdropFilter: COP_GLASS_PANEL.backdropFilter,
        }}
      >
        {SETTINGS_ICONS.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.label}
            aria-label={item.label}
            className="flex items-center justify-center p-2 rounded-sm opacity-80 hover:opacity-100"
          >
            <Image src={item.src} alt="" width={20} height={20} />
          </button>
        ))}
      </div>

      <button
        type="button"
        title={hasMission ? "Exit mission" : "Notifications"}
        aria-label={hasMission ? "Exit mission" : "Notifications"}
        className="pointer-events-auto absolute flex items-center justify-center p-2"
        style={{
          right: POSITION.bellRight,
          top: POSITION.bellTop,
          width: POSITION.bellSize,
          height: POSITION.bellSize,
          background: COP_GLASS_PANEL.background,
          border: COP_GLASS_PANEL.border,
          borderRadius: RADIUS.panel,
          boxShadow: "0px 0px 8px rgba(0,0,0,0.62)",
          backdropFilter: COP_GLASS_PANEL.backdropFilter,
        }}
        onClick={onBell}
      >
        <Image
          src="/icons/notifications.svg"
          alt=""
          width={20}
          height={20}
          className="opacity-90"
        />
      </button>
    </div>
  );
}
