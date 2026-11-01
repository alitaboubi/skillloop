import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { AR, C, KUFI, LAT } from "./theme";
import { LoopMark, Wordmark } from "./ui";

// Instagram portrait carousel, same story as the reel « غدوة إن شاء الله ». Copy mixes Tunisian Arabic and French.
export const POST = { width: 1080, height: 1350, count: 8 };

const F = {
  outfit: loadOutfit("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily,
  fraunces: loadFraunces("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily,
  nunito: loadNunito("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily,
  grotesk: loadGrotesk("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily,
};

function Frame({ n, children, bg = C.ink }: { n: number; children: ReactNode; bg?: string }) {
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: LAT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(50% 30% at 90% 5%, ${C.lime}22, transparent), radial-gradient(50% 30% at 5% 95%, ${C.clay}22, transparent)` }} />
      {children}
      <div style={{ position: "absolute", top: 44, right: 50, fontWeight: 800, fontSize: 30, color: C.white, background: "rgba(0,0,0,0.35)", padding: "8px 20px", borderRadius: 999 }}>{n}/{POST.count}</div>
      <div style={{ position: "absolute", bottom: 40, left: 50, display: "flex", alignItems: "center", gap: 12 }}>
        <LoopMark size={64} /><span style={{ fontWeight: 800, fontSize: 32, color: C.white }}>Skill<span style={{ color: C.lime }}>Loop</span></span>
      </div>
      {n < POST.count && <div style={{ position: "absolute", bottom: 40, right: 50, fontWeight: 800, fontSize: 30, color: C.ink, background: C.lime, padding: "10px 24px", borderRadius: 999 }}>Glissez →</div>}
    </AbsoluteFill>
  );
}

function Title({ ar, fr, top = 110, size = 74 }: { ar: string; fr: string; top?: number; size?: number }) {
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center" }}>
      <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: size, color: C.white, lineHeight: 1.3 }}>{ar}</div>
      <div style={{ fontWeight: 700, fontSize: 38, color: C.lime, marginTop: 10, lineHeight: 1.3 }}>{fr}</div>
    </div>
  );
}

const photo = (file: string, style: CSSProperties) => <Img src={staticFile(`post/${file}.jpg`)} style={{ objectFit: "cover", ...style }} />;
const chip = (bg: string, fg: string, size = 30): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 24px", borderRadius: 999, background: bg, color: fg, fontWeight: 800, fontSize: size });

function MiniPhone({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 560, height: 900, borderRadius: 74, background: "#0b0f1a", padding: 16, boxShadow: `0 50px 110px rgba(0,0,0,0.6), 0 0 0 3px #2a3555, 0 0 90px ${C.lime}2a`, ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 60, overflow: "hidden", background: C.paper, color: C.ink }}>
        <div style={{ position: "absolute", top: 14, left: "50%", width: 150, height: 40, marginLeft: -75, borderRadius: 24, background: "#0b0f1a", zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}

// 1 — Hook
function S1() {
  return (
    <Frame n={1}>
      {photo("winter", { position: "absolute", inset: 0, width: "100%", height: "100%", objectPosition: "50% 30%" })}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(17,27,49,0.1) 25%, ${C.ink}f0 72%)` }} />
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 170, textAlign: "center" }}>
        <div dir="rtl" style={{ display: "inline-block", fontFamily: KUFI, fontWeight: 700, fontSize: 112, color: C.ink, background: C.lime, padding: "4px 44px 20px", borderRadius: 28, transform: "rotate(-2deg)" }}>غدوة إن شاء الله 😩</div>
        <div style={{ fontWeight: 800, fontSize: 52, color: C.white, marginTop: 34, lineHeight: 1.25 }}>Vous aussi, on vous a dit<br />« demain »… il y a un an ?</div>
        <div dir="rtl" style={{ fontFamily: AR, fontWeight: 600, fontSize: 40, color: C.muted, marginTop: 14 }}>إنت زادة قالولك «غدوة»… وما جاش حد؟</div>
      </div>
    </Frame>
  );
}

// 2 — The wait
function S2() {
  const tiles: [string, string, string][] = [["day3", "اليوم 3 ⏳", "Jour 3"], ["ramadan", "رمضان 🌙", "Ramadan"], ["aid", "العيد 🐑", "L’Aïd"], ["summer", "الصيف ☀️", "L’été"]];
  return (
    <Frame n={2}>
      <Title ar="نستنى… ونستنى… ونستنى" fr="Et toujours personne à la porte." />
      <div style={{ position: "absolute", top: 380, left: 60, right: 60, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {tiles.map(([f, ar, fr], i) => (
          <div key={f} style={{ position: "relative", height: 400, borderRadius: 32, overflow: "hidden", transform: `rotate(${[-1.5, 1.2, 1, -1.2][i]}deg)`, boxShadow: "0 24px 50px rgba(0,0,0,0.45)" }}>
            {photo(f, { width: "100%", height: "100%", objectPosition: "50% 35%" })}
            <div style={{ position: "absolute", top: 18, left: 18, background: C.paper, borderRadius: 18, padding: "6px 18px 10px", textAlign: "center" }}>
              <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 38, color: C.ink }}>{ar}</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: C.ink2, opacity: 0.7 }}>{fr}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// 3 — Tracking (the real request steps)
function S3() {
  const steps: [string, string, "done" | "now" | "next"][] = [
    ["Demande envoyée", "08:12", "done"], ["Acceptée", "08:20", "done"], ["🗓️ Rendez-vous · demain 09:00", "", "done"],
    ["🚗 En route", "08:41", "now"], ["Intervention commencée", "", "next"], ["Intervention terminée", "", "next"],
  ];
  return (
    <Frame n={3}>
      <Title ar="مع SkillLoop تعرف وقتاش يجي" fr="Rendez-vous, « en route », terminé : vous suivez tout." size={66} />
      <MiniPhone style={{ left: 260, top: 330, height: 800 }}>
        <div style={{ padding: "80px 34px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Img src={staticFile("stills/karim.jpg")} style={{ width: 80, height: 80, borderRadius: 999, objectFit: "cover" }} />
            <div><div style={{ fontWeight: 800, fontSize: 34 }}>Karim</div><span style={chip("#e6f9b8", "#2c4a00", 22)}>En route</span></div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 26, marginTop: 30, marginBottom: 14 }}>Suivi de l’intervention</div>
          <div style={{ position: "relative", paddingInlineStart: 40 }}>
            <div style={{ position: "absolute", left: 11, top: 10, bottom: 20, width: 3, background: "#e2ddd2" }} />
            {steps.map(([label, at, st]) => (
              <div key={label} style={{ position: "relative", marginBottom: 22 }}>
                <span style={{ position: "absolute", left: -40, top: 6, width: 24, height: 24, borderRadius: 99,
                  background: st === "done" ? C.sea : st === "now" ? C.lime : C.paper, border: st === "next" ? "3px solid #d6d0c4" : "none",
                  boxShadow: st === "now" ? `0 0 0 8px ${C.lime}55` : "none" }} />
                <div style={{ fontWeight: st === "next" ? 600 : 800, fontSize: 26, color: st === "next" ? "#8a8f9b" : C.ink }}>{label}</div>
                {at && <div style={{ fontSize: 20, color: "#6b7280" }}>{at}</div>}
              </div>
            ))}
          </div>
        </div>
      </MiniPhone>
      <div style={{ position: "absolute", bottom: 108, left: 0, right: 0, textAlign: "center", fontSize: 24, color: C.muted }}>Étapes déclarées par le pro, heure enregistrée par SkillLoop.</div>
    </Frame>
  );
}

// 4 — The result
function S4() {
  return (
    <Frame n={4}>
      {photo("water", { position: "absolute", inset: 0, width: "100%", height: "100%", objectPosition: "50% 40%" })}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.ink}e6 0%, transparent 32%, transparent 62%, ${C.ink}e6 88%)` }} />
      <Title ar="جا في الوقت… والخدمة كملت" fr="Il est venu. Pour de vrai." top={90} />
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ ...chip(C.lime, C.ink, 48), padding: "20px 44px", transform: "rotate(-3deg)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>✅ Intervention terminée</span>
      </div>
    </Frame>
  );
}

// 5 — For pros: the vitrine
function S5() {
  const feats = ["📸 Réalisations", "🎬 Vidéos", "↔️ Avant / Après", "📊 Statistiques"];
  return (
    <Frame n={5}>
      <Title ar="إنت صنايعي؟ هاذي الفيترينة متاعك" fr="Votre vitrine pro, prête à partager." size={64} />
      <MiniPhone style={{ left: 60, top: 370, width: 500, height: 820 }}>
        <div style={{ height: 210, background: `linear-gradient(135deg, ${C.ink}, ${C.sea})` }} />
        <div style={{ padding: "0 28px", marginTop: -70 }}>
          <Img src={staticFile("stills/karim.jpg")} style={{ width: 140, height: 140, borderRadius: 999, objectFit: "cover", border: `6px solid ${C.paper}` }} />
          <div style={{ fontWeight: 800, fontSize: 42 }}>Karim</div>
          <div style={{ fontSize: 24, color: "#5b6477" }}>Plombier · Tunis</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 22 }}>
            {["work1", "work2", "work3", "karim"].map((w) => <Img key={w} src={staticFile(`stills/${w}.jpg`)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 18 }} />)}
          </div>
          <div style={{ marginTop: 20, background: C.lime, borderRadius: 999, padding: "18px 0", textAlign: "center", fontWeight: 800, fontSize: 26 }}>Envoyer une demande</div>
        </div>
      </MiniPhone>
      <div style={{ position: "absolute", left: 600, right: 50, top: 470, display: "flex", flexDirection: "column", gap: 22 }}>
        {feats.map((f) => <div key={f} style={{ ...chip("rgba(255,255,255,0.08)", C.white, 32), border: "2px solid rgba(255,255,255,0.15)", borderRadius: 24, padding: "22px 26px" }}>{f}</div>)}
        <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>Exemple de page. Vidéos et statistiques : SkillLoop Pro.</div>
      </div>
    </Frame>
  );
}

