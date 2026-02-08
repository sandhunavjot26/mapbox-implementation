import Image from "next/image";
import { Target, TargetClassification } from "@/mock/targets";
import { flyToTarget, selectTarget } from "@/components/map/mapController";

import TrackingIcon from "@/assets/tracking.svg";
import DroneIcon from "@/assets/drone.svg";

const classificationStyles: Record<TargetClassification, string> = {
  ENEMY: "text-red-400 bg-red-950",
  FRIENDLY: "text-green-400 bg-green-950",
  UNKNOWN: "text-amber-400 bg-amber-950",
};

interface TrackingPanelProps {
  targets: Target[];
  collapsed: boolean;
  onToggle: () => void;
}

export function TrackingPanel({ targets, collapsed, onToggle }: TrackingPanelProps) {
  return (
    <aside
      className={`shrink-0 border-l border-slate-800 bg-slate-950/50 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-12" : "w-72"
        }`}
    >
      {/* Panel header */}
      <div
        className={`px-3 py-3 border-b border-slate-800 ${collapsed ? "cursor-pointer" : ""}`}
        onClick={collapsed ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          {!collapsed && (
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 shrink-0"
              aria-label="Collapse panel"
            >
              <svg
                className="w-4 h-4 rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? "justify-center w-full" : ""}`}>
            <Image src={TrackingIcon} alt="Tracking" width={20} height={20} className="shrink-0" />
            <h2
              className={`text-sm font-mono font-semibold text-slate-200 tracking-wide whitespace-nowrap transition-all duration-300 ${collapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
            >
              Tracking
            </h2>
          </div>
          <span
            className={`text-[10px] font-mono text-red-400 bg-red-950 px-2 py-0.5 animate-pulse whitespace-nowrap transition-all duration-300 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}
          >
            INBOUND
          </span>
        </div>
      </div>

      {/* Tracking list */}
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-opacity duration-300 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >
        {targets.map((target) => (
          <div
            key={target.id}
            onClick={() => {
              flyToTarget(target);
              selectTarget(target.id);
            }}
            className="bg-slate-900/50 border border-slate-800 p-3 cursor-pointer hover:border-slate-600 hover:bg-slate-900/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Image src={DroneIcon} alt="Drone" width={16} height={16} />
                <span className="text-slate-200 text-xs font-mono font-semibold">
                  {target.id}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5">
                  {target.distanceKm.toFixed(1)} KM
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 ${classificationStyles[target.classification]}`}
                >
                  {target.classification}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-slate-500">
              <div className="flex">
                <span className="w-16">Altitude:</span>
                <span className="text-slate-400">{target.altitude} FT</span>
              </div>
              <div className="flex">
                <span className="w-16">Heading:</span>
                <span className="text-slate-400">{target.heading}°</span>
              </div>
              <div className="flex">
                <span className="w-16">Frequency:</span>
                <span className="text-slate-400">{target.frequencyMHz} MHz</span>
              </div>
              <div className="flex">
                <span className="w-16">RSSI:</span>
                <span className="text-slate-400">{target.rssi} dBm</span>
              </div>
              <div className="flex col-span-2">
                <span className="w-16">Coords:</span>
                <span className="text-slate-400">
                  {target.coordinates[1].toFixed(5)}, {target.coordinates[0].toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
