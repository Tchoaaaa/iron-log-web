// Pure display-formatting helpers — no state, no side effects.

export function formatRest(seconds) {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}min${seconds % 60}`;
}

// repos affiché en mm:ss dans l'écran de séance (formatRest reste utilisé ailleurs)
export function fmtRestMMSS(seconds) {
  const s = Number(seconds) || 0;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// "mercredi, 9 sept."
export function fmtDayDate(ts) {
  const s = new Date(ts).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  return s.replace(/^(\S+)\s/, "$1, ");
}

export function fmtDur(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m > 0 ? m + " min" : ""}`.trim();
}

// live workout chrono: "MM:SS" or "H:MM:SS"
export function fmtTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function fmtNum(n) {
  return Number(n).toLocaleString("fr-FR");
}

// tonnage d'affichage : le volume enregistré est en kg (Σ poids×reps).
// < 1 tonne -> kg ; sinon -> tonnes, pour éviter les nombres à rallonge.
export function fmtVolume(kg) {
  const n = Number(kg) || 0;
  if (n < 1000) return `${Math.round(n)} kg`;
  const t = n / 1000;
  return `${t < 100 ? t.toFixed(2) : Math.round(t)} T`;
}
