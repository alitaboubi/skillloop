import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { TrustBadge, FirstVisitEmpty } from "@/components/states";
import { NotifyMe } from "@/components/notify-me";
import { isEmail, submitNotify } from "@/lib/notify-me";
import { proNoun } from "@/lib/pro-noun";
import { rowToService } from "@/lib/services-db";

vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>,
}));

const wrap = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe("levels of proof", () => {
  it("uses the approved labels in all three languages", () => {
    expect([dictionaries.fr.proof_declared, dictionaries.fr.proof_confirmed, dictionaries.fr.proof_verified]).toEqual(["Déclaré", "Confirmé par un client", "Vérifié par SkillLoop"]);
    expect([dictionaries.en.proof_declared, dictionaries.en.proof_confirmed, dictionaries.en.proof_verified]).toEqual(["Declared", "Confirmed by a client", "Verified by SkillLoop"]);
    expect([dictionaries.ar.proof_declared, dictionaries.ar.proof_confirmed, dictionaries.ar.proof_verified]).toEqual(["مُعلَن", "مؤكَّد من زبون", "مُتحقَّق منه من SkillLoop"]);
  });
  it("says its level in words (not colour alone) and explains it", () => {
    wrap(<TrustBadge level="declared" />);
    expect(screen.getByText("Déclaré")).toBeInTheDocument();
    expect(screen.getByText(/non vérifiée par SkillLoop/)).toBeInTheDocument();
  });
});

describe("pro wording", () => {
  it("is 'pro' in FR/EN, صنايعي for trades and محترف otherwise in Arabic", () => {
    expect(proNoun("fr", "home")).toBe("pro");
    expect(proNoun("en")).toBe("pro");
    expect(proNoun("ar", "home")).toBe("صنايعي");
    expect(proNoun("ar", "automotive")).toBe("صنايعي");
    expect(proNoun("ar", "tutoring")).toBe("محترف");
    expect(proNoun("ar")).toBe("محترف");
  });
});

describe("first-visit empty state", () => {
  it("explains SkillLoop and offers invite + publish; no email form while the notify table is off", () => {
    wrap(<FirstVisitEmpty />);
    expect(screen.getByText("SkillLoop démarre")).toBeInTheDocument();
    expect(screen.getByText("Inviter sur WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Publier mon service")).toBeInTheDocument();
    expect(screen.queryByLabelText("Votre email")).toBeNull();
  });
});

describe("Prévenez-moi", () => {
  it("validates emails", () => {
    expect(isEmail("a@b.tn")).toBe(true);
    expect(isEmail("nope")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
  });
  it("stores a trimmed, lower-cased email with the search context", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    expect(await submitNotify(insert, { email: " Ali@Mail.TN ", query: " plombier ", city: "Sousse", lang: "fr" })).toBe("ok");
    expect(insert).toHaveBeenCalledWith({ email: "ali@mail.tn", query: "plombier", city: "Sousse", lang: "fr" });
  });
  it("maps the database rate limit to a clear message", async () => {
    const insert = vi.fn(async () => ({ error: { message: "notify_limit: too many requests for this email" } }));
    expect(await submitNotify(insert, { email: "a@b.tn", lang: "fr" })).toBe("limited");
  });
  it("shows a clear confirmation after saving", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    wrap(<NotifyMe query="clim" insert={insert} />);
    fireEvent.change(screen.getByLabelText("Votre email"), { target: { value: "ali@mail.tn" } });
    fireEvent.click(screen.getByRole("button", { name: "Prévenez-moi" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ali@mail.tn"));
  });
  it("refuses an invalid email without calling the database", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    wrap(<NotifyMe insert={insert} />);
    fireEvent.change(screen.getByLabelText("Votre email"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Prévenez-moi" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Entrez une adresse email valide."));
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("expert mini-row data", () => {
  const row = { id: "s1", owner_id: "u1", title: "Clim", description: "Réparation", category: "home", price_model: "fixed", price: 50, city: "Sousse", remote: false, created_at: new Date().toISOString(), profiles: { display_name: "Karim", title: "Frigoriste", avatar_url: "u1/a.jpg", accepting: true } };
  it("carries the pro's photo and declared availability", () => {
    const s = rowToService(row, undefined, "https://signed/a.jpg");
    expect(s.providerAvatar).toBe("https://signed/a.jpg");
    expect(s.accepting).toBe(true);
    expect(s.profession).toBe("Frigoriste");
  });
  it("shows no availability when the pro never declared it", () => {
    expect(rowToService({ ...row, profiles: { display_name: "Karim" } }).accepting).toBeUndefined();
  });
});
