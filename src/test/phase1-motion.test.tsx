import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HighlightGrid } from "@/components/highlight-grid";
import { Reveal } from "@/components/brand";
import { FaqBlock } from "@/components/page-sections";

const grid = () => render(
  <HighlightGrid className="grid">
    <li><a href="/explore?category=home">Maison</a></li>
    <li><a href="/explore?category=tech">Tech</a></li>
  </HighlightGrid>,
);
const frame = (c: HTMLElement) => c.querySelector(".highlight-frame")!;

describe("category highlight", () => {
  it("is a plain list of links with one decorative frame outside the list", () => {
    const { container } = grid();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(container.querySelector("ul > span")).toBeNull();
    expect(frame(container)).toHaveAttribute("aria-hidden", "true");
    expect(frame(container)).not.toHaveAttribute("data-on");
  });

  it("follows a mouse pointer and hides when it leaves", () => {
    const { container } = grid();
    fireEvent.pointerOver(screen.getByText("Tech"), { pointerType: "mouse" });
    expect(frame(container)).toHaveAttribute("data-on");
    fireEvent.pointerLeave(container.querySelector("ul")!, { pointerType: "mouse" });
    expect(frame(container)).not.toHaveAttribute("data-on");
  });

  it("follows keyboard focus and hides when focus leaves the list", () => {
    const { container } = grid();
    const link = screen.getByText("Maison");
    link.focus();
    expect(frame(container)).toHaveAttribute("data-on");
    link.blur();
    expect(frame(container)).not.toHaveAttribute("data-on");
  });
});

describe("staggered grid", () => {
  it("never hides cards on first render (server/no-JS safe)", () => {
    const { container } = render(<Reveal stagger className="grid"><div>A</div><div>B</div></Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("data-stagger", "true");
    expect(el.dataset["reveal"]).not.toBe("pending");
    expect(screen.getByText("A")).toBeVisible();
  });
});

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
