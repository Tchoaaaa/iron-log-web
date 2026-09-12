import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { uid } from "../lib/constants";
import { volumeOfExercises, repsOfExercises, setsOfExercises } from "../lib/workoutMath";
import { readJSON, writeJSON, debounce } from "../lib/storage";

const storageKey = (userId) => `gymapp:active-session:${userId}`;

function isValidActive(value) {
  return !!value && typeof value === "object" && Array.isArray(value.entries);
}

// Cleans a live `active.entries` array into the flat shape the server
// stores: empty sets are dropped, and a superset entry splits into its two
// exercises tagged with the same `superset` id (so they can be regrouped
// later — see `groupExercisesIntoEntries`).
export function cleanActiveEntries(entries) {
  return entries
    .flatMap((e) => {
      if (e.kind === "superset") {
        const a = {
          name: e.nameA,
          superset: e.id,
          sets: e.sets
            .filter((s) => s.weightA !== "" && s.repsA !== "")
            .map((s) => ({ weight: Number(s.weightA), reps: Number(s.repsA) })),
        };
        const b = {
          name: e.nameB,
          superset: e.id,
          sets: e.sets
            .filter((s) => s.weightB !== "" && s.repsB !== "")
            .map((s) => ({ weight: Number(s.weightB), reps: Number(s.repsB) })),
        };
        return [a, b];
      }
      return [
        {
          name: e.name,
          sets: e.sets
            .filter((s) => s.weight !== "" && s.reps !== "")
            .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
        },
      ];
    })
    .filter((e) => e.sets.length > 0);
}

// The inverse: rebuilds live editing entries from a stored workout's flat
// `exercises` array, regrouping any pair that shares a `superset` id back
// into one superset entry (rather than flattening it to two singles, which
// silently discards the pairing when you edit a past superset workout).
export function groupExercisesIntoEntries(exercises) {
  const groups = [];
  const bySupersetId = new Map();
  for (const e of exercises) {
    if (e.superset) {
      if (!bySupersetId.has(e.superset)) {
        const group = { supersetId: e.superset, items: [] };
        bySupersetId.set(e.superset, group);
        groups.push(group);
      }
      bySupersetId.get(e.superset).items.push(e);
    } else {
      groups.push({ supersetId: null, items: [e] });
    }
  }
  return groups.flatMap((g) => {
    if (g.supersetId && g.items.length === 2) {
      const [a, b] = g.items;
      const setCount = Math.max(a.sets.length, b.sets.length);
      return [
        {
          id: uid(),
          kind: "superset",
          name: `${a.name} + ${b.name}`,
          nameA: a.name,
          nameB: b.name,
          sets: Array.from({ length: setCount }, (_, i) => ({
            weightA: a.sets[i] ? String(a.sets[i].weight) : "",
            repsA: a.sets[i] ? String(a.sets[i].reps) : "",
            doneA: !!a.sets[i],
            weightB: b.sets[i] ? String(b.sets[i].weight) : "",
            repsB: b.sets[i] ? String(b.sets[i].reps) : "",
            doneB: !!b.sets[i],
          })),
        },
      ];
    }
    // not part of a (surviving) pair — same single-exercise shape as before
    return g.items.map((e) => ({
      id: uid(),
      kind: "single",
      name: e.name,
      sets: e.sets.map((s) => ({
        weight: s.weight === 0 ? "0" : String(s.weight),
        reps: String(s.reps),
        done: true,
      })),
    }));
  });
}

