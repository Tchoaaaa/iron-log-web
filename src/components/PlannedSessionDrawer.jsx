import { useState } from "react";
import { Play } from "lucide-react";
import Drawer from "./Drawer";
import { WEEK_DAYS, localDate, weekStart } from "../lib/weeklyPlan";
import { fmtDate, fmtDur } from "../lib/format";
export default function PlannedSessionDrawer({
  row,
  weekly,
  workouts,
  onClose,
  onStart,
  onHistory,
  onEdit,
}) {
  const [destination, setDestination] = useState("");
  const [workoutId, setWorkoutId] = useState("");
  const [error, setError] = useState("");
  const linked = new Set(weekly.rows.map((r) => r.workout?.id).filter(Boolean));
  const candidates = workouts.filter(
    (w) => weekStart(localDate(w.date)) === row.weekStart && !linked.has(w.id),
  );
  const destinations = weekly.rows.filter(
    (r) => !r.slot && r.date >= weekly.today,
  );
  const execute = async (action) => {
    setError("");
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err.message || "Modification impossible.");
    }
  };
  const movedDay = WEEK_DAYS.find(
    (d) => d.key === (row.slot.movedTo || row.slot.movedFrom),
  );
  return (
    <Drawer title={row.name} onClose={onClose} busy={weekly.busy}>
      <p className="eyebrow mb-5">
        {row.label} · {fmtDate(new Date(`${row.date}T12:00:00`))}
      </p>
      {row.slot.movedTo ? (
        <div className="flex flex-col gap-4">
          <p className="muted text-sm">
            Déplacée au {movedDay?.label.toLowerCase()}. La semaine type reste
            inchangée.
          </p>
          <button
            className="secondary"
            disabled={weekly.busy}
            onClick={() => execute(() => weekly.undoMove(row.key))}
          >
            Annuler le déplacement
          </button>
        </div>
      ) : row.workout ? (
        <>
          <p className="muted text-sm mb-4">
            Séance terminée · {fmtDur(row.workout.durationMin)}
          </p>
          <button
            className="primary w-full"
            onClick={() => {
              onClose();
              onHistory(row.workout.id);
            }}
          >
            Voir la séance terminée
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          {row.missing ? (
            <>
              <p className="muted text-sm">
                Cette séance a été supprimée. Remplace-la ou retire-la du
                planning.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
              >
                Modifier la semaine
              </button>
            </>
          ) : (
            <button
              className="primary"
              onClick={() => {
                onClose();
                onStart(row);
              }}
            >
              <Play size={16} /> Démarrer cette séance
            </button>
          )}
          {row.status === "missed" && (
            <p className="muted text-sm">
              Cette séance reste prévue à sa date d’origine. Tu peux la faire
              maintenant, la déplacer ou associer un entraînement déjà terminé.
            </p>
          )}
          {row.slot.movedFrom && (
            <p className="muted text-xs">
              Prévue initialement le {movedDay?.label.toLowerCase()}.
            </p>
          )}
          {destinations.length > 0 && (
            <div className="border-section">
              <label className="field">
                Déplacer cette semaine
                <select
                  className="il-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">Choisir un jour vide</option>
                  {destinations.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="text-button mt-2"
                disabled={!destination || weekly.busy}
                onClick={() => execute(() => weekly.move(row.key, destination))}
              >
                Déplacer la séance
              </button>
            </div>
          )}
          {row.slot.movedFrom && (
            <button
              className="text-button"
              disabled={weekly.busy}
              onClick={() => execute(() => weekly.undoMove(row.key))}
            >
              Annuler le déplacement
            </button>
          )}
          <div className="border-section">
            <label className="field">
              Associer une séance terminée
              <select
                className="il-input"
                value={workoutId}
                disabled={!candidates.length}
                onChange={(e) => setWorkoutId(e.target.value)}
              >
                <option value="">
                  {candidates.length
                    ? "Choisir dans mon historique"
                    : "Aucune séance disponible cette semaine"}
                </option>
                {candidates.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || "Séance libre"} · {fmtDate(w.date)} ·{" "}
                    {fmtDur(w.durationMin)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-button mt-2"
              disabled={!workoutId || weekly.busy}
              onClick={() => execute(() => weekly.associate(row, workoutId))}
            >
              Associer à ce jour
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      )}
    </Drawer>
  );
}