// 6 — QR on the shop window
function S6() {
  return (
    <Frame n={6}>
      {photo("shop", { position: "absolute", inset: 0, width: "100%", height: "100%", objectPosition: "50% 45%", filter: "brightness(0.55)" })}
      {/* Veo wrote fake Arabic on the meter box: blur it. */}
      <div style={{ position: "absolute", left: 870, top: 1030, width: 200, height: 200, backdropFilter: "blur(10px)", borderRadius: 8 }} />
      <Title ar="حطّ الـQR متاعك على الحانوت" fr="Les clients scannent… et voient votre travail." size={66} />
      <div style={{ position: "absolute", top: 450, left: "50%", marginLeft: -270, width: 540, transform: "rotate(-3deg)", filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.6))" }}>
        <Img src={staticFile("sticker.svg")} style={{ width: 540, height: 540 }} />
      </div>
      <div style={{ position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center" }}>
        <span style={chip(C.lime, C.ink, 32)}>Carte & autocollant QR · SkillLoop Pro</span>
      </div>
    </Frame>
  );
}

// 7 — Page themes (the app's four carnet themes)
function S7() {
  const themes = [
    { name: "Méditerranée", font: F.outfit, bg: "#f6f9fd", cover: "linear-gradient(160deg,#1c2f6b,#2f6fc0)", fg: "#1a2550", cta: "#2a54b3", ctaFg: "#fff", r: 24 },
    { name: "Atelier", font: F.fraunces, bg: "#fbf3e8", cover: "linear-gradient(160deg,#3d2318,#a2502b)", fg: "#3a2418", cta: "#b2532c", ctaFg: "#fff", r: 8 },
    { name: "Olivier", font: F.nunito, bg: "#f6f7ec", cover: "linear-gradient(160deg,#28331f,#5f7a3c)", fg: "#26331d", cta: "#3c5326", ctaFg: "#f6f9e6", r: 28 },
    { name: "Nuit", font: F.grotesk, bg: "#10121d", cover: "linear-gradient(160deg,#151a2c,#2b3150)", fg: "#f1f2f7", cta: C.lime, ctaFg: C.ink, r: 16 },
  ];
  return (
    <Frame n={7}>
      <Title ar="اختار الستيل اللي يشبهلك" fr="4 thèmes pour votre page · SkillLoop Pro" size={68} />
      <div style={{ position: "absolute", top: 400, left: 50, right: 50, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {themes.map((t, i) => (
          <div key={t.name} style={{ background: t.bg, borderRadius: 34, overflow: "hidden", height: 380, transform: `rotate(${[-1.2, 1, 1.2, -1][i]}deg)`, boxShadow: "0 24px 50px rgba(0,0,0,0.45)" }}>
            <div style={{ height: 120, background: t.cover }} />
            <div style={{ padding: "0 26px", marginTop: -46 }}>
              <Img src={staticFile("stills/karim.jpg")} style={{ width: 92, height: 92, borderRadius: 999, objectFit: "cover", border: `5px solid ${t.bg}` }} />
              <div style={{ fontFamily: t.font, fontWeight: 800, fontSize: 40, color: t.fg, marginTop: 4 }}>{t.name}</div>
              <div style={{ fontSize: 20, color: t.fg, opacity: 0.65 }}>Plombier · Tunis</div>
              <div style={{ marginTop: 18, background: t.cta, color: t.ctaFg, borderRadius: t.r, padding: "14px 0", textAlign: "center", fontWeight: 800, fontSize: 22 }}>Envoyer une demande</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// 8 — CTA
function S8() {
  const steps: [string, string, string][] = [
    ["1", "ابعثلنا «PRO» في الميساج", "Envoyez « PRO » en message"],
    ["2", "نحضّرولك البروفيل والخدمات متاعك", "On crée votre profil et vos services"],
    ["3", "تبدا تستقبل الطلبات", "Vous recevez les demandes"],
  ];
  return (
    <Frame n={8}>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0 }}><Wordmark size={74} /></div>
      <Title ar="إنت صنايعي جدّي؟ إحنا نتكفّلو بالباقي" fr="Pro sérieux ? On s’occupe du reste." top={260} size={62} />
      <div style={{ position: "absolute", top: 560, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 22 }}>
        {steps.map(([n, ar, fr]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 26, background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 30, padding: "22px 28px" }}>
            <span style={{ width: 78, height: 78, borderRadius: 999, background: C.lime, color: C.ink, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 42, flexShrink: 0 }}>{n}</span>
            <div style={{ flex: 1 }}>
              <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 38, color: C.white, textAlign: "right" }}>{ar}</div>
              <div style={{ fontWeight: 700, fontSize: 28, color: C.lime }}>{fr}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 130, left: 60, right: 60, display: "flex", justifyContent: "center", gap: 20 }}>
        <span style={chip(C.lime, C.ink, 34)}>📩 DM « PRO »</span>
        <span style={chip(C.white, C.ink, 34)}>🔔 Abonnez-vous</span>
      </div>
    </Frame>
  );
}

export const SLIDES = [S1, S2, S3, S4, S5, S6, S7, S8];
