import { Facebook, Globe, Instagram, Linkedin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import type { TKey } from "@/lib/i18n";
import type { ContactKind } from "@/lib/profile-contacts";

/** Icon, label and placeholder per contact kind — shared by the editor and the public profile. */
export const CONTACT_META: Record<ContactKind, { icon: LucideIcon; label: TKey; ph: TKey }> = {
  phone: { icon: Phone, label: "c_phone", ph: "c_ph_phone" },
  whatsapp: { icon: MessageCircle, label: "c_whatsapp", ph: "c_ph_phone" },
  website: { icon: Globe, label: "c_website", ph: "c_ph_website" },
  facebook: { icon: Facebook, label: "c_facebook", ph: "c_ph_facebook" },
  instagram: { icon: Instagram, label: "c_instagram", ph: "c_ph_instagram" },
  linkedin: { icon: Linkedin, label: "c_linkedin", ph: "c_ph_linkedin" },
};
