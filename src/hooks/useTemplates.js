import { useState } from "react";
import * as api from "../lib/api";
import { REST_OPTIONS } from "../lib/constants";

// Saved workout templates (reusable séances) and the draft being
// created/edited.
export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState(null); // { id?, name, exercises: [...] }

  function applyFromServer(tpl) {
    setTemplates(tpl || []);
  }

  const openNewTemplate = () => {
    setTemplateDraft({ name: "", exercises: [] });
  };
  const openEditTemplate = (tpl) => {
    setTemplateDraft({ id: tpl.id, name: tpl.name, exercises: tpl.exercises.map((e) => ({ ...e })) });
  };
  const setDraftName = (name) => setTemplateDraft((d) => ({ ...d, name }));
  const removeExerciseFromDraft = (name) => {
    setTemplateDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name !== name) }));
  };
  const adjustDraftExerciseSets = (name, delta) => {
    setTemplateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.name === name ? { ...e, sets: Math.max(1, Math.min(8, e.sets + delta)) } : e
      ),
    }));
  };
  const cycleDraftExerciseRest = (name, which) => {
    setTemplateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        if (e.name !== name) return e;
        const field = which === "A" ? "restA" : which === "B" ? "restB" : "rest";
        const current = REST_OPTIONS.indexOf(e[field]);
        const next = REST_OPTIONS[(current + 1) % REST_OPTIONS.length];
        return { ...e, [field]: next };
      }),
    }));
  };
  const cancelTemplateDraft = () => setTemplateDraft(null);

  // Pushes an exercise (built by the exercise picker) into the draft — a
  // no-op if that exercise/pair is already in it.
  const addExerciseToDraft = (entry) => {
    setTemplateDraft((d) => {
      if (entry.kind === "superset") {
        const already = d.exercises.some(
          (e) => e.pair && e.pair[0] === entry.nameA && e.pair[1] === entry.nameB
        );
        if (already) return d;
        return {
          ...d,
          exercises: [
            ...d.exercises,
            { name: `${entry.nameA} + ${entry.nameB}`, sets: entry.count, restA: entry.restA, restB: entry.restB, pair: [entry.nameA, entry.nameB] },
          ],
        };
      }
      if (d.exercises.some((e) => e.name === entry.name)) return d;
      return { ...d, exercises: [...d.exercises, { name: entry.name, sets: entry.count, rest: entry.rest }] };
    });
  };
  const saveTemplateDraft = async ({ onError } = {}) => {
    const name = templateDraft.name.trim();
    if (!name || templateDraft.exercises.length === 0) return;
    try {
      const saved = await api.saveTemplate({
        id: templateDraft.id,
        name,
        exercises: templateDraft.exercises,
      });
      setTemplates((prev) =>
        templateDraft.id ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
      );
      setTemplateDraft(null);
    } catch (err) {
      onError?.(err.message || "Impossible d'enregistrer la séance.");
    }
  };
  const deleteTemplate = async (id, { onError } = {}) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTemplate(id);
    } catch (err) {
      onError?.(err.message || "Suppression impossible.");
    }
  };

  return {
    templates,
    templateDraft,
    setTemplateDraft,
    applyFromServer,
    openNewTemplate,
    openEditTemplate,
    setDraftName,
    removeExerciseFromDraft,
    adjustDraftExerciseSets,
    cycleDraftExerciseRest,
    cancelTemplateDraft,
    addExerciseToDraft,
    saveTemplateDraft,
    deleteTemplate,
  };
}
