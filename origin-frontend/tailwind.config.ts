// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/app/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        text: "#111827",
        muted: "#6b7280",
        border: "#e5e7eb",
        pill: "#f3f4f6",
        rebel: "#ef4444",
        rebelDark: "#dc2626",
      },
      borderRadius: {
        pill: "9999px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.06)",
      },
    },
  },
  plugins: [],
};

export default config;