type JsonRecord = Record<string, string | number | boolean | null>;

function send(url: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export function trackNewsPostEvent(
  postId: string,
  eventType: "landing_impression" | "feed_impression" | "card_click" | "detail_view" | "source_click",
  metadata?: JsonRecord
) {
  send(`/api/news/${postId}/track`, {
    event_type: eventType,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    metadata: metadata ?? {},
  });
}

export function trackNewsEvent(
  eventType: "feed_visit",
  metadata?: JsonRecord
) {
  send("/api/news/track", {
    event_type: eventType,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    metadata: metadata ?? {},
  });
}
