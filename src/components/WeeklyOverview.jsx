import { Check, ArrowUpRight } from "lucide-react";
const STATUS = {
  today: "Aujourd’hui",
  done: "Terminée",
  missed: "Manquée",
  upcoming: "À venir",
  moved: "Déplacée",
};
export default function WeeklyOverview({ weekly, onEdit, onSelect }) {
  const planned = weekly.rows.filter(
    (row) => row.slot && row.status !== "moved",
  );
  const done = planned.filter((row) => row.status === "done").length;
  const pct = planned.length ? Math.round((done / planned.length) * 100) : 0;
  return (
    <section aria-label="Planning hebdomadaire" className="weekly-overview">
      {weekly.error && (
        <div className="notice mb-4">
          <p className="error" role="alert">
            {weekly.error}
          </p>
          <button
            className="text-button"
            disabled={weekly.busy}
            onClick={() => weekly.retry().catch(() => {})}
          >
            Réessayer la synchronisation
          </button>
        </div>
      )}
      {!weekly.configured ? (
        <>
          <p className="eyebrow">PLANIFIE TA SEMAINE</p>
          <h2 className="text-xl font-semibold mt-3">Trouve ton rythme.</h2>
          <p className="muted text-sm mt-2 mb-3">
            Structure tes entraînements en quelques gestes.
          </p>
          <button className="text-button week-link" onClick={onEdit}>
            Organiser ma semaine <ArrowUpRight size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="section-heading">
            <h2 className="eyebrow">CETTE SEMAINE</h2>
            {planned.length > 0 && (
              <span className="week-ratio il-num">
                <strong>{done}</strong> / {planned.length}
              </span>
            )}
          </div>
          {planned.length > 0 && (
            <div className="week-progress">
              <div className="week-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="mt-4">
            {weekly.rows.map((row) => {
              const content = (
                <>
                  <span className="eyebrow">{row.short}</span>
                  <span className="week-session-name">
                    {row.slot ? row.name : "REST"}
                    {row.missing && <small>À remplacer</small>}
                  </span>
                  <span
                    className={`week-status ${row.status === "done" || row.status === "today" ? "is-active" : ""}`}
                  >
                    {row.status === "done" ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        <span className="sr-only">Terminée</span>
                      </>
                    ) : row.status === "today" ? (
                      "Aujourd’hui"
                    ) : row.status === "moved" ? (
                      "Déplacée"
                    ) : null}
                  </span>
                </>
              );
              return row.slot ? (
                <button
                  className="week-row"
                  key={row.key}
                  onClick={() => onSelect(row.key)}
                  aria-label={`${row.label}, ${row.name}, ${STATUS[row.status]}`}
                >
                  {content}
                </button>
              ) : (
                <div className="week-row" key={row.key}>
                  {content}
                </div>
              );
            })}
          </div>
          {planned.length === 0 && (
            <p className="muted text-xs mt-3">
              Une semaine libre. Ajoute une séance quand tu le souhaites.
            </p>
          )}
          <button className="text-button muted mt-2" onClick={onEdit}>
            Modifier la semaine
          </button>
        </>
      )}
    </section>
  );
}
