// Ready-made images a pro can pick instead of uploading: service covers (4:3, 3 per category) and profile avatars (1:1).
// Plain SVG, no text (they are shown in every language), "Mapped loop" colours. The app rasterises the picked one to a
// JPEG and uploads it like any other photo (src/lib/presets.ts).
// Run: node scripts/make-presets.mjs  → src/assets/covers, src/assets/avatars, src/assets/banners (profile banners, wide)
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = {
  ink: "#07162a", ink2: "#12283e", inkDeep: "#030b1a", top: "#0e2036", lime: "#b4f24e", limeD: "#7fb62a",
  sea: "#348dcf", seaL: "#85c7f1", seaDeep: "#003053", clay: "#e97c48", clayL: "#f6bc9c", sand: "#faf6ef",
  muted: "#e2ded5", line: "#bec5ce", white: "#ffffff", gold: "#f2c14e",
};

/* ---------- themes ---------- */
const THEMES = {
  ink: { bg: [C.top, C.inkDeep], contour: "#ffffff", contourOp: 0.06, fg: C.sand, panel: C.white, soft: C.ink2, bar: C.muted, strong: C.ink },
  sand: { bg: ["#fbf8f2", "#ece5d7"], contour: C.ink, contourOp: 0.07, fg: C.ink, panel: C.white, soft: "#e9e3d6", bar: C.muted, strong: C.ink },
  sea: { bg: ["#0f4573", "#04223f"], contour: "#ffffff", contourOp: 0.07, fg: C.sand, panel: C.white, soft: "#0c3a63", bar: "#dfe7ee", strong: C.ink },
};

