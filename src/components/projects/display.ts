export function sanitizeProjectText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/\[AUDIT\]\s*/gi, "")
    .replace(/^(Released|Premiering|In Production|Unlocking|Teaser)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
