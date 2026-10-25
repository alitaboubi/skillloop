import type { TKey } from "./i18n";

export type CategoryId = "tech" | "design" | "tutoring" | "home" | "care" | "healthcare" | "engineering" | "automotive" | "business" | "events" | "personal" | "student" | "other";
export const CATEGORIES: { id: CategoryId; key: TKey }[] = [
  { id: "tech", key: "cat_tech" },
  { id: "design", key: "cat_design" },
  { id: "tutoring", key: "cat_tutoring" },
  { id: "home", key: "cat_home" },
  { id: "care", key: "cat_care" },
  { id: "healthcare", key: "cat_healthcare" },
  { id: "engineering", key: "cat_engineering" },
  { id: "automotive", key: "cat_automotive" },
  { id: "business", key: "cat_business" },
  { id: "events", key: "cat_events" },
  { id: "personal", key: "cat_personal" },
  { id: "student", key: "cat_student" },
  { id: "other", key: "cat_other" },

];
export const CITIES = ["Tunis", "Sousse", "Sfax", "Nabeul", "Bizerte", "Monastir"];

export type Service = {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  price: number;
  unit: "per_project" | "per_hour" | "per_visit" | "pm_fixed" | "pm_from" | "pm_quote";
  city: string;
  remote: boolean;
  image: string;
  provider: string;
  delivery: string;
  languages: string;
  publishedDaysAgo: number;
  ownerId?: string;
  quoteOnly?: boolean;
  real?: boolean;
  /** True only when the provider uploaded a real photo (not a category fallback). */
  hasPhoto?: boolean;
  /** True when a priced model has no stored amount — never display as 0. */
  priceMissing?: boolean;
  details?: Record<string, unknown>;
  accepting?: boolean;
  profession?: string | undefined;
  /** Only set when real reviews exist. */
  rating?: { avg: number; count: number };
  /** Only set when a real verification exists. */
  verified?: boolean;
};

