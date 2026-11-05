import { loadFont as loadArabic } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadLatin } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadKufi } from "@remotion/google-fonts/ReemKufi";
import { continueRender, delayRender, staticFile } from "remotion";

// SkillLoop "Mapped loop" palette (src/styles.css, src/lib/pro-card.ts).
export const C = {
  ink: "#111b31", ink2: "#1d2c4d", paper: "#faf7f1", lime: "#c4ee57", limeInk: "#1a2410",
  clay: "#d8763f", sea: "#2f6db5", muted: "#b8c3d5", success: "#2f9e6a", white: "#ffffff",
};

// The render browser has no emoji font: ship Noto Color Emoji with the project and add it to every stack.
const emojiWait = delayRender("emoji font");
const emoji = new FontFace("Noto Color Emoji", `url(${staticFile("fonts/NotoColorEmoji.ttf")})`);
emoji.load().then(() => { document.fonts.add(emoji); continueRender(emojiWait); }).catch(() => continueRender(emojiWait));
// The Arabic subsets carry no space glyph: Latin comes before the emoji font so spaces keep their normal width.
const latin = loadLatin("normal", { weights: ["500", "700", "800"], subsets: ["latin"] }).fontFamily;
const stack = (family: string) => `"${family}", "${latin}", "Noto Color Emoji"`;

export const LAT = `"${latin}", "Noto Color Emoji"`;
export const AR = stack(loadArabic("normal", { weights: ["600", "800"], subsets: ["arabic"] }).fontFamily);
export const KUFI = stack(loadKufi("normal", { weights: ["700"], subsets: ["arabic"] }).fontFamily);

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const s = (sec: number) => Math.round(sec * FPS);