const n = (v) => Math.round(v * 10) / 10;
function contours(t, cx = 600, cy = 140) {
  let out = "";
  for (let k = 1; k <= 16; k++) {
    const r = k * 38;
    const pts = [];
    for (let i = 0; i <= 360; i += 6) {
      const a = (i * Math.PI) / 180;
      const w = 1 + 0.09 * Math.sin(3 * a + k * 0.7) + 0.05 * Math.sin(5 * a - k);
      pts.push(`${n(cx + r * w * Math.cos(a) * 1.25)},${n(cy + r * w * Math.sin(a))}`);
    }
    out += `<polyline points="${pts.join(" ")}"/>`;
  }
  return `<g fill="none" stroke="${t.contour}" stroke-opacity="${t.contourOp}" stroke-width="1.2">${out}</g>`;
}
function loopMark(cx, cy, a, color, w = 3.5) {
  const pts = [];
  for (let i = 0; i <= 360; i += 4) {
    const r = (i * Math.PI) / 180, d = 1 + Math.sin(r) ** 2;
    pts.push(`${n(cx + (a * Math.cos(r)) / d)},${n(cy + (a * Math.sin(r) * Math.cos(r)) / d)}`);
  }
  const [sx, sy] = pts[10].split(",");
  return `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/><circle cx="${sx}" cy="${sy}" r="5.5" fill="${C.lime}"/>`;
}
const defs = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#020814" flood-opacity="0.32"/></filter></defs>`;
const rect = (x, y, w, h, r, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const panel = (x, y, w, h, r, fill) => rect(x, y, w, h, r, fill, `filter="url(#sh)"`);
const circle = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const stroke = (d, color, w, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const bars = (x, y, ws, h, gap, fill) => ws.map((w, i) => rect(x, y + i * (h + gap), w, h, h / 2, fill)).join("");
const sparkle = (x, y, s, fill) => path(`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`, fill);
const dots = (x, y, cols, rows, gap, fill, op = 0.35) => {
  let o = ""; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) o += circle(x + i * gap, y + j * gap, 2.4, fill, `fill-opacity="${op}"`);
  return o;
};

function cover(theme, scene) {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="1200" height="900">${defs}` +
    `<linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient>` +
    `<rect width="800" height="600" fill="url(#bg)"/>${contours(t)}${scene(t)}${loopMark(724, 548, 30, theme === "sand" ? C.ink : C.lime, 3)}</svg>`;
}

/* ---------- scenes (centred, about 560×420) ---------- */
const SCENES = {
  tech: [
    (t) => // browser + phone
      panel(230, 120, 450, 330, 18, t.panel) + rect(230, 120, 450, 40, 18, "#efebe3") + rect(230, 142, 450, 18, 0, "#efebe3") +
      circle(254, 140, 6, C.clay) + circle(274, 140, 6, C.gold) + circle(294, 140, 6, C.lime) + rect(320, 131, 220, 18, 9, C.white) +
      rect(256, 184, 46, 16, 6, C.ink) + bars(500, 188, [40], 8, 0, C.muted) + bars(550, 188, [40], 8, 0, C.muted) + rect(610, 182, 50, 20, 10, C.lime) +
      bars(256, 226, [200, 150], 18, 12, C.ink) + bars(256, 290, [180, 140], 8, 10, C.muted) + rect(256, 330, 90, 28, 14, C.lime) +
      rect(480, 222, 180, 130, 10, C.sea) + path("M480 352L540 290L580 325L620 285L660 330V352Z", C.seaDeep) + circle(630, 250, 14, C.lime) +
      rect(256, 380, 125, 50, 10, "#f4f0e8") + rect(395, 380, 125, 50, 10, "#f4f0e8") + rect(534, 380, 125, 50, 10, "#f4f0e8") +
      circle(278, 405, 10, C.clay) + circle(417, 405, 10, C.sea) + circle(556, 405, 10, C.lime) +
      panel(130, 250, 140, 250, 22, C.ink) + rect(138, 258, 124, 234, 16, C.white) + rect(180, 266, 40, 8, 4, C.ink) +
      bars(152, 290, [80, 56], 12, 8, C.ink) + bars(152, 334, [96, 70], 6, 7, C.muted) + rect(152, 362, 60, 18, 9, C.lime) + rect(152, 392, 96, 66, 8, C.sea),
    (t) => // code editor + terminal
      panel(150, 110, 470, 320, 16, C.ink2) + rect(150, 110, 470, 36, 16, "#1b3550") + rect(150, 130, 470, 16, 0, "#1b3550") +
      circle(172, 128, 6, C.clay) + circle(192, 128, 6, C.gold) + circle(212, 128, 6, C.lime) +
      rect(150, 146, 70, 284, 0, "#0d2034") + bars(166, 170, [36, 30, 40, 26, 34], 6, 14, "#33506d") +
      [[ [240, C.sea, 60], [310, C.seaL, 110] ], [[260, C.lime, 50], [320, C.sand, 140]], [[260, C.clay, 70], [340, C.sand, 90]], [[280, C.seaL, 120], [410, C.lime, 40]],
       [[280, C.sand, 80], [370, C.clay, 60]], [[260, C.sand, 30]], [[240, C.sea, 40], [290, C.seaL, 160]], [[260, C.lime, 90], [360, C.sand, 70]], [[240, C.sand, 30]]]
        .map((row, i) => row.map(([x, c, w]) => rect(x, 168 + i * 27, w, 9, 4.5, c)).join("")).join("") +
      rect(240, 165 + 3 * 27, 360, 15, 3, "#ffffff", `fill-opacity="0.06"`) +
      panel(430, 300, 250, 170, 14, C.inkDeep) + rect(452, 326, 14, 10, 2, C.lime) + bars(476, 326, [120], 10, 0, C.sand) +
      bars(452, 352, [180, 140, 160], 8, 12, "#3b5878") + rect(452, 412, 14, 10, 2, C.lime) + rect(472, 410, 8, 14, 1, C.sand) +
      circle(640, 120, 26, C.lime) + stroke("M628 120l8 8 16-16", C.ink, 5),
    (t) => // analytics dashboard + cloud
      panel(140, 110, 520, 340, 18, t.panel) + rect(140, 110, 120, 340, 18, C.ink) + rect(242, 110, 18, 340, 0, C.ink) +
      circle(178, 146, 12, C.lime) + bars(164, 190, [70, 56, 64, 48], 8, 22, "#2c4561") + rect(156, 186, 90, 16, 8, "#ffffff", `fill-opacity="0.08"`) +
      [0, 1, 2].map((i) => rect(282 + i * 124, 132, 110, 70, 12, "#f4f0e8") + bars(296 + i * 124, 148, [50], 8, 0, C.muted) + rect(296 + i * 124, 168, 60, 18, 6, [C.ink, C.sea, C.clay][i])).join("") +
      rect(282, 222, 230, 206, 12, "#f4f0e8") + [60, 95, 75, 130, 110, 150].map((h, i) => rect(302 + i * 34, 410 - h, 20, h, 5, i === 5 ? C.lime : C.sea)).join("") +
      rect(530, 222, 110, 206, 12, "#f4f0e8") + circle(585, 290, 38, "none", `stroke="${C.muted}" stroke-width="16"`) +
      path("M585 252A38 38 0 0 1 621 302", "none", `stroke="${C.clay}" stroke-width="16"`) + path("M621 302A38 38 0 0 1 560 319", "none", `stroke="${C.sea}" stroke-width="16"`) +
      bars(550, 350, [70, 50, 60], 7, 10, C.muted) +
      panel(580, 400, 150, 92, 46, C.sand) + path("M612 470a26 26 0 0 1 4-52 34 34 0 0 1 64 6 22 22 0 0 1 2 46Z", C.sea) + stroke("M655 455v-22m-10 10 10-10 10 10", C.white, 5),
  ],
  design: [
    (t) => // artboards / app screens
      [0, 1, 2].map((i) => {
        const x = 170 + i * 165, y = i === 1 ? 110 : 150;
        return panel(x, y, 140, 280, 22, t.panel) + rect(x + 10, y + 10, 120, 260, 14, i === 1 ? C.ink : "#f4f0e8") +
          rect(x + 24, y + 30, 92, i === 1 ? 110 : 70, 12, [C.clay, C.lime, C.sea][i]) +
          bars(x + 24, y + (i === 1 ? 156 : 116), [80, 56], 10, 8, i === 1 ? C.sand : C.ink) +
          bars(x + 24, y + (i === 1 ? 200 : 160), [92, 70, 84], 6, 7, i === 1 ? "#33506d" : C.muted) +
          rect(x + 24, y + 228, 92, 26, 13, i === 1 ? C.lime : C.ink);
      }).join("") +
      stroke("M310 290C340 250 370 250 335 220", C.lime, 3, `stroke-dasharray="6 7"`) + stroke("M475 250C505 230 510 290 500 300", C.lime, 3, `stroke-dasharray="6 7"`) +
      path("M560 430l14 44 8-18 18-6Z", C.clay, `stroke="${C.white}" stroke-width="3"`) + rect(580, 476, 74, 26, 8, C.clay),
    (t) => // brand identity: mark + swatches + type blocks
      panel(150, 120, 300, 300, 24, t.panel) + circle(300, 255, 92, C.ink) + path("M262 255a38 38 0 1 1 76 0a38 38 0 1 1-76 0Z", C.lime) +
      circle(300, 255, 18, C.ink) + path("M300 163a92 92 0 0 1 92 92h-40a52 52 0 0 0-52-52Z", C.clay) +
      bars(220, 370, [160], 12, 0, C.ink) + bars(250, 392, [100], 7, 0, C.muted) +
      [C.ink, C.lime, C.clay, C.sea].map((c, i) => panel(480 + (i % 2) * 100, 130 + Math.floor(i / 2) * 100, 84, 84, 16, c)).join("") +
      panel(480, 340, 184, 120, 16, t.panel) + path("M505 430l26-66h12l26 66h-14l-6-17h-24l-6 17Zm24-29h16l-8-22Z", C.ink) +
      bars(590, 372, [52, 40, 52, 30], 8, 10, C.muted),
    (t) => // pen tool + bezier
      panel(140, 100, 520, 360, 20, t.panel) + dots(170, 130, 16, 11, 31, C.line, 0.6) +
      stroke("M210 380C260 160 420 160 470 300S600 360 610 180", C.ink, 6) +
      stroke("M210 380L250 220M470 300L420 400M470 300L520 200M610 180L630 120", C.sea, 2.5) +
      [[210, 380], [470, 300], [610, 180]].map(([x, y]) => rect(x - 10, y - 10, 20, 20, 3, C.white, `stroke="${C.sea}" stroke-width="3"`)).join("") +
      [[250, 220], [420, 400], [520, 200], [630, 120]].map(([x, y]) => circle(x, y, 7, C.sea)).join("") +
      `<g transform="translate(470 300) rotate(-35)">${path("M0 0l-16 46h32Z", C.ink)}${rect(-16, 46, 32, 70, 6, C.lime)}${circle(0, 22, 5, C.white)}</g>` +
      [C.clay, C.lime, C.sea, C.ink].map((c, i) => circle(200 + i * 46, 140, 16, c, `stroke="${C.white}" stroke-width="4"`)).join(""),
  ],
  tutoring: [
    (t) => // open book + pencil
      panel(160, 170, 480, 290, 20, "transparent") +
      path("M400 200C330 160 230 160 170 180V440C230 420 330 420 400 460Z", t.panel, `filter="url(#sh)"`) +
      path("M400 200C470 160 570 160 630 180V440C570 420 470 420 400 460Z", "#f4f0e8", `filter="url(#sh)"`) +
      stroke("M400 200V460", C.line, 3) +
      bars(205, 220, [160, 140, 170, 120], 8, 16, C.muted) + rect(205, 320, 150, 80, 10, C.sea) + circle(240, 350, 14, C.lime) +
      path("M205 400L255 360L285 380L325 345L355 375V400Z", C.seaDeep) +
      bars(430, 220, [150, 170, 130], 8, 16, C.muted) + path("M440 320h40v40h-40Z", C.clay) + path("M500 360l26-44 26 44Z", C.lime) + circle(590, 340, 22, C.ink) +
      bars(430, 390, [170], 8, 0, C.muted) +
      `<g transform="translate(620 150) rotate(35)">${rect(-14, 0, 28, 190, 4, C.gold)}${rect(-14, 0, 28, 24, 4, C.clay)}${path("M-14 190h28l-14 36Z", C.clayL)}${path("M-5 213h10l-5 13Z", C.ink)}</g>` +
      sparkle(220, 130, 18, C.lime) + sparkle(560, 110, 12, t.fg),
    (t) => // board with graph
      panel(140, 100, 520, 330, 18, "#a8805a") + rect(156, 116, 488, 298, 10, "#1d4a3b") +
      stroke("M200 380H600M220 400V140", "#e8efe9", 3) + stroke("M240 160C300 400 380 400 440 260S540 160 600 220", C.lime, 5) +
      circle(345, 345, 8, C.clay) + stroke("M200 160h24M200 220h12M200 280h12M200 340h12", "#e8efe9", 3, `stroke-opacity="0.5"`) +
      path("M480 160h70M515 140v40", "none", `stroke="#e8efe9" stroke-width="5" stroke-linecap="round"`) + stroke("M570 150l30 30M600 150l-30 30", "#e8efe9", 5) +
      rect(320, 430, 160, 14, 4, "#8c6a49") + rect(560, 420, 40, 12, 3, C.sand) + rect(510, 420, 40, 12, 3, C.clayL) +
      `<g transform="translate(640 460) rotate(-20)">${rect(0, 0, 80, 30, 6, C.sea)}${rect(0, 22, 80, 8, 3, "#e8efe9")}</g>`,
    (t) => // video lesson on laptop
      panel(180, 110, 440, 290, 18, C.ink) + rect(196, 126, 408, 258, 8, "#f4f0e8") +
      rect(196, 126, 270, 258, 8, C.seaL) + circle(330, 230, 48, C.clayL) + path("M282 228a48 48 0 0 1 96-8c-20-6-46-30-50-40-10 22-30 40-46 48Z", C.ink) +
      path("M246 384c4-70 44-98 84-98s80 28 84 98Z", C.sea) +
      rect(480, 140, 110, 82, 8, "#e2ded5") + circle(535, 175, 20, "#c98d63") + path("M505 222c2-28 14-36 30-36s28 8 30 36Z", C.clay) +
      bars(480, 240, [110, 80, 100, 70], 8, 12, C.muted) + rect(480, 340, 110, 28, 14, C.lime) +
      path("M140 400h520l-30 40H170Z", "#cfd6de", `filter="url(#sh)"`) + rect(360, 404, 80, 8, 4, "#aeb8c3") +
      circle(632, 150, 22, C.clay) + rect(625, 140, 14, 20, 7, C.white),
  ],
  home: [
    (t) => // house + tools
      path("M180 300L360 160L540 300V460H180Z", t.panel, `filter="url(#sh)"`) + path("M150 310L360 140L570 310", "none", `stroke="${C.clay}" stroke-width="26" stroke-linejoin="round" stroke-linecap="round"`) +
      rect(240, 330, 80, 80, 8, C.seaL) + stroke("M280 330v80M240 370h80", C.white, 5) + rect(400, 340, 80, 120, 8, C.ink) + circle(462, 404, 6, C.lime) +
      rect(470, 180, 34, 70, 4, C.ink2) + sparkle(620, 200, 16, C.lime) + sparkle(130, 420, 10, t.fg) +
      panel(520, 400, 170, 90, 12, C.clay) + rect(570, 384, 70, 24, 8, "none", `stroke="${C.ink}" stroke-width="8"`) + rect(520, 432, 170, 8, 0, "#c96535"),
    (t) => // paint roller on wall
      panel(140, 110, 400, 360, 16, "#f4f0e8") + dots(170, 140, 12, 10, 34, C.line, 0.55) +
      path("M140 230h400v110H140Z", C.sea) + path("M140 230h400v26H140Z", C.seaL, `fill-opacity="0.6"`) + path("M540 230v110", "none") +
      `<g filter="url(#sh)">${rect(470, 190, 190, 70, 30, C.sea)}${rect(470, 190, 190, 22, 11, C.seaL, `fill-opacity="0.45"`)}</g>` +
      stroke("M660 225h30v80h-125v40", C.ink, 10) + rect(552, 345, 26, 120, 10, C.clay) +
      panel(580, 420, 120, 70, 10, C.white) + rect(580, 420, 120, 18, 6, C.sea) + rect(600, 404, 80, 18, 9, "none", `stroke="${C.ink}" stroke-width="5"`) +
      circle(232, 396, 8, C.sea) + circle(318, 412, 6, C.sea),
    (t) => // plumbing + electricity
      panel(140, 120, 250, 330, 20, t.panel) + stroke("M190 160h80a30 30 0 0 1 30 30v40", C.line, 26) + rect(270, 222, 60, 30, 8, C.ink) +
      rect(286, 196, 28, 34, 6, C.clay) + rect(262, 186, 76, 14, 7, C.clay) + path("M300 270c-14 22-22 34-22 46a22 22 0 0 0 44 0c0-12-8-24-22-46Z", C.sea) +
      rect(170, 360, 190, 60, 10, "#f4f0e8") + stroke("M190 390h150", C.sea, 6) +
      panel(420, 120, 250, 330, 20, C.ink) + circle(545, 230, 62, C.lime) + circle(545, 230, 62, "none", `stroke="${C.white}" stroke-opacity=".25" stroke-width="18"`) +
      rect(515, 288, 60, 50, 8, C.sand) + bars(515, 344, [60, 60], 8, 6, C.line) + path("M545 200l-16 34h18l-12 30 30-40h-18l12-24Z", C.ink) +
      [[450, 160], [640, 170], [460, 320], [630, 310]].map(([x, y]) => sparkle(x, y, 12, C.lime)).join("") + rect(460, 400, 170, 22, 11, "#2c4561"),
  ],
  care: [
    (t) => // heart held in hands
      circle(400, 300, 190, t.soft) + path("M400 400C320 340 280 300 280 255a60 60 0 0 1 120-20 60 60 0 0 1 120 20c0 45-40 85-120 145Z", C.clay, `filter="url(#sh)"`) +
      path("M180 380c40-10 90 0 130 40l60 50H200Z", C.clayL) + path("M620 380c-40-10-90 0-130 40l-60 50h170Z", C.clayL) +
      path("M180 380l20 90h-60l-10-70Z", C.sea) + path("M620 380l-20 90h60l10-70Z", C.sea) +
      path("M340 240a30 30 0 0 1 40-20", "none", `stroke="${C.white}" stroke-opacity=".6" stroke-width="10" stroke-linecap="round"`) +
      sparkle(250, 170, 16, C.lime) + sparkle(560, 160, 12, C.lime) + sparkle(600, 250, 8, t.fg),
    (t) => // care schedule: calendar + clock + check
      panel(160, 120, 330, 330, 20, t.panel) + rect(160, 120, 330, 70, 20, C.sea) + rect(160, 170, 330, 20, 0, C.sea) +
      rect(210, 100, 14, 44, 7, C.ink) + rect(426, 100, 14, 44, 7, C.ink) +
      [...Array(15)].map((_, i) => rect(190 + (i % 5) * 58, 212 + Math.floor(i / 5) * 72, 40, 52, 8, [3, 7, 11].includes(i) ? C.lime : "#f4f0e8")).join("") +
      stroke("M318 290l8 8 16-16", C.ink, 4) +
      panel(450, 260, 200, 200, 100, C.ink) + circle(550, 360, 80, C.sand) + stroke("M550 360v-48M550 360l34 20", C.ink, 8) + circle(550, 360, 8, C.clay) +
      [0, 90, 180, 270].map((a) => { const r = (a * Math.PI) / 180; return circle(550 + 64 * Math.cos(r), 360 + 64 * Math.sin(r), 4, C.ink); }).join(""),
    (t) => // home care: house with heart + helping hand
      circle(400, 290, 200, t.soft) + path("M250 300L400 180L550 300V450H250Z", t.panel, `filter="url(#sh)"`) +
      path("M225 310L400 165L575 310", "none", `stroke="${C.sea}" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"`) +
      path("M400 410C350 372 330 350 330 322a35 35 0 0 1 70-10 35 35 0 0 1 70 10c0 28-20 50-70 88Z", C.clay) +
      rect(280, 330, 34, 34, 6, C.seaL) + rect(486, 330, 34, 34, 6, C.seaL) + sparkle(600, 180, 14, C.lime) + sparkle(200, 220, 10, C.lime) +
      path("M120 470c60-30 140-40 220-20l140 30v30H120Z", C.clayL) + path("M680 470c-40-20-100-20-160 0v40h160Z", C.sea),
  ],
  healthcare: [
    (t) => // stethoscope + cross card
      panel(160, 130, 270, 330, 22, t.panel) + rect(250, 180, 90, 90, 14, C.sea) + rect(280, 160, 30, 130, 8, C.sea) + rect(230, 210, 130, 30, 8, C.sea) +
      rect(230, 190, 130, 70, 0, "transparent") + bars(200, 320, [190, 150, 170], 10, 14, C.muted) + rect(200, 400, 110, 30, 15, C.lime) +
      stroke("M520 140v90a70 70 0 0 0 140 0v-90", C.line, 14) + circle(520, 140, 12, C.clay) + circle(660, 140, 12, C.clay) +
      stroke("M590 300v60a60 60 0 0 1-120 0v-10", C.line, 14) + circle(470, 330, 34, C.sea, `filter="url(#sh)"`) + circle(470, 330, 18, C.seaL),
    (t) => // heart-rate monitor
      panel(130, 140, 540, 300, 22, C.ink) + rect(150, 160, 500, 220, 12, C.inkDeep) + dots(170, 180, 16, 7, 31, "#1f8a66", 0.5) +
      stroke("M150 280h110l20-50 30 110 30-170 30 140 20-30h90l16-24 16 24h138", C.lime, 6) +
      path("M560 230C540 216 530 206 530 194a16 16 0 0 1 30-6 16 16 0 0 1 30 6c0 12-10 22-30 36Z", C.clay) +
      rect(170, 396, 120, 24, 12, C.sea) + rect(310, 396, 80, 24, 12, "#2c4561") + circle(620, 408, 12, C.clay),
    (t) => // clipboard + capsule
      panel(180, 110, 280, 370, 20, t.panel) + rect(260, 92, 120, 44, 12, C.ink) + circle(320, 104, 8, C.sand) +
      [0, 1, 2, 3].map((i) => rect(210, 170 + i * 66, 30, 30, 8, i < 3 ? C.lime : "#f4f0e8") + (i < 3 ? stroke(`M216 ${185 + i * 66}l7 7 12-12`, C.ink, 4) : "") + bars(256, 176 + i * 66, [170, 120], 8, 8, C.muted)).join("") +
      `<g transform="translate(560 270) rotate(-35)" filter="url(#sh)">${rect(-50, -120, 100, 240, 50, C.white)}${path("M-50 0V-70a50 50 0 0 1 100 0V0Z", C.clay)}</g>` +
      circle(640, 420, 30, C.sea, `filter="url(#sh)"`) + rect(622, 416, 36, 8, 4, C.white) + sparkle(520, 140, 14, C.lime),
  ],
  engineering: [
    (t) => // blueprint plan
      panel(130, 100, 540, 380, 16, "#0d4f86") + dots(160, 130, 17, 11, 31, C.white, 0.18) +
      stroke("M190 150h300v120h120v170H190Z", C.white, 6) + stroke("M190 300h170v140M360 150v90M490 270v60", C.white, 4) +
      stroke("M360 300a40 40 0 0 1 40 40", C.seaL, 3) + stroke("M190 470h420M190 462v16M610 462v16", C.lime, 3) +
      rect(220, 180, 100, 70, 6, C.white, `fill-opacity="0.12"`) + rect(520, 300, 60, 100, 6, C.lime, `fill-opacity="0.85"`) +
      `<g transform="translate(560 120) rotate(20)">${rect(0, 0, 160, 30, 4, C.gold)}${[...Array(9)].map((_, i) => rect(10 + i * 16, 0, 3, i % 2 ? 10 : 16, 1, C.ink)).join("")}</g>`,
    (t) => // gears
      [[330, 300, 120, 12, C.sea], [520, 220, 80, 9, C.lime], [520, 410, 64, 8, C.clay]].map(([cx, cy, r, k, c]) => {
        let d = "";
        for (let i = 0; i < k * 2; i++) {
          const a0 = (i * Math.PI) / k, a1 = ((i + 1) * Math.PI) / k, rr = i % 2 ? r : r + r * 0.2;
          d += `${i ? "L" : "M"}${n(cx + rr * Math.cos(a0))} ${n(cy + rr * Math.sin(a0))}L${n(cx + rr * Math.cos(a1))} ${n(cy + rr * Math.sin(a1))}`;
        }
        return path(d + "Z", c, `filter="url(#sh)"`) + circle(cx, cy, r * 0.45, t.soft) + circle(cx, cy, r * 0.2, t.fg);
      }).join("") + sparkle(200, 160, 14, C.lime) + sparkle(640, 120, 10, t.fg),
    (t) => // crane + building
      rect(140, 470, 520, 10, 5, t.fg, `fill-opacity="0.4"`) +
      panel(380, 260, 200, 210, 8, t.panel) + [...Array(8)].map((_, i) => rect(404 + (i % 3) * 56, 286 + Math.floor(i / 3) * 56, 40, 36, 4, i === 4 ? C.lime : C.seaL)).join("") +
      stroke("M220 470V140M220 140h360M220 190l40-50M260 140v40", C.gold, 12) +
      [...Array(6)].map((_, i) => stroke(`M212 ${170 + i * 50}l16 30`, C.ink, 3)).join("") +
      stroke("M520 140v70", t.fg, 3) + rect(495, 210, 50, 34, 4, C.clay) + rect(196, 450, 48, 20, 4, C.ink2) +
      rect(150, 140, 60, 30, 4, C.ink2),
  ],
  automotive: [
    (t) => // car side
      path("M150 380c0-40 20-60 60-70l70-60c20-16 40-22 70-22h120c30 0 50 10 70 30l50 52c40 4 70 20 70 70v20H150Z", C.clay, `filter="url(#sh)"`) +
      path("M300 260l-40 50h120v-60h-50c-14 0-22 2-30 10Zm100-10v60h120l-40-46c-8-10-18-14-32-14Z", C.seaL) +
      rect(150, 380, 500, 20, 10, "#c96535") + circle(250, 400, 48, C.ink) + circle(250, 400, 20, C.sand) + circle(550, 400, 48, C.ink) + circle(550, 400, 20, C.sand) +
      rect(620, 340, 30, 16, 6, C.gold) + rect(150, 344, 22, 14, 6, C.white) +
      rect(120, 460, 560, 6, 3, t.fg, `fill-opacity=".25"`) + sparkle(620, 170, 16, C.lime) + sparkle(190, 200, 10, t.fg),
    (t) => // wheel + gauge
      circle(310, 300, 150, C.ink, `filter="url(#sh)"`) + circle(310, 300, 96, "#3b5878") + circle(310, 300, 80, C.line) +
      [...Array(5)].map((_, i) => { const a = (i * 72 * Math.PI) / 180; return stroke(`M310 300L${n(310 + 74 * Math.cos(a))} ${n(300 + 74 * Math.sin(a))}`, "#8a96a3", 18); }).join("") +
      circle(310, 300, 24, C.ink) + circle(310, 300, 8, C.lime) +
      panel(500, 150, 190, 190, 95, t.panel) + path("M530 270a65 65 0 0 1 130 0", "none", `stroke="${C.muted}" stroke-width="14" stroke-linecap="round"`) +
      path("M530 270a65 65 0 0 1 100-55", "none", `stroke="${C.lime}" stroke-width="14" stroke-linecap="round"`) + stroke("M595 270l38-44", C.ink, 6) + circle(595, 270, 10, C.clay) +
      panel(520, 380, 150, 90, 14, C.sea) + rect(540, 368, 26, 16, 4, C.ink) + rect(624, 368, 26, 16, 4, C.ink) + stroke("M560 425h24M572 413v24M625 425h24", C.white, 5),
    (t) => // garage tools: wrench + screwdriver + spark plug
      circle(400, 300, 200, t.soft) +
      `<g transform="translate(400 300) rotate(-40)">${rect(-14, -150, 28, 300, 12, C.line)}${path("M-44-150a44 44 0 0 1 88 0l-18 0v-34h-52v34Z", C.line)}${path("M-44 150a44 44 0 0 0 88 0l-18 0v34h-52v-34Z", C.line)}</g>` +
      `<g transform="translate(400 300) rotate(40)">${rect(-18, -170, 36, 140, 14, C.clay)}${rect(-6, -30, 12, 150, 4, C.sand)}${path("M-6 120h12l-6 18Z", C.sand)}</g>` +
      `<g transform="translate(600 200) rotate(20)" filter="url(#sh)">${rect(-16, -70, 32, 50, 6, C.white)}${rect(-24, -20, 48, 40, 6, C.ink)}${rect(-8, 20, 16, 40, 3, C.line)}${stroke("M0 60v14h10", C.lime, 4)}</g>` +
      sparkle(220, 160, 16, C.lime) + sparkle(250, 450, 10, t.fg),
  ],
  business: [
    (t) => // growth chart
      panel(150, 120, 500, 340, 20, t.panel) + bars(184, 152, [140, 90], 12, 10, C.muted) +
      [90, 130, 120, 180, 230].map((h, i) => rect(200 + i * 82, 420 - h, 52, h, 8, i === 4 ? C.lime : C.sea)).join("") +
      stroke("M226 300L308 250L390 270L472 200L560 140", C.clay, 6) + path("M560 140l-34 2 22 26Z", C.clay) +
      [[226, 300], [308, 250], [390, 270], [472, 200]].map(([x, y]) => circle(x, y, 8, C.white, `stroke="${C.clay}" stroke-width="5"`)).join("") +
      panel(560, 360, 140, 110, 16, C.ink) + bars(580, 384, [60], 10, 0, "#3b5878") + rect(580, 410, 90, 30, 6, C.lime),
    (t) => // social media posts
      panel(300, 90, 220, 420, 30, C.ink) + rect(312, 102, 196, 396, 22, C.white) + circle(338, 132, 12, C.clay) + bars(358, 126, [70], 10, 0, C.ink) +
      rect(324, 156, 172, 150, 10, C.sea) + circle(450, 196, 18, C.lime) + path("M324 306l60-60 40 36 30-24 42 48Z", C.seaDeep) +
      path("M340 336c-6-6-12-10-12-16a7 7 0 0 1 12-4 7 7 0 0 1 12 4c0 6-6 10-12 16Z", C.clay) + rect(364, 324, 16, 14, 4, C.muted) + bars(324, 352, [150, 110], 8, 8, C.muted) +
      [0, 1, 2].map((i) => rect(324 + i * 60, 392, 52, 52, 8, [C.clay, C.lime, C.ink][i])).join("") +
      panel(140, 170, 150, 110, 16, t.panel) + path("M215 250c-22-18-34-28-34-44a17 17 0 0 1 34-6 17 17 0 0 1 34 6c0 16-12 26-34 44Z", C.clay) +
      panel(540, 140, 140, 70, 16, C.lime) + circle(574, 175, 14, C.ink) + bars(598, 166, [60, 40], 7, 6, C.ink) +
      panel(540, 330, 150, 130, 16, t.panel) + [40, 70, 55, 90].map((h, i) => rect(562 + i * 30, 430 - h, 18, h, 4, i === 3 ? C.lime : C.sea)).join(""),
    (t) => // briefcase + pie + document
      panel(150, 140, 260, 320, 18, t.panel) + bars(180, 176, [160, 120], 12, 10, C.ink) + bars(180, 230, [200, 170, 190, 140, 180], 7, 11, C.muted) +
      rect(180, 360, 90, 60, 8, "#f4f0e8") + stroke("M300 405c20-30 40 10 70-20", C.clay, 4) +
      circle(560, 210, 90, C.sea, `filter="url(#sh)"`) + path("M560 210V120a90 90 0 0 1 86 116Z", C.lime) + path("M560 210l86 26a90 90 0 0 1-56 60Z", C.clay) +
      panel(430, 330, 240, 150, 18, C.ink) + rect(510, 306, 80, 34, 10, "none", `stroke="${C.ink}" stroke-width="12"`) + rect(430, 390, 240, 10, 0, C.ink2) + rect(536, 380, 28, 30, 6, C.lime),
  ],
  events: [
    (t) => // camera + photo frames
      `<g transform="rotate(-8 280 250)">${panel(160, 150, 220, 200, 8, C.white)}${rect(176, 166, 188, 140, 4, C.seaL)}${circle(320, 200, 16, C.lime)}${path("M176 306l70-70 50 46 30-24 38 48Z", C.sea)}</g>` +
      `<g transform="rotate(10 560 230)">${panel(470, 140, 200, 180, 8, C.white)}${rect(484, 154, 172, 124, 4, C.clayL)}${path("M484 278l50-50 40 34 40-50 42 66Z", C.clay)}</g>` +
      panel(270, 300, 260, 170, 22, C.ink) + rect(310, 280, 70, 30, 8, C.ink) + circle(400, 385, 60, "#2c4561") + circle(400, 385, 42, C.sea) + circle(386, 372, 12, C.seaL) +
      rect(480, 320, 30, 16, 5, C.lime) + circle(300, 330, 7, C.clay),
    (t) => // party: balloons + confetti
      [[310, 220, C.clay], [400, 180, C.lime], [490, 230, C.sea]].map(([x, y, c]) =>
        stroke(`M${x} ${y + 85}C${x - 20} ${y + 160} ${x + 30} ${y + 200} ${400} ${470}`, t.fg, 2.5, `stroke-opacity=".6"`) +
        path(`M${x} ${y - 80}c46 0 72 38 72 76 0 46-40 84-72 84s-72-38-72-84c0-38 26-76 72-76Z`, c, `filter="url(#sh)"`) + path(`M${x - 8} ${y + 82}h16l-8 10Z`, c) +
        path(`M${x - 40} ${y - 30}a40 40 0 0 1 24-30`, "none", `stroke="${C.white}" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"`)).join("") +
      [[180, 150, C.lime, 20], [620, 160, C.clay, -30], [200, 400, C.sea, 40], [610, 400, C.lime, 10], [150, 280, C.clay, 60], [660, 290, C.sea, -10]]
        .map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="22" height="10" rx="3" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join("") +
      sparkle(250, 470, 12, t.fg) + sparkle(560, 470, 14, C.lime),
    (t) => // music: mic + notes + string lights
      stroke("M120 130Q400 230 680 130", t.fg, 2.5, `stroke-opacity=".5"`) +
      [160, 230, 300, 370, 440, 510, 580, 640].map((x, i) => { const y = 130 + Math.sin((x - 120) / 560 * Math.PI) * 50; return circle(x, y + 16, 11, [C.lime, C.clay, C.gold, C.seaL][i % 4]); }).join("") +
      panel(320, 230, 120, 170, 60, C.ink) + rect(332, 242, 96, 120, 48, "#3b5878") + [...Array(5)].map((_, i) => rect(340, 262 + i * 18, 80, 5, 2.5, C.line)).join("") +
      rect(366, 390, 28, 80, 8, C.ink) + rect(330, 466, 100, 14, 7, C.ink2) +
      path("M530 360a26 20 0 1 0 26 20V250l70-20v110a26 20 0 1 0 26 20V200l-122 34Z", C.lime, `filter="url(#sh)"`) +
      path("M230 380a20 16 0 1 0 20 16v-90l40 16v-20l-60-22Z", C.clay),
  ],
  personal: [
    (t) => // beauty: mirror + scissors + comb
      panel(170, 110, 230, 300, 115, C.gold) + rect(186, 126, 198, 268, 99, C.seaL) + path("M220 200a70 90 0 0 1 60-50", "none", `stroke="${C.white}" stroke-opacity=".6" stroke-width="14" stroke-linecap="round"`) +
      rect(265, 410, 40, 60, 10, C.gold) + rect(220, 466, 130, 16, 8, C.ink2) +
      `<g transform="translate(560 220) rotate(-30)">${stroke("M0 0L-30 150M0 0L30 150", C.line, 12)}${circle(-38, 176, 26, "none", `stroke="${C.clay}" stroke-width="12"`)}${circle(38, 176, 26, "none", `stroke="${C.clay}" stroke-width="12"`)}${circle(0, 90, 6, C.ink)}</g>` +
      `<g transform="translate(470 390) rotate(15)" filter="url(#sh)">${rect(0, 0, 200, 34, 8, C.ink)}${[...Array(14)].map((_, i) => rect(10 + i * 13, 34, 6, 36, 3, C.ink)).join("")}</g>` + sparkle(470, 130, 14, C.lime),
    (t) => // coaching: dumbbell + stopwatch
      `<g transform="rotate(-18 330 300)" filter="url(#sh)">${rect(200, 285, 260, 30, 10, C.line)}${rect(160, 225, 50, 150, 14, C.ink)}${rect(450, 225, 50, 150, 14, C.ink)}${rect(130, 250, 34, 100, 10, C.sea)}${rect(496, 250, 34, 100, 10, C.sea)}</g>` +
      circle(560, 210, 90, t.panel, `filter="url(#sh)"`) + rect(540, 100, 40, 24, 6, C.ink) + rect(620, 128, 20, 30, 6, C.ink, `transform="rotate(45 630 143)"`) +
      circle(560, 210, 70, "none", `stroke="${C.muted}" stroke-width="12"`) + path("M560 140a70 70 0 0 1 66 92", "none", `stroke="${C.lime}" stroke-width="12" stroke-linecap="round"`) +
      stroke("M560 210V160", C.ink, 7) + circle(560, 210, 9, C.clay) +
      [[220, 140], [640, 430], [190, 440]].map(([x, y], i) => sparkle(x, y, 14 - i * 2, i ? t.fg : C.lime)).join(""),
    (t) => // wellness: leaves + candle + stones
      circle(400, 280, 190, t.soft) +
      path("M300 420C220 340 230 220 330 170c40 90 30 180-30 250Z", C.limeD) + stroke("M300 420C300 330 315 250 330 170", C.ink, 3, `stroke-opacity=".35"`) +
      path("M320 420C320 320 400 260 480 260c-10 90-70 150-160 160Z", C.lime) +
      panel(470, 300, 80, 140, 12, C.sand) + rect(507, 280, 6, 22, 3, C.ink) + path("M510 246c14 16 14 30 0 36-14-6-14-20 0-36Z", C.gold) +
      path("M200 470c0-24 40-34 90-34s100 10 100 34Z", "#8a96a3") + path("M410 470c0-20 34-28 70-28s80 8 80 28Z", C.ink2) + path("M560 470c0-14 22-20 50-20s50 6 50 20Z", C.clay) +
      sparkle(600, 170, 14, C.lime),
  ],
  student: [
    (t) => // graduation cap + diploma
      path("M400 150L640 240L400 330L160 240Z", C.ink, `filter="url(#sh)"`) + path("M260 280v90c40 40 240 40 280 0v-90L400 332Z", C.ink2) +
      stroke("M600 255v110", C.lime, 5) + circle(600, 372, 12, C.lime) + path("M400 150L640 240L400 330L160 240Z", "none", `stroke="${C.white}" stroke-opacity=".12" stroke-width="2"`) +
      `<g transform="rotate(-12 300 440)" filter="url(#sh)">${rect(180, 410, 260, 60, 30, C.sand)}${circle(210, 440, 30, "#ece3d0")}${rect(300, 405, 26, 70, 4, C.clay)}</g>` +
      sparkle(200, 150, 16, C.lime) + sparkle(640, 140, 10, t.fg),
    (t) => // backpack + laptop + notebook
      panel(170, 150, 200, 300, 60, C.sea) + rect(200, 120, 140, 70, 34, "none", `stroke="${C.ink}" stroke-width="14"`) +
      rect(200, 260, 140, 120, 22, C.seaDeep) + rect(250, 290, 40, 10, 5, C.lime) + rect(170, 230, 200, 14, 7, "#2a73ad") +
      panel(400, 200, 240, 160, 12, C.ink) + rect(412, 212, 216, 136, 6, C.white) + bars(428, 230, [120, 80], 10, 8, C.ink) + bars(428, 272, [180, 150, 160], 6, 8, C.muted) +
      path("M380 360h280l-22 26H402Z", "#cfd6de") +
      `<g transform="rotate(8 520 450)" filter="url(#sh)">${rect(420, 410, 200, 70, 8, C.clay)}${rect(432, 410, 10, 70, 0, "#c96535")}${bars(460, 430, [120, 90], 7, 8, C.sand)}</g>`,
    (t) => // books + lamp
      `<g filter="url(#sh)">${rect(200, 420, 300, 50, 6, C.sea)}${rect(220, 370, 260, 50, 6, C.clay)}${rect(190, 320, 290, 50, 6, C.lime)}${rect(230, 280, 220, 40, 6, C.ink2)}</g>` +
      bars(230, 438, [120], 8, 0, C.white) + bars(250, 388, [80], 8, 0, C.white) + bars(220, 338, [140], 8, 0, C.ink) + bars(260, 294, [60], 8, 0, C.sand) +
      stroke("M560 470V300l60-90", t.fg, 10) + rect(520, 460, 90, 16, 8, t.fg) +
      path("M580 190l90-40 30 70-90 40Z", C.gold, `filter="url(#sh)"`) + path("M610 260l90-40 30 60c-60 40-110 40-130 0Z", C.gold, `fill-opacity=".25"`) +
      sparkle(200, 170, 14, C.lime),
  ],
  other: [
    (t) => // puzzle pieces
      [[250, 200, C.sea, 0], [400, 200, C.lime, 1], [250, 350, C.clay, 1], [400, 350, C.ink2, 0]].map(([x, y, c, f]) => {
        const s = 140;
        const d = `M${x} ${y}h${s / 2 - 20}a20 20 0 0 ${f ? 0 : 1} 40 0h${s / 2 - 20}v${s / 2 - 20}a20 20 0 0 ${f ? 1 : 0} 0 40v${s / 2 - 20}h-${s}Z`;
        return path(d, c, `filter="url(#sh)"`);
      }).join("") +
      `<g transform="translate(560 160) rotate(14)" filter="url(#sh)">${path("M0 0h50a20 20 0 0 1 40 0h50v140H0Z", t.panel)}</g>` + sparkle(620, 420, 16, C.lime),
    (t) => // checklist + star
      panel(220, 100, 300, 400, 20, t.panel) + rect(300, 84, 140, 40, 12, C.ink) +
      [0, 1, 2, 3, 4].map((i) => rect(254, 160 + i * 62, 32, 32, 8, i < 3 ? C.lime : "#f4f0e8") + (i < 3 ? stroke(`M261 ${176 + i * 62}l7 7 12-13`, C.ink, 4) : "") + bars(302, 166 + i * 62, [180, 120], 8, 8, C.muted)).join("") +
      path("M590 180l22 46 50 6-36 34 10 50-46-24-46 24 10-50-36-34 50-6Z", C.gold, `filter="url(#sh)"`) + sparkle(170, 200, 14, C.lime),
    (t) => // network on map
      dots(160, 130, 16, 11, 32, t.fg, 0.18) +
      [[230, 200], [400, 160], [560, 230], [320, 360], [500, 400], [640, 380]].map(([x, y], i, a) => (i ? stroke(`M${a[i - 1][0]} ${a[i - 1][1]}L${x} ${y}`, t.fg, 3, `stroke-opacity=".4"`) : "")).join("") +
      stroke("M230 200L320 360M560 230L500 400", t.fg, 3, `stroke-opacity=".4"`) +
      [[230, 200, C.clay], [400, 160, C.lime], [560, 230, C.sea], [320, 360, C.lime], [500, 400, C.clay], [640, 380, C.sea]].map(([x, y, c]) =>
        path(`M${x} ${y + 10}c-18-22-30-36-30-52a30 30 0 0 1 60 0c0 16-12 30-30 52Z`, c, `filter="url(#sh)"`) + circle(x, y - 42, 10, C.white)).join("") +
      loopMark(400, 280, 90, C.lime, 6),
  ],
};
const THEME_ORDER = ["ink", "sand", "sea"];

