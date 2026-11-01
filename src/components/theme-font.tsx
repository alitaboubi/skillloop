import { THEME_FONTS, type CarnetTheme } from "@/lib/carnet";

/** Loads a page theme's display font (React hoists the stylesheet into <head>, once per URL). */
export function ThemeFont({ theme }: { theme: CarnetTheme }) {
  return <link rel="stylesheet" href={THEME_FONTS[theme]} precedence="theme-font" />;
}
