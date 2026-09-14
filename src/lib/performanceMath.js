import { computePrCountByWorkoutId, volumeOfExercises } from "./workoutMath";
import { addDays, localDate, weekStart } from "./weeklyPlan";

const timestamp = (date) => new Date(`${date}T00:00:00`).getTime();
const dayDistance = (a, b) =>
  Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000,
  );
export const changePercent = (value, previous) =>
  previous > 0 ? ((value - previous) / previous) * 100 : null;
export const orderedWorkouts = (workouts) =>
  [...workouts]
    .filter((w) => Number.isFinite(Number(w.date)))
    .sort((a, b) => a.date - b.date);
export function performancePeriod(period, now = Date.now()) {
  const today = localDate(now);
  const start =
    period === "week"
      ? weekStart(today)
      : period === "year"
        ? `${today.slice(0, 4)}-01-01`
        : `${today.slice(0, 7)}-01`;
  const days = dayDistance(start, today) + 1;
  return {
    start,
    today,
    end: addDays(today, 1),
    days,
    previousStart: addDays(start, -days),
    previousEnd: start,
  };
}
const between = (workouts, start, end) =>
  workouts.filter((w) => w.date >= timestamp(start) && w.date < timestamp(end));
const validSets = (sets) =>
  (sets || [])
    .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) }))
    .filter(
      (s) =>
        Number.isFinite(s.weight) &&
        s.weight >= 0 &&
        Number.isFinite(s.reps) &&
        s.reps > 0,
    );
const betterSet = (a, b) =>
  !a || b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps)
    ? b
    : a;

// The same exercise name is the existing history identity. Combine duplicate
// entries within one workout, so a superset or repeated block counts once.
export function exerciseTimelines(workouts) {
  const all = new Map();
  for (const w of orderedWorkouts(workouts)) {
    const grouped = new Map();
    for (const e of w.exercises)
      grouped.set(e.name, [
        ...(grouped.get(e.name) || []),
        ...validSets(e.sets),
      ]);
    for (const [name, sets] of grouped) {
      if (!sets.length) continue;
      const prior = all.get(name) || [];
      const best = sets.reduce(betterSet, null);
      const priorWeight = prior.length
        ? Math.max(...prior.map((r) => r.weight))
        : 0;
      prior.push({
        workoutId: w.id,
        date: w.date,
        name: w.name || "Séance libre",
        ...best,
        maxReps: Math.max(...sets.map((s) => s.reps)),
        volume: sets.reduce((n, s) => n + s.weight * s.reps, 0),
        pr: best.weight > priorWeight,
      });
      all.set(name, prior);
    }
  }
  return all;
}
export function exerciseRecords(timelines) {
  return [...timelines]
    .map(([name, rows]) => ({
      ...rows.reduce((best, row) => betterSet(best, row), null),
      name,
    }))
    .sort((a, b) => b.date - a.date || a.name.localeCompare(b.name, "fr"));
}
export function exerciseProgress(name, rows) {
  const weighted = rows.some((r) => r.weight > 0);
  const metric = weighted ? "weight" : "maxReps";
  const first = rows[0]?.[metric] ?? 0;
  const last = rows.at(-1)?.[metric] ?? 0;
  return {
    name,
    rows,
    weighted,
    metric,
    value: last,
    change: rows.length > 1 ? changePercent(last, first) : null,
    repsChange: rows.length > 1 ? last - first : null,
  };
}
export function performanceOverview(workouts, period, now = Date.now()) {
  const range = performancePeriod(period, now);
  const current = between(workouts, range.start, range.end);
  const previous = between(workouts, range.previousStart, range.previousEnd);
  const counts = computePrCountByWorkoutId(workouts);
  const totals = (list) => ({
    sessions: list.length,
    volume: list.reduce((n, w) => n + volumeOfExercises(w.exercises), 0),
    prs: list.reduce((n, w) => n + (counts[w.id] || 0), 0),
    frequency: list.length / Math.max(1, range.days / 7),
  });
  const buckets = [];
  let cursor = range.start;
  while (cursor < range.end) {
    const next =
      period === "year"
        ? localDate(
            new Date(
              new Date(`${cursor}T12:00:00`).getFullYear(),
              new Date(`${cursor}T12:00:00`).getMonth() + 1,
              1,
              12,
            ),
          )
        : period === "month"
          ? weekStart(addDays(cursor, 7))
          : addDays(cursor, 1);
    const end = next > range.end ? range.end : next;
    const items = between(current, cursor, end);
    buckets.push({ date: timestamp(cursor), value: totals(items).volume });
    cursor = next;
  }
  const timelines = exerciseTimelines(workouts);
  const progression = [...timelines]
    .map(([name, rows]) =>
      exerciseProgress(name, between(rows, range.start, range.end)),
    )
    .filter((e) => e.rows.length)
    .sort(
      (a, b) =>
        b.rows.length - a.rows.length ||
        b.rows.at(-1).date - a.rows.at(-1).date ||
        a.name.localeCompare(b.name, "fr"),
    );
  return {
    range,
    current,
    totals: totals(current),
    previous: totals(previous),
    buckets,
    progression,
    records: exerciseRecords(timelines),
  };
}
export function exerciseDetail(workouts, name, weeks, now = Date.now()) {
  const rows = exerciseTimelines(workouts).get(name) || [];
  const end = addDays(localDate(now), 1);
  const start = addDays(end, -weeks * 7);
  const current = between(rows, start, end);
  const previous = between(rows, addDays(start, -weeks * 7), start);
  const volume = (list) => list.reduce((n, r) => n + r.volume, 0);
  const progress = exerciseProgress(name, current);
  return {
    ...progress,
    start,
    end,
    best: rows.reduce(betterSet, null),
    volume: volume(current),
    volumeChange: changePercent(volume(current), volume(previous)),
    maxCharge: current.reduce((max, r) => Math.max(max, r.weight), 0),
    prs: current.filter((r) => r.pr).length,
  };
}
