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
