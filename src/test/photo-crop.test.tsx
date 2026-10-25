import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { centred, clampPos, coverScale, outputSize, sourceRect, zoomAround } from "@/lib/crop";
import { PhotoPicker } from "@/components/photo-picker";

const img = { w: 4000, h: 3000 };
const frame = { w: 400, h: 400 };

describe("crop math", () => {
  it("cover scale fills the frame on the short side", () => {
    expect(coverScale(img, frame)).toBeCloseTo(400 / 3000);
  });

  it("starts centred and never leaves an empty edge", () => {
    const s = coverScale(img, frame);
    const p = centred(img, frame, s);
    expect(p.y).toBeCloseTo(0);
    expect(p.x).toBeCloseTo((400 - 4000 * s) / 2);
    expect(clampPos({ x: 50, y: 50 }, img, frame, s)).toEqual({ x: 0, y: 0 });
    expect(clampPos({ x: -9999, y: -9999 }, img, frame, s).x).toBeCloseTo(400 - 4000 * s);
  });

  it("zooming keeps the centre point in place", () => {
    const s1 = coverScale(img, frame), s2 = s1 * 2;
    const p1 = centred(img, frame, s1);
    const p2 = zoomAround(p1, frame, s1, s2);
    // image point under the frame centre is the same before and after
    expect((200 - p1.x) / s1).toBeCloseTo((200 - p2.x) / s2);
    expect((200 - p1.y) / s1).toBeCloseTo((200 - p2.y) / s2);
  });

  it("maps the frame back to image pixels and never upscales the output", () => {
    const s = coverScale(img, frame);
    const r = sourceRect(centred(img, frame, s), frame, s);
    expect(r.sw).toBeCloseTo(3000);
    expect(r.sh).toBeCloseTo(3000);
    expect(r.sx).toBeCloseTo(500);
    expect(outputSize(r.sw, 1, 800)).toEqual({ w: 800, h: 800 });
    expect(outputSize(300, 4 / 3, 1600)).toEqual({ w: 300, h: 225 });
  });
});

describe("PhotoPicker framing step", () => {
  beforeAll(() => {
    URL.createObjectURL ??= () => "blob:test";
    URL.revokeObjectURL ??= () => {};
  });

  it("opens the framing dialog after picking; cancel changes nothing", async () => {
    const onPick = vi.fn();
    render(<I18nProvider><PhotoPicker onPick={onPick} /></I18nProvider>);
    const input = screen.getByLabelText("Choisir une photo");
    const file = new File(["x"], "photo.png", { type: "image/png" });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(await screen.findByRole("dialog", { name: "Cadrer la photo" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Zone de cadrage" })).toBeInTheDocument();
    // Apply waits for the image to load (no fake framing).
    expect(screen.getByRole("button", { name: "Utiliser ce cadrage" })).toBeDisabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Annuler" })); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("refuses a wrong file type before framing", async () => {
    const onPick = vi.fn();
    render(<I18nProvider><PhotoPicker onPick={onPick} /></I18nProvider>);
    await act(async () => { fireEvent.change(screen.getByLabelText("Choisir une photo"), { target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] } }); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });
});
