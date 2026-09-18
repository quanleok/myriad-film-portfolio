import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "'General Sans'", "system-ui", "sans-serif"],
        body: ["'General Sans'", "'Geist'", "system-ui", "sans-serif"],
      },
      colors: {
        page: {
          DEFAULT: "var(--page)",
          secondary: "var(--page-secondary)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          active: "var(--surface-active)",
        },
        subtle: "var(--subtle)",
        border: "var(--border)",
        brand: {
          50: "var(--role-brand-50)",
          100: "var(--role-brand-100)",
          200: "var(--role-brand-200)",
          300: "var(--role-brand-300)",
          400: "var(--role-brand-400)",
          500: "var(--role-brand-500)",
          600: "var(--role-brand-600)",
          700: "var(--role-brand-700)",
          800: "var(--role-brand-800)",
          900: "var(--role-brand-900)",
          950: "var(--role-brand-950)",
        },
        accent: {
          free: "var(--role-accent-free)",
          premium: "var(--role-accent-premium)",
          trending: "var(--role-accent-trending)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        role: {
          bg: {
            canvas: "var(--role-bg-canvas)",
            page: "var(--role-bg-page)",
            "page-secondary": "var(--role-bg-page-secondary)",
            surface: "var(--role-bg-surface)",
            "surface-hover": "var(--role-bg-surface-hover)",
            "surface-active": "var(--role-bg-surface-active)",
            subtle: "var(--role-bg-subtle)",
            contrast: "var(--role-bg-contrast)",
            overlay: "var(--role-bg-overlay)",
            "overlay-soft": "var(--role-bg-overlay-soft)",
          },
          overlay: {
            strong: "var(--role-overlay-strong)",
            soft: "var(--role-overlay-soft)",
          },
          fg: {
            primary: "var(--role-fg-primary)",
            secondary: "var(--role-fg-secondary)",
            tertiary: "var(--role-fg-tertiary)",
            contrast: "var(--role-fg-contrast)",
            "on-media": "var(--role-fg-on-media)",
            brand: "var(--role-brand-on)",
          },
          border: {
            DEFAULT: "var(--role-border-default)",
            subtle: "var(--role-border-subtle)",
            strong: "var(--role-border-strong)",
          },
          success: {
            bg: "var(--role-success-bg)",
            fg: "var(--role-success-fg)",
            border: "var(--role-success-border)",
          },
          warning: {
            bg: "var(--role-warning-bg)",
            fg: "var(--role-warning-fg)",
            border: "var(--role-warning-border)",
          },
          danger: {
            bg: "var(--role-danger-bg)",
            fg: "var(--role-danger-fg)",
            border: "var(--role-danger-border)",
          },
          info: {
            bg: "var(--role-info-bg)",
            fg: "var(--role-info-fg)",
            border: "var(--role-info-border)",
          },
          glow: {
            soft: "var(--role-glow-soft)",
            strong: "var(--role-glow-strong)",
          },
          edge: {
            soft: "var(--role-edge-soft)",
            strong: "var(--role-edge-strong)",
          },
          cta: {
            bg: "var(--role-cta-bg)",
            hover: "var(--role-cta-hover)",
            fg: "var(--role-cta-fg)",
            ring: "var(--role-cta-ring)",
          },
          surface: {
            "elev-1": "var(--role-surface-elev-1)",
            "elev-2": "var(--role-surface-elev-2)",
          },
        },

      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "heart-bounce": {
          "0%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.3)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "heart-explode": {
          "0%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.4)" },
          "30%": { transform: "scale(0.9)" },
          "45%": { transform: "scale(1.15)" },
          "60%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "notification-bounce": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(15deg)" },
          "75%": { transform: "rotate(-15deg)" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "card-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "border-glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 1px var(--card-glow)" },
          "50%": { boxShadow: "0 0 8px 1px var(--accent-glow)" },
        },
        "eq-1": {
          "0%, 100%": { height: "30%" },
          "50%": { height: "100%" },
        },
        "eq-2": {
          "0%, 100%": { height: "60%" },
          "50%": { height: "20%" },
        },
        "eq-3": {
          "0%, 100%": { height: "40%" },
          "50%": { height: "80%" },
        },
        "enter": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "enter-scale": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "enter-left": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "enter-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "heart-bounce": "heart-bounce 0.35s ease-out",
        "heart-explode": "heart-explode 0.5s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
        "slide-down": "slide-down 0.2s ease-out",
        "notification-bounce": "notification-bounce 0.5s ease-in-out",
        "ken-burns": "ken-burns 20s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "loading-bar": "loading-bar 1.5s ease-in-out infinite",
        "card-shimmer": "card-shimmer 0.5s ease-out forwards",
        "border-glow-pulse": "border-glow-pulse 1.5s ease-in-out infinite",
        "eq-1": "eq-1 0.8s ease-in-out infinite",
        "eq-2": "eq-2 0.6s ease-in-out infinite",
        "eq-3": "eq-3 0.7s ease-in-out infinite",
        "enter": "enter 0.5s ease-out both",
        "enter-scale": "enter-scale 0.4s ease-out both",
        "enter-left": "enter-left 0.4s ease-out both",
        "enter-right": "enter-right 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
