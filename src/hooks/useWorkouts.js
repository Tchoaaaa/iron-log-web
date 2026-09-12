import { useMemo, useState } from "react";
import * as api from "../lib/api";
import { computeLastByExercise } from "../lib/workoutMath";

// The user's workout history: the list itself, CRUD against Supabase, and
// the "last time you did this exercise" lookup used as a reference while
// logging a running workout.
export function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);

  function applyFromServer(wk) {
    setWorkouts(wk || []);
  }

  const lastByExercise = useMemo(() => computeLastByExercise(workouts), [workouts]);

  const addWorkout = (saved) => setWorkouts((prev) => [saved, ...prev]);
  const replaceWorkout = (id, saved) =>
    setWorkouts((prev) => prev.map((w) => (w.id === id ? saved : w)));

  const deleteWorkout = async (id, { onError } = {}) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await api.deleteWorkout(id);
    } catch (err) {
      onError?.(err.message || "Suppression impossible.");
    }
  };

  return {
    workouts,
    lastByExercise,
    applyFromServer,
    addWorkout,
    replaceWorkout,
    deleteWorkout,
  };
}
