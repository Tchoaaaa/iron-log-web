import { Plus, Trash2 } from "lucide-react";
import { C } from "../lib/theme";
import { SET_GRID } from "../lib/constants";
import { fmtRestMMSS, fmtTimer } from "../lib/format";
import ExerciseNoteField from "../components/ExerciseNoteField";
import ExercisePickerModal from "../components/ExercisePickerModal";
import { useExercisePicker } from "../hooks/useExercisePicker";

export default function WorkoutScreen({ activeSession, lastByExercise, libraryHook, onDiscard }) {
  const { active, now, timing, lockedExercises, updateSet, removeEntry, addEntryToActive } = activeSession;
  const { exerciseNotes, setExerciseNote, persistExerciseNote } = libraryHook;
  const picker = useExercisePicker({ library: libraryHook.exercises });

  return (
    <div className="flex flex-col">
      {/* header de séance */}
      <div className="pb-3 mb-1" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-baseline justify-between gap-3">
          <span
            style={{ color: C.textDim, fontWeight: 600, letterSpacing: "0.14em" }}
            className="text-[11px] uppercase"
          >
            {active.editId ? "Modifier la séance" : "Séance en cours"}
          </span>
          {timing && (
            <span className="il-num text-sm" style={{ color: C.textDim, fontWeight: 500 }}>
              {fmtTimer(now - active.startedAt)}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3 mt-1.5">
          <span style={{ color: C.textDim }} className="text-xs min-w-0 truncate">
            {active.fromTemplate ? `D'après « ${active.fromTemplate} »` : "Séance libre"}
          </span>
          <button onClick={onDiscard} style={{ color: C.textFaint }} className="text-xs flex-shrink-0">
            Annuler
          </button>
        </div>
      </div>

      {active.entries.length === 0 && (
        <div style={{ color: C.textFaint }} className="text-sm text-center py-14">
          Ajoute ton premier exercice pour commencer.
        </div>
      )}

      {active.entries.map((entry, entryIdx) => {
        const isSuper = entry.kind === "superset";
        const superNo = isSuper
          ? active.entries.slice(0, entryIdx + 1).filter((x) => x.kind === "superset").length
          : 0;
        const subs = isSuper
          ? [
              { label: entry.nameA, weightKey: "weightA", repsKey: "repsA", doneKey: "doneA", rest: entry.restA },
              { label: entry.nameB, weightKey: "weightB", repsKey: "repsB", doneKey: "doneB", rest: entry.restB },
            ]
          : [{ label: entry.name, weightKey: "weight", repsKey: "reps", doneKey: "done", rest: entry.rest }];

        return (
          <div key={entry.id} className="py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
            {isSuper && (
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{ color: C.textDim, fontWeight: 600, letterSpacing: "0.14em" }}
                  className="text-[10px] uppercase"
                >
                  Superset / {String(superNo).padStart(2, "0")}
                </span>
                {!lockedExercises && (
                  <button onClick={() => removeEntry(entry.id)} style={{ color: C.textFaint }} aria-label="Retirer l'exercice">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}

            <div
              className={isSuper ? "flex flex-col gap-5" : undefined}
              style={isSuper ? { borderLeft: `1px solid ${C.line}`, paddingLeft: 14, paddingTop: 10, paddingBottom: 2 } : undefined}
            >
              {subs.map((sub, subIdx) => (
                <div key={subIdx}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        style={{ color: C.text, fontWeight: 700, letterSpacing: "0.04em" }}
                        className="text-sm uppercase leading-snug"
                      >
                        {sub.label}
                      </div>
                      <div
                        className="il-num text-[11px] mt-2 uppercase"
                        style={{ color: C.textDim, letterSpacing: "0.04em" }}
                      >
                        {entry.sets.length} série{entry.sets.length > 1 ? "s" : ""}
                        {sub.rest ? ` · repos ${fmtRestMMSS(sub.rest)}` : ""}
                      </div>
                    </div>
                    {!isSuper && !lockedExercises && (
                      <button
                        onClick={() => removeEntry(entry.id)}
                        style={{ color: C.textFaint }}
                        className="flex-shrink-0"
                        aria-label="Retirer l'exercice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div
                    className="grid mt-5 mb-2 text-[10px] uppercase"
                    style={{ gridTemplateColumns: SET_GRID, gap: 6, color: C.textDim, letterSpacing: "0.08em" }}
                  >
                    <span />
                    <span className="text-center">Préc.</span>
                    <span className="text-center">Kg</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  <div className="flex flex-col gap-2">
                    {entry.sets.map((s, idx) => {
                      const prev = lastByExercise[sub.label]?.sets?.[idx];
                      const done = !!s[sub.doneKey];
                      return (
                        <div
                          key={idx}
                          className="grid items-center"
                          style={{ gridTemplateColumns: SET_GRID, gap: 6 }}
                        >
                          <span
                            className="il-num text-xs text-center"
                            style={{ color: done ? C.textFaint : C.textDim, fontWeight: 600 }}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="il-num text-[11px] text-center" style={{ color: C.textDim }}>
                            {prev ? `${prev.weight}×${prev.reps}` : "—"}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            className="il-input il-num rounded-lg py-2 text-[15px] w-full text-center"
                            placeholder={prev && prev.weight != null ? String(prev.weight) : "0"}
                            value={s[sub.weightKey]}
                            onChange={(e) => updateSet(entry.id, idx, sub.weightKey, e.target.value)}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            className="il-input il-num rounded-lg py-2 text-[15px] w-full text-center"
                            placeholder={prev && prev.reps != null ? String(prev.reps) : "0"}
                            value={s[sub.repsKey]}
                            onChange={(e) => updateSet(entry.id, idx, sub.repsKey, e.target.value)}
                          />
                          <button
                            onClick={() => updateSet(entry.id, idx, sub.doneKey, !done)}
                            className="flex items-center justify-center"
                            style={{ height: 34, justifySelf: "center" }}
                            aria-label={done ? "Série validée" : "Valider la série"}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                background: done ? C.amber : "transparent",
                                border: done ? "none" : `1.5px solid ${C.line}`,
                                display: "block",
                              }}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <ExerciseNoteField
                    label={isSuper ? sub.label : undefined}
                    value={exerciseNotes[sub.label] || ""}
                    onType={(v) => setExerciseNote(sub.label, v)}
                    onCommit={(v) => persistExerciseNote(sub.label, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!lockedExercises && (
        <button
          onClick={picker.open}
          style={{ color: C.textDim }}
          className="text-sm py-5 flex items-center justify-center gap-2"
        >
          <Plus size={15} /> Ajouter un exercice
        </button>
      )}

      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          contextLabel={null}
          showRestStep={false}
          onFinish={addEntryToActive}
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
    </div>
  );
}