/* ---------- avatars (1:1) ---------- */
const SKIN = ["#f3d2b5", "#e0ac84", "#c98d63", "#9c6640", "#6e4529", "#fbe1cc"];
const BG = [C.lime, C.seaL, C.clayL, "#d9d3c5", C.sea, "#cfe7a9", "#f2c14e", "#b9c7f0"];
const SHIRT = [C.ink, C.sea, C.clay, C.limeD, "#3b5878", C.gold, "#6c5b7b", "#f4f0e8"];
const HAIR = ["#1c1410", "#3b2416", "#6b4a2b", "#a3683a", "#2b2b2b", "#9b9692", "#d8d2c8", "#7a2e1c"];
const SCARF = [C.sea, C.clay, "#6c5b7b", C.ink2, C.limeD, "#c94f6d", C.gold, "#2a73ad"];
function avatar({ skin, bg, shirt, hair, style, glasses = false, beard = false, earrings = false, mustache = false, hat = "", collar = "" }) {
  const s = SKIN[skin], h = HAIR[hair], scarf = SCARF[hair % SCARF.length];
  let back = "", front = "";
  if (style === "long") back = path("M156 220c0-80 44-130 100-130s100 50 100 130v140H156Z", h);
  if (style === "bun") back = circle(256, 96, 36, h);
  if (style === "ponytail") back = path("M330 150c50 10 70 70 50 150-6 24-26 30-34 10 14-50 6-100-26-130Z", h);
  if (style === "afro") back = circle(256, 180, 120, h);
  if (style === "hijab") back = path("M140 250c0-100 50-160 116-160s116 60 116 160c0 40-10 80-30 110H170c-20-30-30-70-30-110Z", scarf);
  if (style === "short") front = path("M176 196c0-56 36-92 80-92s80 36 80 92c-18-26-50-40-80-40s-62 14-80 40Z", h);
  if (style === "curly") front = [...Array(9)].map((_, i) => { const a = Math.PI + (i * Math.PI) / 8; return circle(n(256 + 84 * Math.cos(a)), n(196 + 74 * Math.sin(a)), 30, h); }).join("") + circle(256, 130, 46, h);
  if (style === "long" || style === "bun" || style === "ponytail") front = path("M172 206c0-64 38-104 84-104s84 40 84 104c-10-40-50-60-84-50-30-6-70 10-84 50Z", h);
  if (style === "fade") front = path("M180 186c4-46 36-74 76-74s72 28 76 74c-20-16-46-24-76-24s-56 8-76 24Z", h);
  if (style === "sidepart") front = path("M174 210c-6-66 36-106 86-106 46 0 84 36 80 100-16-34-44-52-92-50-10 18-40 34-74 56Z", h);
  if (style === "afro") front = path("M176 200c0-60 36-90 80-90s80 30 80 90c-20-30-50-44-80-44s-60 14-80 44Z", h);
  if (style === "bald") front = path("M196 140c20-20 44-28 60-28s40 8 60 28c-20-8-40-10-60-10s-40 2-60 10Z", "#ffffff", `fill-opacity=".25"`);
  if (style === "hijab") front = path("M168 230c0-76 40-122 88-122s88 46 88 122c-6-50-40-84-88-84s-82 34-88 84Z", scarf) +
    path("M164 300c16 44 50 66 92 66s76-22 92-66c-4 34-40 80-92 80s-88-46-92-80Z", scarf);
  const ears = style === "hijab" ? "" : circle(170, 226, 16, s) + circle(342, 226, 16, s);
  const head = ears + path("M172 210c0-60 38-98 84-98s84 38 84 98c0 62-38 102-84 102s-84-40-84-102Z", s);
  const brow = style === "hijab" || style === "bald" ? C.ink : h;
  const face = circle(222, 222, 8, C.ink) + circle(290, 222, 8, C.ink) +
    stroke("M210 196q12-8 24 0M278 196q12-8 24 0", brow, 6) +
    stroke("M226 266q30 24 60 0", C.ink, 6) + circle(206, 252, 12, "#e97c48", `fill-opacity=".18"`) + circle(306, 252, 12, "#e97c48", `fill-opacity=".18"`);
  const hats = {
    chechia: path("M190 150c0-40 30-56 66-56s66 16 66 56c-40-10-92-10-132 0Z", "#b8322a") + rect(188, 140, 136, 18, 9, "#9a2620") + stroke("M256 94c10-10 30-6 34 10", "#1c1410", 4),
    cap: path("M174 176c0-50 36-80 82-80s82 30 82 80Z", SHIRT[(shirt + 1) % SHIRT.length]) + path("M300 172c40 0 70 6 84 18-30 4-60 4-90 0Z", SHIRT[(shirt + 1) % SHIRT.length]) + circle(256, 98, 7, C.white, `fill-opacity=".6"`),
    beanie: path("M170 186c0-60 38-96 86-96s86 36 86 96Z", C.clay) + rect(166, 170, 180, 30, 14, "#c96535") + circle(256, 86, 16, C.clayL),
    headphones: stroke("M164 230c-6-90 40-140 92-140s98 50 92 140", C.ink, 14) + rect(146, 214, 34, 64, 14, C.lime) + rect(332, 214, 34, 64, 14, C.lime),
  };
  const extras = (glasses ? circle(222, 222, 26, "none", `stroke="${C.ink}" stroke-width="6"`) + circle(290, 222, 26, "none", `stroke="${C.ink}" stroke-width="6"`) + stroke("M248 220h16", C.ink, 6) : "") +
    (beard ? path("M174 240c6 50 40 76 82 76s76-26 82-76c-14 22-30 30-44 30-10-14-22-14-38-14s-28 0-38 14c-14 0-30-8-44-30Z", h) + stroke("M226 270q30 18 60 0", C.ink, 6) : "") +
    (mustache && !beard ? path("M222 258c14-12 26-10 34-2 8-8 20-10 34 2-14 4-24 6-34 0-10 6-20 4-34 0Z", h) : "") +
    (earrings ? circle(170, 252, 7, C.gold) + circle(342, 252, 7, C.gold) : "") + (hat ? hats[hat] : "");
  const shirtC = SHIRT[shirt];
  const collars = {
    vneck: path("M226 342l30 40 30-40Z", s),
    shirt: path("M226 342l30 40 30-40Z", s) + path("M214 346l42 36-20 24-34-50Z", C.white) + path("M298 346l-42 36 20 24 34-50Z", C.white),
    tie: path("M226 342l30 40 30-40Z", C.white) + path("M250 352h12l6 70-12 16-12-16Z", C.clay),
    hoodie: path("M190 352c20 30 112 30 132 0l10 20c-30 40-122 40-152 0Z", "#ffffff", `fill-opacity=".25"`) + stroke("M236 384v40M276 384v40", C.white, 4),
    turtle: rect(222, 318, 68, 40, 18, shirtC) + rect(222, 318, 68, 40, 18, "#000000", `fill-opacity=".12"`),
  };
  const body = rect(226, 290, 60, 50, 20, s) + path("M96 512c0-96 70-170 160-170s160 74 160 170Z", shirtC) + collars[collar || (style === "hijab" ? "turtle" : "vneck")];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="${BG[bg]}"/>` +
    `<circle cx="256" cy="256" r="236" fill="#ffffff" fill-opacity=".18"/>${back}${body}${head}${front}${face}${extras}</svg>`;
}
/** Not a person: for those who prefer a symbol. */
function symbolAvatar(bg, fg, kind) {
  const shapes = {
    loop: loopMark(256, 256, 150, fg, 22),
    star: path("M256 120l36 76 84 10-62 58 16 82-74-40-74 40 16-82-62-58 84-10Z", fg),
    bulb: circle(256, 220, 96, fg) + rect(216, 300, 80, 60, 12, fg) + bars(222, 372, [68, 68], 14, 8, C.ink) + path("M256 170l-24 54h28l-18 50 46-66h-28l18-38Z", C.ink),
    leaf: path("M150 380C130 220 240 130 390 130c10 150-80 260-240 250Z", fg) + stroke("M150 380C220 300 290 230 360 170", C.ink, 10, `stroke-opacity=".35"`),
    bolt: path("M290 90L170 290h80l-30 140 130-210h-84Z", fg),
    heart: path("M256 400C150 320 110 270 110 210a74 74 0 0 1 146-20 74 74 0 0 1 146 20c0 60-40 110-146 190Z", fg),
    code: stroke("M190 170l-80 86 80 86M322 170l80 86-80 86M282 140l-52 232", fg, 26),
    compass: circle(256, 256, 130, "none", `stroke="${fg}" stroke-width="22"`) + path("M256 150l36 106-36 106-36-106Z", fg) + circle(256, 256, 16, C.ink),
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="${bg}"/>` +
    `<circle cx="256" cy="256" r="236" fill="#ffffff" fill-opacity=".08"/>${shapes[kind]}</svg>`;
}
const AVATARS = [
  { skin: 1, bg: 0, shirt: 0, hair: 0, style: "short", beard: true },
  { skin: 2, bg: 1, shirt: 2, hair: 1, style: "long", earrings: true },
  { skin: 0, bg: 2, shirt: 1, hair: 3, style: "hijab" },
  { skin: 3, bg: 3, shirt: 3, hair: 0, style: "curly", glasses: true },
  { skin: 2, bg: 4, shirt: 5, hair: 1, style: "fade" },
  { skin: 1, bg: 5, shirt: 4, hair: 2, style: "bun", glasses: true },
  { skin: 4, bg: 2, shirt: 0, hair: 0, style: "curly" },
  { skin: 0, bg: 0, shirt: 2, hair: 4, style: "short", glasses: true },
  { skin: 2, bg: 3, shirt: 1, hair: 2, style: "hijab", earrings: false },
  { skin: 1, bg: 1, shirt: 3, hair: 3, style: "long" },
  { skin: 3, bg: 5, shirt: 2, hair: 4, style: "fade", beard: true },
  { skin: 0, bg: 4, shirt: 0, hair: 1, style: "bun", earrings: true },
  { skin: 2, bg: 0, shirt: 4, hair: 0, style: "short" },
  { skin: 1, bg: 2, shirt: 5, hair: 0, style: "hijab", glasses: true },
  { skin: 3, bg: 1, shirt: 1, hair: 1, style: "long", earrings: true },
  { skin: 4, bg: 3, shirt: 3, hair: 4, style: "short", beard: true, glasses: true },
  // second set: more hair, ages, hats, collars
  { skin: 1, bg: 6, shirt: 0, hair: 5, style: "sidepart", mustache: true, collar: "shirt" },
  { skin: 2, bg: 7, shirt: 1, hair: 0, style: "short", hat: "chechia", mustache: true },
  { skin: 0, bg: 5, shirt: 6, hair: 7, style: "ponytail", earrings: true },
  { skin: 4, bg: 6, shirt: 3, hair: 0, style: "afro" },
  { skin: 1, bg: 4, shirt: 7, hair: 3, style: "sidepart", glasses: true, collar: "tie" },
  { skin: 2, bg: 2, shirt: 4, hair: 4, style: "hijab", collar: "turtle" },
  { skin: 3, bg: 0, shirt: 2, hair: 0, style: "bald", beard: true },
  { skin: 5, bg: 1, shirt: 0, hair: 6, style: "bun", glasses: true, collar: "turtle" },
  { skin: 2, bg: 3, shirt: 5, hair: 1, style: "short", hat: "cap" },
  { skin: 1, bg: 7, shirt: 2, hair: 5, style: "hijab", glasses: true },
  { skin: 3, bg: 6, shirt: 1, hair: 1, style: "ponytail", collar: "hoodie" },
  { skin: 0, bg: 3, shirt: 3, hair: 6, style: "bald", glasses: true, mustache: true, collar: "shirt" },
  { skin: 4, bg: 4, shirt: 5, hair: 0, style: "fade", hat: "headphones", collar: "hoodie" },
  { skin: 2, bg: 5, shirt: 6, hair: 2, style: "long", glasses: true },
  { skin: 1, bg: 0, shirt: 4, hair: 7, style: "curly", earrings: true },
  { skin: 0, bg: 1, shirt: 0, hair: 3, style: "short", hat: "beanie" },
  { skin: 3, bg: 2, shirt: 7, hair: 6, style: "hijab", collar: "turtle" },
  { skin: 5, bg: 6, shirt: 1, hair: 2, style: "sidepart", beard: true, collar: "shirt" },
  { skin: 2, bg: 7, shirt: 3, hair: 0, style: "afro", glasses: true },
  { skin: 1, bg: 3, shirt: 6, hair: 5, style: "bun", earrings: true },
  { skin: 4, bg: 5, shirt: 2, hair: 4, style: "short", mustache: true, collar: "tie" },
  { skin: 0, bg: 6, shirt: 5, hair: 1, style: "ponytail", glasses: true },
  { skin: 3, bg: 4, shirt: 0, hair: 0, style: "sidepart", collar: "hoodie" },
  { skin: 2, bg: 1, shirt: 7, hair: 6, style: "short", hat: "chechia", beard: true },
];
const SYMBOLS = [
  [C.ink, C.lime, "loop"], [C.sea, C.sand, "star"], [C.lime, C.ink, "bulb"], ["#1d4a3b", C.lime, "leaf"],
  [C.clay, C.sand, "bolt"], [C.clayL, C.clay, "heart"], [C.ink2, C.seaL, "code"], [C.gold, C.ink, "compass"],
];

