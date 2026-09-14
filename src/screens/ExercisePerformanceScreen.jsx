import { useMemo } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { exerciseDetail } from "../lib/performanceMath";
import { fmtDate, fmtNum, fmtVolume } from "../lib/format";
import PerformanceChart from "../components/PerformanceChart";
import { Change } from "./PerformanceOverview";
export default function ExercisePerformanceScreen({
  name,
  workouts,
  onBack,
  onWorkout,
  today,
  weeks,
  onWeeks,
}) {
  const data = useMemo(
    () =>
      exerciseDetail(
        workouts,
        name,
        weeks,
        new Date(`${today}T12:00:00`).getTime(),
      ),
    [workouts, name, weeks, today],
  );
  return (
    <section className="exercise-performance">
      <button className="text-button justify-start mb-5" onClick={onBack}>
        <ArrowLeft size={17} /> Retour à Performance
      </button>
      <p className="eyebrow">PROGRESSION DE L’EXERCICE</p>
      <h1 className="page-title mt-2 mb-6">{name}</h1>
      {data.best ? (
        <>
          <p className="eyebrow">MEILLEUR SET · TOUTES PÉRIODES</p>
          <p className="il-num text-3xl mt-2">
            {fmtNum(data.best.weight)} kg × {data.best.reps}
          </p>
          <p className="muted text-xs mt-2 mb-6">{fmtDate(data.best.date)}</p>
        </>
      ) : (
        <p className="muted text-sm mb-6">
          Aucun résultat enregistré pour cet exercice.
        </p>
      )}
      <div
        className="segmented"
        role="group"
        aria-label="Période de progression"
      >
        {[4, 8, 12].map((n) => (
          <button key={n} aria-pressed={weeks === n} onClick={() => onWeeks(n)}>
            {n} semaines
          </button>
        ))}
      </div>
      <section className="performance-section">
        <div className="section-heading">
          <h2 className="eyebrow">
            {data.weighted ? "CHARGE MAXIMALE" : "RÉPÉTITIONS MAXIMALES"}
          </h2>
          {data.rows.length > 0 && (
            <span className="il-num">
              {fmtNum(data.value)} {data.weighted ? "kg" : "reps"}
            </span>
          )}
        </div>
        <PerformanceChart
          label={`Progression de ${name}`}
          unit={data.weighted ? "kg" : "reps"}
          points={data.rows.map((r) => ({
            date: r.date,
            value: r[data.metric],
          }))}
        />
        <p className="muted text-[11px] mt-3">
          La courbe reprend les résultats de chaque séance enregistrée.
        </p>
      </section>
      <div className="performance-stats detail-stats">
        <div>
          <small>Charge</small>
          <strong className="il-num">{fmtNum(data.maxCharge)} kg</strong>
          <small>Sur la période</small>
        </div>
        <div>
          <small>Volume</small>
          <strong className="il-num">{fmtVolume(data.volume)}</strong>
          <Change value={data.volumeChange} />
          <small>vs {weeks} sem. précédentes</small>
        </div>
        <div>
          <small>PR</small>
          <strong className="il-num">{data.prs}</strong>
          <small>Sur la période</small>
        </div>
      </div>
      <section className="performance-section">
        <div className="section-heading">
          <h2 className="eyebrow">DERNIÈRES SÉANCES</h2>
          <span className="muted text-xs">
            {data.rows.length} séance{data.rows.length > 1 ? "s" : ""}
          </span>
        </div>
        {[...data.rows].reverse().map((r) => (
          <button
            className="list-row"
            key={r.workoutId}
            onClick={() => onWorkout(r.workoutId)}
          >
            <span>
              <strong>{fmtDate(r.date)}</strong>
              <small>{r.name}</small>
            </span>
            <span className="il-num text-sm">
              {fmtNum(r.weight)} kg × {r.reps}
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        {!data.rows.length && (
          <p className="muted text-sm py-5">
            Aucune séance dans ces {weeks} semaines. Essaie une période plus
            large.
          </p>
        )}
      </section>
    </section>
  );
}
