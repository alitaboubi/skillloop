import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FaqBlock } from "@/components/page-sections";

describe("FAQ", () => {
  it("keeps the accessible accordion: a button that expands its answer", () => {
    render(<FaqBlock items={[{ q: "Question ?", a: "Réponse." }]} />);
    const btn = screen.getByRole("button", { name: "Question ?" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Réponse.")).toBeVisible();
  });
});
