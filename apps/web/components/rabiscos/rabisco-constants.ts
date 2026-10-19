import type { RabiscoBackground, RabiscoFontStyle } from "@telebooks/types";

export interface RabiscoThemeConfig {
  id: RabiscoBackground;
  label: string;
  bgClass: string;
  previewBg: string;
  textColor: string;
}

export const RABISCO_THEMES: RabiscoThemeConfig[] = [
  {
    id: "gradient-blue",
    label: "Oceano",
    bgClass: "bg-gradient-to-br from-[#006CEB] via-[#007BFF] to-[#0284C7] text-white",
    previewBg: "from-[#006CEB] via-[#007BFF] to-[#0284C7]",
    textColor: "text-white",
  },
  {
    id: "gradient-purple",
    label: "Cósmico",
    bgClass: "bg-gradient-to-br from-purple-700 via-violet-800 to-indigo-950 text-white",
    previewBg: "from-purple-700 via-violet-800 to-indigo-950",
    textColor: "text-white",
  },
  {
    id: "gradient-sunset",
    label: "Pôr do Sol",
    bgClass: "bg-gradient-to-br from-rose-600 via-amber-600 to-purple-900 text-white",
    previewBg: "from-rose-600 via-amber-600 to-purple-900",
    textColor: "text-white",
  },
  {
    id: "gradient-emerald",
    label: "Floresta",
    bgClass: "bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950 text-white",
    previewBg: "from-emerald-600 via-teal-800 to-slate-950",
    textColor: "text-white",
  },
  {
    id: "gradient-amber",
    label: "Pergaminho",
    bgClass: "bg-gradient-to-br from-amber-700 via-orange-800 to-stone-950 text-amber-100",
    previewBg: "from-amber-700 via-orange-800 to-stone-950",
    textColor: "text-amber-100",
  },
  {
    id: "gradient-rose",
    label: "Rubi",
    bgClass: "bg-gradient-to-br from-pink-600 via-rose-700 to-stone-950 text-white",
    previewBg: "from-pink-600 via-rose-700 to-stone-950",
    textColor: "text-white",
  },
  {
    id: "paper-dark",
    label: "Tinta Escura",
    bgClass: "bg-gradient-to-br from-zinc-900 via-neutral-900 to-black text-amber-50 border border-neutral-800",
    previewBg: "from-zinc-900 via-neutral-900 to-black",
    textColor: "text-amber-50",
  },
  {
    id: "classic-slate",
    label: "Grafite",
    bgClass: "bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-slate-100",
    previewBg: "from-slate-900 via-slate-800 to-cyan-950",
    textColor: "text-slate-100",
  },
];

export interface RabiscoFontConfig {
  id: RabiscoFontStyle;
  label: string;
  fontClass: string;
}

export const RABISCO_FONTS: RabiscoFontConfig[] = [
  {
    id: "sans",
    label: "Moderna",
    fontClass: "font-sans font-semibold tracking-tight",
  },
  {
    id: "serif",
    label: "Literária",
    fontClass: "font-serif italic font-normal tracking-wide",
  },
  {
    id: "mono",
    label: "Máquina",
    fontClass: "font-mono font-medium tracking-normal",
  },
  {
    id: "handwriting",
    label: "Diário",
    fontClass: "font-serif font-bold tracking-tight",
  },
];

export function getRabiscoTheme(themeId: string): RabiscoThemeConfig {
  const found = RABISCO_THEMES.find((t) => t.id === themeId);
  return found || RABISCO_THEMES[0]!;
}

export function getRabiscoFont(fontId: string): RabiscoFontConfig {
  const found = RABISCO_FONTS.find((f) => f.id === fontId);
  return found || RABISCO_FONTS[0]!;
}

