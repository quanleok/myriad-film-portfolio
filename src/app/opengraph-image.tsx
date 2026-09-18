import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Myriad Spring — Watch AI Video";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.22), transparent 24%), radial-gradient(circle at 82% 10%, rgba(16,185,129,0.18), transparent 18%), linear-gradient(135deg, #05090a 0%, #0a100d 50%, #060907 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#og-mark)" />
            <path
              d="M8 23V9L16 17L24 9V23"
              stroke="#f8fbff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17V23"
              stroke="#f8fbff"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="og-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22c55e" />
                <stop offset="1" stopColor="#0f172a" />
              </linearGradient>
            </defs>
          </svg>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#f7fbff",
              letterSpacing: -3,
            }}
          >
            Myriad Spring
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #16a34a, #22c55e, #34d399)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
