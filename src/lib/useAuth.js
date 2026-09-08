import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Tracks the Supabase auth session. `loading` is true until the first check
// resolves; `session` is null when signed out, or the session object when
// signed in. No password is ever kept here — Supabase stores only the JWT.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
