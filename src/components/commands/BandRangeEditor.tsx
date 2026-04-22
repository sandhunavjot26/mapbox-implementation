"use client";

/**
 * Band range editor — 12-band table for BAND_RANGE_SET / BAND_RANGE_QUERY.
 * Per GUI Developer Guide: each band has enable, start (MHz), end (MHz), att.
 * Query fetches current config; Set sends array to device.
 */

import { useState, useCallback, useEffect } from "react";
import { createCommand } from "@/lib/api/commands";
import { ApiClientError } from "@/lib/api/client";
import { useCommandsStore } from "@/stores/commandsStore";
import type { Asset } from "@/types/assets";

export interface BandRow {
  enable: number;
  start: number;
  end: number;
  att: number;
}

const DEFAULT_BANDS: BandRow[] = Array.from({ length: 12 }, (_, i) => ({
  enable: 0,
  start: 400 + i * 50,
  end: 450 + i * 50,
  att: 0,
}));

function formatCommandError(err: unknown): string {
  if (err instanceof ApiClientError) {
    const d: unknown = (err as ApiClientError & { detail?: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const msgs = (d as Array<{ msg?: string }>).map((e) => e?.msg ?? JSON.stringify(e));
      return msgs.join("; ") || err.message;
    }
    if (d && typeof d === "object") return JSON.stringify(d);
    return err.message ?? "Command failed";
  }
  return "Command failed. Check network.";
}

/** Parse dt99 or API response to BandRow[] */
function parseBands(payload: unknown): BandRow[] {
  if (!Array.isArray(payload)) return [...DEFAULT_BANDS];
  return payload.slice(0, 12).map((b: unknown) => {
    const row = b as Record<string, unknown>;
    return {
      enable: Number(row.enable ?? 0),
      start: Number(row.start ?? 0),
      end: Number(row.end ?? 0),
      att: Number(row.att ?? 0),
    };
  });
}

interface BandRangeEditorProps {
  asset: Asset;
  missionId: string;
  onClose: () => void;
}

export function BandRangeEditor({ asset, missionId, onClose }: BandRangeEditorProps) {
  const [bands, setBands] = useState<BandRow[]>(() => [...DEFAULT_BANDS]);
  const [queryPending, setQueryPending] = useState(false);
  const [setPending, setSetPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQueryId, setLastQueryId] = useState<string | null>(null);

  // When BAND_RANGE_QUERY succeeds, parse result and update bands
  const commands = useCommandsStore((s) => s.commands);
  useEffect(() => {
    if (!lastQueryId) return;
    const cmd = commands.find((c) => c.id === lastQueryId);
    if (cmd?.status === "SUCCEEDED" && cmd.result_payload) {
      const data = cmd.result_payload as { bands?: unknown; data?: unknown };
      const arr = data.bands ?? data.data ?? cmd.result_payload;
      setBands(parseBands(arr));
      setLastQueryId(null);
    }
  }, [commands, lastQueryId]);

  const addCommand = useCallback((out: { id: string; mission_id: string; device_id: string | null; command_type: string; status: string; approved_count?: number; required_approvals?: number; last_error?: string | null; packet_no?: number | null }) => {
    useCommandsStore.getState().addOrUpdateCommand({
      id: out.id,
      mission_id: out.mission_id,
      device_id: out.device_id,
      command_type: out.command_type,
      status: out.status,
      approved_count: out.approved_count,
      required_approvals: out.required_approvals,
      last_error: out.last_error,
      packet_no: out.packet_no ?? undefined,
      created_at: new Date().toISOString(),
    });
  }, []);

  const handleQuery = async () => {
    if (!missionId) return;
    setQueryPending(true);
    setError(null);
    try {
      const out = await createCommand({
        mission_id: missionId,
        device_id: asset.id,
        command_type: "BAND_RANGE_QUERY",
        payload: {},
      });
      addCommand(out);
      setLastQueryId(out.id);
    } catch (err) {
      setError(formatCommandError(err));
    } finally {
      setQueryPending(false);
    }
  };

  const handleSet = async () => {
    if (!missionId) return;
    setSetPending(true);
    setError(null);
    try {
      const payload = bands.map((b) => ({
        enable: b.enable,
        start: b.start,
        end: b.end,
        att: b.att,
      }));
      const out = await createCommand({
        mission_id: missionId,
        device_id: asset.id,
        command_type: "BAND_RANGE_SET",
        payload: payload as unknown as Record<string, unknown>,
      });
      addCommand(out);
    } catch (err) {
      setError(formatCommandError(err));
    } finally {
      setSetPending(false);
    }
  };

  const updateBand = (index: number, field: keyof BandRow, value: number) => {
    setBands((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const pending = queryPending || setPending;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <h3 className="text-sm font-mono font-semibold text-slate-200">Band Range — {asset.name}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg leading-none" aria-label="Close">×</button>
        </div>

        {error && (
          <div className="mx-4 mt-2 flex items-center justify-between gap-2 bg-red-950/50 border border-red-500/50 px-2 py-1.5">
            <span className="text-red-400 text-[11px] font-mono truncate flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200 text-xs shrink-0">×</button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 text-[11px] font-mono mb-2">
            <span className="text-slate-500">#</span>
            <span className="text-slate-500">Enable</span>
            <span className="text-slate-500">Start (MHz)</span>
            <span className="text-slate-500">End (MHz)</span>
            <span className="text-slate-500">Att</span>
          </div>
          {bands.map((band, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 items-center mb-1">
              <span className="text-slate-500 w-4">{i + 1}</span>
              <input
                type="number"
                min={0}
                max={1}
                value={band.enable}
                onChange={(e) => updateBand(i, "enable", Number(e.target.value))}
                className="w-14 px-1 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
              />
              <input
                type="number"
                min={0}
                max={6000}
                value={band.start}
                onChange={(e) => updateBand(i, "start", Number(e.target.value))}
                className="w-full px-1 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
              />
              <input
                type="number"
                min={0}
                max={6000}
                value={band.end}
                onChange={(e) => updateBand(i, "end", Number(e.target.value))}
                className="w-full px-1 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={band.att}
                onChange={(e) => updateBand(i, "att", Number(e.target.value))}
                className="w-14 px-1 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          <button
            type="button"
            onClick={handleQuery}
            disabled={pending}
            className="px-3 py-1.5 text-[11px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 transition-colors disabled:opacity-50"
          >
            {queryPending ? "Querying…" : "Query"}
          </button>
          <button
            type="button"
            onClick={handleSet}
            disabled={pending}
            className="px-3 py-1.5 text-[11px] font-mono border border-cyan-500/60 text-cyan-400 hover:bg-cyan-950/40 transition-colors disabled:opacity-50"
          >
            {setPending ? "Sending…" : "Set"}
          </button>
          <button type="button" onClick={onClose} className="ml-auto px-3 py-1.5 text-[11px] font-mono border border-slate-600 text-slate-400 hover:text-slate-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
