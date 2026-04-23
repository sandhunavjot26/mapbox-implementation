"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OverallDetectionPanel } from "@/components/detections/OverallDetectionPanel";
import { useAuthStore } from "@/stores/authStore";
import { COLOR, FONT } from "@/styles/driifTokens";

export default function OverallDetectionsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const token = useAuthStore((s) => s.getToken());
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!token) {
      clearAuth();
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router, token, clearAuth]);

  if (!isAuthorized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLOR.pageBg }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <span className="text-slate-500 text-xs font-mono tracking-widest uppercase">
            Verifying Access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{
        background: COLOR.pageBg,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{
          borderColor: COLOR.missionCreateFieldBorder,
          background: COLOR.missionsPanelBg,
        }}
      >
        <Link
          href="/dashboard"
          className="text-sm font-medium hover:opacity-80"
          style={{ color: COLOR.missionsSecondaryText }}
        >
          ← Back to map
        </Link>
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: COLOR.missionsSecondaryText }}
        >
          Overall detections
        </span>
      </header>
      <main className="flex justify-center px-3 py-4 pb-8">
        <OverallDetectionPanel variant="page" />
      </main>
    </div>
  );
}
