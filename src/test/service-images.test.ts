import { describe, expect, it } from "vitest";
import { imageProblem } from "@/lib/services-db";

describe("service photo rules", () => {
  it("accepts a JPG under 5 MB", () => expect(imageProblem({ type: "image/jpeg", size: 2_000_000 })).toBeNull());
  it("rejects photos over 5 MB", () => expect(imageProblem({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toBe("err_image_size"));
  it("rejects non-image formats", () => expect(imageProblem({ type: "application/pdf", size: 1000 })).toBe("err_image_type"));
});
