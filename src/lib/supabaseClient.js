import { createClient } from "@supabase/supabase-js";

// Both values come from `.env` (see `.env.example`). They are client-side by
// design: the publishable key is only useful alongside Row Level Security,
// which `supabase-schema.sql` turns on for every table. The secret /
// service_role key is never referenced anywhere in this app.
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Configuration Supabase manquante. Copie .env.example vers .env et renseigne " +
      "VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
