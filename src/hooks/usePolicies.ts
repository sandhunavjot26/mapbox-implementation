/**
 * usePolicies — fetch command policies for approval/timeout display.
 * Per AeroShield Live Operations Guide Section 9.
 */

import { useQuery } from "@tanstack/react-query";
import { listPolicies } from "@/lib/api/policies";

export const policiesKeys = {
  all: ["policies"] as const,
};

export function usePolicies() {
  return useQuery({
    queryKey: policiesKeys.all,
    queryFn: listPolicies,
    staleTime: 60 * 1000,
  });
}
