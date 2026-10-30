import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TKey } from "./i18n";
import { readTheme } from "./carnet";
import { PRO_TOOLS_ENABLED, myStatsQuery } from "./pro-tools";
import { profileQuery } from "./profiles-db";

/**
 * "Démarrer avec Pro": the guided first steps of the Pro space (/dashboard?section=pro). Every step is read from real
 * state — a published video, a stored theme, a downloaded card (this device), a first counted visit — never ticked by
 * hand. Without VITE_PRO_TOOLS only the card exists.
 */
export type ProStepId = "video" | "theme" | "card" | "visit";
export type ProStep = { id: ProStepId; title: TKey; desc: TKey; done: boolean };

export function proSteps(s: { tools: boolean; hasVideo: boolean; hasTheme: boolean; cardSaved: boolean; hasVisits: boolean }): ProStep[] {
  const all: ProStep[] = [
    { id: "video", title: "ph_step_video", desc: "ph_step_video_d", done: s.hasVideo },
    { id: "theme", title: "ph_step_theme", desc: "ph_step_theme_d", done: s.hasTheme },
    { id: "card", title: "ph_step_card", desc: "ph_step_card_d", done: s.cardSaved },
    { id: "visit", title: "ph_step_visit", desc: "ph_step_visit_d", done: s.hasVisits },
  ];
  return s.tools ? all : all.filter((x) => x.id === "card");
}

/* Card downloaded or printed on this device (a convenience mark only; nothing depends on it). */
const cardKey = (userId: string) => `sl-pro-card:${userId}`;
export function readCardSaved(userId: string): boolean {
  try { return typeof window !== "undefined" && window.localStorage.getItem(cardKey(userId)) === "1"; } catch { return false; }
}
export function markCardSaved(userId: string): void {
  try { window.localStorage.setItem(cardKey(userId), "1"); window.dispatchEvent(new Event("sl-pro-card")); } catch { /* storage blocked */ }
}

function subscribeCard(cb: () => void) {
  window.addEventListener("sl-pro-card", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("sl-pro-card", cb); window.removeEventListener("storage", cb); };
}

/** Live steps for the signed-in pro (only meaningful while they have Pro). */
export function useProSteps(userId: string, pro: boolean): { steps: ProStep[]; done: number; loading: boolean } {
  const prof = useQuery(profileQuery(userId));
  const stats = useQuery({ ...myStatsQuery(userId), enabled: PRO_TOOLS_ENABLED && pro });
  const cardSaved = useSyncExternalStore(subscribeCard, () => readCardSaved(userId), () => false);
  const steps = proSteps({
    tools: PRO_TOOLS_ENABLED,
    hasVideo: (prof.data?.portfolio ?? []).some((x) => !!x.video_url),
    hasTheme: !!readTheme(prof.data?.professional_details),
    cardSaved,
    hasVisits: !!stats.data && !stats.data.empty,
  });
  return { steps, done: steps.filter((x) => x.done).length, loading: prof.isLoading };
}
