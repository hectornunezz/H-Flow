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
          orange: "#f97316",
          ember: "#ea580c",
        },
        line: "var(--border)",
      },
      backgroundImage: {
        fire: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
