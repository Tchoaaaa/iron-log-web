import { useState } from "react";
import * as api from "../lib/api";
import { templateEntry, replaceTemplateEntry } from "../lib/exercisePlan";

// Saved workout templates (reusable séances) and the draft being
// created/edited. The draft screen doubles as the template's detail view:
// once it has a name and at least one exercise, every change (add/edit/
// remove/reorder an exercise, rename) is saved to the server right away —
// there is no separate "Enregistrer" step once a séance exists.
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
  const cancelTemplateDraft = () => setTemplateDraft(null);

  // Saves `next` if it's complete enough to exist (named, non-empty) —
  // a no-op otherwise, so a brand-new draft can hold a name or a first
  // exercise without hitting the network until both are there.
  const persist = async (next, { onError } = {}) => {
    if (!next.name.trim() || next.exercises.length === 0) return;
    try {
      const saved = await api.saveTemplate({
        id: next.id,
        name: next.name.trim(),
        exercises: next.exercises,
      });
      setTemplates((prev) =>
        next.id ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
      );
      if (!next.id) setTemplateDraft((d) => (d ? { ...d, id: saved.id } : d));
    } catch (err) {
      onError?.(err.message || "Impossible d'enregistrer la séance.");
    }
  };

  // Persists whatever is currently in the draft (e.g. on blur of the name
  // field while creating a new séance).
  const persistDraft = (opts) => templateDraft && persist(templateDraft, opts);

  const renameDraft = (name, opts) => {
    const next = { ...templateDraft, name };
    setTemplateDraft(next);
    persist(next, opts);
  };
  const addExerciseToDraft = (entry, opts) => {
    const next = { ...templateDraft, exercises: [...templateDraft.exercises, templateEntry(entry)] };
    setTemplateDraft(next);
    persist(next, opts);
  };
  const editExerciseInDraft = (index, entry, opts) => {
    const next = {
      ...templateDraft,
      exercises: templateDraft.exercises.flatMap((ex, i) => (i === index ? replaceTemplateEntry(ex, entry) : [ex])),
    };
    setTemplateDraft(next);
    persist(next, opts);
  };
  // A template with zero exercises can't be saved (persist() no-ops below
  // that point), so removing the last one would silently fail — and the
  // exercise would reappear on reload with no explanation. Block it instead.
  const removeExerciseAt = (index, opts) => {
    if (templateDraft.exercises.length <= 1) {
      opts?.onError?.(
        "Une séance doit contenir au moins un exercice. Supprime la séance entière si tu veux t’en débarrasser.",
      );
      return false;
    }
    const next = { ...templateDraft, exercises: templateDraft.exercises.filter((_, i) => i !== index) };
    setTemplateDraft(next);
    persist(next, opts);
    return true;
  };
  // Restores an exercise at a specific index — used to undo a removal.
  const restoreExerciseAt = (index, exercise, opts) => {
    const exercises = [...templateDraft.exercises];
    exercises.splice(index, 0, exercise);
    const next = { ...templateDraft, exercises };
    setTemplateDraft(next);
    persist(next, opts);
  };
  const reorderDraft = (exercises, opts) => {
    const next = { ...templateDraft, exercises };
    setTemplateDraft(next);
    persist(next, opts);
  };

  const deleteTemplate = async (id, { onError } = {}) => {
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      onError?.(err.message || "Suppression impossible.");
      return false;
    }
  };

  return {
    templates,
    templateDraft,
    applyFromServer,
    openNewTemplate,
    openEditTemplate,
    setDraftName,
    cancelTemplateDraft,
    persistDraft,
    renameDraft,
    addExerciseToDraft,
    editExerciseInDraft,
    removeExerciseAt,
    restoreExerciseAt,
    reorderDraft,
    deleteTemplate,
  };
}
