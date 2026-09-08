import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ShieldCheck, Users, Dumbbell, Activity, RefreshCw } from "lucide-react";
import { C } from "../lib/theme";
import { adminOverview, adminUserStats } from "../lib/api";

// Admin-only space. It is a separate screen, but the real boundary is in the
// database: admin_overview() / admin_user_stats() raise "not authorized" for
// non-admins, and Row Level Security blocks any cross-user table read. A
// non-admin flipping client state still gets nothing back.
export default function AdminDashboard({ onExit, email }) {
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, us] = await Promise.all([adminOverview(), adminUserStats()]);
      setOverview(ov);
      setRows(us);
    } catch (err) {
      setError(
        /not authorized/i.test((err && err.message) || "")
          ? "Accès refusé : ce compte n'a pas le rôle administrateur."
          : (err && err.message) || "Erreur de chargement."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmtDate = (v) =>
    v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const num = (v) => Number(v || 0);

  const kpis = useMemo(() => {
    if (!overview) return [];
    return [
      { label: "Utilisateurs", value: num(overview.total_users), icon: Users, color: C.steel },
      { label: "Séances totales", value: num(overview.total_workouts), icon: Dumbbell, color: C.amber },
      { label: "Actifs (7 j)", value: num(overview.active_7d), icon: Activity, color: C.water },
      { label: "Actifs (30 j)", value: num(overview.active_30d), icon: Activity, color: C.moss },
      { label: "Séances (7 j)", value: num(overview.workouts_7d), icon: Dumbbell, color: C.rust },
      {
        label: "Volume cumulé",
        value: num(overview.total_volume).toLocaleString("fr-FR") + " kg",
        icon: Activity,
        color: C.steel,
      },
    ];
  }, [overview]);

  return (
    <div style={{ background: C.bg, minHeight: 600 }} className="w-full flex justify-center">
      <div
        style={{ color: C.text, fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 720 }}
        className="w-full flex flex-col"
      >
        <style>{`
          .ad-card { background: ${C.surface}; border: 1px solid ${C.line}; }
          .ad-num { font-variant-numeric: tabular-nums; font-family: "SF Mono", ui-monospace, Menlo, monospace; }
        `}</style>

        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: C.steel }} />
            <span style={{ fontWeight: 700 }}>Espace administrateur</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              style={{ color: C.textDim }}
              className="flex items-center gap-1 text-xs"
              title="Recharger"
            >
              <RefreshCw size={13} /> Recharger
            </button>
            <button
              onClick={onExit}
              style={{ color: C.textDim }}
              className="flex items-center gap-1 text-xs"
            >
              <ChevronLeft size={14} /> Retour à l'app
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <div
            style={{ background: C.surfaceRaised, border: `1px solid ${C.line}`, color: C.textDim }}
            className="rounded-2xl p-3 text-xs leading-relaxed"
          >
            Connecté en tant qu'<strong>{email}</strong>. Ce tableau de bord n'affiche que les
            données nécessaires à son fonctionnement : email, nom affiché, date d'inscription et
            statistiques d'activité agrégées. Il n'expose aucun mot de passe et n'utilise aucune
            clé secrète — tout passe par des fonctions serveur restreintes aux administrateurs.
          </div>

          {error && (
            <div
              style={{ background: C.surface, border: `1px solid ${C.rust}`, color: C.rust }}
              className="rounded-2xl p-3 text-sm"
            >
              {error}
            </div>
          )}

          {loading && !overview && (
            <div style={{ color: C.textDim }} className="text-sm py-10 text-center">
              Chargement…
            </div>
          )}

          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {kpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="ad-card rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon size={14} style={{ color: k.color }} />
                      <span style={{ color: C.textDim }} className="text-xs">
                        {k.label}
                      </span>
                    </div>
                    <div className="ad-num text-2xl" style={{ fontWeight: 700 }}>
                      {k.value}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rows.length > 0 && (
            <div className="ad-card rounded-2xl overflow-hidden">
              <div
                style={{ color: C.textDim, borderBottom: `1px solid ${C.line}` }}
                className="text-xs px-4 py-2 font-semibold"
              >
                Utilisateurs & activité
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: C.textFaint }} className="text-xs text-left">
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Nom</th>
                      <th className="px-4 py-2 font-medium">Inscrit le</th>
                      <th className="px-4 py-2 font-medium text-right">Séances</th>
                      <th className="px-4 py-2 font-medium">Dernière séance</th>
                      <th className="px-4 py-2 font-medium text-right">Volume (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td className="px-4 py-2">{r.email}</td>
                        <td className="px-4 py-2">{r.display_name || "—"}</td>
                        <td className="px-4 py-2">{fmtDate(r.signed_up_at)}</td>
                        <td className="px-4 py-2 text-right ad-num">{num(r.workout_count)}</td>
                        <td className="px-4 py-2">{fmtDate(r.last_workout_at)}</td>
                        <td className="px-4 py-2 text-right ad-num">
                          {num(r.total_volume).toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
