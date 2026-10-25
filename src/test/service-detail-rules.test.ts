import { describe, expect, it } from "vitest";
import { rowToService } from "@/lib/services-db";

const row = { id: "1", owner_id: "o", title: "T", description: "D", category: "home", price_model: "fixed", price: 50, city: "Tunis", remote: false, created_at: new Date().toISOString() };

describe("service detail data rules", () => {
  it("flags a priced service with no amount as missing, not zero", () => expect(rowToService({ ...row, price: null }).priceMissing).toBe(true));
  it("does not flag a quote-only service as missing a price", () => expect(rowToService({ ...row, price_model: "quote", price: null }).priceMissing).toBe(false));
  it("treats the category fallback image as no real photo", () => expect(rowToService(row).hasPhoto).toBe(false));
  it("marks an uploaded photo as real", () => expect(rowToService(row, "https://x/y.jpg").hasPhoto).toBe(true));
});
