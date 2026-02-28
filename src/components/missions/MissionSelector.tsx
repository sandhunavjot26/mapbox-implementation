"use client";

/**
 * Mission selector — list missions, create new, load mission.
 * GET /api/v1/missions — list + search
 * POST /api/v1/missions — create
 * On load: set active mission and navigate to workspace
 */

import { useState } from "react";
import { useMissionsList, useCreateMission } from "@/hooks/useMissions";
import { useMissionStore } from "@/stores/missionStore";
import { useTargetsStore } from "@/stores/targetsStore";

export function MissionSelector() {
  const [search, setSearch] = useState("");
  const [createName, setCreateName] = useState("");
  const [createAop, setCreateAop] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: missions, isLoading, error } = useMissionsList(search || undefined);
  const createMutation = useCreateMission();
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  const clearTargets = useTargetsStore((s) => s.clearTargets);

  const handleLoad = (missionId: string) => {
    clearTargets();
    setActiveMission(missionId);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const m = await createMutation.mutateAsync({
        name: createName.trim(),
        aop: createAop.trim() || null,
      });
      setCreateName("");
      setCreateAop("");
      setIsCreating(false);
      handleLoad(m.id);
    } catch {
      // error shown by mutation
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border-r border-slate-800 w-80">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-mono font-semibold text-slate-200 mb-3">
          Missions
        </h2>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono px-3 py-2 text-xs
                     focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="mt-3 w-full px-3 py-2 text-xs font-mono border border-cyan-500/60 text-cyan-400
                     hover:bg-cyan-950/40 transition-colors"
        >
          {isCreating ? "Cancel" : "+ Create Mission"}
        </button>
        {isCreating && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Mission name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="AOP (optional)"
              value={createAop}
              onChange={(e) => setCreateAop(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !createName.trim()}
              className="w-full px-3 py-2 text-xs font-mono bg-cyan-600 text-slate-100
                         hover:bg-cyan-500 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create & Load"}
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="text-red-400 text-xs font-mono p-2">
            Failed to load missions
          </div>
        )}
        {isLoading && (
          <div className="text-slate-500 text-xs font-mono p-2">Loading...</div>
        )}
        {missions?.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleLoad(m.id)}
            className="w-full text-left px-3 py-2 mb-1 rounded border border-slate-800
                       hover:border-cyan-500/50 hover:bg-slate-900/80 transition-colors"
          >
            <div className="text-slate-200 text-xs font-mono font-semibold">
              {m.name}
            </div>
            {m.aop && (
              <div className="text-slate-500 text-[10px] font-mono mt-0.5">
                {m.aop}
              </div>
            )}
          </button>
        ))}
        {missions?.length === 0 && !isLoading && (
          <div className="text-slate-500 text-xs font-mono p-2">
            No missions. Create one to start.
          </div>
        )}
      </div>
    </div>
  );
}
