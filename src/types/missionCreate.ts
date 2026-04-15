export type MissionType = "Live Op" | "Training Sim" | "Maintenance";

/** Pre-launch checklist row (Figma 853:10163 — Frame 42). */
export type MissionReviewChecklistItem = {
  id: string;
  variant: "success" | "warning";
  title: string;
  subtitle: string;
  /** When true, user must acknowledge before launch (warning row). */
  needsAcknowledge?: boolean;
};

/** Mission summary row: value (primary) + uppercase label (Figma 853:10238+). */
export type MissionReviewSummaryRow = {
  value: string;
  label: string;
};

/** Full Review & Launch panel content — built from draft state or future API. */
export type MissionReviewLaunchContent = {
  checklist: MissionReviewChecklistItem[];
  summaryRows: MissionReviewSummaryRow[];
};
