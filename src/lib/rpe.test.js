import { describe, it, expect } from "vitest";
import { normalizeRpe, rpeEnabled } from "./rpe";
import { liveEntry, templateEntry, planFromEntry, replaceLiveEntry, replaceTemplateEntry } from "./exercisePlan";
import { cleanActiveEntries, groupExercisesIntoEntries } from "../hooks/useActiveSession";

const plan = { kind: "single", name: "Squat", nameA: "Squat", count: 2, targets: [], rpeEnabled: true };

describe("optional RPE per set", () => {
  it.each(["", " ", null, undefined, true, [], 0, 11, -1, 7.5, "oops", Infinity])("rejects invalid or absent value %s", value => {
    expect(normalizeRpe(value)).toBeNull();
  });
  it.each([1, 10, "8"])("accepts RPE %s", value => {
    expect(normalizeRpe(value)).toBe(Number(value));
  });
  it("stores only activation in templates and starts every session without ratings", () => {
    const template = templateEntry({ ...plan, rpe: 8 });
    expect(template.rpeEnabled).toBe(true);
    expect(template.rpe).toBeUndefined();
    const loaded = planFromEntry(template);
    const session = liveEntry(loaded);
    expect(session.rpeEnabled).toBe(true);
    expect(session.sets.every(s => s.rpe === undefined)).toBe(true);
    expect(rpeEnabled({ name: "Old", sets: 3 })).toBe(false);
  });
  it("keeps per-set RPE attached to the surviving results and supports clearing", () => {
    const entry = liveEntry(plan);
    entry.sets = [
      { weight: "50", reps: "8", rpe: "6" },
      { weight: "", reps: "", rpe: "10" },
      { weight: "50", reps: "7", rpe: "9" },
    ];
    const saved = cleanActiveEntries([entry]);
    expect(saved[0].sets).toEqual([{ weight: 50, reps: 8, rpe: 6 }, { weight: 50, reps: 7, rpe: 9 }]);
    const [reopened] = groupExercisesIntoEntries(JSON.parse(JSON.stringify(saved)));
    expect(reopened.rpeEnabled).toBe(true);
    expect(reopened.sets.map(s => s.rpe)).toEqual([6, 9]);
    reopened.sets[0].rpe = "";
    expect(cleanActiveEntries([reopened])[0].sets[0]).toEqual({ weight: 50, reps: 8 });
  });
  it("round-trips distinct RPE values for each side and round of a superset", () => {
    const entry = liveEntry({ ...plan, kind: "superset", nameB: "Row" });
    entry.sets = [
      { weightA: "50", repsA: "8", rpeA: "6", weightB: "30", repsB: "10", rpeB: "8" },
      { weightA: "50", repsA: "7", rpeA: "9", weightB: "30", repsB: "8", rpeB: "" },
    ];
    const saved = cleanActiveEntries([entry]);
    expect(saved[0].sets.map(s => s.rpe)).toEqual([6, 9]);
    expect(saved[1].sets.map(s => s.rpe)).toEqual([8, undefined]);
    const [reopened] = groupExercisesIntoEntries(saved);
    expect(reopened.sets.map(s => [s.rpeA, s.rpeB])).toEqual([[6, 8], [9, undefined]]);
    expect(reopened.rpeEnabled).toBe(true);
  });
  it("preserves ratings on mode changes and clears only a replaced exercise", () => {
    const entry = liveEntry(plan);
    entry.sets[0] = { weight: "50", reps: "8", rpe: 7 };
    const pairPlan = { ...plan, kind: "superset", nameB: "Row" };
    const [pair] = replaceLiveEntry(entry, pairPlan);
    pair.sets[0].rpeB = 9;
    expect(pair.sets[0].rpeA).toBe(7);
    const edited = liveEntry({ ...pairPlan, nameB: "Curl" }, pair);
    expect(edited.sets[0].rpeA).toBe(7);
    expect(edited.sets[0].rpeB).toBeUndefined();
    const [a, b] = replaceLiveEntry(pair, plan);
    expect(a.sets[0].rpe).toBe(7);
    expect(b.sets[0].rpe).toBe(9);
    expect(b.rpeEnabled).toBe(true);
    const splitTemplates = replaceTemplateEntry(templateEntry(pairPlan), plan);
    expect(splitTemplates.every(e => e.rpeEnabled)).toBe(true);
  });
  it("allows an enabled block to be saved without any rating", () => {
    const entry = liveEntry(plan);
    entry.sets[0] = { weight: "0", reps: "12" };
    const [saved] = cleanActiveEntries([entry]);
    expect(saved).toMatchObject({ rpeEnabled: true, sets: [{ weight: 0, reps: 12 }] });
    expect(saved.sets[0].rpe).toBeUndefined();
  });
  it("recognizes saved set ratings even if an activation flag is absent", () => {
    const [entry] = groupExercisesIntoEntries([{ name: "Squat", sets: [{ weight: 10, reps: 5, rpe: 8 }] }]);
    expect(entry.rpeEnabled).toBe(true);
    expect(planFromEntry(entry).rpeEnabled).toBe(true);
  });
});
