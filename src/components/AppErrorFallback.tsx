"use client";

/**
 * Full-page error fallback for the root ErrorBoundary.
 * Must be a Client Component so the reload button's onClick works.
 */

export function AppErrorFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-4 border border-red-500/50 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-red-500 animate-pulse" />
        </div>
        <p className="text-red-400 font-mono text-sm mb-2">
          Something went wrong
        </p>
        <p className="text-slate-500 font-mono text-xs mb-4">
          Refresh the page or try again later.
        </p>
        <button
          type="button"
          onClick={() => typeof window !== "undefined" && window.location.reload()}
          className="px-4 py-2 text-xs font-mono border border-cyan-500/60 text-cyan-400 hover:bg-cyan-950/40 transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
