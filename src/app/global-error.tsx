"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#0d1117", color: "#e6edf3", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center" }}>
          <p style={{ fontSize: "3rem", fontWeight: 700, color: "rgba(239,68,68,0.3)", margin: 0 }}>!</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "1rem" }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", color: "#8b949e", marginTop: "0.5rem", maxWidth: "28rem" }}>
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.5rem",
              backgroundColor: "#34d399",
              color: "#0d1117",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
