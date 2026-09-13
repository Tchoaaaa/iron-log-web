import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Tracks the Supabase auth session. `loading` is true until the first check
// resolves; `session` is null when signed out, or the session object when
// signed in. No password is ever kept here — Supabase stores only the JWT.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.has('error') ? 'Ce lien est expiré ou invalide. Connecte-toi pour demander un nouveau lien de confirmation.' : '';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError("Le lien ou la session n’a pas pu être vérifié. Réessaie de te connecter.");
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    }).catch(() => { if (active) { setError("Connexion indisponible. Réessaie."); setLoading(false); } });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, error };
}