/* ---------- profile banners (wide, behind the public profile header; no text) ---------- */
const BW = 1600, BH = 480;
function wobble(cx, cy, r, k, sx = 1.25, sy = 1) {
  const pts = [];
  for (let i = 0; i <= 360; i += 5) {
    const a = (i * Math.PI) / 180, w = 1 + 0.09 * Math.sin(3 * a + k * 0.7) + 0.05 * Math.sin(5 * a - k);
    pts.push(`${n(cx + r * w * Math.cos(a) * sx)},${n(cy + r * w * Math.sin(a) * sy)}`);
  }
  return `<polyline points="${pts.join(" ")}"/>`;
}
const glow = (id, color) => `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
function star8(cx, cy, r, fill, extra = "") {
  const pts = [];
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.72 : r; pts.push(`${n(cx + rr * Math.cos(a))},${n(cy + rr * Math.sin(a))}`); }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" ${extra}/>`;
}
const BANNERS = {
  "topo-ink": () => `<rect width="${BW}" height="${BH}" fill="${C.ink}"/><defs>${glow("g1", C.sea)}${glow("g2", C.lime)}</defs>` +
    `<ellipse cx="1250" cy="120" rx="520" ry="320" fill="url(#g1)"/><ellipse cx="300" cy="460" rx="420" ry="220" fill="url(#g2)" opacity=".5"/>` +
    `<g fill="none" stroke="${C.lime}" stroke-opacity=".22" stroke-width="1.6">${[...Array(18)].map((_, k) => wobble(1200, 180, 30 + k * 36, k)).join("")}</g>` +
    `<g fill="none" stroke="${C.seaL}" stroke-opacity=".14" stroke-width="1.4">${[...Array(10)].map((_, k) => wobble(260, 420, 30 + k * 34, k + 3)).join("")}</g>`,
  "topo-sea": () => `<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f4573"/><stop offset="1" stop-color="#04223f"/></linearGradient><rect width="${BW}" height="${BH}" fill="url(#b)"/>` +
    `<g fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1.5">${[...Array(22)].map((_, k) => wobble(800, 260, 20 + k * 40, k, 1.6, 0.8)).join("")}</g>` +
    circle(800, 260, 7, C.lime) + circle(800, 260, 22, "none", `stroke="${C.lime}" stroke-opacity=".5" stroke-width="2"`),
  "aurora": () => `<rect width="${BW}" height="${BH}" fill="${C.inkDeep}"/><defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter></defs>` +
    `<g filter="url(#bl)" opacity=".85">${circle(380, 160, 210, C.sea)}${circle(820, 330, 190, C.limeD)}${circle(1240, 140, 230, "#6c5b7b")}${circle(1450, 400, 160, C.clay)}</g>` +
    dots(40, 40, 50, 13, 32, "#ffffff", 0.08),
  "zellige": () => {
    let tiles = "";
    for (let y = -40; y < BH + 80; y += 120) for (let x = -40; x < BW + 80; x += 120) {
      const o = (Math.floor(y / 120) % 2) * 60;
      tiles += star8(x + o, y, 44, "none", `stroke="${C.seaL}" stroke-opacity=".45" stroke-width="2.5"`) + star8(x + o, y, 14, C.lime, `fill-opacity="${((x + y) / 120) % 3 === 0 ? 0.7 : 0.15}"`);
    }
    return `<rect width="${BW}" height="${BH}" fill="#0b2f52"/>${tiles}<rect width="${BW}" height="${BH}" fill="url(#zf)"/><linearGradient id="zf" x1="0" x2="1"><stop offset="0" stop-color="#0b2f52" stop-opacity=".9"/><stop offset=".55" stop-color="#0b2f52" stop-opacity="0"/></linearGradient>`;
  },
  "medina": () => {
    const sky = `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a73ad"/><stop offset="1" stop-color="#85c7f1"/></linearGradient><rect width="${BW}" height="${BH}" fill="url(#s)"/>`;
    let city = "";
    const blocks = [[0, 300, 180], [170, 260, 160], [320, 320, 200], [510, 230, 150], [650, 290, 220], [860, 250, 140], [990, 310, 210], [1190, 240, 170], [1350, 290, 260]];
    blocks.forEach(([x, y, w], i) => {
      city += rect(x, y, w, BH - y, 0, i % 3 === 1 ? "#f4f0e8" : C.white);
      city += path(`M${x + w / 2 - 22} ${BH}v-60a22 22 0 0 1 44 0v60Z`, i % 2 ? "#1f5fa0" : C.sea);
      if (i % 3 === 0) city += path(`M${x + w / 2 - 40} ${y}a40 40 0 0 1 80 0Z`, C.white) + circle(x + w / 2, y - 44, 5, C.gold);
      if (i % 2 === 0) city += rect(x + 24, y + 30, 26, 36, 13, "#1f5fa0");
    });
    return sky + circle(1300, 110, 60, C.gold, `fill-opacity=".9"`) + city + rect(0, BH - 30, BW, 30, 0, "#e6dfd2");
  },
  "waves": () => `<rect width="${BW}" height="${BH}" fill="${C.seaDeep}"/>` +
    [[C.sea, 160, 0.9], ["#2a73ad", 230, 0.95], [C.seaL, 300, 0.6], ["#0f4573", 360, 1], [C.ink, 420, 1]].map(([c, y, op], i) => {
      let d = `M0 ${y}`;
      for (let x = 0; x <= BW; x += 200) d += ` Q${x + 100} ${y + (i % 2 ? 40 : -40)} ${x + 200} ${y}`;
      return path(`${d} V${BH} H0Z`, c, `fill-opacity="${op}"`);
    }).join("") + circle(1260, 120, 54, C.gold) + circle(1260, 120, 90, C.gold, `fill-opacity=".15"`),
  "sunset": () => `<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1d3a"/><stop offset=".6" stop-color="${C.clay}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient><rect width="${BW}" height="${BH}" fill="url(#sk)"/>` +
    circle(1000, 330, 120, "#fde3a7", `fill-opacity=".9"`) +
    path("M0 330L200 240L380 320L560 210L760 330L940 260L1140 340L1360 230L1600 320V480H0Z", "#5b2e3f") +
    path("M0 390L240 320L460 390L700 300L920 400L1180 320L1400 400L1600 350V480H0Z", "#3a1e2c") +
    path("M0 440L300 400L620 450L900 410L1240 450L1600 420V480H0Z", C.ink),
  "constellation": () => {
    const pts = [[120, 120], [300, 80], [420, 200], [600, 140], [760, 260], [900, 120], [1080, 200], [1220, 90], [1380, 220], [1520, 130], [260, 300], [520, 340], [980, 330], [1300, 360]];
    const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [2, 10], [10, 11], [11, 4], [4, 12], [12, 6], [8, 13], [12, 13]];
    return `<rect width="${BW}" height="${BH}" fill="${C.ink}"/>` + dots(20, 20, 54, 16, 30, "#ffffff", 0.06) +
      links.map(([a, b]) => stroke(`M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`, C.seaL, 1.6, `stroke-opacity=".35"`)).join("") +
      pts.map(([x, y], i) => circle(x, y, i % 4 === 0 ? 9 : 5, i % 4 === 0 ? C.lime : C.sand) + (i % 4 === 0 ? circle(x, y, 22, C.lime, `fill-opacity=".15"`) : "")).join("");
  },
  "tiles": () => {
    const cols = [C.ink2, C.sea, C.lime, C.clay, "#0f4573", C.gold, C.seaL];
    let t = ""; let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let y = 0; y < BH; y += 80) for (let x = 0; x < BW; x += 80) {
      const c = cols[Math.floor(rnd() * cols.length)], k = rnd();
      t += k < 0.3 ? path(`M${x} ${y + 80}A80 80 0 0 1 ${x + 80} ${y}V${y + 80}Z`, c) : k < 0.55 ? circle(x + 40, y + 40, 30, c) : k < 0.75 ? path(`M${x} ${y}h80L${x} ${y + 80}Z`, c) : rect(x + 12, y + 12, 56, 56, 12, c, `fill-opacity=".5"`);
    }
    return `<rect width="${BW}" height="${BH}" fill="${C.ink}"/>${t}<linearGradient id="tf" x1="0" x2="1"><stop offset="0" stop-color="${C.ink}" stop-opacity=".95"/><stop offset=".5" stop-color="${C.ink}" stop-opacity=".35"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0"/></linearGradient><rect width="${BW}" height="${BH}" fill="url(#tf)"/>`;
  },
  "stripes": () => `<rect width="${BW}" height="${BH}" fill="${C.ink}"/>` +
    [...Array(14)].map((_, i) => `<rect x="${700 + i * 70}" y="-200" width="34" height="900" fill="${[C.lime, C.sea, C.clay, C.gold][i % 4]}" fill-opacity="${0.15 + (i / 14) * 0.7}" transform="rotate(30 ${700 + i * 70} 240)"/>`).join(""),
  "arcs": () => `<rect width="${BW}" height="${BH}" fill="#13263b"/>` +
    [...Array(9)].map((_, i) => circle(1600, 480, 120 + i * 90, "none", `stroke="${[C.clay, C.gold, C.lime, C.seaL][i % 4]}" stroke-width="${i % 2 ? 26 : 10}" stroke-opacity="${0.9 - i * 0.08}"`)).join("") +
    circle(1600, 480, 90, C.clay),
  "grid": () => `<rect width="${BW}" height="${BH}" fill="${C.ink}"/><defs>${glow("gg", C.lime)}</defs>` +
    [...Array(41)].map((_, i) => stroke(`M${i * 40} 0V${BH}`, "#ffffff", 1, `stroke-opacity=".06"`)).join("") + [...Array(13)].map((_, i) => stroke(`M0 ${i * 40}H${BW}`, "#ffffff", 1, `stroke-opacity=".06"`)).join("") +
    `<ellipse cx="1150" cy="240" rx="380" ry="260" fill="url(#gg)" opacity=".5"/>` +
    [[960, 160, 160, 120, C.sea], [1140, 120, 120, 200, C.lime], [1280, 200, 200, 120, C.clay], [1080, 340, 240, 80, C.seaL]].map(([x, y, w, h, c]) => rect(x, y, w, h, 16, c, `fill-opacity=".9"`)).join("") +
    stroke("M960 160h400", C.lime, 2, `stroke-dasharray="6 8"`),
  "sand-loop": () => `<rect width="${BW}" height="${BH}" fill="#2b2118"/><defs>${glow("sl", C.gold)}</defs><ellipse cx="1100" cy="240" rx="600" ry="300" fill="url(#sl)" opacity=".5"/>` +
    [...Array(6)].map((_, i) => loopMark(1100, 240, 160 + i * 70, C.gold, 2).replace(/<circle[^>]*>/, "")).join("") + loopMark(1100, 240, 120, C.lime, 6),
  "studio": () => `<rect width="${BW}" height="${BH}" fill="${C.clay}"/>` +
    circle(1280, 140, 220, C.gold, `fill-opacity=".85"`) + rect(980, 220, 360, 360, 180, C.ink, `fill-opacity=".9"`) + path("M1400 480L1600 200V480Z", C.clayL) +
    path("M0 480L0 360Q300 300 600 400T1200 380V480Z", "#c96535") + sparkle(820, 120, 26, C.sand) + sparkle(1500, 80, 16, C.ink),
  "garden": () => `<rect width="${BW}" height="${BH}" fill="#1d4a3b"/>` +
    [...Array(18)].map((_, i) => {
      const x = 640 + i * 54, h = 160 + ((i * 53) % 140), c = [C.lime, C.limeD, "#2f6b4f"][i % 3];
      return path(`M${x} ${BH}C${x - 40} ${BH - h * 0.6} ${x - 10} ${BH - h} ${x + 30} ${BH - h}C${x + 40} ${BH - h * 0.5} ${x + 20} ${BH - 40} ${x} ${BH}Z`, c, `fill-opacity=".9"`);
    }).join("") + circle(420, 130, 70, C.gold, `fill-opacity=".8"`),
  "blueprint": () => `<rect width="${BW}" height="${BH}" fill="#0d4f86"/>` +
    [...Array(81)].map((_, i) => stroke(`M${i * 20} 0V${BH}`, "#ffffff", i % 5 ? 0.6 : 1.2, `stroke-opacity="${i % 5 ? 0.06 : 0.12}"`)).join("") +
    [...Array(25)].map((_, i) => stroke(`M0 ${i * 20}H${BW}`, "#ffffff", i % 5 ? 0.6 : 1.2, `stroke-opacity="${i % 5 ? 0.06 : 0.12}"`)).join("") +
    stroke("M900 100h420v280H900ZM900 240h200v140M1100 100v80M1200 240h120", C.white, 4, `stroke-opacity=".8"`) + circle(1460, 180, 70, "none", `stroke="${C.lime}" stroke-width="3"`) +
    stroke("M1390 180h140M1460 110v140", C.lime, 2) + stroke("M900 420h420M900 410v20M1320 410v20", C.lime, 2),
};

