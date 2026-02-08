"use client";

import { useEffect, useState } from "react";
import { Asset } from "@/mock/assets";
import { Target } from "@/mock/targets";
import { subscribeToPopup, PopupState } from "../mapController";

// Classification color mapping
const classificationColors: Record<string, string> = {
  ENEMY: "text-red-400",
  FRIENDLY: "text-green-400",
  UNKNOWN: "text-amber-400",
};

// Status color mapping
const statusColors: Record<string, string> = {
  ACTIVE: "text-green-400",
  INACTIVE: "text-slate-500",
};

export function EntityHoverPopup() {
  const [popupState, setPopupState] = useState<PopupState | null>(null);

  useEffect(() => {
    // Subscribe to popup state changes
    const unsubscribe = subscribeToPopup((state) => {
      setPopupState(state);
    });

    return unsubscribe;
  }, []);

  // Don't render if no popup state or not visible
  if (!popupState || !popupState.visible) {
    return null;
  }

  const { entityType, data, screenPosition } = popupState;

  // Offset from cursor
  const offsetX = 12;
  const offsetY = 12;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: screenPosition.x + offsetX,
        top: screenPosition.y + offsetY,
      }}
    >
      <div className="bg-slate-900/95 border border-slate-700 backdrop-blur-sm px-3 py-2 min-w-[180px]">
        {entityType === "asset" ? (
          <AssetPopupContent data={data as Asset} />
        ) : (
          <TargetPopupContent data={data as Target} />
        )}
      </div>
    </div>
  );
}

function AssetPopupContent({ data }: { data: Asset }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50">
        <span className="text-slate-200 text-xs font-mono font-semibold">
          {data.name}
        </span>
        <span
          className={`text-[10px] font-mono ${statusColors[data.status]}`}
        >
          {data.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">ID</span>
          <span className="text-slate-400">{data.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Area</span>
          <span className="text-slate-400">{data.area}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{data.altitude} FT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Coverage</span>
          <span className="text-slate-400">{data.coverageRadiusKm} KM</span>
        </div>
      </div>
    </div>
  );
}

function TargetPopupContent({ data }: { data: Target }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50">
        <span className="text-slate-200 text-xs font-mono font-semibold">
          {data.id}
        </span>
        <span
          className={`text-[10px] font-mono ${classificationColors[data.classification]}`}
        >
          {data.classification}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between gap-6">
          <span className="text-slate-500">Distance</span>
          <span className="text-slate-400">{data.distanceKm.toFixed(1)} KM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{data.altitude} FT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Heading</span>
          <span className="text-slate-400">{data.heading}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Frequency</span>
          <span className="text-slate-400">{data.frequencyMHz} MHz</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">RSSI</span>
          <span className="text-slate-400">{data.rssi} dBm</span>
        </div>
      </div>
    </div>
  );
}
