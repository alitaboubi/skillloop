import { loadFont as loadArabic } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadLatin } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// The app's own tokens (src/styles.css :root and .dark), converted from OKLCH to hex.
export type Pal = {
  bg: string; card: string; fg: string; navy: string; muted: string; mutedFg: string; border: string;
  lime: string; limeFg: string; sea: string; seaSoft: string; clay: string; claySoft: string; success: string; successSoft: string;
};

export const LIGHT: Pal = {
  bg: "#f7f7f2", card: "#ffffff", fg: "#131832", navy: "#07162a", muted: "#eef0f4", mutedFg: "#596475", border: "#e1e5ea",
  lime: "#b4f24e", limeFg: "#07162a", sea: "#0068a7", seaSoft: "#e0f1fe", clay: "#db703b", claySoft: "#ffebde",
  success: "#137738", successSoft: "#e3f4e8",
};

export const DARK: Pal = {
  bg: "#0a0c1a", card: "#13162a", fg: "#eff2f7", navy: "#05101f", muted: "#1d2130", mutedFg: "#a5aec2", border: "#2e3242",
  lime: "#b4f24e", limeFg: "#07162a", sea: "#68bbef", seaSoft: "#0e293d", clay: "#ed905e", claySoft: "#3a2216",
  success: "#67d283", successSoft: "#12301d",
};

// Latin follows Arabic because the Arabic subset has no space glyph.
const latin = loadLatin("normal", { weights: ["200", "500", "600", "700", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const LAT = `"${latin}"`;
export const AR = `"${loadArabic("normal", { weights: ["600", "800"], subsets: ["arabic"] }).fontFamily}", "${latin}"`;

export const MONO = `"${loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily}", monospace`;

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

// Brand surfaces (src/styles.css: --ink, --ink-2, the .bg-ink-hero gradient) and the bright fields of the reel.
export const INK = "#07162a";
export const INK2 = "#142a48";
export const PAPER = "#f7f7f2";
export const LIME = "#b4f24e";
export const LIME_DEEP = "#8fcf2a";
export const CLAY = "#db703b";
export const SEA = "#0068a7";
export const SEA_HI = "#2a8fd6";
export const INK_FG = "#f8f6f0";
export const INK_MUTED = "#b9c6d8";
