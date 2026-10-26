import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FounderCard } from "@/components/founder-card";

const props = {
  jpg: "/p.jpg", webp: "/p.webp", width: 560, height: 700,
  alt: "Portrait d'Ali Taboubi, fondateur de SkillLoop", name: "Ali Taboubi", role: "Fondateur de SkillLoop",
  quote: "« Les talents sont déjà là. SkillLoop les rend visibles. »", revealLabel: "Afficher le mot d'Ali Taboubi",
};

describe("founder card", () => {
  it("shows the name and role without any interaction, and the portrait with its alt text and reserved size", () => {
    render(<FounderCard {...props} />);
    expect(screen.getByText("Ali Taboubi")).toBeInTheDocument();
    expect(screen.getByText("Fondateur de SkillLoop")).toBeInTheDocument();
    const img = screen.getByAltText(props.alt);
    expect(img).toHaveAttribute("width", "560");
    expect(img).toHaveAttribute("height", "700");
    // The grayscale copy is decorative only.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("toggles the note with a real button (touch and keyboard)", () => {
    render(<FounderCard {...props} />);
    const btn = screen.getByRole("button", { name: props.revealLabel });
    const note = screen.getByText(props.quote);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveAttribute("aria-controls", note.id);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("never reveals or cycles on its own", () => {
    vi.useFakeTimers();
    render(<FounderCard {...props} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    vi.useRealTimers();
  });
});
