import { useEffect, useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { C } from "../lib/theme";
import { signIn, signUp, resendConfirmation, requestPasswordReset } from "../lib/api";

// Sign-up / sign-in screen. Passwords are handed straight to Supabase Auth and
// never stored, logged, or echoed back by the app.
export default function AuthScreen({ authError = "" }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(authError);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resetRequest, setResetRequest] = useState(false); // false | "form" | "sent"
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((resendAt - clockNow) / 1000));
  const beginCooldown = () => {
    const time = Date.now();
    setClockNow(time);
    setResendAt(time + 60000);
  };
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setClockNow(time);
      // Stop ticking once the cooldown has actually run out — resendAt
      // itself never resets to 0, so without this the interval would keep
      // re-rendering the screen every second indefinitely.
      if (time >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const resend = async () => {
    if (busy || cooldown) return;
    setBusy(true);
    setError("");
    try {
      await resendConfirmation(confirmationEmail);
      setInfo(
        "Un nouveau lien a été demandé. Vérifie ta boîte mail et tes indésirables.",
      );
      beginCooldown();
    } catch (e) {
      setError(translateAuthError(e));
      if (/rate limit|too many/i.test(e.message)) beginCooldown();
    } finally {
      setBusy(false);
    }
  };
  const [info, setInfo] = useState("");

  const requestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setResetError("Renseigne ton email.");
      return;
    }
    setResetBusy(true);
    setResetError("");
    try {
      await requestPasswordReset(email.trim());
      setResetRequest("sent");
    } catch (err) {
      setResetError(translateAuthError(err));
    } finally {
      setResetBusy(false);
    }
  };

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
            "La confirmation de ton adresse est nécessaire pour continuer.",
          );
          setConfirmationEmail(email.trim());
          beginCooldown();
          setMode("signin");
          setPassword("");
        }
        // Otherwise the auth listener in App swaps this screen for the app.
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(translateAuthError(err));
      if (/email not confirmed/i.test(err.message || ""))
        setConfirmationEmail(email.trim());
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
        <h1
          className="au-logo text-4xl mb-2"
          style={{ fontWeight: 600, color: C.text }}
        >
          <span style={{ color: C.amber }}>Ø</span>RE
        </h1>
        <p
          style={{
            color: C.textFaint,
            letterSpacing: "0.2em",
            fontSize: "10px",
          }}
          className="mb-6"
        >
          TRAIN · TRACK · PROGRESS
        </p>
        <p style={{ color: C.textDim }} className="mb-6 text-sm">
          {mode === "signup"
            ? "Crée ton compte"
            : "Connecte-toi pour continuer"}
        </p>

        {resetRequest ? (
          <section
            className="w-full flex flex-col gap-4 text-center"
            aria-label="Réinitialiser le mot de passe"
          >
            {resetRequest === "sent" ? (
              <>
                <MailCheck size={40} className="mx-auto" />
                <h2 className="text-2xl font-semibold">Vérifie ta boîte mail</h2>
                <p className="muted text-sm">
                  Si un compte existe pour <strong>{email.trim()}</strong>, un
                  lien de réinitialisation vient de lui être envoyé.
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setResetRequest(false);
                    setResetError("");
                  }}
                >
                  Retour à la connexion
                </button>
              </>
            ) : (
              <form
                onSubmit={requestReset}
                className="w-full max-w-xs flex flex-col gap-2.5 text-left mx-auto"
              >
                <p className="muted text-sm mb-1">
                  On t’enverra un lien pour choisir un nouveau mot de passe.
                </p>
                <input
                  className="au-input px-3 py-2.5 rounded-xl text-sm"
                  aria-label="Adresse e-mail"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {resetError && (
                  <div style={{ color: C.rust }} className="text-xs">
                    {resetError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={resetBusy}
                  style={{
                    background: C.amber,
                    color: C.signalInk,
                    opacity: resetBusy ? 0.6 : 1,
                  }}
                  className="py-3 rounded-full font-semibold text-sm mt-1"
                >
                  {resetBusy ? "…" : "Envoyer le lien"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setResetRequest(false);
                    setResetError("");
                  }}
                >
                  Retour à la connexion
                </button>
              </form>
            )}
          </section>
        ) : confirmationEmail ? (
          <section
            className="w-full flex flex-col gap-4 text-center"
            aria-label="Confirmation de l’adresse e-mail"
          >
            <MailCheck size={40} className="mx-auto" />
            <h2 className="text-2xl font-semibold">Vérifie ta boîte mail</h2>
            <p className="muted text-sm">
              Un lien de confirmation a été demandé pour{" "}
              <strong>{confirmationEmail}</strong>. Ouvre-le pour activer ton
              compte.
            </p>
            <p className="muted text-xs">
              Pense aussi aux courriers indésirables. Le lien est à usage
              unique.
            </p>
            {info && (
              <p className="notice text-sm" role="status">
                {info}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary"
              disabled={busy || cooldown > 0}
              onClick={resend}
            >
              {cooldown
                ? `Renvoyer dans ${cooldown} s`
                : busy
                  ? "Envoi…"
                  : "Renvoyer le lien"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setConfirmationEmail("");
                setInfo("");
                setError("");
                setMode("signin");
              }}
            >
              Retour à la connexion
            </button>
            <button
              className="text-button"
              onClick={() => {
                setConfirmationEmail("");
                setInfo("");
                setError("");
                setMode("signup");
              }}
            >
              Corriger mon adresse
            </button>
          </section>
        ) : (
          <>
            <form
              onSubmit={submit}
              className="w-full max-w-xs flex flex-col gap-2.5"
            >
              {mode === "signup" && (
                <input
                  className="au-input px-3 py-2.5 rounded-xl text-sm"
                  aria-label="Prénom (optionnel)"
                  placeholder="Prénom (optionnel)"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              )}
              <input
                className="au-input px-3 py-2.5 rounded-xl text-sm"
                aria-label="Adresse e-mail"
                required
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
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  aria-label="Mot de passe"
                  required
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ color: C.textFaint }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  aria-label={
                    showPw
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setResetRequest("form");
                    setError("");
                    setInfo("");
                  }}
                  style={{ color: C.textDim }}
                  className="text-xs self-end underline"
                >
                  Mot de passe oublié ?
                </button>
              )}

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
                style={{
                  background: C.amber,
                  color: C.signalInk,
                  opacity: busy ? 0.6 : 1,
                }}
                className="py-3 rounded-full font-semibold text-sm mt-1"
              >
                {busy
                  ? "…"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : "Se connecter"}
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
          </>
        )}
      </div>
    </div>
  );
}

function translateAuthError(err) {
  const msg = (err && err.message) || String(err);
  if (/invalid login credentials/i.test(msg))
    return "Email ou mot de passe incorrect.";
  if (/user already registered/i.test(msg))
    return "Un compte existe déjà avec cet email.";
  if (/email not confirmed/i.test(msg))
    return "Adresse non confirmée. Vérifie ta boîte mail.";
  if (/rate limit|too many requests/i.test(msg))
    return "Trop de tentatives. Réessaie dans un moment.";
  if (/password/i.test(msg) && /at least/i.test(msg))
    return "Mot de passe trop court (8 caractères minimum).";
  return msg;
}
