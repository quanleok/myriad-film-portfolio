export function getSiteUrl() {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    ""
  ).trim();

  if (configured) {
    const clean = configured.replace(/\/+$/, "");
    const normalized = clean.startsWith("http") ? clean : `https://${clean}`;

    try {
      const parsed = new URL(normalized);
      if (parsed.hostname === "myriadspring.com" || parsed.hostname === "www.myriadspring.com") {
        return "https://myriadspring.com";
      }
      return normalized;
    } catch {
      return normalized;
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://myriadspring.com";
  }

  return "http://localhost:3000";
}
