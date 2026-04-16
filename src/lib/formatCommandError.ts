import { ApiClientError } from "@/lib/api/client";

/** Convert API error to a string — detail can be object/array (e.g. Pydantic validation errors) */
export function formatCommandError(err: unknown): string {
  if (err instanceof ApiClientError) {
    const d: unknown = (err as ApiClientError & { detail?: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const msgs = (d as Array<{ msg?: string }>).map(
        (e) => e?.msg ?? JSON.stringify(e),
      );
      return msgs.join("; ") || err.message;
    }
    if (d && typeof d === "object") return JSON.stringify(d);
    return err.message ?? "Command failed";
  }
  return "Command failed. Check network.";
}
