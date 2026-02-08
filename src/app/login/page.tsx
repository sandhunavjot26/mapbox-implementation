"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (!username.trim() || !password.trim()) {
      setError("ALL FIELDS REQUIRED");
      return;
    }

    // Validate credentials (mock: admin/admin only)
    if (username !== "admin" || password !== "admin") {
      setError("ACCESS DENIED — INVALID CREDENTIALS");
      return;
    }

    localStorage.setItem("isAuthenticated", "true");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      {/* Scan lines overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />

      {/* Main container */}
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-amber-500 animate-pulse" />
            <span className="text-amber-500 text-xs font-mono tracking-[0.3em] uppercase">
              System Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-slate-100 tracking-wider mb-2">
            DRIIF CONSOLE
          </h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide">
            COUNTER-UAS OPERATIONS
          </p>
        </div>

        {/* Login form container */}
        <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
          {/* Top border accent */}
          <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

          <div className="p-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-slate-700" />
              <span className="text-slate-500 text-xs font-mono tracking-widest uppercase">
                Authentication Required
              </span>
              <div className="h-px flex-1 bg-slate-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username field */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-xs font-mono text-slate-400 tracking-wider uppercase"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono px-4 py-3 
                             focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50
                             placeholder:text-slate-600 transition-colors"
                  placeholder="Enter operator ID"
                  autoComplete="username"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-mono text-slate-400 tracking-wider uppercase"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono px-4 py-3 
                             focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50
                             placeholder:text-slate-600 transition-colors"
                  placeholder="Enter access code"
                  autoComplete="current-password"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-950/50 border border-red-500/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-mono tracking-wider">
                      {error}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 font-mono font-bold 
                           tracking-[0.2em] py-4 mt-4
                           hover:bg-cyan-900/50 hover:border-cyan-500 hover:text-cyan-100
                           active:bg-cyan-800/50
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                           transition-all duration-200 uppercase"
              >
                Enter Console
              </button>
            </form>
          </div>

          {/* Bottom border accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-xs font-mono">
            AUTHORIZED PERSONNEL ONLY
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-500 text-xs font-mono">
                SECURE CONNECTION
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