// The in-progress (or being-edited) workout session: entries, live chrono,
// end-of-session recap, and a `finishing` busy flag so the save button can
// disable itself against double taps. `active` is mirrored to localStorage
// (debounced) so a refresh or crash doesn't silently lose it, and restored
// on mount — namespaced per user since `GymApp` remounts on account switch.
export function useActiveSession({ userId }) {
  const key = storageKey(userId);
  const [active, setActive] = useState(() => {
    const restored = readJSON(key);
    return isValidActive(restored) ? restored : null;
  });
  const [now, setNow] = useState(() => Date.now());
  const [sessionSummary, setSessionSummary] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const debouncedPersist = useRef(debounce((value) => writeJSON(key, value), 400)).current;
  useEffect(() => {
    debouncedPersist(active);
  }, [active, debouncedPersist]);
  useEffect(() => () => debouncedPersist.cancel(), [debouncedPersist]);

  // Ends the session and clears its localStorage backup immediately —
  // don't rely on the debounced write, which could lose the race if the
  // tab closes right after finishing/discarding.
  const clearActive = () => {
    debouncedPersist.cancel();
    writeJSON(key, null);
    setActive(null);
  };

  // live chrono while a workout is running (not while editing a past one)
  const timing = !!active && !active.editId;
  // a séance started from a template keeps its exercise list fixed — add /
  // remove is done outside the séance (in the template, or when editing a
  // past one). An ad-hoc "Séance vide" stays editable.
  const lockedExercises = !!active && !active.editId && !!active.fromTemplate;
  useEffect(() => {
    if (!timing) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timing]);

  const startWorkout = () => {
    setActive({ startedAt: Date.now(), entries: [], fromTemplate: null });
  };

  // reopen a saved workout in the workout editor — supersets are regrouped
  // (not flattened, see groupExercisesIntoEntries), the original date and
  // duration are kept.
  const startEditWorkout = (w) => {
    setActive({
      startedAt: w.date,
      editId: w.id,
      originalDurationMin: w.durationMin,
      fromTemplate: w.name || null,
      entries: groupExercisesIntoEntries(w.exercises),
    });
  };

  const startFromTemplate = (tpl) => {
    setActive({
      startedAt: Date.now(),
      fromTemplate: tpl.name,
      entries: tpl.exercises.map((ex) =>
        ex.pair
          ? {
              id: uid(),
              kind: "superset",
              name: ex.name,
              nameA: ex.pair[0],
              nameB: ex.pair[1],
              restA: ex.restA,
              restB: ex.restB,
              sets: Array.from({ length: ex.sets || 1 }, () => ({ weightA: "", repsA: "", doneA: false, weightB: "", repsB: "", doneB: false })),
            }
          : {
              id: uid(),
              kind: "single",
              name: ex.name,
              rest: ex.rest,
              sets: Array.from({ length: ex.sets || 1 }, () => ({ weight: "", reps: "", done: false })),
            }
      ),
    });
  };

  // Turns a picker entry descriptor into a live workout entry (own id, and
  // per-set fields initialized empty/undone).
  const addEntryToActive = (entry) => {
    setActive((a) => ({
      ...a,
      entries: [
        ...a.entries,
        entry.kind === "superset"
          ? {
              id: uid(),
              kind: "superset",
              name: `${entry.nameA} + ${entry.nameB}`,
              nameA: entry.nameA,
              nameB: entry.nameB,
              sets: Array.from({ length: entry.count }, () => ({ weightA: "", repsA: "", doneA: false, weightB: "", repsB: "", doneB: false })),
            }
          : {
              id: uid(),
              kind: "single",
              name: entry.name,
              sets: Array.from({ length: entry.count }, () => ({ weight: "", reps: "", done: false })),
            },
      ],
    }));
  };

  const updateSet = (entryId, idx, field, value) => {
    setActive((a) => ({
      ...a,
      entries: a.entries.map((e) =>
        e.id !== entryId
          ? e
          : { ...e, sets: e.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
      ),
    }));
  };
  const removeEntry = (entryId) => {
    setActive((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== entryId) }));
  };

  // `workouts`/`addWorkout`/`replaceWorkout` come from useWorkouts — passed
  // in per call rather than baked into this hook, so each hook keeps owning
  // its own api.js calls and this one only touches workouts through plain
  // setters.
  const finishWorkout = async ({ workouts, addWorkout, replaceWorkout, onError, onEmpty, onEditSaved } = {}) => {
    if (!active || active.entries.length === 0) {
      clearActive();
      onEmpty?.();
      return;
    }
    const durationMin = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000));
    const cleaned = cleanActiveEntries(active.entries);

    if (cleaned.length === 0) {
      clearActive();
      onEmpty?.();
      return;
    }

    setFinishing(true);
    try {
      if (active.editId) {
        const saved = await api.updateWorkout(active.editId, {
          name: active.fromTemplate || null,
          exercises: cleaned,
        });
        replaceWorkout(active.editId, saved);
        clearActive();
        onEditSaved?.();
        return;
      }
      const saved = await api.insertWorkout({
        date: Date.now(),
        durationMin,
        exercises: cleaned,
        name: active.fromTemplate || null,
      });

      // recap de fin de séance — comparaison UNIQUEMENT avec la même séance
      // (même modèle) précédente. Push suivi de Pull => aucune comparaison.
      // Première fois qu'on fait cette séance => progression à 100 %.
      const prevSession = active.fromTemplate
        ? workouts.find((w) => w.name === active.fromTemplate)
        : null;
      const volNow = volumeOfExercises(cleaned);
      const repsNow = repsOfExercises(cleaned);
      const loadNow = repsNow > 0 ? volNow / repsNow : 0;
      let loadPct = 100;
      let volumePct = 100;
      if (prevSession) {
        const volWas = volumeOfExercises(prevSession.exercises);
        const repsWas = repsOfExercises(prevSession.exercises);
        const loadWas = repsWas > 0 ? volWas / repsWas : 0;
        loadPct = loadWas > 0 ? ((loadNow - loadWas) / loadWas) * 100 : 100;
        volumePct = volWas > 0 ? ((volNow - volWas) / volWas) * 100 : 100;
      }
      const trend = [
        ...(active.fromTemplate
          ? workouts
              .filter((w) => w.name === active.fromTemplate)
              .slice(0, 7)
              .map((w) => volumeOfExercises(w.exercises))
              .reverse()
          : []),
        volNow,
      ];

      addWorkout(saved);
      setSessionSummary({
        name: active.fromTemplate || null,
        elapsedMs: Date.now() - active.startedAt,
        setCount: setsOfExercises(cleaned),
        volume: volNow,
        loadPct,
        volumePct,
        firstTime: !prevSession,
        trend,
      });
      clearActive();
    } catch (err) {
      onError?.(err.message || "Impossible d'enregistrer la séance.");
    } finally {
      setFinishing(false);
    }
  };

  const discardWorkout = () => {
    clearActive();
  };

  const dismissSessionSummary = () => setSessionSummary(null);

  return {
    active,
    now,
    sessionSummary,
    finishing,
    timing,
    lockedExercises,
    startWorkout,
    startEditWorkout,
    startFromTemplate,
    addEntryToActive,
    updateSet,
    removeEntry,
    finishWorkout,
    discardWorkout,
    dismissSessionSummary,
  };
}
