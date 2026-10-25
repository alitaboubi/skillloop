import { useCallback, useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "skillloop.theme";

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

export function parseThemePref(v: string | null): ThemePref {
  return v === "light" || v === "dark" ? v : "system";
}

/** Runs before paint in <head> so there is no flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function apply(pref: ThemePref) {
  const dark = resolveTheme(pref, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    setPrefState(parseThemePref(window.localStorage.getItem(THEME_KEY)));
  }, []);

  useEffect(() => {
    apply(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    if (p === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, p);
  }, []);

  return { pref, setPref };
}
