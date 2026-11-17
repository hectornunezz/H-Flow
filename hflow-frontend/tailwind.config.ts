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
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        card: "var(--card)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          strong: "var(--accent-strong)",
        },
        fire: {
          orange: "#FF8C00",
          ember: "#E07B00",
        },
        line: "var(--border)",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
      },
      backgroundImage: {
        fire: "linear-gradient(135deg, #FF8C00 0%, #E07B00 100%)",
        "dark-mesh":
          "radial-gradient(ellipse at 80% 0%, rgba(255,140,0,0.12), transparent 45%), linear-gradient(180deg, #0A0A0A 0%, #111111 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 140, 0, 0.3)",
        "glow-lg": "0 0 40px rgba(255, 140, 0, 0.25)",
        deep: "0 0 30px rgba(0, 0, 0, 0.8)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
