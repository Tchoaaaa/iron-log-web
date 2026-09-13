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
            <button className="text-button" onClick={onEdit}>
              Modifier la semaine
            </button>
          </div>
          <p className="week-count il-num">
            <span>{done}</span> / {planned.length}{" "}
            <small>séance{planned.length !== 1 ? "s" : ""}</small>
          </p>
          <div>
            {weekly.rows.map((row) => {
              const content = (
                <>
                  <span className="eyebrow">{row.short}</span>
                  <span className="week-session-name">
                    {row.slot ? row.name : "—"}
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
                    ) : (
                      STATUS[row.status] || ""
                    )}
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
        </>
      )}
    </section>
  );
}
