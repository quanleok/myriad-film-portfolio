export type ReportReason = "copyright" | "inappropriate" | "spam" | "harassment" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "copyright", label: "Copyright violation" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "other", label: "Other" },
];
