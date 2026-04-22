/**
 * Protocol catalogue — GET /api/v1/protocols (§B.11).
 */

import { apiJson } from "./client";
import type { ProtocolOut } from "@/types/aeroshield";

export async function listProtocols(): Promise<ProtocolOut[]> {
  const res = await apiJson<{ protocols: ProtocolOut[] }>(
    "device",
    "/api/v1/protocols"
  );
  return res.protocols ?? [];
}
