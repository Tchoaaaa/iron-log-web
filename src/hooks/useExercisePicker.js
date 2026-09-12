import { useMemo, useState } from "react";

const INITIAL_PENDING = {
  pickerStep: "search",
  pendingExerciseName: null,
  pendingKind: "single",
  pendingNameA: null,
  pendingNameB: null,
  pendingSetCount: 3,
  pendingRestA: null,
  supersetStage: null, // null | "a" | "b"
};

// The exercise-picker wizard's state machine. Knows nothing about where a
// finished pick ends up (a running workout vs. a template draft) — it just
// walks the user through choosing an exercise (or a superset pair), a set
// count, and optionally rest time(s), then hands the caller a plain
// descriptor via `buildEntry`. The caller decides whether to ask for rest
// (`showRestStep`) and what shape to turn the descriptor into.
export function useExercisePicker({ library }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pending, setPending] = useState(INITIAL_PENDING);

  const filteredLibrary = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return library;
    return library.filter((e) => e.name.toLowerCase().includes(q));
  }, [library, pickerQuery]);

  const open = () => {
    setPending(INITIAL_PENDING);
    setPickerQuery("");
    setShowPicker(true);
  };
  const close = () => {
    setShowPicker(false);
    setPickerQuery("");
    setPending(INITIAL_PENDING);
  };

  const goToStep = (pickerStep) => setPending((p) => ({ ...p, pickerStep }));

  const startSupersetBuild = () => {
    setPending((p) => ({ ...p, supersetStage: "a" }));
    setPickerQuery("");
  };
  const cancelSupersetBuild = () => {
    setPending((p) => ({ ...p, supersetStage: null, pendingNameA: null }));
    setPickerQuery("");
  };

  // step 1: exercise chosen — either finalize a single pick or advance the superset build
  const chooseExercise = (name) => {
    setPending((p) => {
      if (p.supersetStage === "a") {
        setPickerQuery("");
        return { ...p, pendingNameA: name, supersetStage: "b" };
      }
      if (p.supersetStage === "b") {
        setPickerQuery("");
        return { ...p, pendingKind: "superset", pendingNameB: name, supersetStage: null, pickerStep: "sets" };
      }
      return { ...p, pendingKind: "single", pendingExerciseName: name, pickerStep: "sets" };
    });
  };

  const setPendingSetCount = (pendingSetCount) => setPending((p) => ({ ...p, pendingSetCount }));
  const setPendingRestA = (pendingRestA) => setPending((p) => ({ ...p, pendingRestA }));

  // Builds the generic entry descriptor for the current pick. The caller
  // (a workout screen vs. a template editor) turns this into whatever shape
  // it actually stores.
  const buildEntry = ({ count, rest, restA, restB } = {}) => {
    if (pending.pendingKind === "superset") {
      return {
        kind: "superset",
        nameA: pending.pendingNameA,
        nameB: pending.pendingNameB,
        count: count ?? pending.pendingSetCount,
        restA: restA ?? pending.pendingRestA,
        restB,
      };
    }
    return {
      kind: "single",
      name: pending.pendingExerciseName,
      count: count ?? pending.pendingSetCount,
      rest,
    };
  };

  return {
    showPicker,
    pickerQuery,
    setPickerQuery,
    filteredLibrary,
    ...pending,
    open,
    close,
    goToStep,
    startSupersetBuild,
    cancelSupersetBuild,
    chooseExercise,
    setPendingSetCount,
    setPendingRestA,
    buildEntry,
  };
}
