import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  WEEK_DAYS,
  emptyWeek,
  localDate,
  addDays,
  weekStart,
  normalizePlan,
  rollWeek,
  weekRows,
  saveWeekDraft,
  movePlannedSession,
  undoMove,
  linkCompletedWorkout,
  completionTarget,
} from "./weeklyPlan";
const templates = [
  { id: "push", name: "Push" },
  { id: "pull", name: "Pull" },
  { id: "legs", name: "Legs" },
];
const monday = "2026-09-14";
const wednesday = "2026-09-16";
const draft = {
  ...emptyWeek(),
  monday: "push",
  wednesday: "pull",
  friday: "legs",
};
const setup = (today = monday, history = [], selection = draft) =>
  saveWeekDraft(null, selection, "template", today, templates, history);
const workout = (id, name, date) => ({
  id,
  name,
  date: new Date(`${date}T18:00:00`).getTime(),
  exercises: [],
  durationMin: 45,
});
const target = (day = "monday", id = "push") => ({
  weekStart: monday,
  day,
  templateId: id,
});

describe("weekly configuration", () => {
  it.each([0, 1, 3, 7])(
    "saves %i planned days including an intentionally empty week",
    (count) => {
      const selection = emptyWeek();
      WEEK_DAYS.slice(0, count).forEach((d) => (selection[d.key] = "push"));
      const plan = setup(monday, [], selection);
      expect(plan.weekly_template).not.toBeNull();
      expect(
        weekRows(plan, templates, [], monday).filter((r) => r.slot),
      ).toHaveLength(count);
    },
  );
  it("distinguishes an unconfigured week from a saved empty week", () => {
    expect(normalizePlan(null).weekly_template).toBeNull();
    expect(setup(monday, [], emptyWeek()).weekly_template).toEqual(emptyWeek());
  });
  it("edits only the real week when requested", () => {
    const plan = setup();
    const edited = saveWeekDraft(
      plan,
      { ...draft, tuesday: "legs", friday: null },
      "current",
      monday,
      templates,
      [],
    );
    expect(edited.weekly_template).toEqual(draft);
    expect(edited.current_week.days.tuesday.templateId).toBe("legs");
    expect(edited.current_week.days.friday).toBeNull();
    const next = rollWeek(edited, "2026-09-21");
    expect(next.current_week.days.tuesday).toBeNull();
    expect(next.current_week.days.friday.templateId).toBe("legs");
  });
  it("keeps manual removals when applying changes to the recurring template", () => {
    const edited = saveWeekDraft(
      setup(),
      { ...draft, friday: null },
      "current",
      monday,
      templates,
      [],
    );
    const changed = saveWeekDraft(
      edited,
      { ...draft, friday: "pull" },
      "template",
      monday,
      templates,
      [],
    );
    expect(changed.current_week.days.friday).toBeNull();
    expect(changed.weekly_template.friday).toBe("pull");
  });
  it("does not silently remove missed days when the recurring week changes", () => {
    const plan = saveWeekDraft(
      setup(),
      { ...draft, monday: null, friday: "push" },
      "template",
      wednesday,
      templates,
      [],
    );
    expect(plan.current_week.days.monday.templateId).toBe("push");
    expect(plan.current_week.days.friday.templateId).toBe("push");
  });
  it("can save the recurring template for the following week only", () => {
    const plan = saveWeekDraft(
      setup(),
      emptyWeek(),
      "template",
      monday,
      templates,
      [],
      false,
    );
    expect(plan.current_week.days.monday.templateId).toBe("push");
    expect(rollWeek(plan, "2026-09-21").current_week.days.monday).toBeNull();
  });
  it("keeps renamed templates by ID and deleted templates visible", () => {
    const renamed = templates.map((t) =>
      t.id === "push" ? { ...t, name: "Push A" } : t,
    );
    expect(weekRows(setup(), renamed, [], monday)[0].name).toBe("Push A");
    const missing = weekRows(setup(), templates.slice(1), [], monday)[0];
    expect(missing.name).toBe("Séance supprimée");
    expect(missing.status).toBe("today");
    expect(missing.missing).toBe(true);
  });
  it("rejects adding an ID deleted since opening the editor, but allows removing it", () => {
    expect(() =>
      saveWeekDraft(
        setup(),
        { ...draft, tuesday: "removed" },
        "current",
        monday,
        templates,
        [],
      ),
    ).toThrow("supprimée");
    const result = saveWeekDraft(
      setup(),
      { ...draft, monday: null },
      "template",
      monday,
      templates.slice(1),
      [],
    );
    expect(result.current_week.days.monday).toBeNull();
  });
});
describe("history links and states", () => {
  it("derives DONE/TODAY/UPCOMING/MISSED without duplicating exercises", () => {
    const history = [workout("done-push", "Push", monday)];
    const plan = setup(wednesday, history);
    const rows = weekRows(plan, templates, history, wednesday);
    expect(rows[0].status).toBe("done");
    expect(rows[2].status).toBe("today");
    expect(rows[4].status).toBe("upcoming");
    expect(plan.current_week.days.monday).toEqual({
      templateId: "push",
      workoutId: "done-push",
    });
    expect(weekRows(plan, templates, [], wednesday)[0].status).toBe("missed");
  });
  it("matches repeated instances of the same template to different local days", () => {
    const selection = { ...emptyWeek(), monday: "push", wednesday: "push" };
    const history = [workout("one", "Push", monday)];
    const rows = weekRows(
      setup(wednesday, history, selection),
      templates,
      history,
      wednesday,
    );
    expect(rows[0].status).toBe("done");
    expect(rows[2].status).toBe("today");
  });
  it("never guesses when two saved templates have the same name", () => {
    const plan = saveWeekDraft(
      null,
      draft,
      "template",
      monday,
      [...templates, { id: "other-push", name: "Push" }],
      [workout("one", "Push", monday)],
    );
    expect(plan.current_week.days.monday.workoutId).toBeUndefined();
  });
  it("keeps DONE after rename or deletion of the source template", () => {
    const history = [workout("one", "Push", monday)];
    const plan = setup(monday, history);
    expect(
      weekRows(plan, templates.slice(1), history, monday)[0],
    ).toMatchObject({ status: "done", name: "Push", missing: false });
  });
  it("does not match a different day or an unplanned workout", () => {
    const history = [
      workout("one", "Pull", monday),
      workout("two", "Push", "2026-09-15"),
    ];
    expect(
      weekRows(setup(monday, history), templates, history, monday).some(
        (r) => r.status === "done",
      ),
    ).toBe(false);
    expect(
      completionTarget(
        setup(),
        { fromTemplateId: "legs" },
        workout("x", "", monday).date,
      ),
    ).toBeNull();
    expect(
      completionTarget(setup(), {}, workout("x", "", monday).date),
    ).toBeNull();
  });
  it("links only the corresponding day when finishing a scheduled workout", () => {
    const history = [workout("one", "Push", monday)];
    const plan = linkCompletedWorkout(
      setup(),
      target(),
      "one",
      monday,
      history,
    );
    expect(weekRows(plan, templates, history, monday)[0].status).toBe("done");
    expect(plan.weekly_template.monday).toBe("push");
  });
  it("keeps the planned date if the session ends after midnight", () => {
    expect(
      completionTarget(
        setup(),
        { plannedSlot: target() },
        workout("one", "Push", "2026-09-15").date,
      ),
    ).toEqual(target());
  });
  it("prevents the same historical session counting for two planned days", () => {
    const history = [workout("one", "Push", monday)];
    const plan = linkCompletedWorkout(
      setup(monday, [], { ...draft, wednesday: "push" }),
      target(),
      "one",
      monday,
      history,
    );
    expect(() =>
      linkCompletedWorkout(plan, target("wednesday"), "one", monday, history),
    ).toThrow("autre jour");
  });
  it("allows associating a free historical workout explicitly", () => {
    const history = [workout("one", null, monday)];
    expect(
      weekRows(
        linkCompletedWorkout(setup(), target(), "one", monday, history),
        templates,
        history,
        monday,
      )[0].status,
    ).toBe("done");
  });
  it("never overwrites an existing completion or silently reassigns after a plan edit", () => {
    const history = [
      workout("one", "Push", monday),
      workout("two", "Push", monday),
    ];
    const plan = linkCompletedWorkout(
      setup(),
      target(),
      "one",
      monday,
      history,
    );
    expect(() =>
      linkCompletedWorkout(plan, target(), "two", monday, history),
    ).toThrow("déjà associé");
    expect(() =>
      linkCompletedWorkout(plan, target("friday"), "two", monday, history),
    ).toThrow("planning a changé");
  });
});
describe("manual flexibility", () => {
  it("keeps a moved source visible without counting the session twice", () => {
    const plan = movePlannedSession(
      setup(),
      "wednesday",
      "thursday",
      monday,
      [],
    );
    const rows = weekRows(plan, templates, [], wednesday);
    expect(rows[2].status).toBe("moved");
    expect(rows[3].slot.movedFrom).toBe("wednesday");
    expect(rows.filter((r) => r.slot && r.status !== "moved")).toHaveLength(3);
    expect(plan.weekly_template.wednesday).toBe("pull");
  });
  it("rejects moving onto an occupied day and can undo a move", () => {
    expect(() =>
      movePlannedSession(setup(), "monday", "friday", monday, []),
    ).toThrow("jour vide");
    const reverted = undoMove(
      movePlannedSession(setup(), "wednesday", "thursday", monday, []),
      "thursday",
      monday,
      [],
    );
    expect(reverted.current_week.days.wednesday.templateId).toBe("pull");
    expect(reverted.current_week.days.thursday).toBeNull();
  });
  it("follows a planned session moved after it was started", () => {
    const plan = movePlannedSession(setup(), "monday", "tuesday", monday, []);
    const linked = linkCompletedWorkout(plan, target(), "one", monday, [
      workout("one", "Push", monday),
    ]);
    expect(linked.current_week.days.tuesday.workoutId).toBe("one");
    expect(linked.current_week.days.monday.workoutId).toBeUndefined();
  });
});
describe("dates, time zones and rollover", () => {
  it("uses Monday boundaries across year changes", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("starts a new week without old completion links and keeps the previous snapshot", () => {
    const old = setup(monday, [workout("one", "Push", monday)]);
    const next = rollWeek(old, "2026-09-21");
    expect(next.current_week.days.monday).toEqual({ templateId: "push" });
    expect(next.previous_week.days.monday.workoutId).toBe("one");
  });
  it("can associate a Sunday workout saved after the Monday rollover", () => {
    const plan = setup(monday, [], { ...emptyWeek(), sunday: "push" });
    const linked = linkCompletedWorkout(
      plan,
      target("sunday"),
      "late",
      "2026-09-21",
      [workout("late", "Push", "2026-09-21")],
    );
    expect(linked.previous_week.days.sunday.workoutId).toBe("late");
    expect(linked.current_week.days.sunday.workoutId).toBeUndefined();
  });
  it.each(["Europe/Paris", "America/Los_Angeles", "Pacific/Auckland"])(
    "preserves civil dates and DST transitions in %s",
    (tz) => {
      const module = new URL("./weeklyPlan.js", import.meta.url).href;
      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import {localDate,addDays,weekStart} from '${module}'; console.log(JSON.stringify([localDate(new Date(2026,2,29,0,30)),addDays('2026-03-23',7),addDays('2026-10-19',7),weekStart('2026-03-29')]));`,
        ],
        { env: { ...process.env, TZ: tz } },
      ).toString();
      expect(JSON.parse(result)).toEqual([
        "2026-03-29",
        "2026-03-30",
        "2026-10-26",
        "2026-03-23",
      ]);
    },
  );
  it("normalizes malformed saved settings to a safe empty plan", () => {
    expect(
      normalizePlan({
        weekly_template: { monday: 12 },
        current_week: { start: "nonsense" },
      }),
    ).toMatchObject({ weekly_template: emptyWeek(), current_week: null });
    expect(localDate(new Date(2026, 8, 14, 0, 5))).toBe(monday);
  });
});

describe("repeated adjustments", () => {
  it("preserves an emptied intermediate day when applying a new recurring week", () => {
    const moved = movePlannedSession(
      movePlannedSession(setup(), "wednesday", "thursday", monday, []),
      "thursday",
      "saturday",
      monday,
      [],
    );
    const updated = saveWeekDraft(
      moved,
      { ...draft, thursday: "legs" },
      "template",
      monday,
      templates,
      [],
    );
    expect(updated.current_week.days.thursday).toBeNull();
    expect(updated.current_week.days.saturday.templateId).toBe("pull");
    expect(updated.weekly_template.thursday).toBe("legs");
  });
});
