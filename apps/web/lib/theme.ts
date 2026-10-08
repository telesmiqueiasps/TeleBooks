/**
 * TeleBooks Design Tokens — Identidade Visual Premium
 * Cores, tipografia, bordas e sombras centralizadas conforme especificação
 */

export const telebooksTheme = {
  colors: {
    // Fundos
    bgPrimary: "#030817",
    bgSecondary: "#07142B",
    deepNavy: "#0A1935",
    fieldBg: "#0D1D3A",
    cardBg: "rgba(7, 21, 45, 0.88)",
    cardBgSolid: "#07152D",

    // Azuis e Ciano
    primaryBlue: "#087CFF",
    accentBlue: "#119DFF",
    luminousCyan: "#20B9FF",
    borderBlue: "#203B69",
    borderInput: "rgba(32, 59, 105, 0.8)",
    borderInputFocus: "#20B9FF",

    // Tipografia
    textPrimary: "#F7F9FF",
    textSecondary: "#A4B5D2",
    textAuxiliary: "#7186AB",

    // Destaques e Estados
    decorativeGold: "#F5B85C",
    googleBg: "#FFFFFF",
    googleText: "#1F1F1F",
    validationError: "#FF6B7A",
    successState: "#42D6A4",
  },
  gradients: {
    bgGradient: "radial-gradient(ellipse 90% 60% at 75% 15%, #0A1935 0%, #07142B 45%, #030817 100%)",
    buttonPrimary: "linear-gradient(90deg, #087CFF 0%, #119DFF 100%)",
    buttonPrimaryHover: "linear-gradient(90deg, #0066E0 0%, #087CFF 100%)",
    cardBorderGlow: "linear-gradient(135deg, rgba(32, 185, 255, 0.35) 0%, rgba(32, 59, 105, 0.6) 50%, rgba(8, 124, 255, 0.2) 100%)",
  },
  shadows: {
    card: "0 20px 60px rgba(0, 0, 0, 0.55), 0 0 45px rgba(8, 124, 255, 0.12)",
    buttonPrimary: "0 10px 25px -4px rgba(8, 124, 255, 0.5), 0 0 15px rgba(32, 185, 255, 0.3)",
    fieldFocus: "0 0 0 2px rgba(32, 185, 255, 0.35), 0 0 20px rgba(8, 124, 255, 0.2)",
    googleBtn: "0 4px 14px rgba(0, 0, 0, 0.25)",
  },
  radii: {
    card: "32px",
    input: "22px",
    button: "30px",
  },
} as const;
