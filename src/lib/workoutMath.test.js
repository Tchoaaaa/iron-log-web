import { describe, it, expect } from "vitest";
import {
  estOneRM,
  volumeOfExercises,
  repsOfExercises,
  setsOfExercises,
  computeLastByExercise,
  computePrCountByWorkoutId,
  computeHistoryMonths,
} from "./workoutMath";

describe("estOneRM", () => {
  it("estimates a 1RM from weight and reps (Epley-style)", () => {
    expect(estOneRM(100, 6)).toBe(120);
  });
  it("returns 0 when weight is missing", () => {
    expect(estOneRM(0, 6)).toBe(0);
  });
  it("returns 0 when reps is missing", () => {
    expect(estOneRM(100, 0)).toBe(0);
  });
});

const fixture = [
  { sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
  { sets: [{ weight: 50, reps: 10 }] },
];

describe("volumeOfExercises", () => {
  it("sums weight×reps across all sets and exercises", () => {
    expect(volumeOfExercises(fixture)).toBe(100 * 5 * 2 + 50 * 10);
  });
  it("returns 0 for an empty exercise list", () => {
    expect(volumeOfExercises([])).toBe(0);
  });
  it("returns 0 when every exercise has empty sets", () => {
    expect(volumeOfExercises([{ sets: [] }])).toBe(0);
  });
});

describe("repsOfExercises", () => {
  it("sums reps across all sets and exercises", () => {
    expect(repsOfExercises(fixture)).toBe(5 + 5 + 10);
  });
});

describe("setsOfExercises", () => {
  it("counts total sets across all exercises", () => {
    expect(setsOfExercises(fixture)).toBe(3);
  });
});

const workouts = [
  {
    id: "w3",
    date: new Date(2026, 2, 1).getTime(),
    exercises: [{ name: "Squat", sets: [{ weight: 120, reps: 5 }] }],
  },
  {
    id: "w2",
    date: new Date(2026, 1, 15).getTime(),
    exercises: [{ name: "Squat", sets: [{ weight: 110, reps: 5 }] }],
  },
  {
    id: "w1",
    date: new Date(2026, 1, 1).getTime(),
    exercises: [{ name: "Squat", sets: [{ weight: 100, reps: 5 }] }],
  },
];

describe("computeLastByExercise", () => {
  it("returns the sets from the first (most recent) workout logging that exercise", () => {
    expect(computeLastByExercise(workouts)).toEqual({
      Squat: { date: workouts[0].date, sets: workouts[0].exercises[0].sets },
    });
  });
  it("returns an empty map for no workouts", () => {
    expect(computeLastByExercise([])).toEqual({});
  });
  it("doesn't blow up on an exercise only ever logged once", () => {
    const single = [{ id: "a", date: 1, exercises: [{ name: "Curl", sets: [{ weight: 10, reps: 12 }] }] }];
    expect(computeLastByExercise(single).Curl.sets).toEqual([{ weight: 10, reps: 12 }]);
  });
});

describe("computePrCountByWorkoutId", () => {
  it("flags a PR on the first weighted time and on every heavier top set since", () => {
    const counts = computePrCountByWorkoutId(workouts);
    expect(counts.w1).toBe(1); // first time -> PR
    expect(counts.w2).toBe(1); // 110 > 100 -> PR
    expect(counts.w3).toBe(1); // 120 > 110 -> PR
  });
  it("doesn't count a repeated (non-heavier) top set as a PR", () => {
    const repeated = [
      { id: "b", date: 2, exercises: [{ name: "Squat", sets: [{ weight: 100, reps: 5 }] }] },
      { id: "a", date: 1, exercises: [{ name: "Squat", sets: [{ weight: 100, reps: 5 }] }] },
    ];
    expect(computePrCountByWorkoutId(repeated).b).toBe(0);
  });
  it("returns an empty map for no workouts", () => {
    expect(computePrCountByWorkoutId([])).toEqual({});
  });
});

describe("computeHistoryMonths", () => {
  it("groups workouts by calendar month, keeping newest-first order", () => {
    const groups = computeHistoryMonths(workouts);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toEqual([workouts[0]]);
    expect(groups[1].items).toEqual([workouts[1], workouts[2]]);
  });
  it("returns no groups for an empty history", () => {
    expect(computeHistoryMonths([])).toEqual([]);
  });
  it("keeps separate groups across a year boundary", () => {
    const spanning = [
      { id: "jan", date: new Date(2026, 0, 5).getTime(), exercises: [] },
      { id: "dec", date: new Date(2025, 11, 20).getTime(), exercises: [] },
    ];
    const groups = computeHistoryMonths(spanning);
    expect(groups).toHaveLength(2);
    expect(groups[0].items[0].id).toBe("jan");
    expect(groups[1].items[0].id).toBe("dec");
  });
});
