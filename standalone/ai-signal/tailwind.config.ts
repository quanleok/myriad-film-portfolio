import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#060816",
        surface: "#0c1127",
        ink: "#eef3ff",
        grid: "#151b35",
        positive: "#46f3c5",
        warning: "#ffbc5e",
        danger: "#ff6b8a",
        electric: "#67b6ff",
      },
      boxShadow: {
        halo: "0 18px 60px rgba(71, 237, 195, 0.12)",
      },
      backgroundImage: {
        "signal-grid":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
