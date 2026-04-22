"use client";

/**
 * WsStatusIndicator — shows WebSocket connection status per stream.
 * Green = open, amber = connecting, red = error/closed
 */

type WsStatus = "connecting" | "open" | "closed" | "error";

const statusConfig: Record<WsStatus, { color: string; label: string }> = {
  connecting: { color: "bg-amber-500", label: "Connecting" },
  open: { color: "bg-green-500", label: "Live" },
  closed: { color: "bg-slate-500", label: "Closed" },
  error: { color: "bg-red-500", label: "Error" },
};

function StatusDot({ status }: { status: WsStatus }) {
  const { color, label } = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${status === "open" ? "text-green-400" : status === "error" ? "text-red-400" : "text-slate-500"}`}
      title={label}
    >
      <span
        className={`w-2 h-2 rounded-full ${color} ${status === "connecting" ? "animate-pulse" : ""}`}
      />
      <span className="text-[11px] font-mono uppercase">{label}</span>
    </span>
  );
}

interface WsStatusIndicatorProps {
  eventsStatus: WsStatus;
  devicesStatus: WsStatus;
  commandsStatus: WsStatus;
}

export function WsStatusIndicator({
  eventsStatus,
  devicesStatus,
  commandsStatus,
}: WsStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-4 text-[11px] font-mono">
      <span className="text-slate-500 uppercase">WS:</span>
      <StatusDot status={eventsStatus} />
      <StatusDot status={devicesStatus} />
      <StatusDot status={commandsStatus} />
    </div>
  );
}
