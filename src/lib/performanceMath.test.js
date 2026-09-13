import { describe, it, expect } from "vitest";
import {
  exerciseTimelines,
  exerciseRecords,
  performanceOverview,
  performancePeriod,
  exerciseDetail,
  changePercent,
} from "./performanceMath";
import { computePrCountByWorkoutId } from "./workoutMath";
const day = (d) => new Date(`${d}T12:00:00`).getTime();
const ex = (name, weight, reps = 8) => ({ name, sets: [{ weight, reps }] });
const w = (id, date, exercises) => ({
  id,
  date: day(date),
  name: "Nom de séance",
  durationMin: 40,
  exercises,
});
const workouts = [
  w("c", "2026-09-13", [ex("Bench", 80), ex("Row", 50)]),
  w("a", "2026-08-31", [ex("Bench", 60)]),
  w("b", "2026-09-07", [ex("Bench", 70)]),
];
const now = day("2026-09-13");
describe("performance calculations", () => {
  it("uses calendar week/month/year and equal-length previous windows", () => {
    expect(performancePeriod("week", now)).toMatchObject({
      start: "2026-09-07",
      end: "2026-09-14",
      days: 7,
      previousStart: "2026-08-31",
    });
    expect(performancePeriod("month", now)).toMatchObject({
      start: "2026-09-01",
      days: 13,
      previousStart: "2026-08-19",
    });
    expect(performancePeriod("year", day("2024-03-01")).days).toBe(61);
  });
  it("aggregates loaded history without including the previous period", () => {
    const data = performanceOverview(workouts, "month", now);
    expect(data.totals).toMatchObject({ sessions: 2, volume: 1600, prs: 3 });
    expect(data.previous).toMatchObject({ sessions: 1, volume: 480, prs: 1 });
    expect(data.buckets.reduce((n, p) => n + p.value, 0)).toBe(
      data.totals.volume,
    );
    expect(data.totals.frequency).toBeCloseTo(2 / (13 / 7));
  });
  it("shares the existing PR definition, including the initial weighted session", () => {
    const data = performanceOverview(workouts, "year", now);
    expect(data.totals.prs).toBe(
      Object.values(computePrCountByWorkoutId(workouts)).reduce(
        (a, b) => a + b,
        0,
      ),
    );
  });
  it("keeps exercise identity separate from workout names", () => {
    const records = exerciseRecords(exerciseTimelines(workouts));
    expect(records.map((r) => r.name).sort()).toEqual(["Bench", "Row"]);
    expect(records.find((r) => r.name === "Bench")).toMatchObject({
      weight: 80,
      reps: 8,
      workoutId: "c",
    });
  });
  it("chooses heavier sets first, then reps at the same weight", () => {
    const data = [
      w("a", "2026-09-01", [ex("Squat", 80, 8)]),
      w("b", "2026-09-02", [ex("Squat", 80, 10)]),
      w("c", "2026-09-03", [ex("Squat", 70, 15)]),
    ];
    expect(exerciseRecords(exerciseTimelines(data))[0]).toMatchObject({
      weight: 80,
      reps: 10,
      workoutId: "b",
    });
    expect(exerciseDetail(data, "Squat", 4, now).prs).toBe(1);
  });
  it("merges repeated blocks within the same session without duplicating dates or PRs", () => {
    const data = exerciseTimelines([
      w("a", "2026-09-01", [ex("Bench", 60), ex("Bench", 70)]),
    ]).get("Bench");
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ weight: 70, volume: 1040, pr: true });
  });
  it("handles bodyweight and invalid or empty sets without invented load", () => {
    const data = [
      w("a", "2026-09-01", [ex("Tractions", 0, 6), { name: "Vide", sets: [] }]),
      w("b", "2026-09-10", [ex("Tractions", 0, 10), ex("Invalide", NaN)]),
    ];
    const result = exerciseDetail(data, "Tractions", 4, now);
    expect(result).toMatchObject({
      weighted: false,
      value: 10,
      repsChange: 4,
      volume: 0,
      prs: 0,
      chargeChange: null,
    });
    expect(exerciseRecords(exerciseTimelines(data))).toHaveLength(1);
  });
  it("provides a record even when it predates the selected detail window", () => {
    const data = [
      w("a", "2025-01-01", [ex("Bench", 100)]),
      w("b", "2026-09-10", [ex("Bench", 80)]),
    ];
    const result = exerciseDetail(data, "Bench", 4, now);
    expect(result.best.weight).toBe(100);
    expect(result.rows).toHaveLength(1);
    expect(result.change).toBeNull();
    expect(result.prs).toBe(0);
  });
  it("handles empty periods and missing exercises without NaN or fictional trends", () => {
    const data = performanceOverview([], "month", now);
    expect(data.totals).toEqual({
      sessions: 0,
      volume: 0,
      prs: 0,
      frequency: 0,
    });
    expect(data.progression).toEqual([]);
    expect(exerciseDetail([], "Bench", 8, now).best).toBeNull();
    expect(changePercent(5, 0)).toBeNull();
    expect(changePercent(0, 5)).toBe(-100);
  });
  it("keeps exact date boundaries and excludes future days", () => {
    const data = [
      w("a", "2026-09-06", [ex("Bench", 10)]),
      w("b", "2026-09-07", [ex("Bench", 20)]),
      w("c", "2026-09-14", [ex("Bench", 30)]),
    ];
    expect(
      performanceOverview(data, "week", now).current.map((r) => r.id),
    ).toEqual(["b"]);
  });
  it("recalculates all-time records and PRs after editing or deleting history", () => {
    const remaining = workouts.filter((w) => w.id !== "c");
    expect(exerciseRecords(exerciseTimelines(remaining))[0].weight).toBe(70);
    const edited = remaining.map((row) =>
      row.id === "b" ? { ...row, exercises: [ex("Bench", 50)] } : row,
    );
    expect(exerciseDetail(edited, "Bench", 4, now).prs).toBe(1);
  });
  it("does not mutate workouts and produces chronological series from unsorted data", () => {
    const original = JSON.stringify(workouts);
    const rows = exerciseTimelines(workouts).get("Bench");
    expect(rows.map((r) => r.workoutId)).toEqual(["a", "b", "c"]);
    expect(JSON.stringify(workouts)).toBe(original);
  });
});

describe("recorded progression", () => {
  it("plots actual load, independently of estimated strength or repetitions", () => {
    const rows = [
      w("a", "2026-09-01", [ex("Bench", 60, 30)]),
      w("b", "2026-09-10", [ex("Bench", 70, 5)]),
    ];
    const detail = exerciseDetail(rows, "Bench", 4, now);
    expect(detail.metric).toBe("weight");
    expect(detail.value).toBe(70);
    expect(detail.rows.map((row) => row[detail.metric])).toEqual([60, 70]);
    expect(detail.change).toBeCloseTo(100 / 6);
    expect(performanceOverview(rows, "month", now).progression[0].value).toBe(
      70,
    );
  });
});
