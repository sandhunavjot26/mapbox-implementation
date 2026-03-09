"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Target, TargetClassification } from "@/types/targets";
import {
  selectTargetAndShowPopup,
  subscribeToAlertTargets,
} from "@/components/map/mapController";
import {
  subscribeToComputedTargets,
  subscribeToPulseTargets,
  subscribeToIntercepts,
} from "@/stores/mapActionsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import type { InterceptState } from "@/stores/mapActionsStore";

import TrackingIcon from "@/assets/tracking.svg";
import DroneIcon from "@/assets/drone.svg";

const classificationStyles: Record<TargetClassification, string> = {
  ENEMY: "text-red-400 bg-red-950",
  FRIENDLY: "text-green-400 bg-green-950",
  UNKNOWN: "text-amber-400 bg-amber-950",
};

const classificationBorderStyles: Record<TargetClassification, string> = {
  ENEMY: "border-red-500/70",
  FRIENDLY: "border-green-500/70",
  UNKNOWN: "border-slate-600",
};

const classificationTagStyles: Record<TargetClassification, string> = {
  ENEMY: "text-red-400",
  FRIENDLY: "text-green-400",
  UNKNOWN: "text-slate-400",
};

/** High-threat: ENEMY, not neutralized, within 5km */
function isHighThreat(
  target: Target,
  isNeutralized: boolean,
): boolean {
  return (
    target.classification === "ENEMY" &&
    !isNeutralized &&
    target.distanceKm <= 5
  );
}

const interceptStateStyles: Record<InterceptState, string> = {
  vectoring: "text-amber-400",
  engaging: "text-orange-400 animate-pulse",
  neutralized: "text-green-400",
};

interface TrackingPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  /** When true, use targets from API (targetsStore) instead of mock (mapActionsStore) */
  useApiTargets?: boolean;
}

export type TrackingFilter = "all" | "active" | "neutralized";

