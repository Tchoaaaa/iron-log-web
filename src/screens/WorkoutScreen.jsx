import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Check,
  Pause,
  Play,
  Timer,
  X,
} from "lucide-react";
import { SET_GRID } from "../lib/constants";
import { fmtRestMMSS, fmtTimer } from "../lib/format";
import { validSet, elapsedSessionMs, restRemainingMs } from "../lib/sessionTimer";
import ExerciseNoteField from "../components/ExerciseNoteField";
import ExercisePickerModal from "../components/ExercisePickerModal";
import Drawer from "../components/Drawer";
import { useExercisePicker } from "../hooks/useExercisePicker";

// Owns the only 1-second tick on this screen (session chrono + rest
// countdown). Kept local to this component — and out of useActiveSession —
// so the once-a-second re-render stays scoped to this small panel instead
// of the whole app shell (which owns the session's state).
function SessionTimers({
  active,
  timing,
  manualRest,
  onManualRestChange,
  onTogglePause,
  onStartRest,
  onStopRest,
  done,
  total,
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timing) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timing]);
  const rest = active.restTimer;
  const remaining = restRemainingMs(active, now);
  return (
    <>
      {timing && (
        <div className="timer-panel">
          <div>
            <p className="eyebrow">
              {active.pausedAt != null
                ? "CHRONOMÈTRE EN PAUSE"
                : "DURÉE DE SÉANCE"}
            </p>
            <p
              className="il-num text-4xl mt-2"
              role="timer"
              aria-label="Durée de la séance"
            >
              {fmtTimer(elapsedSessionMs(active, now))}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label={
              active.pausedAt != null
                ? "Reprendre le chronomètre"
                : "Mettre le chronomètre en pause"
            }
            onClick={onTogglePause}
          >
            {active.pausedAt != null ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>
      )}
      <div>
        <div className="flex justify-between text-xs muted mb-2">
          <span>Progression</span>
          <span className="il-num">
            {done} / {total} séries validées
          </span>
        </div>
        <progress
          className="w-full"
          value={done}
          max={total || 1}
          aria-label="Séries validées"
        />
      </div>
      {timing && (
        <div className="rest-panel">
          {rest ? (
            <>
              <div>
                <p className="eyebrow">
                  {remaining ? "TEMPS DE REPOS" : "REPOS TERMINÉ"}
                </p>
                <p className="il-num text-3xl mt-1" role="timer">
                  {fmtTimer(remaining)}
                </p>
                <p className="muted text-xs mt-1">{rest.label}</p>
                {remaining === 0 && (
                  <span role="status" className="text-sm">
                    Prêt pour la prochaine série.
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="secondary compact"
                  onClick={() => onStartRest(rest.seconds, rest.label)}
                >
                  Relancer
                </button>
                <button className="text-button text-xs" onClick={onStopRest}>
                  <X size={14} /> Fermer
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                Repos manuel
                <select
                  className="il-input"
                  value={manualRest}
                  onChange={(e) => onManualRestChange(Number(e.target.value))}
                >
                  {[30, 60, 90, 120, 180, 300].map((s) => (
                    <option key={s} value={s}>
                      {fmtRestMMSS(s)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary compact"
                onClick={() => onStartRest(manualRest)}
              >
                <Timer size={16} /> Démarrer
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function WorkoutScreen({
  activeSession: a,
  lastByExercise,
  libraryHook,
  onDiscard,
  onBack,
}) {
  const { active, timing, lockedExercises, updateSet, addEntryToActive } = a;
  const picker = useExercisePicker({ library: libraryHook.exercises });
  const [editingId, setEditingId] = useState(null);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState(null);
  const [manualRest, setManualRest] = useState(90);
  const total = active.entries.reduce(
    (n, ex) => n + ex.sets.length * (ex.kind === "superset" ? 2 : 1),
    0,
  );
  const done = active.entries.reduce(
    (n, ex) =>
      n +
      ex.sets.reduce(
        (v, s) =>
          v +
          (ex.kind === "superset"
            ? Number(!!s.doneA) + Number(!!s.doneB)
            : Number(!!s.done)),
        0,
      ),
    0,
  );
  return (
    <section className="flex flex-col gap-5">
      <button className="text-button justify-start" onClick={onBack}>
        <ArrowLeft size={17} /> Retour à l’accueil
      </button>
      <div>
        <p className="eyebrow">
          {active.editId ? "MODIFIER L’HISTORIQUE" : "SÉANCE EN COURS"}
        </p>
        <h1 className="page-title mt-2">
          {active.fromTemplate || "Séance libre"}
        </h1>
      </div>
      <SessionTimers
        active={active}
        timing={timing}
        manualRest={manualRest}
        onManualRestChange={setManualRest}
        onTogglePause={a.togglePause}
        onStartRest={a.startRest}
        onStopRest={a.stopRest}
        done={done}
        total={total}
      />
      {!active.entries.length && (
        <div className="empty-state">
          <h2>Quel est ton premier exercice ?</h2>
          <p>
            Ajoute tes exercices, puis saisis tes résultats série par série.
          </p>
        </div>
      )}
      {active.entries.map((entry, index) => {
        const superSet = entry.kind === "superset";
        const subs = superSet
          ? [
              { label: entry.nameA, suffix: "A", rest: entry.restA },
              { label: entry.nameB, suffix: "B", rest: entry.restB },
            ]
          : [{ label: entry.name, suffix: "", rest: entry.rest }];
        return (
          <article className="exercise-card" key={entry.id}>
            <div className="flex justify-between items-center mb-4">
              <p className="eyebrow">
                {superSet ? "SUPERSET" : "EXERCICE"} /{" "}
                {String(index + 1).padStart(2, "0")}
              </p>
              {!lockedExercises && (
                <button
                  className="icon-button"
                  aria-label={`Modifier ${entry.name}`}
                  onClick={() => {
                    setEditingId(entry.id);
                    picker.open(entry);
                  }}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-6">
              {subs.map((sub) => (
                <div key={sub.suffix}>
                  <h2 className="text-lg font-semibold leading-snug">
                    {sub.label}
                  </h2>
                  <div className="muted text-xs mt-2 flex justify-between items-center">
                    <span>
                      {entry.sets.length} séries ·{" "}
                      {sub.rest === 0
                        ? "Sans repos"
                        : `${fmtRestMMSS(sub.rest ?? 90)} de repos`}
                    </span>
                    {timing && sub.rest !== 0 && (
                      <button
                        className="text-button text-xs"
                        onClick={() => a.startRest(sub.rest ?? 90, sub.label)}
                      >
                        <Timer size={14} /> Repos
                      </button>
                    )}
                  </div>
                  <div
                    className="grid mt-4 mb-2 text-[10px] muted uppercase"
                    style={{ gridTemplateColumns: SET_GRID, gap: 6 }}
                  >
                    <span>#</span>
                    <span className="text-center">Préc.</span>
                    <span className="text-center">Kg</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Fait</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {entry.sets.map((set, i) => {
                      const previous = lastByExercise[sub.label]?.sets?.[i];
                      const validated = !!set["done" + sub.suffix];
                      const target = set["target" + sub.suffix];
                      const canValidate = validSet(
                        set["weight" + sub.suffix],
                        set["reps" + sub.suffix],
                      );
                      return (
                        <div key={i}>
                          <div
                            className={`grid items-center set-row ${validated ? "completed" : ""}`}
                            style={{ gridTemplateColumns: SET_GRID, gap: 6 }}
                          >
                            <span className="il-num muted text-xs text-center">
                              {i + 1}
                            </span>
                            <span className="il-num muted text-[10px] text-center">
                              {previous
                                ? `${previous.weight}×${previous.reps}`
                                : "—"}
                            </span>
                            <input
                              className="il-input il-num w-full text-center"
                              aria-label={`${sub.label}, série ${i + 1}, charge en kg`}
                              type="number"
                              min="0"
                              step="any"
                              inputMode="decimal"
                              placeholder={
                                previous ? String(previous.weight) : "0"
                              }
                              value={set["weight" + sub.suffix]}
                              onChange={(e) => {
                                updateSet(
                                  entry.id,
                                  i,
                                  "weight" + sub.suffix,
                                  e.target.value,
                                );
                                if (validated)
                                  updateSet(
                                    entry.id,
                                    i,
                                    "done" + sub.suffix,
                                    false,
                                  );
                              }}
                            />
                            <input
                              className="il-input il-num w-full text-center"
                              aria-label={`${sub.label}, série ${i + 1}, répétitions réalisées`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              placeholder={
                                target ||
                                (previous ? String(previous.reps) : "—")
                              }
                              value={set["reps" + sub.suffix]}
                              onChange={(e) => {
                                updateSet(
                                  entry.id,
                                  i,
                                  "reps" + sub.suffix,
                                  e.target.value,
                                );
                                if (validated)
                                  updateSet(
                                    entry.id,
                                    i,
                                    "done" + sub.suffix,
                                    false,
                                  );
                              }}
                            />
                            <button
                              className={`set-check ${validated ? "checked" : ""}`}
                              disabled={!validated && !canValidate}
                              aria-label={`${validated ? "Dévalider" : "Valider"} ${sub.label}, série ${i + 1}`}
                              aria-pressed={validated}
                              title={
                                canValidate
                                  ? "Valider cette série"
                                  : "Renseigne une charge (0 accepté) et les répétitions"
                              }
                              onClick={() =>
                                a.completeSet(
                                  entry.id,
                                  i,
                                  "done" + sub.suffix,
                                  sub.rest,
                                  sub.label,
                                )
                              }
                            >
                              {validated ? <Check size={16} /> : <span />}
                            </button>
                          </div>
                          {target && (
                            <p className="muted text-[10px] text-right mt-1 pr-10">
                              Objectif : {target} reps
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <ExerciseNoteField
                    value={libraryHook.exerciseNotes[sub.label] || ""}
                    onType={(v) => libraryHook.setExerciseNote(sub.label, v)}
                    onCommit={(v) =>
                      libraryHook.persistExerciseNote(sub.label, v)
                    }
                  />
                </div>
              ))}
            </div>
            {!lockedExercises && (
              <button
                className="text-button text-xs mt-3"
                onClick={() => setRemove(entry)}
              >
                Retirer cet exercice
              </button>
            )}
          </article>
        );
      })}
      {!lockedExercises && (
        <button
          className="secondary"
          onClick={() => {
            setEditingId(null);
            picker.open();
          }}
        >
          <Plus size={17} /> Ajouter un exercice
        </button>
      )}
      <button className="text-button" onClick={() => setDiscard(true)}>
        {active.editId ? "Annuler les modifications" : "Abandonner la séance"}
      </button>
      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          onFinish={(plan) =>
            editingId ? a.editEntry(editingId, plan) : addEntryToActive(plan)
          }
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
      {(discard || remove) && (
        <Drawer
          title={
            remove
              ? "Retirer cet exercice ?"
              : active.editId
                ? "Annuler les modifications ?"
                : "Abandonner la séance ?"
          }
          onClose={() => {
            setDiscard(false);
            setRemove(null);
          }}
        >
          <p className="muted text-sm mb-5">
            {remove
              ? `Les séries saisies pour « ${remove.name} » seront retirées de cette séance.`
              : active.editId
                ? "La séance enregistrée restera inchangée."
                : "Les résultats de cette séance ne seront pas enregistrés."}
          </p>
          <div className="flex gap-3">
            <button
              className="secondary flex-1"
              onClick={() => {
                setDiscard(false);
                setRemove(null);
              }}
            >
              Continuer
            </button>
            <button
              className="primary flex-1"
              onClick={() => {
                if (remove) {
                  a.removeEntry(remove.id);
                  setRemove(null);
                } else onDiscard();
              }}
            >
              {remove ? "Retirer" : "Confirmer"}
            </button>
          </div>
        </Drawer>
      )}
    </section>
  );
}
