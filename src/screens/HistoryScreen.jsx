import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  SlidersHorizontal,
  Trash2,
  Plus,
} from "lucide-react";
import { fmtDate, fmtDur, fmtVolume, fmtNum } from "../lib/format";
import {
  volumeOfExercises,
  computePrCountByWorkoutId,
  computeHistoryMonths,
} from "../lib/workoutMath";
import { EMPTY_FILTERS, filterWorkouts } from "../lib/historyFilters";
import Drawer from "../components/Drawer";

export default function HistoryScreen({
  workouts,
  expandedHistory,
  setExpandedHistory,
  onEditWorkout,
  onDeleteWorkout,
  onStartWorkout,
  filters,
  setFilters,
  onBack,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const counts = useMemo(() => computePrCountByWorkoutId(workouts), [workouts]);
  const filtered = useMemo(
    () => filterWorkouts(workouts, filters),
    [workouts, filters],
  );
  const months = useMemo(() => computeHistoryMonths(filtered), [filtered]);
  const selected = workouts.find((w) => w.id === expandedHistory);
  const applied = Object.entries(filters).filter(([k, v]) =>
    k === "type" ? v !== "all" : !!v,
  ).length;
  if (selected)
    return (
      <section className="flex flex-col gap-5">
        <button
          className="text-button justify-start"
          onClick={() => {
            setDeleting(false);
            setExpandedHistory(null);
            onBack?.();
          }}
        >
          <ArrowLeft size={17} /> Retour
        </button>
        <div>
          <p className="eyebrow">SÉANCE ENREGISTRÉE</p>
          <h1 className="page-title mt-2">{selected.name || "Séance libre"}</h1>
          <p className="muted text-sm mt-2">{fmtDate(selected.date)}</p>
        </div>
        <div className="session-stats">
          <div>
            <small>Durée</small>
            <strong>{fmtDur(selected.durationMin)}</strong>
          </div>
          <div>
            <small>Volume</small>
            <strong>{fmtVolume(volumeOfExercises(selected.exercises))}</strong>
          </div>
          <div>
            <small>Records</small>
            <strong>{counts[selected.id] || 0}</strong>
          </div>
        </div>
        {selected.exercises.map((ex, index) => (
          <article key={index} className="exercise-card">
            {ex.superset && <p className="eyebrow mb-2">SUPERSET</p>}
            <h2 className="font-semibold">{ex.name}</h2>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Série</th>
                  <th>Charge</th>
                  <th>Reps</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((s, i) => (
                  <tr key={i}>
                    <td>{String(i + 1).padStart(2, "0")}</td>
                    <td>{fmtNum(s.weight)} kg</td>
                    <td>{s.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
        <button className="secondary" onClick={() => onEditWorkout(selected)}>
          <Pencil size={16} /> Modifier la séance
        </button>
        <button className="text-button error" onClick={() => setDeleting(true)}>
          <Trash2 size={16} /> Supprimer la séance
        </button>
        {deleting && (
          <Drawer
            title="Supprimer cette séance ?"
            onClose={() => setDeleting(false)}
            busy={busy}
          >
            <p className="muted text-sm mb-5">
              Les résultats de « {selected.name || "Séance libre"} » du{" "}
              {fmtDate(selected.date)} seront supprimés.
            </p>
            {error && (
              <p role="alert" className="error mb-3">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                className="secondary flex-1"
                disabled={busy}
                onClick={() => setDeleting(false)}
              >
                Annuler
              </button>
              <button
                className="primary flex-1"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const ok = await onDeleteWorkout(selected.id);
                    if (ok !== false) {
                      setDeleting(false);
                      setExpandedHistory(null);
                    } else setError("Suppression impossible. Réessaie.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </Drawer>
        )}
      </section>
    );
  return (
    <section>
      <div className="section-heading mb-4">
        <p className="muted text-sm">
          {filtered.length} séance{filtered.length > 1 ? "s" : ""}
        </p>
        <button
          className="secondary compact"
          onClick={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        >
          <SlidersHorizontal size={16} /> Filtres
          {applied ? ` (${applied})` : ""}
        </button>
      </div>
      {applied > 0 && (
        <button
          className="text-button mb-4"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          Réinitialiser les filtres
        </button>
      )}
      {workouts.length === 0 ? (
        <div className="empty-state">
          <h2>Ta première séance t’attend.</h2>
          <p>Retrouve ici tes entraînements et leur progression.</p>
          <button className="primary" onClick={onStartWorkout}>
            <Plus size={17} /> Démarrer une séance
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h2>Aucune séance sur cette sélection.</h2>
          <p>Essaie d’élargir la période ou de changer le type.</p>
          <button
            className="secondary"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Effacer les filtres
          </button>
        </div>
      ) : (
        months.map((month) => (
          <div key={month.key} className="mb-6">
            <h2 className="eyebrow mb-2">{month.label}</h2>
            {month.items.map((w) => (
              <button
                className="list-row"
                key={w.id}
                onClick={() => setExpandedHistory(w.id)}
              >
                <span>
                  <strong>{w.name || "Séance libre"}</strong>
                  <small>{fmtDate(w.date)}</small>
                  <span className="il-num text-sm block mt-3">
                    {fmtDur(w.durationMin)} ·{" "}
                    {fmtVolume(volumeOfExercises(w.exercises))}
                    {counts[w.id] > 0 ? ` · ${counts[w.id]} PR` : ""}
                  </span>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        ))
      )}
      {filterOpen && (
        <Drawer
          title="Filtrer l’historique"
          onClose={() => setFilterOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(draft);
              setFilterOpen(false);
            }}
            className="flex flex-col gap-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="field">
                Du
                <input
                  className="il-input"
                  type="date"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label className="field">
                Au
                <input
                  className="il-input"
                  type="date"
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              Type de séance
              <select
                className="il-input"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              >
                <option value="all">Tous les types</option>
                <option value="free">Séance libre</option>
                <option value="template">Séance nommée</option>
                <option value="superset">Avec superset</option>
              </select>
            </label>
            <label className="field">
              Séance
              <select
                className="il-input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              >
                <option value="">Toutes les séances</option>
                {[...new Set(workouts.map((w) => w.name).filter(Boolean))].map(
                  (name) => (
                    <option key={name}>{name}</option>
                  ),
                )}
              </select>
            </label>
            <button
              className="primary"
              disabled={!!draft.from && !!draft.to && draft.from > draft.to}
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setDraft(EMPTY_FILTERS)}
            >
              Tout réinitialiser
            </button>
          </form>
        </Drawer>
      )}
    </section>
  );
}
