import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          light: "#ffffff",
          dark: "#181b22",
        },
        border: "var(--border)",
        editorial: {
          paper: "#fcfbf9",
          surface: "#ffffff",
          ink: "#141618",
          muted: "#6b7280",
          graphite: "#12151a",
          darkSurface: "#181b22",
          border: "#e7e2d8",
          darkBorder: "#272b35",
          accent: "#2563eb",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        book: "0 8px 24px -4px rgba(0, 0, 0, 0.15), 0 2px 6px -1px rgba(0, 0, 0, 0.08)",
        "book-hover": "0 16px 32px -6px rgba(0, 0, 0, 0.22), 0 4px 10px -2px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
