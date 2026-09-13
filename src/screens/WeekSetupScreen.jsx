import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { emptyWeek, WEEK_DAYS } from "../lib/weeklyPlan";

export default function WeekSetupScreen({
  weekly,
  templates,
  onClose,
  onGoToTemplates,
}) {
  const [scope, setScope] = useState("template");
  const [typeDraft, setTypeDraft] = useState(() => ({
    ...(weekly.plan.weekly_template || emptyWeek()),
  }));
  const [currentDraft, setCurrentDraft] = useState(() =>
    Object.fromEntries(
      weekly.rows.map((r) => [r.key, r.slot?.templateId || null]),
    ),
  );
  const [applyCurrent, setApplyCurrent] = useState(true);
  const [error, setError] = useState("");
  const initialWeek = useState(weekly.rows[0].weekStart)[0];
  const draft = scope === "template" ? typeDraft : currentDraft;
  const setDraft = scope === "template" ? setTypeDraft : setCurrentDraft;
  const weekChanged = initialWeek !== weekly.rows[0].weekStart;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await weekly.save(draft, scope, applyCurrent);
      onClose();
    } catch (err) {
      setError(err.message || "Enregistrement impossible. Réessaie.");
    }
  };
  return (
    <section className="week-setup">
      <button
        className="text-button justify-start"
        disabled={weekly.busy}
        onClick={onClose}
      >
        <ArrowLeft size={16} /> Accueil
      </button>
      <p className="eyebrow mt-5">UN RYTHME QUI TE RESSEMBLE</p>
      <h1 className="page-title mt-2">Organise ta semaine.</h1>
      <p className="muted text-sm mt-3 mb-6">
        Choisis tes jours, retrouve tes séances. Le reste peut rester vide.
      </p>
      {weekly.configured && (
        <div
          className="segmented mb-5"
          role="group"
          aria-label="Semaine à modifier"
        >
          <button
            disabled={weekly.busy}
            aria-pressed={scope === "template"}
            onClick={() => setScope("template")}
          >
            Semaine type
          </button>
          <button
            disabled={weekly.busy}
            aria-pressed={scope === "current"}
            onClick={() => setScope("current")}
          >
            Cette semaine
          </button>
        </div>
      )}
      <p className="muted text-xs mb-4">
        {scope === "template"
          ? "Ta semaine type se répète à partir du lundi."
          : "Ces ajustements concernent uniquement la semaine en cours."}
      </p>
      {templates.length === 0 && (
        <div className="week-empty-library">
          <p className="text-sm mb-2">
            Crée une séance pour pouvoir la placer dans ta semaine.
          </p>
          <button className="secondary" onClick={onGoToTemplates}>
            Créer une séance
          </button>
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={weekly.busy || weekChanged}>
          {WEEK_DAYS.map((day) => {
            const row = weekly.rows.find((r) => r.key === day.key);
            const locked =
              scope === "current" &&
              (row.status === "done" ||
                row.slot?.movedTo ||
                row.slot?.movedFrom);
            const missing =
              draft[day.key] && !templates.some((t) => t.id === draft[day.key]);
            return (
              <div className="week-editor-row" key={day.key}>
                <label htmlFor={`week-${day.key}`}>
                  <span className="eyebrow">{day.short}</span>
                </label>
                <div className="min-w-0">
                  <select
                    id={`week-${day.key}`}
                    aria-label={`Séance du ${day.label.toLowerCase()}`}
                    className="week-select"
                    disabled={!!locked}
                    value={draft[day.key] || ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [day.key]: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">Aucune séance</option>
                    {missing && (
                      <option value={draft[day.key]}>
                        Séance supprimée — à remplacer
                      </option>
                    )}
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {locked && (
                    <p className="muted text-[11px] mt-1">
                      {row.status === "done"
                        ? "Séance terminée"
                        : "Déplacement modifiable depuis la semaine"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </fieldset>
        {scope === "template" && weekly.configured && (
          <label className="flex items-start gap-3 mt-5 text-xs muted">
            <input
              type="checkbox"
              checked={applyCurrent}
              disabled={weekly.busy}
              onChange={(e) => setApplyCurrent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Appliquer aussi aux jours à venir de cette semaine. Les jours
              passés, terminés ou déjà ajustés sont conservés.
            </span>
          </label>
        )}
        {(error || weekChanged) && (
          <p className="error mt-4" role="alert">
            {weekChanged
              ? "La semaine a changé. Reviens à l’accueil pour ouvrir la nouvelle semaine."
              : error}
          </p>
        )}
        <div className="flex gap-3 mt-7">
          <button
            type="button"
            className="secondary flex-1"
            onClick={onClose}
            disabled={weekly.busy}
          >
            Annuler
          </button>
          <button
            className="primary flex-1"
            disabled={weekly.busy || weekChanged}
          >
            {weekly.busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
