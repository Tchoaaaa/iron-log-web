import { X, Search, Plus, ChevronRight } from "lucide-react";
import { C } from "../lib/theme";
import { REST_OPTIONS } from "../lib/constants";
import { formatRest } from "../lib/format";

// Wraps `useExercisePicker`'s wizard state with the two pieces of business
// logic the picker itself doesn't know about:
//   - `showRestStep`: whether this flow asks for rest time(s) inline
//     (templates do; a running workout doesn't, and skips straight to
//     finalizing once a set count is chosen)
//   - `onFinish`: what to do with the finished pick — the caller turns the
//     generic `{kind, name|nameA/nameB, count, rest|restA/restB}` descriptor
//     into whatever shape it stores (an active-session entry vs. a template
//     draft exercise)
export default function ExercisePickerModal({ picker, contextLabel, showRestStep, onFinish, onCreateExercise }) {
  const {
    pickerQuery,
    setPickerQuery,
    filteredLibrary,
    pickerStep,
    pendingExerciseName,
    pendingKind,
    pendingNameA,
    pendingNameB,
    supersetStage,
    close,
    goToStep,
    startSupersetBuild,
    cancelSupersetBuild,
    chooseExercise,
    setPendingSetCount,
    setPendingRestA,
    buildEntry,
  } = picker;

  const finish = (entry) => {
    onFinish(entry);
    close();
  };

  const chooseSetCount = (count) => {
    setPendingSetCount(count);
    if (showRestStep) {
      goToStep("rest");
    } else {
      finish(buildEntry({ count }));
    }
  };

  const chooseRest = (seconds) => {
    if (pendingKind === "superset" && pickerStep === "rest") {
      setPendingRestA(seconds);
      goToStep("rest-b");
      return;
    }
    if (pendingKind === "superset" && pickerStep === "rest-b") {
      finish(buildEntry({ restB: seconds }));
      return;
    }
    finish(buildEntry({ rest: seconds }));
  };

  const addCustomExercise = async (name) => {
    const trimmed = await onCreateExercise(name);
    if (trimmed) chooseExercise(trimmed);
  };

  return (
    <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, borderTop: `1px solid ${C.line}`, maxHeight: "70vh" }}
        className="w-full max-w-md rounded-t-3xl p-4 flex flex-col"
      >
        {pickerStep === "search" ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontWeight: 700 }}>
                {supersetStage === "a" && "Superset · 1er exercice"}
                {supersetStage === "b" && "Superset · 2e exercice"}
                {!supersetStage && "Choisir un exercice"}
              </div>
              <X size={18} onClick={close} style={{ color: C.textFaint }} />
            </div>
            {contextLabel && !supersetStage && (
              <div style={{ color: C.textFaint }} className="text-xs mb-2 -mt-2">Pour « {contextLabel} »</div>
            )}
            {supersetStage === "b" && (
              <div className="flex items-center justify-between mb-2 -mt-1">
                <span style={{ color: C.textDim }} className="text-xs">1er : {pendingNameA}</span>
                <button onClick={cancelSupersetBuild} style={{ color: C.textFaint }} className="text-xs">Annuler le superset</button>
              </div>
            )}
            <div className="relative mb-2">
              <Search size={14} style={{ color: C.textFaint, position: "absolute", left: 10, top: 10 }} />
              <input
                autoFocus
                className="il-input w-full rounded-xl pl-8 pr-3 py-2 text-sm"
                placeholder="Rechercher ou créer un exercice…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredLibrary.length === 0 && pickerQuery.trim()) {
                    addCustomExercise(pickerQuery);
                  }
                }}
              />
            </div>
            {!supersetStage && !pickerQuery.trim() && (
              <button
                onClick={startSupersetBuild}
                style={{ background: C.surfaceRaised, color: C.steel }}
                className="rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-3"
              >
                <Plus size={14} /> Créer un superset (deux exos enchaînés)
              </button>
            )}
            <div className="overflow-y-auto flex flex-col gap-1">
              {filteredLibrary.map((e) => (
                <button
                  key={e.name}
                  onClick={() => chooseExercise(e.name)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
                  style={{ background: C.surface }}
                >
                  <span className="text-sm">{e.name}</span>
                  <span style={{ color: C.textFaint }} className="text-xs">{e.category}</span>
                </button>
              ))}
              {pickerQuery.trim() && filteredLibrary.length === 0 && (
                <button
                  onClick={() => addCustomExercise(pickerQuery)}
                  style={{ color: C.amber, border: `1px dashed ${C.amber}` }}
                  className="rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Créer « {pickerQuery.trim()} »
                </button>
              )}
            </div>
          </>
        ) : pickerStep === "sets" ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ChevronRight size={16} style={{ color: C.textFaint, transform: "rotate(180deg)" }} onClick={() => goToStep("search")} />
              <div style={{ fontWeight: 700 }}>
                {pendingKind === "superset" ? `${pendingNameA} + ${pendingNameB}` : pendingExerciseName}
              </div>
            </div>
            <div style={{ color: C.textFaint }} className="text-sm mb-4">
              {pendingKind === "superset" ? "Combien de rounds ?" : "Combien de séries ?"}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => chooseSetCount(n)}
                  style={{ background: n === 3 ? C.amber : C.surfaceRaised, color: C.text }}
                  className="il-num py-3 rounded-xl text-base font-semibold flex items-center justify-center"
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ChevronRight
                size={16}
                style={{ color: C.textFaint, transform: "rotate(180deg)" }}
                onClick={() => goToStep(pickerStep === "rest-b" ? "rest" : "sets")}
              />
              <div style={{ fontWeight: 700 }}>
                {pendingKind === "superset" ? (pickerStep === "rest-b" ? pendingNameB : pendingNameA) : pendingExerciseName}
              </div>
            </div>
            <div style={{ color: C.textFaint }} className="text-sm mb-4">
              {pendingKind === "superset"
                ? `Temps de repos après ${pickerStep === "rest-b" ? "cet exercice" : "le 1er exercice"} ?`
                : "Temps de repos entre les séries ?"}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {REST_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => chooseRest(s)}
                  style={{ background: s === 120 ? C.amber : C.surfaceRaised, color: C.text }}
                  className="il-num py-3 rounded-xl text-sm font-semibold flex items-center justify-center"
                >
                  {formatRest(s)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
