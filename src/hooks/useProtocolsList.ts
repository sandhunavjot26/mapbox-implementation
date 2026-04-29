import { useQuery } from "@tanstack/react-query";
import { listProtocols } from "@/lib/api/protocols";

export const protocolsKeys = { all: ["protocols"] as const };

export function useProtocolsList() {
  return useQuery({
    queryKey: protocolsKeys.all,
    queryFn: listProtocols,
    staleTime: 5 * 60 * 1000,
  });
}
