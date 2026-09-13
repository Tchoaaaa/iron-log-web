import { useEffect, useEffectEvent, useRef, useState } from "react";
import * as api from "../lib/api";
import {
  completionTarget,
  linkCompletedWorkout,
  localDate,
  movePlannedSession,
  normalizePlan,
  rollWeek,
  saveWeekDraft,
  undoMove,
  weekRows,
  weekStart,
} from "../lib/weeklyPlan";

export function useWeeklyPlan({ user, templates, workouts, enabled }) {
  // Supabase emits USER_UPDATED after updateUser; the auth session is the source of truth.
  const plan = normalizePlan(user.user_metadata?.training_plan);
  const [today, setToday] = useState(() => localDate());
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  const rolloverAttempt = useRef("");
  useEffect(() => {
    const refreshDay = () => setToday(localDate());
    const timer = setInterval(refreshDay, 30000);
    document.addEventListener("visibilitychange", refreshDay);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshDay);
    };
  }, []);
  const mutate = async (transform) => {
    setPending((n) => n + 1);
    setError("");
    const task = queue.current.then(() => api.updateTrainingPlan(transform));
    queue.current = task.catch(() => {});
    try {
      return await task;
    } catch (err) {
      setError(err.message || "La semaine n’a pas été enregistrée. Réessaie.");
      throw err;
    } finally {
      setPending((n) => n - 1);
    }
  };
  const ensureCurrentWeek = useEffectEvent(() =>
    mutate((raw) => rollWeek(raw, today)),
  );
  const needsRollover =
    !!plan.weekly_template && plan.current_week?.start !== weekStart(today);
  useEffect(() => {
    if (!enabled || !needsRollover || rolloverAttempt.current === today) return;
    rolloverAttempt.current = today;
    ensureCurrentWeek().catch(() => {});
  }, [enabled, needsRollover, today]);
  const displayed = rollWeek(plan, today);
  return {
    plan: displayed,
    today,
    error,
    busy: pending > 0,
    configured: !!plan.weekly_template,
    rows: weekRows(displayed, templates, workouts, today),
    retry: () => mutate((raw) => rollWeek(raw, today)),
    save: (draft, scope, applyCurrent) =>
      mutate((raw) =>
        saveWeekDraft(
          raw,
          draft,
          scope,
          today,
          templates,
          workouts,
          applyCurrent,
        ),
      ),
    move: (from, to) =>
      mutate((raw) => movePlannedSession(raw, from, to, today, workouts)),
    undoMove: (key) => mutate((raw) => undoMove(raw, key, today, workouts)),
    associate: (row, workoutId) => {
      if (!workouts.some((w) => w.id === workoutId))
        return Promise.reject(new Error("Cette séance n’est plus disponible."));
      return mutate((raw) =>
        linkCompletedWorkout(
          raw,
          {
            weekStart: row.weekStart,
            day: row.key,
            templateId: row.slot.templateId,
          },
          workoutId,
          today,
          workouts,
        ),
      );
    },
    recordCompletion: async (saved, session) => {
      if (!session.plannedSlot && !session.fromTemplateId) return;
      const target = completionTarget(displayed, session, saved.date);
      if (!target) return;
      try {
        await mutate((raw) =>
          linkCompletedWorkout(raw, target, saved.id, localDate(), [
            ...workouts,
            saved,
          ]),
        );
      } catch {
        throw new Error(
          "Ta séance est enregistrée. Son association au planning a échoué : tu peux l’associer depuis « Cette semaine ».",
        );
      }
    },
  };
}
