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
/** The 24 governorates (wilayas) of Tunisia, alphabetical (French). Stored as-is in services/profiles. */
export const CITIES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
  "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

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
  /** ISO time the service was created (real services only). */
  publishedAt?: string;
  ownerId?: string;
  quoteOnly?: boolean;
  real?: boolean;
  /** True only when the provider uploaded a real photo (not a category fallback). */
  hasPhoto?: boolean;
  /** True when a priced model has no stored amount — never display as 0. */
  priceMissing?: boolean;
  details?: Record<string, unknown>;
  accepting?: boolean | undefined;
  /** Signed URL of the pro's profile photo (expert mini-row on cards); absent without a photo. */
  providerAvatar?: string | undefined;
  profession?: string | undefined;
  /** Only set when real reviews exist. */
  rating?: { avg: number; count: number };
  /** Only set when a real verification exists. */
  verified?: boolean;
};

