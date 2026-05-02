/**
 * TanStack Query for GET /api/v1/sites (mission parent-site picker, etc.).
 */

import { useQuery } from "@tanstack/react-query";
import { listSites } from "@/lib/api/sites";

export const sitesKeys = {
  all: ["sites"] as const,
  list: () => [...sitesKeys.all, "list"] as const,
};

/** GET /api/v1/sites — list sites (caller scope-filtered) */
export function useSitesList(enabled = true) {
  return useQuery({
    queryKey: sitesKeys.list(),
    queryFn: listSites,
    enabled,
    staleTime: 60 * 1000,
  });
}
