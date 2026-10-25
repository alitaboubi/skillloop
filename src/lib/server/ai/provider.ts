import type { ChatMessage } from "@/lib/ai/offer-prompt";

/** A text-generation backend. Swapping providers means writing another function with this shape. */
export type ProviderRequest = {
  messages: ChatMessage[];
  maxTokens: number;
  schema: Record<string, unknown>;
  timeoutMs: number;
};

export type ProviderResult =
  | { ok: true; content: string; tokens?: number }
  /** `detail` is a short code for logs (status / error code) — never prompt or output text. */
  | { ok: false; reason: "rate_limited" | "unavailable" | "failed"; detail: string };

export type TextProvider = (req: ProviderRequest) => Promise<ProviderResult>;
