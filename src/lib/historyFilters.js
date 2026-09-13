export const EMPTY_FILTERS = { from: "", to: "", type: "all", name: "" };
export function filterWorkouts(workouts, filters) {
  const from = filters.from
    ? new Date(`${filters.from}T00:00:00`).getTime()
    : -Infinity;
  const to = filters.to
    ? new Date(`${filters.to}T23:59:59.999`).getTime()
    : Infinity;
  return workouts.filter(
    (w) =>
      w.date >= from &&
      w.date <= to &&
      (filters.type === "all" ||
        (filters.type === "free"
          ? !w.name
          : filters.type === "superset"
            ? w.exercises.some((e) => e.superset)
            : !!w.name)) &&
      (!filters.name || w.name === filters.name),
  );
}
