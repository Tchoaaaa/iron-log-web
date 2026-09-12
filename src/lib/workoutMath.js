// Pure numeric/aggregation helpers over workout data — no state, no side effects.

export function estOneRM(weight, reps) {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
}

// session aggregates over a list of { sets: [{weight, reps}] }
export function volumeOfExercises(exercises) {
  return exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + Number(set.weight) * Number(set.reps), 0),
    0
  );
}

export function repsOfExercises(exercises) {
  return exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + Number(set.reps), 0),
    0
  );
}

export function setsOfExercises(exercises) {
  return exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

// For each exercise name, the sets logged the last time it was done
// (workouts is expected newest-first). Used as the greyed reference per set
// in a running workout.
export function computeLastByExercise(workouts) {
  const map = {};
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (!map[e.name]) map[e.name] = { date: w.date, sets: e.sets };
    }
  }
  return map;
}

// Number of weight PRs each workout set (a PR = heavier top set than any
// earlier session, or the first weighted time doing that exercise).
export function computePrCountByWorkoutId(workouts) {
  const byId = {};
  const bestSoFar = {}; // exercise -> heaviest top set in earlier sessions
  for (const w of [...workouts].sort((a, b) => a.date - b.date)) {
    const topThis = {};
    for (const e of w.exercises) {
      const mw = e.sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
      topThis[e.name] = Math.max(topThis[e.name] ?? 0, mw);
    }
    let count = 0;
    for (const [name, mw] of Object.entries(topThis)) {
      const prior = bestSoFar[name];
      if (prior === undefined ? mw > 0 : mw > prior) count++;
    }
    byId[w.id] = count;
    for (const [name, mw] of Object.entries(topThis)) {
      bestSoFar[name] = Math.max(bestSoFar[name] ?? 0, mw);
    }
  }
  return byId;
}

// Groups workouts by calendar month, formatted "MOIS ANNÉE" (fr-FR,
// uppercased). Expects `workouts` newest-first and keeps that order within
// and across groups.
export function computeHistoryMonths(workouts) {
  const groups = [];
  let cur = null;
  for (const w of workouts) {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!cur || cur.key !== key) {
      cur = {
        key,
        label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase(),
        items: [],
      };
      groups.push(cur);
    }
    cur.items.push(w);
  }
  return groups;
}
