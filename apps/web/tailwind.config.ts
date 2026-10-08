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
          dark: "#0F172A",
        },
        border: "var(--border)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        // Paleta Oficial TeleBooks
        telebooks: {
          blue: "#007BFF", // Azul Principal Oficial
          navy: "#0F172A", // Azul Escuro Oficial
          purple: "#6366F1", // Roxo Oficial
          green: "#10B981", // Verde Oficial
          gray: "#E5E7EB", // Cinza Oficial
          darkBg: "#0B0F1A", // Fundo Dark Oficial
          darkSurface: "#0F172A", // Superfície Dark Oficial
          // Paleta Premium TeleBooks (Login & Brand)
          dark: "#030817",
          secondary: "#07142B",
          deepNavy: "#0A1935",
          card: "#07152D",
          field: "#0D1D3A",
          primary: "#087CFF",
          accent: "#119DFF",
          cyan: "#20B9FF",
          border: "#203B69",
          textPrimary: "#F7F9FF",
          textSecondary: "#A4B5D2",
          textMuted: "#7186AB",
          gold: "#F5B85C",
          error: "#FF6B7A",
          success: "#42D6A4",
        },
        primary: {
          DEFAULT: "#007BFF",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#007BFF",
          600: "#0066d6",
          700: "#0052ad",
          800: "#003e85",
          900: "#002b5c",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "sans-serif"],
        sora: ["var(--font-sora)", "Sora", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["var(--font-sora)", "Sora", "Georgia", "serif"],
        handwriting: ["var(--font-caveat)", "Caveat", "cursive"],
      },
      boxShadow: {
        book: "0 8px 24px -4px rgba(0, 0, 0, 0.15), 0 2px 6px -1px rgba(0, 0, 0, 0.08)",
        "book-hover": "0 16px 32px -6px rgba(0, 0, 0, 0.22), 0 4px 10px -2px rgba(0, 0, 0, 0.12)",
        "brand-glow": "0 0 24px -4px rgba(0, 123, 255, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
