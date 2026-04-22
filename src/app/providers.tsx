"use client";

/**
 * App providers — QueryClientProvider for TanStack Query + ToastProvider.
 * Required for useQuery, useMutation and imperative toast alerts.
 *
 * ToastProvider sits outside QueryClientProvider so mutation callbacks that
 * render their own consumers can still reach useToast(); it also means the
 * toast stack survives any local QueryClient resets.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/alerts/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ToastProvider>
  );
}
