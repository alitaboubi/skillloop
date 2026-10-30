import { encodeQr, qrPath } from "./qr";
import { siteUrl } from "./seo";
import { profilePath } from "./share";

/**
 * "Carte & QR" (SkillLoop Pro): a printable business card (85 × 55 mm) and a square sticker (80 × 80 mm) that lead to
 * the pro's public page. Built as one standalone SVG string so the preview, the downloads (SVG, PNG) and the print are
 * the same file. Fixed print colours (the card doesn't follow the screen theme); system fonts (no web font is embedded).
 * The QR link carries ?via=qr only so scans can be counted in the pro's own statistics (no third-party tracking).
 */
export type CardVariant = "card" | "sticker";
export type CardInput = {
  name: string;
  title?: string | null | undefined;
  place?: string | null | undefined;
  url: string;
  /** Short line under the QR / above the name (UI language). */
  scanLabel: string;
  /** Sticker headline (UI language). */
  stickerTitle: string;
  /** Lay the card out right-to-left (Arabic UI). */
  rtl: boolean;
};

export const CARD_SIZE_MM: Record<CardVariant, { w: number; h: number }> = { card: { w: 85, h: 55 }, sticker: { w: 80, h: 80 } };

const C = { ink: "#111b31", ink2: "#1d2c4d", paper: "#faf7f1", muted: "#b8c3d5", clay: "#d8763f", lime: "#c4ee57", white: "#ffffff" };
const FONT = "Inter, 'Segoe UI', system-ui, -apple-system, 'Noto Sans Arabic', Tahoma, Arial, 'DejaVu Sans', sans-serif";
const LOOP = "M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z";
const SPARK = "M25 2c-4 0-6 3.5-8 7";

export const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Cuts long user text at a word boundary (≤ max characters, with an ellipsis). */
export function clip(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if ([...t].length <= max) return t;
  const cut = [...t].slice(0, max - 1).join("");
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** Name size that keeps long names on one line (px in the 850-wide card). */
export const nameSize = (name: string, base: number, fit: number) => Math.max(Math.round(base * 0.55), Math.min(base, Math.round((base * fit) / Math.max(1, [...name].length))));

type Align = "left" | "right" | "center";
/**
 * Lines are anchored by their visual side only (no SVG `direction`, which renderers apply inconsistently): the bidi
 * algorithm still orders and shapes Arabic glyphs inside each line.
 */
export const anchorFor = (align: Align) => (align === "center" ? "middle" : align === "right" ? "end" : "start");

function line(text: string, x: number, y: number, size: number, fill: string, weight: number, align: Align) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchorFor(align)}">${escapeXml(text)}</text>`;
}

function qrGroup(url: string, x: number, y: number, box: number) {
  const qr = encodeQr(url);
  const units = qr.size + 4; // 2-module quiet zone inside the white tile (+ the tile's own padding)
  const scale = box / units;
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})"><path d="${qrPath(qr, 2)}" fill="${C.ink}" shape-rendering="crispEdges"/></g>`;
}

const brand = (x: number, y: number, s: number, light: boolean) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-width="3.2"><path d="${LOOP}" stroke="${C.clay}"/><path d="${SPARK}" stroke="${C.lime}" stroke-linecap="round"/></g>` +
  `<text x="${x + 42 * s}" y="${y + 14 * s}" font-size="${17 * s}" font-weight="800" fill="${light ? C.paper : C.ink}" direction="ltr" text-anchor="start">Skill<tspan fill="${light ? C.lime : C.clay}">Loop</tspan></text>`;

/** The standalone SVG for a card or sticker. */
export function buildCardSvg(input: CardInput, variant: CardVariant): string {
  const { w, h } = CARD_SIZE_MM[variant];
  const name = clip(input.name || "SkillLoop", 40);
  const title = input.title ? clip(input.title, 46) : "";
  const place = input.place ? clip(input.place, 40) : "";
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w * 10} ${h * 10}" font-family="${escapeXml(FONT)}">`;

  if (variant === "card") {
    const r = input.rtl;
    const al: Align = r ? "right" : "left";
    const tile = 300, tx = r ? 50 : 850 - 50 - tile, ty = 125;
    const colX = r ? 850 - 56 : 56;
    const ns = nameSize(name, 58, 14);
    return head +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.ink2}"/></linearGradient></defs>` +
      `<rect width="850" height="550" rx="28" fill="url(#g)"/>` +
      `<path d="M-20 520 C 160 470, 300 560, 470 515 S 760 470, 880 505" fill="none" stroke="${C.clay}" stroke-opacity="0.35" stroke-width="3"/>` +
      brand(r ? 850 - 56 - 258 : 56, 52, 2, true) +
      line(name, colX, 250, ns, C.paper, 800, al) +
      (title ? line(title, colX, 250 + 52, 30, C.muted, 500, al) : "") +
      (place ? line(place, colX, 250 + (title ? 98 : 52), 26, C.muted, 500, al) : "") +
      line(clip(input.scanLabel, 34), colX, 420, 22, C.clay, 700, al) +
      `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="22" fill="${C.white}"/>` +
      qrGroup(input.url, tx + 14, ty + 14, tile - 28) +
      `</svg>`;
  }

  const ns = nameSize(name, 50, 18);
  const tile = 440, tx = 180, ty = 180;
  return head +
    `<rect width="800" height="800" rx="56" fill="${C.ink}"/>` +
    `<rect x="14" y="14" width="772" height="772" rx="44" fill="none" stroke="${C.lime}" stroke-width="6"/>` +
    brand(400 - 150, 44, 2.2, true) +
    line(clip(input.stickerTitle, 34), 400, 148, 32, C.paper, 700, "center") +
    `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="30" fill="${C.white}"/>` +
    qrGroup(input.url, tx + 18, ty + 18, tile - 36) +
    line(name, 400, 690, ns, C.paper, 800, "center") +
    line(clip(input.scanLabel, 40), 400, 740, 24, C.clay, 700, "center") +
    `</svg>`;
}

/** Public link the QR opens (canonical origin when configured), marked ?via=qr so scans are counted. */
export function qrLink(userId: string): string {
  const origin = siteUrl() ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${profilePath(userId)}?via=qr`;
}
