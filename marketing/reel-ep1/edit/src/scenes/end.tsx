import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, C, LAT, s } from "../theme";
import { Rise, Wordmark } from "../ui";

/** Final CTA laid over Si Lamjed's last shot: follow + comment + pros DM. */
export function EndCard({ start = 0 }: { start?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - start;
  const dim = interpolate(f, [0, s(0.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bell = spring({ frame: f - s(1.4), fps, config: { damping: 6, stiffness: 160 } });
  const ring = f > s(1.4) ? Math.sin(f / 2) * 14 * Math.max(0, 1 - (f - s(1.4)) / 25) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent 30%, ${C.ink}f2 62%)`, opacity: dim }} />
      <div style={{ position: "absolute", left: 50, right: 50, top: 1060 }}>
        <Rise delay={start + 4}><Wordmark size={70} /></Rise>
        <Rise delay={start + 12} style={{ marginTop: 34, background: C.lime, borderRadius: 34, padding: "26px 30px", textAlign: "center" }}>
          <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 50, color: C.ink, lineHeight: 1.3 }}>📩 صنايعي جدّي؟ ابعثلنا «PRO» في الميساج</div>
          <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 32, color: C.ink, marginTop: 6 }}>On crée votre profil et vos services</div>
        </Rise>
        <Rise delay={start + 22} style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          <span style={{ fontSize: 76, display: "inline-block", transform: `scale(${0.6 + bell * 0.4}) rotate(${ring}deg)` }}>🔔</span>
          <div>
            <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 52, color: C.white }}>اعمل Follow</div>
            <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 32, color: C.lime }}>Abonnez-vous pour la suite</div>
          </div>
        </Rise>
        <Rise delay={start + 32} style={{ marginTop: 26, textAlign: "center" }}>
          <div dir="rtl" style={{ fontFamily: AR, fontWeight: 600, fontSize: 40, color: C.white, opacity: 0.92 }}>💬 قلّنا في الكومنتار: شكون قالك «غدوة» وما جاش؟ 😂</div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
}
