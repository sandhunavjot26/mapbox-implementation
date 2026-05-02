/**
 * Sites API (V2.4.1) — device-service.
 * GET /api/v1/sites — scope-filtered list; requires site:read.
 */

import { apiJson } from "./client";
import type { SiteOut } from "@/types/aeroshield";

/** GET /api/v1/sites — list sites visible to the caller */
export async function listSites(): Promise<SiteOut[]> {
  return apiJson<SiteOut[]>("device", "/api/v1/sites");
}
