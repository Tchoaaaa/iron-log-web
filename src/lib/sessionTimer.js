export function elapsedSessionMs(active, now) {
  if (!active) return 0;
  if (active.editId) return (active.originalDurationMin || 0) * 60000;
  return Math.max(
    0,
    (active.pausedAt ?? now) - active.startedAt - (active.pausedMs || 0),
  );
}
export function toggleSessionPause(active, now) {
  if (!active || active.editId) return active;
  return active.pausedAt != null
    ? {
        ...active,
        pausedMs: (active.pausedMs || 0) + now - active.pausedAt,
        pausedAt: null,
      }
    : { ...active, pausedAt: now };
}
// A rest countdown is measured against the same clock as the session
// chrono: while the session is paused, `now` keeps advancing in the
// background, so we freeze the countdown at `pausedAt` too (same trick as
// elapsedSessionMs) instead of letting it expire silently during the pause.
export function restRemainingMs(active, now) {
  if (!active?.restTimer) return 0;
  const effectiveNow = active.pausedAt ?? now;
  return Math.max(0, active.restTimer.endsAt - effectiveNow);
}
export function validSet(weight, reps) {
  return (
    String(weight).trim() !== "" &&
    String(reps).trim() !== "" &&
    Number.isFinite(Number(weight)) &&
    Number(weight) >= 0 &&
    Number.isInteger(Number(reps)) &&
    Number(reps) > 0
  );
}
// A set with some data (weight or reps) but not a valid, saveable pair —
// e.g. reps entered with no charge. Saving silently drops these; the
// finish-session confirmation should surface them instead.
export function hasPartialData(weight, reps) {
  return (
    !validSet(weight, reps) &&
    (String(weight).trim() !== "" || String(reps).trim() !== "")
  );
}
// Lists every incomplete set across the live session's entries, labelled
// for display (superset sides get their own exercise name).
export function listIncompleteSets(entries) {
  const rows = [];
  for (const e of entries || []) {
    const sides =
      e.kind === "superset"
        ? [
            { name: e.nameA, w: "weightA", r: "repsA" },
            { name: e.nameB, w: "weightB", r: "repsB" },
          ]
        : [{ name: e.name, w: "weight", r: "reps" }];
    e.sets.forEach((s, i) => {
      for (const side of sides) {
        if (hasPartialData(s[side.w], s[side.r])) {
          rows.push({ name: side.name, setIndex: i + 1 });
        }
      }
    });
  }
  return rows;
}
