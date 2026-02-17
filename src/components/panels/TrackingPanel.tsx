"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Target, TargetClassification } from "@/mock/targets";
import {
  selectTargetAndShowPopup,
  subscribeToAlertTargets,
} from "@/components/map/mapController";
import {
  subscribeToComputedTargets,
  subscribeToPulseTargets,
  subscribeToIntercepts,
} from "@/stores/mapActionsStore";
import type { InterceptState } from "@/stores/mapActionsStore";

import TrackingIcon from "@/assets/tracking.svg";
import DroneIcon from "@/assets/drone.svg";

const classificationStyles: Record<TargetClassification, string> = {
  ENEMY: "text-red-400 bg-red-950",
  FRIENDLY: "text-green-400 bg-green-950",
  UNKNOWN: "text-amber-400 bg-amber-950",
};

const interceptStateStyles: Record<InterceptState, string> = {
  vectoring: "text-amber-400",
  engaging: "text-orange-400 animate-pulse",
  neutralized: "text-green-400",
};

interface TrackingPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export type TrackingFilter = "all" | "active" | "neutralized";

export function TrackingPanel({ collapsed, onToggle }: TrackingPanelProps) {
  const [targets, setTargets] = useState<(Target & { confirmed?: boolean })[]>([]);
  const [alertTargets, setAlertTargets] = useState<string[]>([]);
  const [pulseTargetIds, setPulseTargetIds] = useState<string[]>([]);
  const [intercepts, setIntercepts] = useState<{ targetId: string; state: InterceptState }[]>([]);
  const [filter, setFilter] = useState<TrackingFilter>("all");

  const filteredTargets = targets.filter((target) => {
    const intercept = intercepts.find((i) => i.targetId === target.id);
    const isNeutralized = intercept?.state === "neutralized";
    if (filter === "all") return true;
    if (filter === "active") return !isNeutralized;
    return isNeutralized;
  });

  useEffect(() => {
    return subscribeToComputedTargets(setTargets);
  }, []);
  useEffect(() => {
    return subscribeToAlertTargets(setAlertTargets);
  }, []);
  useEffect(() => {
    return subscribeToPulseTargets(setPulseTargetIds);
  }, []);
  useEffect(() => {
    return subscribeToIntercepts((list) =>
      setIntercepts(list.map((i) => ({ targetId: i.targetId, state: i.state })))
    );
  }, []);

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
        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-opacity duration-300 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >
        {filteredTargets.map((target) => {
          const isAlert = alertTargets.includes(target.id);
          const isPulsing = pulseTargetIds.includes(target.id);
          const intercept = intercepts.find((i) => i.targetId === target.id);
          const isNeutralized = intercept?.state === "neutralized";
          const isEnemy = target.classification === "ENEMY";
          const showEnemyHighlight = isEnemy && !isNeutralized;
          return (
          <div
            key={target.id}
            onClick={() => selectTargetAndShowPopup(target)}
            className={`p-3 cursor-pointer transition-all ${
              isNeutralized
                ? "bg-slate-800/40 border border-slate-700 opacity-60"
                : isAlert
                  ? "bg-red-950/60 border-2 border-red-500/80 ring-2 ring-red-500/30 animate-pulse"
                  : isPulsing
                    ? "bg-slate-900/50 border-2 border-cyan-500/60 ring-2 ring-cyan-500/30"
                    : showEnemyHighlight
                      ? "bg-red-950/30 border-2 border-red-500/60 ring-1 ring-red-500/20"
                      : "bg-slate-900/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/70"
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
                    isNeutralized ? "text-slate-500 line-through" : "text-slate-200"
                  }`}
                >
                  {target.id}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {intercept && (
                  <span className={`text-[10px] font-mono uppercase ${interceptStateStyles[intercept.state]}`}>
                    {intercept.state}
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5">
                  {target.distanceKm.toFixed(1)} KM
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 ${
                    isNeutralized ? "text-slate-500 bg-slate-700" : classificationStyles[target.classification]
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
          );
        })}
      </div>
    </aside>
  );
}
