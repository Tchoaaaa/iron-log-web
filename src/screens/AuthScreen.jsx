import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { C } from "../lib/theme";
import { signIn, signUp } from "../lib/api";

// Sign-up / sign-in screen. Passwords are handed straight to Supabase Auth and
// never stored, logged, or echoed back by the app.
export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("Renseigne ton email et ton mot de passe.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await signUp({
          email: email.trim(),
          password,
          displayName,
        });
        if (needsConfirmation) {
          setInfo(
            "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi."
          );
          setMode("signin");
          setPassword("");
        }
        // Otherwise the auth listener in App swaps this screen for the app.
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100dvh" }} className="w-full flex justify-center">
      <div
        style={{
          color: C.text,
          fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif',
          maxWidth: 430,
          minHeight: "100dvh",
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
        className="w-full flex flex-col items-center justify-center px-6"
      >
        <style>{`
          .au-input { background: ${C.surfaceRaised}; border: 1px solid ${C.line}; color: ${C.text}; }
          .au-input::placeholder { color: ${C.textFaint}; }
          .au-input:focus { outline: none; border-color: ${C.amber}; }
          .au-logo { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.28em; }
        `}</style>

        <div
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
        >
          <span
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `3px solid ${C.amber}`,
              display: "inline-block",
            }}
          />
        </div>
        <h1 className="au-logo text-4xl mb-2" style={{ fontWeight: 600, color: C.text }}>
          ORE
        </h1>
        <p style={{ color: C.textFaint, letterSpacing: "0.2em", fontSize: "10px" }} className="mb-6">
          TRAIN · TRACK · PROGRESS
        </p>
        <p style={{ color: C.textDim }} className="mb-6 text-sm">
          {mode === "signup" ? "Crée ton compte" : "Connecte-toi pour continuer"}
        </p>

        <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-2.5">
          {mode === "signup" && (
            <input
              className="au-input px-3 py-2.5 rounded-xl text-sm"
              placeholder="Prénom (optionnel)"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="au-input px-3 py-2.5 rounded-xl text-sm"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              className="au-input w-full px-3 py-2.5 pr-10 rounded-xl text-sm"
              type={showPw ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{ color: C.textFaint }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div style={{ color: C.rust }} className="text-xs">
              {error}
            </div>
          )}
          {info && (
            <div style={{ color: C.steel }} className="text-xs">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ background: C.amber, color: C.text, opacity: busy ? 0.6 : 1 }}
            className="py-3 rounded-full font-semibold text-sm mt-1"
          >
            {busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
            setInfo("");
          }}
          style={{ color: C.textDim }}
          className="text-xs mt-4 underline"
        >
          {mode === "signup"
            ? "J'ai déjà un compte — me connecter"
            : "Pas encore de compte — m'inscrire"}
        </button>

      </div>
    </div>
  );
}

function translateAuthError(err) {
  const msg = (err && err.message) || String(err);
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/user already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/email not confirmed/i.test(msg))
    return "Adresse non confirmée. Vérifie ta boîte mail.";
  if (/rate limit|too many requests/i.test(msg))
    return "Trop de tentatives. Réessaie dans un moment.";
  if (/password/i.test(msg) && /at least/i.test(msg))
    return "Mot de passe trop court (8 caractères minimum).";
  return msg;
}
