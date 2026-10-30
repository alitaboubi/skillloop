import type { CategoryId } from "./data";
import tech from "@/assets/categories/tech.webp";
import design from "@/assets/categories/design.webp";
import tutoring from "@/assets/categories/tutoring.webp";
import home from "@/assets/categories/home.webp";
import care from "@/assets/categories/care.webp";
import healthcare from "@/assets/categories/healthcare.webp";
import engineering from "@/assets/categories/engineering.webp";
import automotive from "@/assets/categories/automotive.webp";
import business from "@/assets/categories/business.webp";
import events from "@/assets/categories/events.webp";
import personal from "@/assets/categories/personal.webp";
import student from "@/assets/categories/student.webp";
import other from "@/assets/categories/other.webp";

/**
 * One illustration photo per category (Unsplash licence, 800×600 WebP; sources in docs/design/art-direction.md).
 * Category art only: on a listing without a provider photo it is always labelled "illustration" — never a pro's work.
 */
export const CATEGORY_IMAGES: Record<CategoryId, string> = {
  tech, design, tutoring, home, care, healthcare, engineering, automotive, business, events, personal, student, other,
};

export const categoryImage = (c: string): string => CATEGORY_IMAGES[c as CategoryId] ?? other;
