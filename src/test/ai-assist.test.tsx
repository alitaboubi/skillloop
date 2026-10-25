import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AiAssist } from "@/components/ai-assist";
import { notConnectedAdapter, type OfferAssistAdapter } from "@/lib/ai/offer-assist";

function Harness({ initial = "", adapter, field = "description" as const, onChange }: { initial?: string; adapter: OfferAssistAdapter; field?: "description" | "deliverables"; onChange?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <I18nProvider>
      <output data-testid="value">{v}</output>
      <AiAssist field={field} value={v} onApply={(n) => { setV(n); onChange?.(n); }} context={{}} adapter={adapter} cooldownMs={0} />
    </I18nProvider>
  );
}
const ok = (text: string): OfferAssistAdapter => vi.fn(async () => ({ status: "success" as const, text }));
const open = () => fireEvent.click(screen.getByRole("button", { name: /Aide à la rédaction/ }));
const brief = (v = "Je répare les fuites et installe des chauffe-eau.") => fireEvent.change(screen.getByLabelText(/Décrivez votre service|Que faut-il améliorer/), { target: { value: v } });
const suggest = () => fireEvent.click(screen.getByRole("button", { name: /Proposer un texte|Proposer une autre version/ }));

describe("AI writing helper", () => {
  it("opens with the brief focused and closes with Escape, changing nothing", () => {
    const onChange = vi.fn();
    render(<Harness adapter={ok("x")} onChange={onChange} />);
    open();
    expect(screen.getByLabelText(/Décrivez votre service/)).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText(/Décrivez votre service/), { key: "Escape" });
    expect(screen.queryByLabelText(/Décrivez votre service/)).toBeNull();
    expect(screen.getByRole("button", { name: /Aide à la rédaction/ })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("asks for a real brief before calling the service", () => {
    const adapter = ok("x");
    render(<Harness adapter={adapter} />);
    open();
    brief("fuite");
    suggest();
    expect(screen.getByText(/au moins 10 caractères/)).toBeInTheDocument();
    expect(adapter).not.toHaveBeenCalled();
  });

  it("says honestly that writing help is unavailable and leaves the field alone", async () => {
    const onChange = vi.fn();
    render(<Harness adapter={notConnectedAdapter} onChange={onChange} />);
    open();
    brief();
    suggest();
    expect(await screen.findByText("L’aide à la rédaction est indisponible pour le moment")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Utiliser ce texte" })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a daily limit says so (not 'wait a few seconds'); a short cooldown says to wait", async () => {
    render(<Harness adapter={async () => ({ status: "error", reason: "rate_limited", limit: "user_limit" })} />);
    open();
    brief();
    suggest();
    expect(await screen.findByText(/Limite du jour atteinte pour l’aide à la rédaction/)).toBeInTheDocument();
  });

  it("a server cooldown keeps the short 'wait' message", async () => {
    render(<Harness adapter={async () => ({ status: "error", reason: "rate_limited", limit: "cooldown" })} />);
    open();
    brief();
    suggest();
    expect(await screen.findByText("Patientez quelques secondes avant une nouvelle demande.")).toBeInTheDocument();
  });

  it("the text language is chosen separately (defaults to the interface language) and is what gets sent", async () => {
    const adapter = vi.fn(async () => ({ status: "success" as const, text: "Texte" }));
    render(<Harness adapter={adapter} />);
    open();
    expect(screen.getByRole("radio", { name: "Français" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "العربية التونسية" }));
    brief("ena plombier fi soussa nصلح fuites w nركب chauffe-eau");
    suggest();
    await screen.findByLabelText("Suggestion");
    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({ lang: "ar" }));
    expect(screen.getByText("Langue du texte proposé")).toBeInTheDocument(); // the interface stayed in French
  });

  it("tells the user not to type contact details", () => {
    render(<Harness adapter={notConnectedAdapter} />);
    open();
    expect(screen.getByText(/N’y mettez pas vos coordonnées/)).toBeInTheDocument();
  });

  it("inserts the edited suggestion into an empty field only when asked", async () => {
    render(<Harness adapter={ok("Réparation de fuites")} />);
    open();
    brief();
    suggest();
    const box = await screen.findByLabelText("Suggestion");
    expect(screen.getByTestId("value")).toHaveTextContent("");
    fireEvent.change(box, { target: { value: "Réparation de fuites à domicile" } });
    fireEvent.click(screen.getByRole("button", { name: "Utiliser ce texte" }));
    expect(screen.getByTestId("value")).toHaveTextContent("Réparation de fuites à domicile");
  });

  it("requires confirmation before replacing existing text; cancel keeps it", async () => {
    render(<Harness initial="Mon texte à moi" adapter={ok("Texte proposé")} />);
    open();
    suggest(); // improve mode is preselected for a field with text, brief optional
    await screen.findByLabelText("Suggestion");
    fireEvent.click(screen.getByRole("button", { name: "Remplacer mon texte" }));
    expect(screen.getByText(/Remplacer votre texte actuel/)).toBeInTheDocument();
    expect(screen.getByTestId("value")).toHaveTextContent("Mon texte à moi");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByTestId("value")).toHaveTextContent("Mon texte à moi");
    fireEvent.click(screen.getByRole("button", { name: "Remplacer mon texte" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, remplacer" }));
    expect(screen.getByTestId("value")).toHaveTextContent("Texte proposé");
  });

  it("appends deliverables on a new line", async () => {
    render(<Harness field="deliverables" initial="Diagnostic" adapter={ok("Devis gratuit")} />);
    open();
    suggest();
    await screen.findByLabelText("Suggestion");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter à la suite" }));
    expect(screen.getByTestId("value").textContent).toBe("Diagnostic\nDevis gratuit");
  });

  it("regenerates on request", async () => {
    const adapter = ok("Version");
    render(<Harness adapter={adapter} />);
    open();
    brief();
    suggest();
    await screen.findByLabelText("Suggestion");
    suggest();
    await screen.findByLabelText("Suggestion");
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("blocks insertion of a suggestion longer than the field allows", async () => {
    render(<Harness field="deliverables" adapter={ok("x".repeat(1001))} />);
    open();
    brief();
    suggest();
    await screen.findByLabelText("Suggestion");
    expect(screen.getByText(/Trop long pour ce champ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Utiliser ce texte" })).toBeDisabled();
  });

  it("shows a recoverable error when the service fails", async () => {
    render(<Harness adapter={async () => { throw new Error("down"); }} />);
    open();
    brief();
    suggest();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Impossible d’obtenir une suggestion/);
  });
});