export function TrackingPanel({
  collapsed,
  onToggle,
  useApiTargets = false,
}: TrackingPanelProps) {
  const [targets, setTargets] = useState<(Target & { confirmed?: boolean })[]>(
    [],
  );
  const apiTargets = useTargetsStore((s) => s.targets);
  const [alertTargets, setAlertTargets] = useState<string[]>([]);
  const [pulseTargetIds, setPulseTargetIds] = useState<string[]>([]);
  const [intercepts, setIntercepts] = useState<
    { targetId: string; state: InterceptState }[]
  >([]);
  const [filter, setFilter] = useState<TrackingFilter>("all");

  const displayTargets = useApiTargets ? apiTargets : targets;

  const filteredTargets = displayTargets.filter((target) => {
    const intercept = intercepts.find((i) => i.targetId === target.id);
    const isNeutralized = intercept?.state === "neutralized";
    if (filter === "all") return true;
    if (filter === "active") return !isNeutralized;
    return isNeutralized;
  });

  useEffect(() => {
    if (!useApiTargets) return subscribeToComputedTargets(setTargets);
  }, [useApiTargets]);
  useEffect(() => {
    return subscribeToAlertTargets(setAlertTargets);
  }, []);
  useEffect(() => {
    return subscribeToPulseTargets(setPulseTargetIds);
  }, []);
  useEffect(() => {
    return subscribeToIntercepts((list) =>
      setIntercepts(
        list.map((i) => ({ targetId: i.targetId, state: i.state })),
      ),
    );
  }, []);

  return (
    <aside
      className={`shrink-0 border-l border-slate-800 bg-slate-950/50 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-12" : "w-72"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div
            className={`flex items-center gap-2 overflow-hidden ${collapsed ? "justify-center w-full" : ""}`}
          >
            <Image
              src={TrackingIcon}
              alt="Tracking"
              width={20}
              height={20}
              className="shrink-0"
            />
            <h2
              className={`text-sm font-mono font-semibold text-slate-200 tracking-wide whitespace-nowrap transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100"
              }`}
            >
              Tracking
            </h2>
          </div>
          {!collapsed && filteredTargets.some((t) => {
            const inter = intercepts.find((i) => i.targetId === t.id);
            return isHighThreat(t, inter?.state === "neutralized");
          }) && (
            <span
              className="text-[10px] font-mono text-red-400 bg-red-950 px-2 py-0.5 animate-pulse whitespace-nowrap"
            >
              INBOUND
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="flex gap-1 mt-2">
            {(["all", "active", "neutralized"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-[10px] font-mono uppercase transition-colors ${
                  filter === f
                    ? "bg-cyan-600/80 text-slate-100"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracking list */}
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-opacity duration-300 ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {filteredTargets.length === 0 && (
          <div className="text-slate-500 text-xs font-mono py-4 text-center">
            No targets yet
          </div>
        )}
        {filteredTargets.map((target) => {
          const isAlert = alertTargets.includes(target.id);
          const isPulsing = pulseTargetIds.includes(target.id);
          const intercept = intercepts.find((i) => i.targetId === target.id);
          const isNeutralized = intercept?.state === "neutralized";
          const isEnemy = target.classification === "ENEMY";
          const showEnemyHighlight = isEnemy && !isNeutralized;
          const highThreat = isHighThreat(target, isNeutralized);
          const tagColor = classificationTagStyles[target.classification];
          const borderColor = classificationBorderStyles[target.classification];

          return (
            <div
              key={target.id}
              onClick={() => selectTargetAndShowPopup(target)}
              className={`p-3 cursor-pointer transition-all border-2 ${
                isNeutralized
                  ? "bg-slate-800/40 border-slate-700 opacity-60"
                  : isAlert
                    ? "bg-red-950/60 border-red-500/80 ring-2 ring-red-500/30 animate-pulse"
                    : isPulsing
                      ? "bg-slate-900/50 border-cyan-500/60 ring-1 ring-cyan-500/30"
                      : showEnemyHighlight
                        ? "bg-red-950/30 border-red-500/60 ring-1 ring-red-500/20"
                        : `bg-slate-900/50 ${borderColor} hover:border-opacity-100 hover:bg-slate-900/70`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Image
                    src={DroneIcon}
                    alt="Drone"
                    width={16}
                    height={16}
                    className={isNeutralized ? "opacity-50" : ""}
                  />
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isNeutralized
                        ? "text-slate-500 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {target.targetName ?? target.id}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {highThreat && (
                    <span className="text-[10px] font-mono text-red-400 bg-red-950 px-1.5 py-0.5 animate-pulse">
                      INBOUND
                    </span>
                  )}
                  {intercept && (
                    <span
                      className={`text-[10px] font-mono uppercase ${interceptStateStyles[intercept.state]}`}
                    >
                      {intercept.state}
                    </span>
                  )}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${tagColor}`}>
                    {target.distanceKm.toFixed(1)} KM
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${tagColor}`}>
                    {target.altitude} FT
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 ${
                      isNeutralized
                        ? "text-slate-500 bg-slate-700"
                        : classificationStyles[target.classification]
                    }`}
                  >
                    {target.classification}
                  </span>
                </div>
              </div>
              <div
                className={`grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono ${
                  isNeutralized ? "text-slate-600" : "text-slate-500"
                }`}
              >
                <div className="flex">
                  <span className="w-16">Distance:</span>
                  <span className={tagColor}>{target.distanceKm.toFixed(1)} KM</span>
                </div>
                <div className="flex">
                  <span className="w-16">Altitude:</span>
                  <span className={tagColor}>{target.altitude} FT</span>
                </div>
                <div className="flex">
                  <span className="w-16">Frequency:</span>
                  <span className="text-slate-400">{target.frequencyMHz} MHz</span>
                </div>
                <div className="flex">
                  <span className="w-16">Azimuth:</span>
                  <span className="text-slate-400">{target.heading}°</span>
                </div>
                {target.bandwidthMHz != null && (
                  <div className="flex">
                    <span className="w-16">Bandwidth:</span>
                    <span className="text-slate-400">{target.bandwidthMHz.toFixed(2)} MHz</span>
                  </div>
                )}
                <div className="flex col-span-2 min-w-0">
                  <span className="w-16 shrink-0">RSSI:</span>
                  <span className="text-slate-400 truncate">
                    {(typeof target.rssi === "number" ? target.rssi : Number(target.rssi ?? 0)).toFixed(1)} dBm
                  </span>
                </div>
                {target.rcCoords && (
                  <div className="flex col-span-2 min-w-0">
                    <span className="w-16 shrink-0">RC/GCS:</span>
                    <span className="text-slate-400 truncate">
                      {target.rcCoords[0].toFixed(5)}, {target.rcCoords[1].toFixed(5)}
                    </span>
                  </div>
                )}
                <div className="flex col-span-2">
                  <span className="w-16">Coords:</span>
                  <span className="text-slate-400">
                    {target.coordinates[1].toFixed(5)}, {target.coordinates[0].toFixed(5)}
                  </span>
                </div>
                {target.speedKmH != null && (
                  <div className="flex">
                    <span className="w-16">Speed:</span>
                    <span className="text-slate-400">{target.speedKmH.toFixed(1)} km/h</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
