/**
 * TanStack Query hook for list commands API.
 * GET /api/v1/commands?mission_id=&status=
 */

import { useQuery } from "@tanstack/react-query";
import { listCommands } from "@/lib/api/commands";

export const commandsKeys = {
  all: ["commands"] as const,
  list: (missionId: string, status?: string) =>
    [...commandsKeys.all, "list", missionId, status ?? ""] as const,
};

/** GET /api/v1/commands?mission_id=&status= — list commands for mission */
export function useCommandsList(missionId: string | null, status?: string, enabled = true) {
  return useQuery({
    queryKey: commandsKeys.list(missionId ?? "", status),
    queryFn: () => listCommands(missionId!, status),
    enabled: !!missionId && enabled,
    staleTime: 10 * 1000,
  });
}