/* ---------- write ---------- */
for (const dir of ["covers", "avatars", "banners"]) {
  rmSync(join(ROOT, "src/assets", dir), { recursive: true, force: true });
  mkdirSync(join(ROOT, "src/assets", dir), { recursive: true });
}
let count = 0;
for (const [cat, scenes] of Object.entries(SCENES)) {
  scenes.forEach((scene, i) => {
    writeFileSync(join(ROOT, "src/assets/covers", `${cat}-${i + 1}.svg`), cover(THEME_ORDER[i % 3], scene));
    count++;
  });
}
const pad = (i) => String(i).padStart(2, "0");
AVATARS.forEach((a, i) => writeFileSync(join(ROOT, "src/assets/avatars", `avatar-${pad(i + 1)}.svg`), avatar(a)));
SYMBOLS.forEach(([bg, fg, kind], i) => writeFileSync(join(ROOT, "src/assets/avatars", `symbol-${pad(i + 1)}.svg`), symbolAvatar(bg, fg, kind)));
for (const [id, make] of Object.entries(BANNERS))
  writeFileSync(join(ROOT, "src/assets/banners", `${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}" preserveAspectRatio="xMidYMid slice">${make()}</svg>`);
console.log(`${count} covers, ${AVATARS.length + SYMBOLS.length} avatars, ${Object.keys(BANNERS).length} banners`);
