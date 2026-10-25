import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { clearOfferDraft, clearWizardDraft } from "@/lib/offer-draft";
import { clearReturnTo, takeOAuthReturn } from "@/lib/return-to";

type Ctx = { user: User | null; session: Session | null; ready: boolean };
const AuthContext = createContext<Ctx>({ user: null, session: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const lastUser = useRef<string | null>(null);
  useEffect(() => {
    const apply = (s: Session | null) => {
      const id = s?.user.id ?? null;
      // Signed out, or another account signed in: drop every cached query so nothing from the previous user lingers.
      if (lastUser.current && lastUser.current !== id) qc.clear();
      lastUser.current = id;
      setSession(s);
      setReady(true);
    };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => data.subscription.unsubscribe();
  }, [qc]);
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, ready }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Sign out cleanly: end the session, forget cached data and unsent drafts in this tab, go home, confirm. */
export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  return async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(t("err_generic")); return; }
    qc.clear();
    clearOfferDraft();
    clearWizardDraft();
    clearReturnTo();
    navigate({ to: "/" });
    toast.success(t("signed_out"));
  };
}

/** Completes "pick up where you left off" after a Google redirect lands back in the app with a new session. */
export function ReturnAfterOAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    if (!user) return;
    // On /login and /signup the auth card finishes the trip itself (popup flow).
    if (/^\/(login|signup)\b/.test(window.location.pathname)) return;
    const back = takeOAuthReturn();
    if (!back) return;
    navigate({ href: back, replace: true });
    toast.success(t("welcome_back_resume"));
  }, [user, navigate, t]);
  return null;
}
