import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AR, C, KUFI, LAT } from "./theme";
import { LoopMark, Wordmark } from "./ui";

// « Nouveau pro » carousels: one per real service published on SkillLoop (data copied from the live listing on
// 2026-11-05; the pros agreed to be featured). Copy mixes Tunisian Arabic and French. No ratings, no promised clients.
export const POST = { width: 1080, height: 1350, count: 5 };

type Step = [ar: string, fr: string];
export type Pro = {
  id: string; name: string; avatar?: string; job: string; place: string;
  cover: string; hookAr: string; hookFr: string; steps: Step[]; deliverables: string[];
  price: string; duration: string; note?: string;
};

export const PROS: Pro[] = [
  {
    id: "cm", name: "Ahmed", job: "Community manager · Instagram, Facebook & TikTok", place: "Tunis · à distance",
    cover: "cm", hookAr: "صفحتك ما تنشرش؟ ولّات فيترينة مسكّرة", hookFr: "Une page qui ne publie pas, c’est une vitrine fermée.",
    steps: [
      ["تبعثلو العروض والبرومو متاع الشهر", "Vos offres, promos et événements du mois"],
      ["يحضّر الكالوندريي والبوستات", "Calendrier, visuels et textes (FR / derja) à valider"],
      ["ينشر، يجاوب، ويعطيك بيلان", "Publication, réponses et bilan en fin de mois"],
    ],
    deliverables: ["12 publications / mois", "4 reels montés", "Calendrier éditorial", "Textes + hashtags", "Réponses aux commentaires", "Bilan mensuel"],
    price: "À partir de 450 DT", duration: "1 mois", note: "Sans engagement longue durée",
  },
  {
    id: "web", name: "Feres Hasni", avatar: "web-av", job: "Sites web vitrines & landing pages", place: "Tunis · à distance",
    cover: "web", hookAr: "عندك نشاط وما عندكش سيت؟", hookFr: "Une activité sans site… ou un site qui ne ramène rien\u00a0?",
    steps: [
      ["20 دقيقة نحكيو على نشاطك", "Appel de 20 min : activité, clients, objectif"],
      ["ماكيت تشوفها وتصادق عليها", "Maquette à valider, 2 tours de modifications"],
      ["السيت يطلع على الدومين متاعك", "Mise en ligne + vidéo pour modifier vos textes"],
    ],
    deliverables: ["1 à 5 pages responsive", "Bouton WhatsApp / formulaire", "Bases SEO", "Mise en ligne", "2 tours de modifications", "Vidéo de prise en main"],
    price: "À partir de 500 DT", duration: "7 à 10 jours",
  },
  {
    id: "logo", name: "Br9 Team", avatar: "logo-av", job: "Logo & identité visuelle", place: "Tunis · à distance",
    cover: "logo", hookAr: "اللوغو هو أول حاجة يتفكّرها الحريف", hookFr: "Votre logo, c’est ce que vos clients retiennent en premier.",
    steps: [
      ["سؤالات قصار على الماركة متاعك", "Questionnaire : marque, clientèle, goûts"],
      ["3 اقتراحات لوغو مختلفين", "3 pistes présentées en situation, 2 tours de modifs"],
      ["تاخو الفيشيات الكل، واللوغو ملكك", "Tous les fichiers + mini charte. Le logo est à vous."],
    ],
    deliverables: ["3 propositions de logo", "Logo + variantes", "Palette + typographies", "PNG, SVG et PDF", "Mini charte graphique", "Photo de profil réseaux"],
    price: "150 DT · prix fixe", duration: "5 à 7 jours",
  },
  {
    id: "ui", name: "aziz kouki", avatar: "ui-av", job: "UI/UX designer · Applications mobiles & web", place: "Sousse · à distance",
    cover: "ui", hookAr: "مشروعك يستاهل شاشات واضحة", hookFr: "Des écrans clairs pour votre projet, votre marque ou votre produit.",
    steps: [
      ["يفهم الحاجة والجمهور متاعك", "Votre besoin, votre audience, votre objectif"],
      ["يقترح ديركسيون فيزويل", "Une direction visuelle avant de dessiner"],
      ["يصمّم الشاشات والسوبورات", "Écrans, maquettes, prototypes, présentations"],
    ],
    deliverables: ["Interfaces web & mobile", "Maquettes & prototypes", "Présentations visuelles", "Amélioration d’écrans existants"],
    price: "À partir de 200 DT", duration: "5 à 6 jours",
  },
];

const chip = (bg: string, fg: string, size = 30): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 24px", borderRadius: 999, background: bg, color: fg, fontWeight: 800, fontSize: size });

function Frame({ n, children }: { n: number; children: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: LAT, overflow: "hidden" }}>
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

function Title({ ar, fr, top = 120, size = 70 }: { ar: string; fr: string; top?: number; size?: number }) {
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center" }}>
      <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: size, color: C.white, lineHeight: 1.3 }}>{ar}</div>
      <div style={{ fontWeight: 700, fontSize: 38, color: C.lime, marginTop: 10, lineHeight: 1.3 }}>{fr}</div>
    </div>
  );
}

function Body({ top = 330, gap = 28, children }: { top?: number; gap?: number; children: ReactNode }) {
  return <div style={{ position: "absolute", top, bottom: 130, left: 60, right: 60, display: "flex", flexDirection: "column", justifyContent: "center", gap }}>{children}</div>;
}

