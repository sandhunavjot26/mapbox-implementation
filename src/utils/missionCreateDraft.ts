/**
 * Create-mission draft completion — single source of truth for
 * footer CTA styling and opening the summary overlay.
 */
export function isCreateDraftComplete(params: {
  name: string;
  fenceCount: number;
  selectedDeviceCount: number;
  /** V2.4.1 parent site — required before POST /missions when API enforces FK */
  siteId: string | null;
}): boolean {
  return (
    params.name.trim().length > 0 &&
    params.fenceCount > 0 &&
    params.selectedDeviceCount > 0 &&
    Boolean(params.siteId?.trim())
  );
}
