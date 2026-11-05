import { loadFont as loadArabic } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadLatin } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

// SkillLoop "Mapped loop" palette (src/styles.css, src/lib/pro-card.ts), on a deeper night stage for the HUD look.
export const C = {
  night: "#070c18", ink: "#111b31", ink2: "#1d2c4d", paper: "#faf7f1", lime: "#c4ee57", limeInk: "#1a2410",
  clay: "#d8763f", sea: "#2f6db5", muted: "#8a93a8", line: "#e6e1d6", success: "#2f9e6a", white: "#ffffff",
};

// Latin follows Arabic because the Arabic subset has no space glyph.
const latin = loadLatin("normal", { weights: ["500", "700", "800"], subsets: ["latin"] }).fontFamily;
export const LAT = `"${latin}"`;
export const AR = `"${loadArabic("normal", { weights: ["600", "800"], subsets: ["arabic"] }).fontFamily}", "${latin}"`;
export const MONO = `"${loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily}", monospace`;
export const SERIF = `"${loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily}", serif`;

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const s = (sec: number) => Math.round(sec * FPS);
