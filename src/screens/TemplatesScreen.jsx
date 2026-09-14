import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { formatRest } from "../lib/format";
import { estimateTemplateMinutes } from "../lib/workoutMath";
import { useExercisePicker } from "../hooks/useExercisePicker";
import ExercisePickerModal from "../components/ExercisePickerModal";
import Drawer from "../components/Drawer";

function repsLabel(ex) {
  const values = Array.from({ length: ex.sets }, (_, j) => ex.targets?.[j] || "").filter(Boolean);
  if (!values.length) return null;
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : values.join("/");
}
function restLabel(ex) {
  return ex.pair
    ? `${formatRest(ex.restA) || "0 s"} / ${formatRest(ex.restB) || "0 s"}`
    : formatRest(ex.rest) || "Sans repos";
}

export default function TemplatesScreen({
  templatesHook: t,
  libraryHook,
  onStartFromTemplate,
  onError,
}) {
  const picker = useExercisePicker({ library: libraryHook.exercises });
  const [editingIndex, setEditingIndex] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOrder, setDragOrder] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [undoRemoval, setUndoRemoval] = useState(null); // { index, exercise }
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);
  const dragFrom = useRef(null);
  // Pointer events for one drag gesture can all land before React commits a
  // re-render between them — endDrag must read the live order synchronously
  // rather than close over the (possibly stale) `dragOrder` state value.
  const dragOrderRef = useRef(null);
  // Per-row DOM nodes, the pixel top of each row measured once at drag start
  // (rows never actually move in the DOM — only their content swaps — so
  // these stay valid for the whole gesture), and a per-row "how far off its
  // natural slot does it currently look" offset driven by a rAF loop below.
  const rowRefs = useRef([]);
  const rowTops = useRef([]);
  const rowOffsets = useRef([]);
  const grabOffset = useRef(0);
  const pointerY = useRef(0);
  const rafId = useRef(null);
  const draft = t.templateDraft;

  useEffect(() => () => rafId.current && cancelAnimationFrame(rafId.current), []);

  const dismissUndo = () => {
    clearTimeout(undoTimer.current);
    setUndoRemoval(null);
  };
  const add = () => {
    dismissUndo();
    setEditingIndex(null);
    picker.open();
  };
  const finish = (plan) => {
    dismissUndo();
    if (editingIndex == null) t.addExerciseToDraft(plan, { onError });
    else t.editExerciseInDraft(editingIndex, plan, { onError });
  };
  const removeExercise = (index, exercise) => {
    if (!t.removeExerciseAt(index, { onError })) return;
    clearTimeout(undoTimer.current);
    setUndoRemoval({ index, exercise });
    undoTimer.current = setTimeout(() => setUndoRemoval(null), 6000);
  };
  const undoRemove = () => {
    if (!undoRemoval) return;
    t.restoreExerciseAt(undoRemoval.index, undoRemoval.exercise, { onError });
    dismissUndo();
  };

  const exercises = dragOrder || draft?.exercises || [];
  const startDrag = (index) => (e) => {
    dismissUndo();
    e.currentTarget.setPointerCapture(e.pointerId);
    const tops = rowRefs.current.map((el) => el?.getBoundingClientRect().top ?? 0);
    rowTops.current = tops;
    rowOffsets.current = tops.map(() => 0);
    grabOffset.current = e.clientY - tops[index];
    pointerY.current = e.clientY;
    dragFrom.current = index;
    setDraggingIndex(index);
    dragOrderRef.current = draft.exercises;
    setDragOrder(draft.exercises);
    const tick = () => {
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        if (i === dragFrom.current) {
          el.style.transform = `translateY(${pointerY.current - grabOffset.current - rowTops.current[i]}px)`;
        } else {
          const settled = rowOffsets.current[i] * 0.7;
          rowOffsets.current[i] = Math.abs(settled) < 0.5 ? 0 : settled;
          el.style.transform = rowOffsets.current[i] ? `translateY(${rowOffsets.current[i]}px)` : "";
        }
      });
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  };
  const moveDrag = (e) => {
    if (dragFrom.current == null) return;
    pointerY.current = e.clientY;
    const from = dragFrom.current;
    // Which natural slot is the dragged row's (visual, pointer-following)
    // top now closest to? Rows never actually move in the DOM — only their
    // content swaps — and the ones around the dragged row are themselves
    // mid-animation, so hit-testing via elementFromPoint gets confused by
    // the overlap. Comparing against the fixed `rowTops` measured at drag
    // start is immune to that.
    const currentTop = pointerY.current - grabOffset.current;
    let to = 0;
    let best = Infinity;
    rowTops.current.forEach((top, i) => {
      const d = Math.abs(top - currentTop);
      if (d < best) {
        best = d;
        to = i;
      }
    });
    if (to === from) return;
    // Every row strictly between the old and new slot shifts by exactly one
    // slot the other way — accumulate that into its running offset so the
    // rAF loop above eases it back to 0, instead of snapping instantly.
    if (to > from) {
      for (let i = from; i < to; i++) rowOffsets.current[i] += rowTops.current[i + 1] - rowTops.current[i];
    } else {
      for (let i = to + 1; i <= from; i++) rowOffsets.current[i] += rowTops.current[i - 1] - rowTops.current[i];
    }
    const arr = [...dragOrderRef.current];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    dragOrderRef.current = arr;
    dragFrom.current = to;
    setDraggingIndex(to);
    setDragOrder(arr);
  };
  const endDrag = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    rowRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "";
    });
    setTimeout(() => rowRefs.current.forEach((el) => el && (el.style.transition = "")), 200);
    if (dragOrderRef.current) t.reorderDraft(dragOrderRef.current, { onError });
    dragOrderRef.current = null;
    setDragOrder(null);
    setDraggingIndex(null);
    dragFrom.current = null;
  };

  const canLaunch = draft && draft.exercises.length > 0 && draft.name.trim();

  return (
    <section className="flex flex-col gap-5">
      {draft && (
        <button className="text-button justify-start" onClick={t.cancelTemplateDraft}>
          <ArrowLeft size={17} /> Mes séances
        </button>
      )}
      {draft ? (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">SÉANCE</p>
              {draft.id ? (
                <h1 className="page-title mt-2">{draft.name}</h1>
              ) : (
                <input
                  autoFocus
                  className="il-input page-title-input mt-2"
                  placeholder="Ex. Push, Jambes, Full body…"
                  value={draft.name}
                  onChange={(e) => t.setDraftName(e.target.value)}
                  onBlur={() => t.persistDraft({ onError })}
                  maxLength={100}
                />
              )}
              {draft.exercises.length > 0 && (
                <p className="muted text-sm mt-1">
                  {draft.exercises.length} exercice{draft.exercises.length > 1 ? "s" : ""} · ~
                  {estimateTemplateMinutes(draft.exercises)} min
                </p>
              )}
            </div>
            {draft.id && (
              <button
                className="icon-button shrink-0"
                aria-label="Options de la séance"
                onClick={() => setMenuOpen(true)}
              >
                <MoreVertical size={20} />
              </button>
            )}
          </div>
          {draft.exercises.length === 0 && (
            <p className="muted text-sm py-5">
              Ajoute les exercices qui composent cette séance.
            </p>
          )}
          <div className="flex flex-col">
            {exercises.map((ex, i) => (
              <div
                key={i}
                ref={(el) => (rowRefs.current[i] = el)}
                className={`template-exercise-row ${draggingIndex === i ? "dragging" : ""}`}
              >
                <span className="il-num muted text-xs template-exercise-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button
                  className="template-exercise-body"
                  onClick={() => {
                    setEditingIndex(i);
                    picker.open(ex);
                  }}
                >
                  <strong>{ex.name}</strong>
                  <small className="muted">
                    {ex.sets} série{ex.sets > 1 ? "s" : ""}
                    {repsLabel(ex) ? ` · ${repsLabel(ex)} reps` : ""} · {restLabel(ex)}
                    {ex.rpeEnabled ? " · RPE ON" : " · RPE OFF"}
                  </small>
                </button>
                <button
                  className="icon-button template-exercise-action"
                  aria-label={
                    exercises.length <= 1
                      ? "Une séance doit contenir au moins un exercice"
                      : `Retirer ${ex.name}`
                  }
                  disabled={exercises.length <= 1}
                  onClick={() => removeExercise(i, ex)}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="icon-button template-exercise-action template-drag-handle"
                  aria-label={`Réordonner ${ex.name}`}
                  onPointerDown={startDrag(i)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <GripVertical size={16} />
                </button>
              </div>
            ))}
          </div>
          {undoRemoval && (
            <p className="muted text-sm flex items-center justify-between gap-3">
              « {undoRemoval.exercise.name} » retiré.
              <button className="text-button" onClick={undoRemove}>
                Annuler
              </button>
            </p>
          )}
          <button className="template-add-exercise" onClick={add}>
            <span className="template-add-icon">
              <Plus size={18} />
            </span>
            Ajouter un exercice
          </button>
          {canLaunch && (
            <div className="template-cta-bar">
              <button
                className="primary uppercase w-full"
                style={{ letterSpacing: "0.06em" }}
                onClick={() => onStartFromTemplate(draft)}
              >
                START
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">TON PROGRAMME</p>
              <h1 className="page-title mt-2">Séances</h1>
            </div>
            <button className="icon-button" aria-label="Créer une séance" onClick={t.openNewTemplate}>
              <Plus size={22} />
            </button>
          </div>
          {t.templates.length ? (
            t.templates.map((tpl) => (
              <button className="list-row" key={tpl.id} onClick={() => t.openEditTemplate(tpl)}>
                <span>
                  <strong>{tpl.name}</strong>
                  <small>{tpl.exercises.slice(0, 3).map((e) => e.name).join(" · ")}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <div className="empty-state">
              <h2>Prépare ton prochain entraînement.</h2>
              <p>
                Crée une séance pour retrouver tes exercices, tes répétitions et tes
                temps de repos.
              </p>
              <button className="primary" onClick={t.openNewTemplate}>
                <Plus size={17} /> Créer ma première séance
              </button>
            </div>
          )}
        </>
      )}
      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          onFinish={finish}
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
      {menuOpen && (
        <Drawer title={draft.name} onClose={() => setMenuOpen(false)}>
          <div className="flex flex-col gap-3">
            <button
              className="secondary"
              onClick={() => {
                setRenameValue(draft.name);
                setMenuOpen(false);
                setRenaming(true);
              }}
            >
              Renommer la séance
            </button>
            <button
              className="text-button error"
              onClick={() => {
                setMenuOpen(false);
                setRemove(true);
              }}
            >
              <Trash2 size={16} /> Supprimer la séance
            </button>
          </div>
        </Drawer>
      )}
      {renaming && (
        <Drawer title="Renommer la séance" onClose={() => setRenaming(false)}>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (renameValue.trim()) t.renameDraft(renameValue.trim(), { onError });
              setRenaming(false);
            }}
          >
            <label className="field">
              Nom de la séance
              <input
                autoFocus
                className="il-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={100}
              />
            </label>
            <button className="primary" disabled={!renameValue.trim()}>
              Enregistrer
            </button>
          </form>
        </Drawer>
      )}
      {remove && (
        <Drawer title="Supprimer cette séance ?" onClose={() => setRemove(false)} busy={busy}>
          <p className="muted text-sm mb-5">
            « {draft.name} » sera retirée de tes séances enregistrées. L’historique des
            entraînements reste conservé.
          </p>
          <div className="flex gap-3">
            <button className="secondary flex-1" onClick={() => setRemove(false)}>
              Annuler
            </button>
            <button
              className="primary flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (await t.deleteTemplate(draft.id, { onError })) {
                    setRemove(false);
                    t.cancelTemplateDraft();
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              Supprimer
            </button>
          </div>
        </Drawer>
      )}
    </section>
  );
}
