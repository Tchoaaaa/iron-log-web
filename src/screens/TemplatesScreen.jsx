import { Plus, X, Pencil, Trash2, Play, Timer } from "lucide-react";
import { C } from "../lib/theme";
import { formatRest } from "../lib/format";
import { useExercisePicker } from "../hooks/useExercisePicker";
import ExercisePickerModal from "../components/ExercisePickerModal";

export default function TemplatesScreen({ templatesHook, libraryHook, onStartFromTemplate, onError }) {
  const {
    templates,
    templateDraft,
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
  } = templatesHook;

  const picker = useExercisePicker({ library: libraryHook.exercises });
  const handleSave = () => saveTemplateDraft({ onError });
  const handleDelete = (id) => deleteTemplate(id, { onError });

  if (!templateDraft) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <div style={{ fontWeight: 700 }} className="text-lg">Mes séances</div>
          <button
            onClick={openNewTemplate}
            style={{ color: C.amber, border: `1px solid ${C.amber}` }}
            className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Plus size={13} /> Créer
          </button>
        </div>

        {templates.length === 0 ? (
          <div style={{ color: C.textFaint }} className="text-sm text-center py-10">
            Crée une séance (ex. « Push », « Jambes ») pour la relancer en un tap.
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="il-card rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div style={{ fontWeight: 600 }} className="text-sm">{t.name}</div>
                <div className="flex items-center gap-3">
                  <Pencil size={14} style={{ color: C.textFaint }} onClick={() => openEditTemplate(t)} />
                  <Trash2 size={14} style={{ color: C.textFaint }} onClick={() => handleDelete(t.id)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.exercises.map((ex) => (
                  <span key={ex.name} style={{ background: C.surfaceRaised, color: C.textDim }} className="text-xs px-2 py-0.5 rounded">
                    {ex.name} <span className="il-num">
                      ×{ex.sets}
                      {ex.pair
                        ? ` · ${formatRest(ex.restA)}/${formatRest(ex.restB)}`
                        : ex.rest ? ` · ${formatRest(ex.rest)}` : ""}
                    </span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => onStartFromTemplate(t)}
                style={{ background: C.amber, color: C.signalInk }}
                className="w-full py-2 rounded-full font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Play size={13} fill={C.text} /> Démarrer cette séance
              </button>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex items-center justify-between">
        <div style={{ fontWeight: 700 }} className="text-lg">
          {templateDraft.id ? "Modifier la séance" : "Nouvelle séance"}
        </div>
        <button onClick={cancelTemplateDraft} style={{ color: C.textFaint }} className="text-xs flex items-center gap-1">
          <X size={13} /> Annuler
        </button>
      </div>

      <input
        autoFocus
        className="il-input rounded-xl px-3 py-2 text-sm"
        placeholder="Nom de la séance (ex. Push, Jambes, Full Body…)"
        value={templateDraft.name}
        onChange={(e) => setDraftName(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        {templateDraft.exercises.length === 0 && (
          <div style={{ color: C.textFaint }} className="text-sm il-card rounded-2xl p-4 text-center">
            Ajoute les exercices qui composent cette séance.
          </div>
        )}
        {templateDraft.exercises.map((ex, i) => (
          <div key={ex.name} className="il-card rounded-2xl px-3 py-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm flex-1 min-w-0">
                <span className="il-num" style={{ color: C.textFaint }}>{i + 1}.</span> {ex.name}
                {!ex.pair && (
                  <button
                    onClick={() => cycleDraftExerciseRest(ex.name)}
                    style={{ color: C.steel }}
                    className="il-num text-xs ml-1.5 inline-flex items-center gap-1 align-middle"
                  >
                    <Timer size={11} /> {formatRest(ex.rest)}
                  </button>
                )}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => adjustDraftExerciseSets(ex.name, -1)}
                  style={{ background: C.surfaceRaised, color: C.text }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                >
                  −
                </button>
                <span className="il-num text-sm w-14 text-center" style={{ color: C.textDim }}>
                  {ex.sets} série{ex.sets > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => adjustDraftExerciseSets(ex.name, 1)}
                  style={{ background: C.surfaceRaised, color: C.text }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                >
                  +
                </button>
                <Trash2 size={14} style={{ color: C.textFaint }} onClick={() => removeExerciseFromDraft(ex.name)} />
              </div>
            </div>
            {ex.pair && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4">
                <button onClick={() => cycleDraftExerciseRest(ex.name, "A")} style={{ color: C.steel }} className="il-num text-xs inline-flex items-center gap-1 align-middle">
                  {ex.pair[0]} · <Timer size={11} /> {formatRest(ex.restA)}
                </button>
                <button onClick={() => cycleDraftExerciseRest(ex.name, "B")} style={{ color: C.steel }} className="il-num text-xs inline-flex items-center gap-1 align-middle">
                  {ex.pair[1]} · <Timer size={11} /> {formatRest(ex.restB)}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={picker.open}
        style={{ border: `1px dashed ${C.line}`, color: C.textDim }}
        className="rounded-2xl p-3 text-sm flex items-center justify-center gap-2"
      >
        <Plus size={15} /> Ajouter un exercice
      </button>

      <button
        onClick={handleSave}
        disabled={!templateDraft.name.trim() || templateDraft.exercises.length === 0}
        style={{
          background: templateDraft.name.trim() && templateDraft.exercises.length > 0 ? C.amber : C.surfaceRaised,
          color: templateDraft.name.trim() && templateDraft.exercises.length > 0 ? C.text : C.textFaint,
        }}
        className="w-full py-3 rounded-full font-semibold mt-1"
      >
        Enregistrer la séance
      </button>

      {picker.showPicker && (
        <ExercisePickerModal
          picker={picker}
          contextLabel={templateDraft?.name || "cette séance"}
          showRestStep
          onFinish={addExerciseToDraft}
          onCreateExercise={libraryHook.addCustomExercise}
        />
      )}
    </div>
  );
}
