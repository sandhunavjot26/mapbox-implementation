"use client";

import { useEffect, useState } from "react";
import { useEngageOverlayStore } from "@/stores/engageOverlayStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { subscribeToMapMove, projectLngLatToViewport } from "../mapController";

/** Floating overlay near target when Engage command succeeds */
export function EngageOverlay() {
  const overlay = useEngageOverlayStore((s) => s.overlay);
  const targets = useTargetsStore((s) => s.targets);
  const setOverlay = useEngageOverlayStore((s) => s.setOverlay);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Update position when overlay, targets, or map move
  useEffect(() => {
    if (!overlay) {
      setPosition(null);
      return;
    }
    const target = targets.find((t) => t.id === overlay.targetId);
    if (!target) {
      setPosition(null);
      return;
    }
    const update = () => {
      const pos = projectLngLatToViewport(target.coordinates);
      setPosition(pos);
    };
    update();
    const unsub = subscribeToMapMove(update);
    return unsub;
  }, [overlay, targets]);

  // Auto-clear when expired
  useEffect(() => {
    if (!overlay) return;
    const remaining = overlay.expiresAt - Date.now();
    if (remaining <= 0) {
      setOverlay(null);
      return;
    }
    const t = setTimeout(() => setOverlay(null), remaining);
    return () => clearTimeout(t);
  }, [overlay, setOverlay]);

  if (!overlay || !position || (position.x === 0 && position.y === 0)) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x - 60,
        top: position.y - 40,
        width: 120,
      }}
    >
      <div className="bg-cyan-950/95 border border-cyan-500/80 text-cyan-300 text-xs font-mono px-2 py-1.5 text-center rounded shadow-lg animate-pulse">
        {overlay.message}
      </div>
    </div>
  );
}
