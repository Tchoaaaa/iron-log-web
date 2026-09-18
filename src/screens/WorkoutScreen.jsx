import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  X,
} from "lucide-react";
import { SET_GRID } from "../lib/constants";
import { fmtRestMMSS, fmtTimer } from "../lib/format";
import { validSet, elapsedSessionMs, restRemainingMs } from "../lib/sessionTimer";
import ExerciseNoteField from "../components/ExerciseNoteField";
import ExercisePickerModal from "../components/ExercisePickerModal";
import Drawer from "../components/Drawer";
import { useExercisePicker } from "../hooks/useExercisePicker";
import SetRpeField from "../components/SetRpeField";
import { rpeEnabled } from "../lib/rpe";

// Collapses per-set rep targets into one label: "8" when every set shares
// the same target, "6–8 / 6–8 / 10–12" when they differ.
function targetSummary(sets, suffix) {
  const values = sets.map((s) => s["target" + suffix]).filter(Boolean);
  if (!values.length) return null;
  const unique = [...new Set(values)];
  return (unique.length === 1 ? unique : values)
    .map((v) => v.replace("-", "–"))
    .join(" / ");
}

// Owns the only 1-second tick for the session chrono. Kept local to this
// component — and out of useActiveSession — so the once-a-second re-render
// stays scoped to this small panel instead of the whole app shell (which
// owns the session's state).
function SessionTimers({ active, timing, onTogglePause, done, total }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timing) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timing]);
  return (
    <div>
      <div className="session-status">
        {timing && (
          <span className="flex items-center gap-2">
            <span
              className="il-num text-lg font-semibold"
              role="timer"
              aria-label="Workout duration"
            >
              {fmtTimer(elapsedSessionMs(active, now))}
            </span>
            <button
              type="button"
              className="icon-button-sm"
              aria-label={
                active.pausedAt != null ? "Resume timer" : "Pause timer"
              }
              onClick={onTogglePause}
            >
              {active.pausedAt != null ? (
                <Play size={14} />
              ) : (
                <Pause size={14} />
              )}
            </button>
          </span>
        )}
        <span className="il-num text-xs muted">
          {done} / {total} sets done
        </span>
      </div>
      <progress
        className="w-full mt-2"
        value={done}
        max={total || 1}
        aria-label="Sets done"
      />
    </div>
  );
}

