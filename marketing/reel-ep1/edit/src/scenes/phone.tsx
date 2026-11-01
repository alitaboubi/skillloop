import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, C, LAT, s } from "../theme";
import { LoopMark, Rise } from "../ui";

// Copy is the app's own French UI text (src/lib/i18n.tsx), so the screens show the real product.

function Phone({ children, tilt = 0 }: { children: ReactNode; tilt?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const float = Math.sin(frame / 18) * 6;
  return (
    <div style={{ position: "absolute", left: "50%", top: 470, width: 760, height: 1360, marginLeft: -380,
      transform: `translateY(${(1 - enter) * 900 + float}px) rotate(${tilt * (1 - enter) + Math.sin(frame / 40) * 0.6}deg)`,
      borderRadius: 96, background: "#0b0f1a", padding: 22, boxShadow: `0 60px 140px rgba(0,0,0,0.6), 0 0 0 3px #2a3555, 0 0 120px ${C.lime}33` }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 76, overflow: "hidden", background: C.paper }}>
        <div style={{ position: "absolute", top: 18, left: "50%", width: 200, height: 52, marginLeft: -100, borderRadius: 30, background: "#0b0f1a", zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}

function Backdrop({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% ${40 + Math.sin(frame / 30) * 4}%, ${C.ink2} 0%, ${C.ink} 70%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(40% 25% at 80% 15%, ${C.lime}26, transparent), radial-gradient(40% 25% at 15% 85%, ${C.clay}26, transparent)` }} />
      {children}
    </AbsoluteFill>
  );
}

function Caption({ ar, fr }: { ar: string; fr: string }) {
  return (
    <Rise style={{ position: "absolute", top: 150, left: 40, right: 40, textAlign: "center" }}>
      <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 70, color: C.white, lineHeight: 1.3 }}>{ar}</div>
      <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 38, color: C.lime, marginTop: 4 }}>{fr}</div>
    </Rise>
  );
}

const pill = (bg: string, fg: string) => ({ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 999, background: bg, color: fg, fontFamily: LAT, fontWeight: 700, fontSize: 28 });

/** Request → Acceptée → Rendez-vous → « Karim est en route. » with the push notification. */
export function TrackingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accepted = frame >= s(0.8);
  const appt = spring({ frame: frame - s(1.6), fps, config: { damping: 14 } });
  const route = spring({ frame: frame - s(2.5), fps, config: { damping: 12, stiffness: 160 } });
  const notif = spring({ frame: frame - s(2.3), fps, config: { damping: 14, stiffness: 140 } });
  const pulse = 1 + Math.max(0, Math.sin((frame - s(2.5)) / 4)) * 0.05 * (frame > s(2.5) ? 1 : 0);
  const badgePop = spring({ frame: frame - s(0.8), fps, config: { damping: 10, stiffness: 220 } });
  return (
    <Backdrop>
      <Caption ar="طلب واحد… والمهني يتقبّل ويجي" fr="Demande → Acceptée → En route" />
      <Phone tilt={-6}>
        {/* push notification */}
        <div style={{ position: "absolute", top: 90, left: 26, right: 26, zIndex: 6, transform: `translateY(${(1 - notif) * -260}px)`,
          background: "rgba(255,255,255,0.96)", borderRadius: 34, padding: "22px 26px", boxShadow: "0 18px 40px rgba(0,0,0,0.25)", display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ width: 70, height: 70, borderRadius: 18, background: C.ink, display: "grid", placeItems: "center" }}><LoopMark size={54} /></div>
          <div style={{ fontFamily: LAT }}>
            <div style={{ fontWeight: 800, fontSize: 26, color: C.ink }}>SkillLoop · maintenant</div>
            <div style={{ fontWeight: 600, fontSize: 30, color: C.ink }}>Karim est en route. 🚗</div>
          </div>
        </div>
        <div style={{ padding: "110px 34px 0", fontFamily: LAT, color: C.ink }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Img src={staticFile("stills/karim.jpg")} style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 40 }}>Karim</div>
              <span style={{ ...pill(accepted ? "#d7f2e3" : "#fdf0d5", accepted ? "#17603f" : "#8a5a00"), transform: `scale(${accepted ? 0.9 + badgePop * 0.1 : 1})` }}>
                {route > 0.5 ? "En route" : accepted ? "Acceptée" : "En attente"}
              </span>
            </div>
          </div>
          <div style={{ marginTop: 26, border: "2px solid #e6e1d6", borderRadius: 28, padding: "20px 24px", display: "flex", justifyContent: "space-between", fontSize: 28 }}>
            <span style={{ fontWeight: 700 }}>Plomberie à domicile</span><span style={{ color: "#5b6477" }}>📍 Tunis</span>
          </div>
          <div style={{ marginTop: 22, background: accepted ? "#e7f6ee" : "#e3eef9", borderRadius: 24, padding: "18px 22px", fontSize: 26, lineHeight: 1.35 }}>
            {accepted ? "Demande acceptée. Le pro indique le rendez-vous et chaque étape." : "Demande envoyée. Le pro peut l’accepter ou la refuser."}
          </div>
          {/* rendez-vous */}
          <div style={{ marginTop: 26, opacity: appt, transform: `translateX(${(1 - appt) * 80}px)`, display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
            <span style={{ fontSize: 36 }}>🗓️</span><span><b>Rendez-vous</b> · demain à 09:00</span>
          </div>
          {/* step */}
          <div style={{ marginTop: 22, opacity: route, transform: `scale(${(0.8 + route * 0.2) * pulse})`, transformOrigin: "left center",
            background: `${C.lime}`, borderRadius: 24, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, fontWeight: 800, fontSize: 34 }}>
            <span style={{ fontSize: 40 }}>🚗</span> Karim est en route.<span style={{ marginInlineStart: "auto", fontWeight: 600, fontSize: 26, opacity: 0.7 }}>08:41</span>
          </div>
          {/* chat */}
          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, fontSize: 28 }}>
            <div style={{ alignSelf: "flex-end", background: C.ink, color: C.white, padding: "16px 22px", borderRadius: "26px 26px 6px 26px", maxWidth: "80%" }}>Bonjour, fuite sous l’évier 🙏</div>
            {accepted && <div style={{ alignSelf: "flex-start", background: "#ece8df", padding: "16px 22px", borderRadius: "26px 26px 26px 6px", maxWidth: "80%", opacity: badgePop }}>Pas de souci, je passe demain 👍</div>}
          </div>
        </div>
      </Phone>
    </Backdrop>
  );
}

/** « Intervention terminée » stamp shown over the fixed tap. */
export function DoneStamp() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 9, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ ...pill(C.lime, C.ink), fontSize: 46, padding: "20px 40px", transform: `scale(${0.4 + p * 0.6}) rotate(${(1 - p) * -12}deg)`, opacity: p, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
        ✅ Intervention terminée
      </div>
    </div>
  );
}

/** Phone camera on the QR sticker: brackets lock on, then the link chip appears. */
function Viewfinder() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lock = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 200 } });
  const sweep = interpolate(frame % 24, [0, 23], [0, 100]);
  const box = 420 - lock * 60;
  const corner = (r: number) => ({ position: "absolute" as const, width: 70, height: 70, borderColor: C.lime, borderStyle: "solid", borderWidth: 0, ...cornerSide(r) });
  return (
    <AbsoluteFill style={{ background: "#2b2f36" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg,#9aa7b1 0%,#6b5f55 60%,#3d3a37 100%)", filter: "blur(18px)", transform: "scale(1.2)" }} />
      <div style={{ position: "absolute", left: "50%", top: "46%", width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }}>
        <Img src={staticFile("sticker.svg")} style={{ position: "absolute", inset: 30, width: box - 60, height: box - 60, borderRadius: 12 }} />
        {[0, 1, 2, 3].map((r) => <div key={r} style={corner(r)} />)}
        <div style={{ position: "absolute", left: 20, right: 20, top: `${sweep}%`, height: 6, background: C.lime, boxShadow: `0 0 24px ${C.lime}`, opacity: 1 - lock }} />
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 40, right: 40, opacity: lock, transform: `translateY(${(1 - lock) * 40}px)`,
        background: "rgba(255,255,255,0.95)", borderRadius: 999, padding: "20px 28px", fontFamily: LAT, fontWeight: 700, fontSize: 30, color: C.ink, textAlign: "center" }}>
        🔗 SkillLoop · Karim, plombier
      </div>
    </AbsoluteFill>
  );
}
function cornerSide(r: number) {
  const w = 10;
  return [
    { left: 0, top: 0, borderLeftWidth: w, borderTopWidth: w, borderTopLeftRadius: 24 },
    { right: 0, top: 0, borderRightWidth: w, borderTopWidth: w, borderTopRightRadius: 24 },
    { left: 0, bottom: 0, borderLeftWidth: w, borderBottomWidth: w, borderBottomLeftRadius: 24 },
    { right: 0, bottom: 0, borderRightWidth: w, borderBottomWidth: w, borderBottomRightRadius: 24 },
  ][r];
}

/** What Salma sees: the scan locks on the QR, then Karim's public page (vitrine pro). */
export function VitrineScene() {
  const frame = useCurrentFrame();
  const SCAN = s(0.75);
  const scroll = interpolate(frame, [SCAN + s(0.5), SCAN + s(2.0)], [0, -260], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const page = interpolate(frame, [SCAN, SCAN + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <Caption ar="سكان واحد… وتشوف خدمتو الكل" fr="Un scan. Sa vitrine pro." />
      <Phone tilt={6}>
        {frame < SCAN + 6 && <Viewfinder />}
        <div style={{ opacity: page, transform: `translateY(${scroll + (1 - page) * 80}px)`, fontFamily: LAT, color: C.ink, position: "absolute", inset: 0, background: C.paper }}>
          <div style={{ height: 300, background: `linear-gradient(135deg, ${C.ink} 0%, ${C.sea} 100%)` }} />
          <div style={{ padding: "0 34px", marginTop: -90 }}>
            <Img src={staticFile("stills/karim.jpg")} style={{ width: 180, height: 180, borderRadius: 999, objectFit: "cover", border: `8px solid ${C.paper}` }} />
            <div style={{ fontWeight: 800, fontSize: 52, marginTop: 10 }}>Karim</div>
            <div style={{ fontSize: 30, color: "#5b6477", marginTop: 4 }}>Plombier · Tunis</div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <span style={pill("#e7f6ee", "#17603f")}>Disponible</span>
              <span style={pill("#e3eef9", C.sea)}>Pro</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 34, marginTop: 34 }}>Réalisations</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
              {["work1", "work2", "work3", "karim"].map((w, i) => (
                <Rise key={w} delay={s(0.5) + i * 4}>
                  <Img src={staticFile(`stills/${w}.jpg`)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 26 }} />
                </Rise>
              ))}
            </div>
            <div style={{ marginTop: 26, background: C.lime, borderRadius: 999, padding: "26px 0", textAlign: "center", fontWeight: 800, fontSize: 34 }}>Envoyer une demande</div>
          </div>
        </div>
      </Phone>
    </Backdrop>
  );
}
