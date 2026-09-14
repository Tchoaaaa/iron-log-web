import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { C } from "../lib/theme";
import { updatePassword } from "../lib/api";

// Shown instead of the app whenever the current session came from a
// password-recovery email link (see useAuth's PASSWORD_RECOVERY handling).
export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (err) {
      setError(err.message || "Le mot de passe n’a pas pu être mis à jour.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ background: C.bg, minHeight: "100dvh" }}
      className="w-full flex justify-center"
    >
      <div
        style={{
          color: C.text,
          fontFamily:
            '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif',
          maxWidth: 430,
          minHeight: "100dvh",
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
        className="w-full flex flex-col items-center justify-center px-6"
      >
        <style>{`
          .au-input { background: ${C.surfaceRaised}; border: 1px solid var(--c-control-border); color: ${C.text}; font-size: 16px; }
          .au-input::placeholder { color: ${C.textFaint}; }
          .au-input:focus { outline: none; border-color: ${C.amber}; }
        `}</style>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: C.text }}>
          Choisis un nouveau mot de passe
        </h1>
        <p style={{ color: C.textDim }} className="mb-6 text-sm text-center">
          Ce mot de passe remplacera l’ancien pour ton compte.
        </p>
        <form
          onSubmit={submit}
          className="w-full max-w-xs flex flex-col gap-2.5"
        >
          <div className="relative">
            <input
              className="au-input w-full px-3 py-2.5 pr-10 rounded-xl text-sm"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              aria-label="Nouveau mot de passe"
              required
              placeholder="Nouveau mot de passe"
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
          <input
            className="au-input px-3 py-2.5 rounded-xl text-sm"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            aria-label="Confirme le nouveau mot de passe"
            required
            placeholder="Confirme le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && (
            <div style={{ color: C.rust }} className="text-xs">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              background: C.amber,
              color: C.signalInk,
              opacity: busy ? 0.6 : 1,
            }}
            className="py-3 rounded-full font-semibold text-sm mt-1"
          >
            {busy ? "…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