// A rest timer for one exercise, inline where it's started — no separate
// panel elsewhere on the screen. Only ticks its own 1-second interval while
// its own rest is the active one, so idle exercises don't re-render.
function RestTrigger({
  active,
  label,
  seconds,
  onStartRest,
  onStopRest,
  onTogglePause,
}) {
  const isActive = active.restTimer?.label === label;
  const [now, setNow] = useState(() => Date.now());
  // The digits only need a 1s tick. The bar itself is NOT driven by this —
  // see the effect below — a React re-render every frame is what looked
  // "saccadé": even with requestAnimationFrame, re-rendering and diffing a
  // whole subtree 60×/s is itself uneven. A single CSS transition, handed
  // off to the compositor once per rest and left alone, glides properly.
  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);
  const fillRef = useRef(null);
  const dotRef = useRef(null);
  const endsAt = active.restTimer?.endsAt;
  const pausedAt = active.pausedAt;
  // Layout effect: runs before paint, so the bar never flashes at its
  // pre-effect default (fully filled) for a frame. Deliberately keyed on
  // endsAt/pausedAt rather than `active` itself — reacting to every
  // unrelated session update (typing a weight elsewhere) would restart
  // the animation each time instead of only when the rest actually changes.
  useLayoutEffect(() => {
    if (!isActive) return;
    const fill = fillRef.current;
    const dot = dotRef.current;
    if (!fill || !dot) return;
    const remainingMs = restRemainingMs(active, Date.now());
    const totalMs = seconds * 1000;
    const startPct = Math.min(
      100,
      Math.max(0, 100 - (remainingMs / totalMs) * 100),
    );
    // Jump to the accurate current position with transitions off, then
    // force the browser to commit that frame before re-enabling them —
    // otherwise it can coalesce both style writes and skip the animation.
    fill.style.transition = "none";
    dot.style.transition = "none";
    fill.style.transform = `scaleX(${startPct / 100})`;
    dot.style.left = `${startPct}%`;
    if (pausedAt != null || remainingMs <= 0) return;
    void fill.offsetWidth;
    const remainingSec = remainingMs / 1000;
    fill.style.transition = `transform ${remainingSec}s linear`;
    dot.style.transition = `left ${remainingSec}s linear`;
    fill.style.transform = "scaleX(1)";
    dot.style.left = "100%";
  }, [isActive, endsAt, seconds, pausedAt]);
  // Starting a rest implies the lifter is back and working — resume the
  // session chrono first if it was paused, otherwise the countdown (which
  // freezes while paused, same as the chrono) would look stuck at its
  // starting value.
  const startFor = (totalSeconds) => {
    if (active.pausedAt != null) onTogglePause();
    onStartRest(totalSeconds, label);
  };
  if (!isActive) {
    return (
      <div className="rest-line">
        <span className="eyebrow">Rest {fmtRestMMSS(seconds)}</span>
        <button
          type="button"
          className="text-button rest-action"
          aria-label={`Start rest for ${label}`}
          onClick={() => startFor(seconds)}
        >
          Start
        </button>
      </div>
    );
  }
  const remaining = restRemainingMs(active, now);
  return (
    <div>
      <div className="rest-line">
        <span className="eyebrow">{remaining ? "Rest" : "Rest done"}</span>
        <span className="il-num text-lg font-semibold" role="timer">
          {fmtTimer(remaining)}
        </span>
      </div>
      <div className="rest-progress-track mt-2">
        <div ref={fillRef} className="rest-progress-fill" />
        <div ref={dotRef} className="rest-progress-dot" />
      </div>
      <div className="rest-line mt-2">
        <button
          type="button"
          className="text-button rest-action"
          onClick={() =>
            startFor(Math.max(1, Math.round(remaining / 1000)) + 15)
          }
        >
          +15 sec
        </button>
        <button
          type="button"
          className="text-button rest-action"
          onClick={() => startFor(seconds)}
        >
          Restart
        </button>
        <button
          type="button"
          className="icon-button-sm"
          aria-label="Stop rest"
          onClick={onStopRest}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutScreen({
  activeSession: a,
  lastByExercise,
  libraryHook,
  onDiscard,
  onBack,
}) {
  const { active, timing, lockedExercises, updateSet, addEntryToActive } = a;
  const picker = useExercisePicker({ library: libraryHook.exercises });
  const [editingId, setEditingId] = useState(null);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleCollapsed = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const total = active.entries.reduce(
    (n, ex) => n + ex.sets.length * (ex.kind === "superset" ? 2 : 1),
    0,
  );
  const done = active.entries.reduce(
    (n, ex) =>
      n +
      ex.sets.reduce(
        (v, s) =>
          v +
          (ex.kind === "superset"
            ? Number(!!s.doneA) + Number(!!s.doneB)
            : Number(!!s.done)),
        0,
      ),
    0,
  );
  return (
    <section className="flex flex-col gap-5">
      <button className="text-button justify-start" onClick={onBack}>
        <ArrowLeft size={17} /> Back
      </button>
      <div>
        <p className="eyebrow">
          {active.editId ? "EDIT HISTORY" : "WORKOUT IN PROGRESS"}
        </p>
        <h1 className="page-title mt-2">
          {active.fromTemplate || "Free workout"}
        </h1>
      </div>
      <SessionTimers
        active={active}
        timing={timing}
        onTogglePause={a.togglePause}
        done={done}
        total={total}
      />
      {!active.entries.length && (
        <div className="empty-state">
          <h2>What's your first exercise?</h2>
          <p>Add your exercises, then log your results set by set.</p>
        </div>
      )}
      {active.entries.map((entry, index) => {
        const superSet = entry.kind === "superset";
        const showRpe = rpeEnabled(entry);
        const setGrid = showRpe
          ? "30px minmax(0, 0.92fr) minmax(0, 0.92fr) minmax(64px, 0.9fr)"
          : SET_GRID;
        const subs = superSet
          ? [
              { label: entry.nameA, suffix: "A", rest: entry.restA },
              { label: entry.nameB, suffix: "B", rest: entry.restB },
            ]
          : [{ label: entry.name, suffix: "", rest: entry.rest }];
        const isCollapsed = collapsed.has(entry.id);
        const entryTotal = entry.sets.length * (superSet ? 2 : 1);
        const entryDone = entry.sets.reduce(
          (v, s) =>
            v +
            (superSet
              ? Number(!!s.doneA) + Number(!!s.doneB)
              : Number(!!s.done)),
          0,
        );
        return (
          <article className="exercise-card" key={entry.id}>
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                className="exercise-toggle flex-1"
                onClick={() => toggleCollapsed(entry.id)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${entry.name}`}
              >
                <p className="eyebrow">
                  {superSet ? "SUPERSET" : "EXERCISE"} /{" "}
                  {String(index + 1).padStart(2, "0")}
                </p>
                <span className="flex items-center gap-2">
                  <span className="il-num muted text-xs">
                    {entryDone} / {entryTotal}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </span>
              </button>
              {!lockedExercises && (
                <button
                  className="icon-button"
                  aria-label={`Edit ${entry.name}`}
                  onClick={() => {
                    setEditingId(entry.id);
                    picker.open(entry);
                  }}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-5">
              {subs.map((sub) => (
                <div key={sub.suffix}>
                  <h2 className="text-lg font-semibold leading-snug">
                    {sub.label}
                  </h2>
                  <div className="eyebrow mt-1.5">
                    {entry.sets.length} sets
                    {targetSummary(entry.sets, sub.suffix) &&
                      ` · Reps ${targetSummary(entry.sets, sub.suffix)}`}
                    {/* Once expanded, the running rest timer gets its own
                        block below — repeating it here would duplicate it. */}
                    {(isCollapsed || !timing || sub.rest === 0) && (
                      <>
                        {" · "}
                        {sub.rest === 0
                          ? "No rest"
                          : fmtRestMMSS(sub.rest ?? 90)}
                      </>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                  {timing && sub.rest > 0 && (
                    <div className="mt-3">
                      <RestTrigger
                        active={active}
                        label={sub.label}
                        seconds={sub.rest}
                        onStartRest={a.startRest}
                        onStopRest={a.stopRest}
                        onTogglePause={a.togglePause}
                      />
                    </div>
                  )}
                  <div
                    className="grid mt-3 mb-1.5 text-[10px] muted uppercase"
                    style={{ gridTemplateColumns: setGrid, gap: 6 }}
                  >
                    <span>Set</span>
                    <span className="text-center">Kg</span>
                    <span className="text-center">Reps</span>
                    {showRpe && <span className="text-center">RPE</span>}
                  </div>
                  <div className={showRpe ? "set-list-rpe" : "flex flex-col gap-1.5"}>
                    {entry.sets.map((set, i) => {
                      const previous = lastByExercise[sub.label]?.sets?.[i];
                      const validated = !!set["done" + sub.suffix];
                      const target = set["target" + sub.suffix];
                      const canValidate = validSet(
                        set["weight" + sub.suffix],
                        set["reps" + sub.suffix],
                      );
                      // Auto-validates once both fields hold a complete value, but
                      // only when the user actually leaves the field — checking on
                      // every keystroke would validate (and start the rest timer)
                      // after the first digit, then immediately un-validate on the
                      // next one.
                      const autoValidate = () => {
                        if (!validated && canValidate) {
                          a.completeSet(
                            entry.id,
                            i,
                            "done" + sub.suffix,
                            sub.rest,
                            sub.label,
                          );
                        }
                      };
                      return (
                        <div
                          key={i}
                          className={`grid items-center set-row ${validated ? "completed" : ""}`}
                          style={{ gridTemplateColumns: setGrid, gap: 6 }}
                        >
                          <button
                            className={`set-check ${validated ? "checked" : ""}`}
                            disabled={!validated && !canValidate}
                            aria-label={`${validated ? "Undo" : "Complete"} ${sub.label}, set ${i + 1}`}
                            aria-pressed={validated}
                            title={
                              canValidate
                                ? "Complete this set"
                                : "Enter a weight (0 is fine) and reps"
                            }
                            onClick={() =>
                              a.completeSet(
                                entry.id,
                                i,
                                "done" + sub.suffix,
                                sub.rest,
                                sub.label,
                              )
                            }
                          >
                            {validated ? <Check size={16} /> : <span>{i + 1}</span>}
                          </button>
                          <input
                            className="il-input il-num w-full text-center"
                            aria-label={`${sub.label}, set ${i + 1}, weight in kg`}
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            placeholder={
                              previous ? String(previous.weight) : "—"
                            }
                            value={set["weight" + sub.suffix]}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateSet(
                                entry.id,
                                i,
                                "weight" + sub.suffix,
                                value,
                              );
                              if (validated) {
                                updateSet(
                                  entry.id,
                                  i,
                                  "done" + sub.suffix,
                                  false,
                                );
                              }
                            }}
                            onBlur={autoValidate}
                          />
                          <input
                            className="il-input il-num w-full text-center"
                            aria-label={`${sub.label}, set ${i + 1}, reps done`}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            placeholder={
                              target ||
                              (previous ? String(previous.reps) : "—")
                            }
                            value={set["reps" + sub.suffix]}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateSet(
                                entry.id,
                                i,
                                "reps" + sub.suffix,
                                value,
                              );
                              if (validated) {
                                updateSet(
                                  entry.id,
                                  i,
                                  "done" + sub.suffix,
                                  false,
                                );
                              }
                            }}
                            onBlur={autoValidate}
                          />
                          {showRpe && (
                            <SetRpeField
                              label={`${sub.label}, set ${i + 1}, RPE`}
                              value={set["rpe" + sub.suffix]}
                              onChange={(value) => updateSet(entry.id, i, "rpe" + sub.suffix, value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <ExerciseNoteField
                    value={libraryHook.exerciseNotes[sub.label] || ""}
                    onType={(v) => libraryHook.setExerciseNote(sub.label, v)}
                    onCommit={(v) =>
                      libraryHook.persistExerciseNote(sub.label, v)
                    }
                  />
                    </>
                  )}
                </div>
              ))}
            </div>
            {!isCollapsed && !showRpe && (
              <button
                type="button"
                className="text-button text-xs mt-2.5 rpe-toggle-row"
                onClick={() => a.enableRpe(entry.id)}
              >
                <span>RPE per set</span>
                <span className="muted">Enable</span>
              </button>
            )}
            {!isCollapsed && !lockedExercises && (
              <button
                className="text-button text-xs mt-2.5"
                onClick={() => setRemove(entry)}
              >
                Remove this exercise
              </button>
            )}
          </article>
        );
      })}
      {!lockedExercises && (
        <button
          className="secondary"
          onClick={() => {
            setEditingId(null);
            picker.open();
          }}
        >
          <Plus size={17} /> Add exercise
        </button>
      )}
      <button className="text-button" onClick={() => setDiscard(true)}>
        {active.editId ? "Cancel changes" : "Discard workout"}
      </button>
      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          onFinish={(plan) =>
            editingId ? a.editEntry(editingId, plan) : addEntryToActive(plan)
          }
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
      {(discard || remove) && (
        <Drawer
          title={
            remove
              ? "Remove this exercise?"
              : active.editId
                ? "Cancel changes?"
                : "Discard workout?"
          }
          onClose={() => {
            setDiscard(false);
            setRemove(null);
          }}
        >
          <p className="muted text-sm mb-5">
            {remove
              ? `The sets logged for "${remove.name}" will be removed from this workout.`
              : active.editId
                ? "The saved workout will stay unchanged."
                : "This workout's results won't be saved."}
          </p>
          <div className="flex gap-3">
            <button
              className="secondary flex-1"
              onClick={() => {
                setDiscard(false);
                setRemove(null);
              }}
            >
              Continue
            </button>
            <button
              className="primary flex-1"
              onClick={() => {
                if (remove) {
                  a.removeEntry(remove.id);
                  setRemove(null);
                } else onDiscard();
              }}
            >
              {remove ? "Remove" : "Confirm"}
            </button>
          </div>
        </Drawer>
      )}
    </section>
  );
}
