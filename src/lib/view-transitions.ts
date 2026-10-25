import { useEffect, useState } from "react";

/**
 * Two continuity transitions only (card photo → service photo, conversation row → thread header).
 * Progressive: used only where the browser supports View Transitions and the user hasn't asked for reduced motion.
 * Names are always rendered (deterministic markup); this hook only decides whether a navigation starts a transition.
 */
export function useViewTransitions(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOk(typeof document.startViewTransition === "function" && !mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return ok;
}

/** Valid, unique view-transition-name for one element kind + id. */
export const vtName = (kind: "svc" | "conv", id: string) => `${kind}-${id.replace(/[^a-zA-Z0-9-]/g, "")}`;
