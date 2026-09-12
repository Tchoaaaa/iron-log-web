import { describe, it, expect } from "vitest";
import { cleanActiveEntries, groupExercisesIntoEntries } from "./useActiveSession";

describe("cleanActiveEntries", () => {
  it("drops sets with an empty weight or reps field", () => {
    const entries = [
      {
        kind: "single",
        name: "Squat",
        sets: [
          { weight: "100", reps: "5", done: true },
          { weight: "", reps: "5", done: false },
        ],
      },
    ];
    const cleaned = cleanActiveEntries(entries);
    expect(cleaned).toEqual([{ name: "Squat", sets: [{ weight: 100, reps: 5 }] }]);
  });

  it("drops an entry entirely once all its sets are empty", () => {
    const entries = [{ kind: "single", name: "Curl", sets: [{ weight: "", reps: "", done: false }] }];
    expect(cleanActiveEntries(entries)).toEqual([]);
  });

  it("splits a superset entry into two rows tagged with the same superset id", () => {
    const entries = [
      {
        id: "abc",
        kind: "superset",
        nameA: "Bench",
        nameB: "Row",
        sets: [{ weightA: "80", repsA: "8", weightB: "60", repsB: "10" }],
      },
    ];
    expect(cleanActiveEntries(entries)).toEqual([
      { name: "Bench", superset: "abc", sets: [{ weight: 80, reps: 8 }] },
      { name: "Row", superset: "abc", sets: [{ weight: 60, reps: 10 }] },
    ]);
  });

  it("keeps only the side of a superset that has valid sets", () => {
    const entries = [
      {
        id: "abc",
        kind: "superset",
        nameA: "Bench",
        nameB: "Row",
        sets: [{ weightA: "80", repsA: "8", weightB: "", repsB: "" }],
      },
    ];
    expect(cleanActiveEntries(entries)).toEqual([
      { name: "Bench", superset: "abc", sets: [{ weight: 80, reps: 8 }] },
    ]);
  });
});

describe("groupExercisesIntoEntries", () => {
  it("rebuilds plain exercises (no superset field) as single entries", () => {
    const exercises = [{ name: "Squat", sets: [{ weight: 100, reps: 5 }] }];
    const [entry] = groupExercisesIntoEntries(exercises);
    expect(entry.kind).toBe("single");
    expect(entry.name).toBe("Squat");
    expect(entry.sets).toEqual([{ weight: "100", reps: "5", done: true }]);
  });

  it("keeps a 0kg set as the string '0', not an empty string", () => {
    const exercises = [{ name: "Dips", sets: [{ weight: 0, reps: 12 }] }];
    const [entry] = groupExercisesIntoEntries(exercises);
    expect(entry.sets[0].weight).toBe("0");
  });

  // Regression test for the "superset lost on edit" bug: two exercises
  // sharing a `superset` id must come back as ONE superset entry, not two
  // independent singles.
  it("regroups a pair sharing a superset id into one superset entry", () => {
    const exercises = [
      { name: "Bench", superset: "s1", sets: [{ weight: 80, reps: 8 }] },
      { name: "Row", superset: "s1", sets: [{ weight: 60, reps: 10 }] },
    ];
    const entries = groupExercisesIntoEntries(exercises);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("superset");
    expect(entries[0].nameA).toBe("Bench");
    expect(entries[0].nameB).toBe("Row");
    expect(entries[0].sets).toEqual([
      { weightA: "80", repsA: "8", doneA: true, weightB: "60", repsB: "10", doneB: true },
    ]);
  });

  it("does not merge two exercises that don't share a superset id", () => {
    const exercises = [
      { name: "Bench", sets: [{ weight: 80, reps: 8 }] },
      { name: "Row", sets: [{ weight: 60, reps: 10 }] },
    ];
    const entries = groupExercisesIntoEntries(exercises);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.kind === "single")).toBe(true);
  });

  it("handles a superset pair with unequal surviving set counts", () => {
    const exercises = [
      { name: "Bench", superset: "s1", sets: [{ weight: 80, reps: 8 }, { weight: 82, reps: 6 }] },
      { name: "Row", superset: "s1", sets: [{ weight: 60, reps: 10 }] },
    ];
    const [entry] = groupExercisesIntoEntries(exercises);
    expect(entry.sets).toHaveLength(2);
    expect(entry.sets[1]).toEqual({ weightA: "82", repsA: "6", doneA: true, weightB: "", repsB: "", doneB: false });
  });
});
