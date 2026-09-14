import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { uid } from "../lib/constants";
import { volumeOfExercises, repsOfExercises, setsOfExercises } from "../lib/workoutMath";
import { liveEntry, replaceLiveEntry } from "../lib/exercisePlan";
import { elapsedSessionMs, toggleSessionPause, validSet } from "../lib/sessionTimer";
import { readJSON, writeJSON, debounce } from "../lib/storage";
import { normalizeRpe, rpeEnabled, setRpeMetadata } from "../lib/rpe";

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
          ...(rpeEnabled(e) ? { rpeEnabled: true } : {}),
          superset: e.id,
          sets: e.sets
            .filter((s) => validSet(s.weightA, s.repsA))
            .map((s) => ({ weight: Number(s.weightA), reps: Number(s.repsA), ...setRpeMetadata(s.rpeA) })),
        };
        const b = {
          name: e.nameB,
          ...(rpeEnabled(e) ? { rpeEnabled: true } : {}),
          superset: e.id,
          sets: e.sets
            .filter((s) => validSet(s.weightB, s.repsB))
            .map((s) => ({ weight: Number(s.weightB), reps: Number(s.repsB), ...setRpeMetadata(s.rpeB) })),
        };
        return [a, b];
      }
      return [
        {
          name: e.name,
          ...(rpeEnabled(e) ? { rpeEnabled: true } : {}),
          sets: e.sets
            .filter((s) => validSet(s.weight, s.reps))
            .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps), ...setRpeMetadata(s.rpe) })),
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
          ...((rpeEnabled(a) || rpeEnabled(b)) ? { rpeEnabled: true } : {}),
          sets: Array.from({ length: setCount }, (_, i) => ({
            ...setRpeMetadata(a.sets[i]?.rpe, "rpeA"),
            ...setRpeMetadata(b.sets[i]?.rpe, "rpeB"),
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
      ...(rpeEnabled(e) ? { rpeEnabled: true } : {}),
      sets: e.sets.map((s) => ({
        ...setRpeMetadata(s.rpe),
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
// after every edit so a refresh does not silently lose it, and restored
// on mount — namespaced per user since `GymApp` remounts on account switch.
export function useActiveSession({ userId, autoRest = false }) {
  const key = storageKey(userId);
  const [active, setActive] = useState(() => {
    const restored = readJSON(key);
    return isValidActive(restored) ? restored : null;
  });
  const [sessionSummary, setSessionSummary] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const savingRef = useRef(false);
  // Debounced: logging a set fires a state change per keystroke, and
  // writeJSON's JSON.stringify + localStorage write shouldn't run on every
  // one of those on a phone.
  const debouncedPersist = useRef(debounce((value) => writeJSON(key, value), 400)).current;
  useEffect(() => {
    debouncedPersist(active);
  }, [active, debouncedPersist]);
  useEffect(() => () => debouncedPersist.cancel(), [debouncedPersist]);
  const clearActive = () => {
    debouncedPersist.cancel();
    writeJSON(key, null);
    setActive(null);
  };

  // live chrono while a workout is running (not while editing a past one).
  // The actual 1s tick lives in <SessionTimers> inside WorkoutScreen, not
  // here — a ticking state at this level would re-render the whole app
  // shell every second for as long as a workout is running.
  const timing = !!active && !active.editId;
  // A séance started from a template keeps its exercise list fixed — add /
  // remove / swap is done outside the séance (in the template itself, or
  // when editing a past one). An ad-hoc "Séance vide" stays fully editable.
  const lockedExercises = !!active && !active.editId && !!active.fromTemplate;

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

  const startFromTemplate = (tpl, plannedSlot = null) => {
    setActive({
      startedAt: Date.now(),
      fromTemplate: tpl.name,
      fromTemplateId: tpl.id,
      plannedSlot,
      entries: tpl.exercises.map(ex => liveEntry({ kind: ex.pair ? 'superset' : 'single', name: ex.name, nameA: ex.pair?.[0], nameB: ex.pair?.[1], count: ex.sets || 1, rest: ex.rest, restA: ex.restA, restB: ex.restB, targets: ex.targets, targetsB: ex.targetsB, rpeEnabled: ex.rpeEnabled })),
    });
  };

  const addEntryToActive = (entry) => setActive(a => a ? ({ ...a, entries: [...a.entries, liveEntry(entry)] }) : a);
  const editEntry = (id, plan) => setActive(a => ({ ...a, entries: a.entries.flatMap(e => e.id === id ? replaceLiveEntry(e, plan) : [e]) }));
  const togglePause = () => { const time = Date.now(); setActive(a => toggleSessionPause(a, time)); };
  const startRest = (seconds = 90, label = 'Repos') => {
    const time = Date.now();
    setActive(a => a ? { ...a, restTimer: seconds > 0 ? { endsAt: time + seconds * 1000, seconds, label } : null } : a);
  };
  const stopRest = () => setActive(a => a ? { ...a, restTimer: null } : a);
  const completeSet = (entryId, idx, doneKey, rest, label) => {
    const time = Date.now();
    setActive(a => {
      const entry = a.entries.find(e => e.id === entryId);
      const set = entry.sets[idx];
      const suffix = doneKey.replace('done', '');
      const done = !set[doneKey];
      if (done && !validSet(set['weight' + suffix], set['reps' + suffix])) return a;
      const seconds = rest ?? 90;
      return { ...a, entries: a.entries.map(e => e.id === entryId ? { ...e, sets: e.sets.map((s, i) => i === idx ? { ...s, [doneKey]: done } : s) } : e),
        ...(done && autoRest && !a.editId && seconds > 0 ? { restTimer: { endsAt: time + seconds * 1000, seconds, label } } : {}) };
    });
  };

  const updateSet = (entryId, idx, field, value) => {
    if (/^rpe[AB]?$/.test(field) && value !== "" && normalizeRpe(value) === null) return;
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

  const enableRpe = (entryId) => {
    setActive(a => a ? {
      ...a,
      entries: a.entries.map(e => e.id === entryId ? { ...e, rpeEnabled: true } : e),
    } : a);
  };

  // `workouts`/`addWorkout`/`replaceWorkout` come from useWorkouts — passed
  // in per call rather than baked into this hook, so each hook keeps owning
  // its own api.js calls and this one only touches workouts through plain
  // setters.
  const finishWorkout = async ({ workouts, addWorkout, replaceWorkout, onError, onEmpty, onEditSaved, onRecorded } = {}) => {
    if (savingRef.current) return;
    if (!active || active.entries.length === 0) {
      clearActive();
      onEmpty?.();
      return;
    }
    const durationMin = Math.max(1, Math.round(elapsedSessionMs(active, Date.now()) / 60000));
    const cleaned = cleanActiveEntries(active.entries);

    if (cleaned.length === 0) {
      clearActive();
      onEmpty?.();
      return;
    }

    savingRef.current = true;
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
        elapsedMs: elapsedSessionMs(active, Date.now()),
        setCount: setsOfExercises(cleaned),
        volume: volNow,
        loadPct,
        volumePct,
        firstTime: !prevSession,
        trend,
      });
      clearActive();
      // A planning write must never roll back a successfully saved workout or
      // leave it active to be saved twice. Manual association remains available.
      try { await onRecorded?.(saved, active); }
      catch (error) { onError?.(error.message || "La séance est enregistrée, mais son association au planning a échoué."); }
    } catch (err) {
      onError?.(err.message || "Impossible d'enregistrer la séance.");
    } finally {
      savingRef.current = false;
      setFinishing(false);
    }
  };

  const discardWorkout = () => {
    clearActive();
  };

  const dismissSessionSummary = () => setSessionSummary(null);

  return {
    active,
    sessionSummary,
    finishing,
    timing,
    lockedExercises,
    startWorkout,
    startEditWorkout,
    startFromTemplate,
    addEntryToActive,
    updateSet,
    enableRpe,
    removeEntry,
    editEntry,
    togglePause,
    startRest,
    stopRest,
    completeSet,
    finishWorkout,
    discardWorkout,
    dismissSessionSummary,
  };
}
