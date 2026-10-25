import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { ShareKit } from "@/components/share-kit";
import { LoopProgress } from "@/components/brand";
import { absoluteUrl, profilePath, servicePath, whatsappShareUrl } from "@/lib/share";

describe("share links", () => {
  it("builds public URLs without tracking parameters", () => {
    expect(absoluteUrl(servicePath("s1"), "https://skillloop.tn")).toBe("https://skillloop.tn/services/s1");
    expect(absoluteUrl("pros/p1", "https://skillloop.tn")).toBe("https://skillloop.tn/pros/p1");
    expect(profilePath("p1")).toBe("/pros/p1");
  });
  it("encodes the WhatsApp text, including Arabic", () => {
    const u = whatsappShareUrl("شوف الخدمة متاعي على SkillLoop:", "https://skillloop.tn/services/s1");
    expect(u.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(u.split("text=")[1]!)).toBe("شوف الخدمة متاعي على SkillLoop: https://skillloop.tn/services/s1");
  });
});

const kit = (full = false) => render(<I18nProvider><ShareKit full={full} path="/pros/p1" title="Amel" text="share_profile_text" label="share_profile" /></I18nProvider>);

describe("ShareKit", () => {
  afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, "share"); });

  it("copies the absolute public link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    kit();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien" })); });
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/pros/p1`);
  });

  it("falls back to selecting the visible link when copying is refused", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    kit(true);
    const input = screen.getByLabelText("Lien public") as HTMLInputElement;
    const select = vi.spyOn(input, "select");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien" })); });
    expect(select).toHaveBeenCalled();
    expect(input.value).toBe(`${window.location.origin}/pros/p1`);
  });

  it("offers native Share only where the browser supports it", () => {
    kit();
    expect(screen.queryByRole("button", { name: "Partager" })).toBeNull();
  });

  it("shows native Share when available and passes the real link", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    kit();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Partager" })); });
    expect(share).toHaveBeenCalledWith({ title: "Amel", text: "Mon profil professionnel sur SkillLoop :", url: `${window.location.origin}/pros/p1` });
  });

  it("links to WhatsApp with the text and URL in a new tab", () => {
    kit();
    const a = screen.getByRole("link", { name: "WhatsApp" });
    expect(a).toHaveAttribute("target", "_blank");
    expect(decodeURIComponent(a.getAttribute("href")!.split("text=")[1]!)).toBe(`Mon profil professionnel sur SkillLoop : ${window.location.origin}/pros/p1`);
  });
});

describe("LoopProgress", () => {
  it("reports real progress to assistive tech and fills the loop proportionally", () => {
    const { container } = render(<LoopProgress value={3} total={4} label="Profil complété : 3 sur 4" />);
    const bar = screen.getByRole("progressbar", { name: "Profil complété : 3 sur 4" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(container.querySelector(".loop-progress")).toHaveAttribute("stroke-dasharray", "0.75 1");
  });
  it("never overfills", () => {
    const { container } = render(<LoopProgress value={9} total={4} label="x" />);
    expect(container.querySelector(".loop-progress")).toHaveAttribute("stroke-dasharray", "1 1");
  });
});
