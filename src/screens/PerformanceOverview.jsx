import { useMemo } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { performanceOverview, changePercent } from "../lib/performanceMath";
import { fmtDate, fmtNum } from "../lib/format";
import { WEEK_DAYS } from "../lib/weeklyPlan";
import PerformanceChart from "../components/PerformanceChart";
import RecordRow from "../components/RecordRow";
const PERIODS = [["week", "Semaine"], ["month", "Mois"], ["year", "Année"]];
// One bar per day (week), per calendar week (month), per month (year) — see
// performanceMath's bucketing. PerformanceChart picks how many of these to
// actually label, keeping a fixed minimum gap regardless of how many bars
// or how long each format's text is (single letters, "Sem. N", full dates…).
const VOLUME_TICKS = {
  week: (ts) => WEEK_DAYS[(new Date(ts).getDay() + 6) % 7].short,
  month: (ts, i) => `Sem. ${i + 1}`,
  year: (ts) =>
    new Date(ts)
      .toLocaleDateString("fr-FR", { month: "short" })
      .charAt(0)
      .toUpperCase(),
};
export function Change({ value, suffix = "%" }) {
  return (
    <span className={value > 0 ? "performance-change" : "muted"}>
      {value === null
        ? "—"
        : `${value > 0 ? "+" : ""}${fmtNum(Math.round(value * 10) / 10)}${suffix}`}
    </span>
  );
}
export default function PerformanceOverview({
  workouts,
  period,
  onPeriod,
  onExercise,
  onRecords,
  onStartWorkout,
  today,
}) {
  const data = useMemo(
    () =>
      performanceOverview(
        workouts,
        period,
        new Date(`${today}T12:00:00`).getTime(),
      ),
    [workouts, period, today],
  );
  const { totals, previous, range } = data;
  const volumeTonnes = (totals.volume / 1000).toLocaleString("fr-FR", {
    maximumFractionDigits: 20,
  });
  return (
    <div className="performance-overview">
      <div className="segmented" role="group" aria-label="Période de l’aperçu">
        {PERIODS.map(([key, label]) => (
          <button key={key} aria-pressed={period === key} onClick={() => onPeriod(key)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted text-xs mt-3">
        {fmtDate(new Date(`${range.start}T12:00:00`))} —{" "}
        {fmtDate(new Date(`${range.today}T12:00:00`))}
      </p>
      {workouts.length === 0 ? (
        <div className="empty-state">
          <h2>Ta progression commence ici.</h2>
          <p>
            Enregistre une séance pour retrouver tes résultats, ton historique
            et tes records.
          </p>
          <button className="primary" onClick={onStartWorkout}>
            Démarrer une séance
          </button>
        </div>
      ) : (
        <>
          <section className="performance-section">
            <h2 className="eyebrow">VUE GLOBALE</h2>
            <div className="performance-stats">
              {[
                [
                  "Séances",
                  fmtNum(totals.sessions),
                  changePercent(totals.sessions, previous.sessions),
                ],
                [
                  "Volume (t)",
                  fmtNum(Math.round(totals.volume / 1000)),
                  changePercent(totals.volume, previous.volume),
                ],
                [
                  "PR",
                  fmtNum(totals.prs),
                  changePercent(totals.prs, previous.prs),
                ],
              ].map(([label, value, change]) => (
                <div key={label}>
                  <strong className="il-num">{value}</strong>
                  <small>{label}</small>
                  <Change value={change} />
                </div>
              ))}
            </div>
            <p className="muted text-[11px] mt-3">
              Évolution vs les {range.days} jours précédents.
            </p>
          </section>
          <section className="performance-section">
            <div className="section-heading">
              <h2 className="eyebrow">VOLUME</h2>
              <span className="il-num text-sm">{volumeTonnes} t</span>
            </div>
            <PerformanceChart
              points={data.buckets.map((point) => ({
                ...point,
                value: point.value / 1000,
              }))}
              unit="t"
              kind="bar"
              label="Volume d’entraînement"
              tickFormat={VOLUME_TICKS[period]}
            />
            {!data.current.length && (
              <p className="muted text-sm mt-3">
                Aucune séance sur cette période. Essaie une période plus large.
              </p>
            )}
          </section>
          <section className="performance-section">
            <h2 className="eyebrow mb-3">PROGRESSION DES EXERCICES</h2>
            {data.progression.slice(0, 4).map((e) => (
              <button
                className="performance-exercise-row"
                key={e.name}
                onClick={() => onExercise(e.name)}
              >
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.weighted ? "Charge maximale" : "Répétitions maximales"}
                  </small>
                </span>
                <PerformanceChart
                  compact
                  points={e.rows.map((r) => ({
                    date: r.date,
                    value: r[e.metric],
                  }))}
                  label={e.name}
                  unit={e.weighted ? "kg" : "reps"}
                />
                <span className="performance-result">
                  <strong>
                    {fmtNum(e.value)} {e.weighted ? "kg" : "reps"}
                  </strong>
                  <Change
                    value={e.weighted ? e.change : e.repsChange}
                    suffix={e.weighted ? "%" : " reps"}
                  />
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
            {!data.progression.length && (
              <p className="muted text-sm">
                Les exercices de cette période apparaîtront ici.
              </p>
            )}
          </section>
          <section className="performance-section">
            <div className="section-heading">
              <h2>
                <button className="text-button" onClick={onRecords}>
                  Mes records <ArrowUpRight size={15} />
                </button>
              </h2>
              <span className="muted text-xs">Toutes périodes</span>
            </div>
            {data.records.slice(0, 3).map((r) => (
              <RecordRow key={r.name} record={r} onExercise={onExercise} />
            ))}
          </section>
          <details className="performance-method">
            <summary>Comprendre les indicateurs</summary>
            <p>
              Volume : somme des charges × répétitions enregistrées. PR :
              nouvelle charge maximale par exercice, première séance lestée
              comprise, comme dans l’historique. Les écarts comparent deux
              périodes de même durée ; « — » indique une base absente ou
              nulle.
            </p>
            <p>
              La progression compare la première et la dernière séance de la
              période, à partir de la charge maximale réellement enregistrée.
              Pour un exercice sans charge, seules les répétitions sont
              comparées ; aucun poids de corps n’est ajouté.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