function Avatar({ p, size }: { p: Pro; size: number }) {
  const ring: CSSProperties = { width: size, height: size, borderRadius: 999, border: `8px solid ${C.lime}`, boxShadow: "0 30px 70px rgba(0,0,0,0.5)" };
  return p.avatar
    ? <Img src={staticFile(`stills/${p.avatar}.jpg`)} style={{ ...ring, objectFit: "cover" }} />
    : <div style={{ ...ring, background: C.clay, color: C.white, display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.45 }}>{p.name[0]}</div>;
}

// 1 — Welcome
function Welcome({ p }: { p: Pro }) {
  return (
    <Frame n={1}>
      <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center" }}>
        <span dir="rtl" style={{ display: "inline-block", fontFamily: KUFI, fontWeight: 700, fontSize: 92, color: C.ink, background: C.lime, padding: "4px 44px 18px", borderRadius: 28, transform: "rotate(-2deg)" }}>مرحبا بيك 👋</span>
        <div style={{ fontWeight: 700, fontSize: 36, color: C.muted, marginTop: 26 }}>Nouveau pro sur SkillLoop</div>
      </div>
      <div style={{ position: "absolute", top: 450, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar p={p} size={330} />
        <div style={{ fontWeight: 800, fontSize: 84, color: C.white, marginTop: 34 }}>{p.name}</div>
        <div style={{ fontWeight: 700, fontSize: 36, color: C.lime, marginTop: 6, textAlign: "center", padding: "0 80px" }}>{p.job}</div>
        <span style={{ ...chip("rgba(255,255,255,0.1)", C.white, 30), marginTop: 26, border: "2px solid rgba(255,255,255,0.16)" }}>📍 {p.place}</span>
      </div>
    </Frame>
  );
}

// 2 — Client pain + the service cover
function Hook({ p }: { p: Pro }) {
  return (
    <Frame n={2}>
      <Title ar={p.hookAr} fr={p.hookFr} size={66} />
      <div style={{ position: "absolute", top: 520, left: 70, right: 70, borderRadius: 40, overflow: "hidden", transform: "rotate(-1.5deg)", boxShadow: `0 50px 110px rgba(0,0,0,0.6), 0 0 0 3px #2a3555, 0 0 90px ${C.lime}2a` }}>
        <Img src={staticFile(`stills/${p.cover}.jpg`)} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
      </div>
    </Frame>
  );
}

// 3 — How it works (from the service description)
function Steps({ p }: { p: Pro }) {
  return (
    <Frame n={3}>
      <Title ar="كيفاش تمشي الخدمة؟" fr="Comment ça se passe" />
      <Body gap={34}>
        {p.steps.map(([ar, fr], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 30, padding: "40px 30px" }}>
            <span style={{ width: 84, height: 84, borderRadius: 999, background: C.lime, color: C.ink, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 44, flexShrink: 0 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 42, color: C.white, textAlign: "right", lineHeight: 1.35 }}>{ar}</div>
              <div style={{ fontWeight: 700, fontSize: 30, color: C.lime, marginTop: 6 }}>{fr}</div>
            </div>
          </div>
        ))}
      </Body>
    </Frame>
  );
}

// 4 — Deliverables, price, duration (as listed on SkillLoop)
function Offer({ p }: { p: Pro }) {
  return (
    <Frame n={4}>
      <Title ar="شنوّة تاخو؟" fr="Ce que vous recevez" />
      <Body gap={60}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {p.deliverables.map((d) => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 14, background: C.paper, color: C.ink, borderRadius: 24, padding: "30px 22px", fontWeight: 800, fontSize: 31, lineHeight: 1.2 }}>
            <span style={{ color: C.success, fontSize: 34 }}>✓</span>{d}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <span style={{ ...chip(C.lime, C.ink, 40), padding: "18px 36px" }}>{p.price}</span>
          <span style={{ ...chip(C.white, C.ink, 40), padding: "18px 36px" }}>⏱ {p.duration}</span>
        </div>
        {p.note && <div style={{ fontWeight: 700, fontSize: 28, color: C.muted }}>{p.note}</div>}
      </div>
      </Body>
    </Frame>
  );
}

// 5 — CTA for clients, then for pros
function Cta({ p }: { p: Pro }) {
  return (
    <Frame n={5}>
      <div style={{ position: "absolute", top: 110, left: 0, right: 0 }}><Wordmark size={70} /></div>
      <Body top={220} gap={80}>
      <div style={{ background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 40, padding: "40px 40px 46px", textAlign: "center" }}>
        <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 56, color: C.white }}>تحب تخدم مع</div>
        <div style={{ fontWeight: 800, fontSize: 64, color: C.lime, marginTop: 4 }}>{p.name} ?</div>
        <div style={{ fontWeight: 700, fontSize: 32, color: C.muted, marginTop: 14 }}>Envoyez-lui une demande sur SkillLoop</div>
        <div style={{ marginTop: 26 }}><span style={chip(C.lime, C.ink, 34)}>🔗 Lien en bio</span></div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 50, color: C.white }}>إنت زادة تخدم؟ صفحة محترف بلاش</div>
        <div style={{ fontWeight: 700, fontSize: 32, color: C.muted, marginTop: 10 }}>Vous aussi ? Votre page pro, gratuite.</div>
        <div style={{ marginTop: 26, display: "flex", justifyContent: "center", gap: 18 }}>
          <span style={chip(C.white, C.ink, 32)}>📩 DM « PRO »</span>
          <span style={chip("rgba(255,255,255,0.12)", C.white, 32)}>🔔 Abonnez-vous</span>
        </div>
      </div>
      </Body>
    </Frame>
  );
}

export const SLIDES = [Welcome, Hook, Steps, Offer, Cta];
