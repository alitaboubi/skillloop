// The real "Carte & QR" sticker from the app (src/lib/pro-card.ts), for compositing onto the shop window.
import { writeFileSync } from "node:fs";
import { buildCardSvg } from "../../../../src/lib/pro-card";

const svg = buildCardSvg({
  name: "Karim", title: "Plombier", place: "Tunis", url: "https://www.instagram.com/skillloop_tunisia/",
  scanLabel: "Scannez pour voir mon travail", stickerTitle: "Retrouvez-moi sur SkillLoop", rtl: false,
}, "sticker");
writeFileSync(new URL("../public/sticker.svg", import.meta.url), svg);
console.log("sticker.svg", svg.length);
