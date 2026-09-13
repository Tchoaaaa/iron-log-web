import { uid } from "./constants";

export function templateEntry(plan) {
  const common = { sets: plan.count, targets: plan.targets };
  return plan.kind === "superset"
    ? {
        ...common,
        name: `${plan.nameA} + ${plan.nameB}`,
        pair: [plan.nameA, plan.nameB],
        targetsB: plan.targetsB,
        restA: plan.restA,
        restB: plan.restB,
      }
    : { ...common, name: plan.name, rest: plan.rest };
}

export function liveEntry(plan, previous) {
  const isSuper = plan.kind === "superset";
  const wasSuper = previous?.kind === "superset";
  // Only carry over already-entered results when the exercise in that slot
  // is unchanged. Otherwise (the user picked a *different* exercise via the
  // edit drawer) that slot starts fresh — carrying over the old exercise's
  // weight/reps/done by position would silently attribute its performance
  // to the new exercise.
  const prevPrimaryName = wasSuper ? previous?.nameA : previous?.name;
  const nextPrimaryName = isSuper ? plan.nameA : plan.name;
  const samePrimary = !!previous && prevPrimaryName === nextPrimaryName;
  const sameSecondary = !!previous && wasSuper && isSuper && previous.nameB === plan.nameB;
  return {
    id: previous?.id || uid(),
    kind: plan.kind,
    name: isSuper ? `${plan.nameA} + ${plan.nameB}` : plan.name,
    ...(isSuper
      ? {
          nameA: plan.nameA,
          nameB: plan.nameB,
          restA: plan.restA,
          restB: plan.restB,
        }
      : { rest: plan.rest }),
    sets: Array.from({ length: plan.count }, (_, i) => {
      const old = samePrimary ? previous.sets[i] || {} : {};
      const oldB = sameSecondary ? previous.sets[i] || {} : {};
      const weight = old[wasSuper ? "weightA" : "weight"] ?? "";
      const reps = old[wasSuper ? "repsA" : "reps"] ?? "";
      const done = old[wasSuper ? "doneA" : "done"] ?? false;
      return isSuper
        ? {
            weightA: weight,
            repsA: reps,
            doneA: done,
            targetA: plan.targets?.[i] || "",
            weightB: oldB.weightB ?? "",
            repsB: oldB.repsB ?? "",
            doneB: oldB.doneB ?? false,
            targetB: plan.targetsB?.[i] || "",
          }
        : { weight, reps, done, target: plan.targets?.[i] || "" };
    }),
  };
}

// Dissociating a saved pair keeps its second exercise and all entered sets.
export function replaceLiveEntry(previous, plan) {
  const result = [liveEntry(plan, previous)];
  if (previous.kind === "superset" && plan.kind === "single") {
    result.push({
      id: uid(),
      kind: "single",
      name: previous.nameB,
      rest: previous.restB,
      sets: previous.sets.map((s) => ({
        weight: s.weightB,
        reps: s.repsB,
        done: s.doneB,
        target: s.targetB || "",
      })),
    });
  }
  return result;
}

export function replaceTemplateEntry(previous, plan) {
  const result = [templateEntry(plan)];
  if (previous.pair && plan.kind === "single")
    result.push({
      name: previous.pair[1],
      sets: previous.sets,
      rest: previous.restB,
      targets: previous.targetsB,
    });
  return result;
}

export function planFromEntry(entry) {
  const live = Array.isArray(entry.sets);
  const superSet = entry.kind === "superset" || !!entry.pair;
  return {
    kind: superSet ? "superset" : "single",
    name: superSet ? entry.nameA || entry.pair[0] : entry.name,
    nameA: superSet ? entry.nameA || entry.pair[0] : entry.name,
    nameB: entry.nameB || entry.pair?.[1] || "",
    count: live ? entry.sets.length : entry.sets,
    rest: entry.rest ?? entry.restA ?? 90,
    restA: entry.restA ?? entry.rest ?? 90,
    restB: entry.restB ?? 90,
    targets: live
      ? entry.sets.map((s) => (superSet ? s.targetA : s.target) || "")
      : [...(entry.targets || [])],
    targetsB: live
      ? entry.sets.map((s) => s.targetB || "")
      : [...(entry.targetsB || [])],
  };
}
