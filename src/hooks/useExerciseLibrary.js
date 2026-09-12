import { useState } from "react";
import * as api from "../lib/api";

// The user's exercise library (defaults + custom) and their per-exercise
// personal notes.
export function useExerciseLibrary({ defaultExercises }) {
  const [exercises, setExercises] = useState(defaultExercises);
  const [exerciseNotes, setExerciseNotes] = useState({}); // exercise name -> personal note

  function applyFromServer(ex) {
    setExercises(ex && ex.length ? ex : defaultExercises);
    setExerciseNotes(
      Object.fromEntries((ex || []).filter((e) => e && e.note).map((e) => [e.name, e.note]))
    );
  }

  // personal per-exercise note — kept in memory as you type, saved on blur,
  // and reloaded next time you train that exercise (same séance or non)
  const setExerciseNote = (name, text) => {
    setExerciseNotes((prev) => ({ ...prev, [name]: text }));
  };
  const persistExerciseNote = async (name, raw) => {
    const text = (raw ?? "").trim();
    try {
      await api.setExerciseNote(name, text || null);
    } catch {
      /* still held in memory; will retry on the next blur */
    }
  };

  const addCustomExercise = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return trimmed;
    if (!exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setExercises((prev) => [...prev, { name: trimmed, category: "Perso" }]);
      try {
        await api.addExercise({ name: trimmed, category: "Perso" });
      } catch {
        /* keep the local copy; the library still works this session */
      }
    }
    return trimmed;
  };

  return {
    exercises,
    exerciseNotes,
    applyFromServer,
    setExerciseNote,
    persistExerciseNote,
    addCustomExercise,
  };
}
