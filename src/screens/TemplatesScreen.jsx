import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Play } from "lucide-react";
import { formatRest } from "../lib/format";
import { useExercisePicker } from "../hooks/useExercisePicker";
import ExercisePickerModal from "../components/ExercisePickerModal";
import Drawer from "../components/Drawer";
export default function TemplatesScreen({
  templatesHook: t,
  libraryHook,
  onStartFromTemplate,
  onError,
}) {
  const picker = useExercisePicker({ library: libraryHook.exercises });
  const [editingIndex, setEditingIndex] = useState(null);
  const [selected, setSelected] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const draft = t.templateDraft;
  const template = t.templates.find((x) => x.id === selected);
  const add = () => {
    setEditingIndex(null);
    picker.open();
  };
  const finish = (plan) => {
    if (editingIndex == null) t.addExerciseToDraft(plan);
    else t.editExerciseInDraft(editingIndex, plan);
  };
  return (
    <section className="flex flex-col gap-5">
      {(draft || template) && (
        <button
          className="text-button justify-start"
          onClick={() => {
            if (draft) t.cancelTemplateDraft();
            else setSelected(null);
          }}
        >
          <ArrowLeft size={17} />{" "}
          {draft ? "Annuler les modifications" : "Mes séances"}
        </button>
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">{draft ? "PRÉPARER" : "TON PROGRAMME"}</p>
          <h1 className="page-title mt-2">
            {draft
              ? draft.id
                ? "Modifier la séance"
                : "Nouvelle séance"
              : template
                ? template.name
                : "Séances"}
          </h1>
        </div>
        {!draft && !template && (
          <button
            className="icon-button"
            aria-label="Créer une séance"
            onClick={t.openNewTemplate}
          >
            <Plus size={22} />
          </button>
        )}
      </div>
      {draft ? (
        <>
          <label className="field">
            Nom de la séance
            <input
              autoFocus
              className="il-input"
              placeholder="Ex. Push, Jambes, Full body…"
              value={draft.name}
              onChange={(e) => t.setDraftName(e.target.value)}
              maxLength={100}
            />
          </label>
          {draft.exercises.length === 0 && (
            <p className="muted text-sm py-5">
              Ajoute les exercices qui composent cette séance.
            </p>
          )}
          {draft.exercises.map((ex, i) => (
            <article key={i} className="exercise-card">
              <div className="flex gap-3 justify-between">
                <div>
                  <p className="eyebrow mb-2">
                    {ex.pair
                      ? "SUPERSET"
                      : `EXERCICE ${String(i + 1).padStart(2, "0")}`}
                  </p>
                  <h2 className="font-semibold">{ex.name}</h2>
                </div>
                <button
                  className="icon-button shrink-0"
                  aria-label={`Modifier ${ex.name}`}
                  onClick={() => {
                    setEditingIndex(i);
                    picker.open(ex);
                  }}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <p className="muted text-sm mt-3">
                {ex.sets} séries ·{" "}
                {ex.pair
                  ? `${formatRest(ex.restA) || "0 s"} / ${formatRest(ex.restB) || "0 s"}`
                  : formatRest(ex.rest) || "Sans repos"}
              </p>
              <p className="il-num muted text-xs mt-2">
                Reps :{" "}
                {Array.from(
                  { length: ex.sets },
                  (_, j) => ex.targets?.[j] || "—",
                ).join(" / ")}
                {ex.pair &&
                  ` · ${Array.from({ length: ex.sets }, (_, j) => ex.targetsB?.[j] || "—").join(" / ")}`}
              </p>
              <button
                className="text-button text-xs mt-2"
                onClick={() => t.removeExerciseAt(i)}
              >
                <Trash2 size={14} /> Retirer
              </button>
            </article>
          ))}
          <button className="secondary" onClick={add}>
            <Plus size={17} /> Ajouter un exercice
          </button>
          <button
            className="primary"
            disabled={busy || !draft.name.trim() || !draft.exercises.length}
            onClick={async () => {
              setBusy(true);
              try {
                await t.saveTemplateDraft({ onError });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Enregistrement…" : "Enregistrer la séance"}
          </button>
        </>
      ) : template ? (
        <>
          <p className="muted text-sm">
            {template.exercises.length} exercices ·{" "}
            {template.exercises.reduce(
              (n, ex) => n + ex.sets * (ex.pair ? 2 : 1),
              0,
            )}{" "}
            séries
          </p>
          {template.exercises.map((ex, i) => (
            <div className="list-row" key={i}>
              <span>
                <strong>{ex.name}</strong>
                <small>
                  {ex.sets} séries{ex.pair ? " · Superset" : ""}
                </small>
              </span>
            </div>
          ))}
          <button
            className="primary"
            onClick={() => onStartFromTemplate(template)}
          >
            <Play size={17} /> Démarrer cette séance
          </button>
          <button
            className="secondary"
            onClick={() => t.openEditTemplate(template)}
          >
            <Pencil size={16} /> Modifier la séance
          </button>
          <button className="text-button" onClick={() => setRemove(template)}>
            <Trash2 size={16} /> Supprimer la séance
          </button>
        </>
      ) : t.templates.length ? (
        t.templates.map((ex) => (
          <button
            className="list-row"
            key={ex.id}
            onClick={() => setSelected(ex.id)}
          >
            <span>
              <strong>{ex.name}</strong>
              <small>{ex.exercises.length} exercices</small>
            </span>
            <ArrowLeft size={17} className="rotate-180" />
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
      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          onFinish={finish}
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
      {remove && (
        <Drawer
          title="Supprimer cette séance ?"
          onClose={() => setRemove(null)}
          busy={busy}
        >
          <p className="muted text-sm mb-5">
            « {remove.name} » sera retirée de tes séances enregistrées.
            L’historique des entraînements reste conservé.
          </p>
          <div className="flex gap-3">
            <button
              className="secondary flex-1"
              onClick={() => setRemove(null)}
            >
              Annuler
            </button>
            <button
              className="primary flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (await t.deleteTemplate(remove.id, { onError })) setRemove(null);
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
