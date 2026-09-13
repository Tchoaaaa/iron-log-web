// Calendar dates are local civil dates, never UTC slices or multiples of 24h.
export const WEEK_DAYS = [
  { key: "monday", short: "LUN", label: "Lundi" },
  { key: "tuesday", short: "MAR", label: "Mardi" },
  { key: "wednesday", short: "MER", label: "Mercredi" },
  { key: "thursday", short: "JEU", label: "Jeudi" },
  { key: "friday", short: "VEN", label: "Vendredi" },
  { key: "saturday", short: "SAM", label: "Samedi" },
  { key: "sunday", short: "DIM", label: "Dimanche" },
];
export const emptyWeek = () =>
  Object.fromEntries(WEEK_DAYS.map(({ key }) => [key, null]));
export function localDate(value = new Date()) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(date, count) {
  const [year, month, day] = date.split("-").map(Number);
  return localDate(new Date(year, month - 1, day + count, 12));
}
export function weekStart(date) {
  const [y, m, d] = date.split("-").map(Number);
  const offset = (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  return addDays(date, -offset);
}
export function dayKey(date) {
  return WEEK_DAYS.find((_, i) => addDays(weekStart(date), i) === date)?.key;
}
const validId = (value) =>
  typeof value === "string" && value.length > 0 && value.length <= 200;
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  addDays(value, 0) === value;
export function normalizePlan(raw) {
  const normalizeDays = (days) =>
    Object.fromEntries(
      WEEK_DAYS.map(({ key }) => {
        const slot = days?.[key];
        return [
          key,
          validId(slot?.templateId)
            ? {
                templateId: slot.templateId,
                ...(validId(slot.workoutId)
                  ? { workoutId: slot.workoutId }
                  : {}),
                ...(WEEK_DAYS.some((d) => d.key === slot.movedTo)
                  ? { movedTo: slot.movedTo }
                  : {}),
                ...(WEEK_DAYS.some((d) => d.key === slot.movedFrom)
                  ? { movedFrom: slot.movedFrom }
                  : {}),
                ...(slot.override === true ? { override: true } : {}),
              }
            : null,
        ];
      }),
    );
  const normalizeWeek = (week) =>
    validDate(week?.start) && weekStart(week.start) === week.start
      ? {
          start: week.start,
          days: normalizeDays(week.days),
          editedDays: WEEK_DAYS.filter(
            (d) =>
              Array.isArray(week.editedDays) && week.editedDays.includes(d.key),
          ).map((d) => d.key),
        }
      : null;
  return {
    version: 1,
    weekly_template:
      raw?.weekly_template && typeof raw.weekly_template === "object"
        ? Object.fromEntries(
            WEEK_DAYS.map(({ key }) => [
              key,
              validId(raw.weekly_template[key])
                ? raw.weekly_template[key]
                : null,
            ]),
          )
        : null,
    current_week: normalizeWeek(raw?.current_week),
    previous_week: normalizeWeek(raw?.previous_week),
  };
}
export function makeWeek(template, start) {
  return {
    start,
    editedDays: [],
    days: Object.fromEntries(
      WEEK_DAYS.map(({ key }) => [
        key,
        template?.[key] ? { templateId: template[key] } : null,
      ]),
    ),
  };
}
export function rollWeek(raw, today) {
  const plan = normalizePlan(raw);
  const start = weekStart(today);
  if (!plan.weekly_template || plan.current_week?.start === start) return plan;
  return {
    ...plan,
    current_week:
      plan.previous_week?.start === start
        ? plan.previous_week
        : makeWeek(plan.weekly_template, start),
    previous_week: plan.current_week,
  };
}
export function weekRows(raw, templates, workouts, today) {
  const plan = rollWeek(raw, today);
  const week = plan.current_week || makeWeek(null, weekStart(today));
  const used = new Set();
  return WEEK_DAYS.map((day, i) => {
    const slot = week.days[day.key];
    const template = templates.find((t) => t.id === slot?.templateId);
    const workout =
      slot?.workoutId && !used.has(slot.workoutId)
        ? workouts.find((w) => w.id === slot.workoutId)
        : null;
    if (workout) used.add(workout.id);
    const date = addDays(week.start, i);
    const status = !slot
      ? "empty"
      : slot.movedTo
        ? "moved"
        : workout
          ? "done"
          : date === today
            ? "today"
            : date < today
              ? "missed"
              : "upcoming";
    return {
      ...day,
      date,
      slot,
      template,
      workout,
      status,
      weekStart: week.start,
      name: template?.name || workout?.name || (slot ? "Séance supprimée" : ""),
      missing: !!slot && !template && !workout,
    };
  });
}
// Older workouts have no template ID. Infer only an unambiguous same-name,
// same-local-day match when saving the plan, then persist just the workout ID.
export function matchHistory(week, templates, workouts) {
  const days = structuredClone(week.days);
  const used = new Set(
    Object.values(days)
      .map((s) => s?.workoutId)
      .filter(Boolean),
  );
  WEEK_DAYS.forEach(({ key }, i) => {
    const slot = days[key];
    if (!slot || slot.workoutId || slot.movedTo) return;
    const template = templates.find((t) => t.id === slot.templateId);
    if (
      !template ||
      templates.filter((t) => t.name === template.name).length !== 1
    )
      return;
    const match = [...workouts]
      .sort((a, b) => a.date - b.date)
      .find(
        (w) =>
          !used.has(w.id) &&
          w.name === template.name &&
          localDate(w.date) === addDays(week.start, i),
      );
    if (match) {
      slot.workoutId = match.id;
      used.add(match.id);
    }
  });
  return { ...week, days };
}
export function saveWeekDraft(
  raw,
  draft,
  scope,
  today,
  templates,
  workouts,
  applyCurrent = true,
) {
  let plan = rollWeek(raw, today);
  const first = !plan.weekly_template;
  const week = plan.current_week || makeWeek(null, weekStart(today));
  const template = Object.fromEntries(
    WEEK_DAYS.map(({ key }) => [key, draft[key] || null]),
  );
  const oldSelection =
    scope === "template"
      ? plan.weekly_template
      : Object.fromEntries(
          WEEK_DAYS.map(({ key }) => [key, week.days[key]?.templateId]),
        );
  for (const { key } of WEEK_DAYS) {
    if (
      template[key] &&
      !templates.some((t) => t.id === template[key]) &&
      template[key] !== oldSelection?.[key]
    )
      throw new Error(
        "Une séance choisie a été supprimée. Choisis une autre séance.",
      );
  }
  const days = structuredClone(week.days);
  const editedDays = new Set(week.editedDays || []);
  WEEK_DAYS.forEach(({ key }, i) => {
    const old = days[key];
    const done = old?.workoutId && workouts.some((w) => w.id === old.workoutId);
    const moved = old?.movedTo || old?.movedFrom;
    if (scope === "template") {
      if (
        !first &&
        (!applyCurrent ||
          addDays(week.start, i) < today ||
          done ||
          moved ||
          old?.override ||
          editedDays.has(key))
      )
        return;
    } else if ((done || moved) && template[key] !== old?.templateId) {
      throw new Error(
        "Les séances terminées ou déplacées se gèrent depuis la semaine.",
      );
    }
    if ((old?.templateId || null) === template[key]) return;
    if (scope === "current") editedDays.add(key);
    days[key] = template[key]
      ? {
          templateId: template[key],
          ...(scope === "current" ? { override: true } : {}),
        }
      : null;
  });
  return {
    ...plan,
    weekly_template:
      scope === "template" || first ? template : plan.weekly_template,
    current_week: matchHistory(
      { ...week, days, editedDays: [...editedDays] },
      templates,
      workouts,
    ),
  };
}
export function movePlannedSession(raw, from, to, today, workouts) {
  const plan = rollWeek(raw, today);
  const days = structuredClone(plan.current_week?.days || emptyWeek());
  const slot = days[from];
  if (!slot || from === to || !WEEK_DAYS.some((d) => d.key === to) || days[to])
    throw new Error("Choisis un jour vide de cette semaine.");
  if (slot.workoutId && workouts.some((w) => w.id === slot.workoutId))
    throw new Error("Cette séance est déjà terminée.");
  if (slot.movedTo) throw new Error("Cette séance a déjà été déplacée.");
  const origin = slot.movedFrom || from;
  days[origin] = { ...days[origin], movedTo: to, override: true };
  if (origin !== from) days[from] = null;
  days[to] = { templateId: slot.templateId, movedFrom: origin, override: true };
  return {
    ...plan,
    current_week: {
      ...plan.current_week,
      days,
      editedDays: [
        ...new Set([...(plan.current_week.editedDays || []), from, to, origin]),
      ],
    },
  };
}
export function undoMove(raw, key, today, workouts) {
  const plan = rollWeek(raw, today);
  const days = structuredClone(plan.current_week.days);
  const source = days[key]?.movedFrom || key;
  const target = days[source]?.movedTo;
  if (!target || !days[target]) return plan;
  if (
    days[target].workoutId &&
    workouts.some((w) => w.id === days[target].workoutId)
  )
    throw new Error("La séance déplacée est déjà terminée.");
  days[source] = { templateId: days[source].templateId, override: true };
  days[target] = null;
  return {
    ...plan,
    current_week: {
      ...plan.current_week,
      days,
      editedDays: [
        ...new Set([...(plan.current_week.editedDays || []), source, target]),
      ],
    },
  };
}
export function linkCompletedWorkout(raw, planned, workoutId, today, workouts) {
  const plan = rollWeek(raw, today);
  const field = ["current_week", "previous_week"].find(
    (k) => plan[k]?.start === planned.weekStart,
  );
  if (!field)
    throw new Error(
      "La séance est enregistrée, mais la semaine prévue n’est plus disponible.",
    );
  const week = structuredClone(plan[field]);
  const key = week.days[planned.day]?.movedTo || planned.day;
  const slot = week.days[key];
  if (!slot || slot.templateId !== planned.templateId)
    throw new Error(
      "La séance est enregistrée, mais le planning a changé. Associe-la depuis la semaine.",
    );
  if (
    slot.workoutId &&
    slot.workoutId !== workoutId &&
    workouts.some((w) => w.id === slot.workoutId)
  )
    throw new Error("Ce jour est déjà associé à une séance terminée.");
  for (const name of ["current_week", "previous_week"]) {
    for (const [day, entry] of Object.entries(plan[name]?.days || {})) {
      if (entry?.workoutId === workoutId && !(name === field && day === key))
        throw new Error("Cette séance est déjà associée à un autre jour.");
    }
  }
  week.days[key] = { ...slot, workoutId };
  return { ...plan, [field]: week };
}
export function completionTarget(raw, session, savedDate) {
  if (session.plannedSlot) return session.plannedSlot;
  if (!session.fromTemplateId) return null;
  const date = localDate(savedDate);
  const plan = rollWeek(raw, date);
  const key = dayKey(date);
  const slot = plan.current_week?.days[key];
  return slot?.templateId === session.fromTemplateId &&
    !slot.movedTo &&
    !slot.workoutId
    ? { weekStart: weekStart(date), day: key, templateId: slot.templateId }
    : null;
}
