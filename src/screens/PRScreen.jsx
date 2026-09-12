import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { C } from "../lib/theme";
import { estOneRM } from "../lib/workoutMath";

export default function PRScreen({ workouts }) {
  const [prExercise, setPrExercise] = useState(null);

  const loggedExerciseNames = useMemo(() => {
    const set = new Set();
    workouts.forEach((w) => w.exercises.forEach((e) => set.add(e.name)));
    return Array.from(set).sort();
  }, [workouts]);

  const prHistory = useMemo(() => {
    if (!prExercise) return [];
    const rows = [];
    [...workouts]
      .sort((a, b) => a.date - b.date)
      .forEach((w) => {
        w.exercises
          .filter((e) => e.name === prExercise)
          .forEach((e) => {
            const best = e.sets.reduce((m, s) => (s.weight > m.weight ? s : m), e.sets[0]);
            rows.push({ date: w.date, weight: best.weight, reps: best.reps });
          });
      });
    return rows;
  }, [workouts, prExercise]);

  const bestEver = useMemo(() => {
    if (prHistory.length === 0) return null;
    return prHistory.reduce((m, r) => (r.weight > m.weight ? r : m), prHistory[0]);
  }, [prHistory]);

  return (
    <div className="flex flex-col gap-3">
      <div style={{ fontWeight: 700 }} className="text-lg mb-1">Records</div>
      {loggedExerciseNames.length === 0 ? (
        <div style={{ color: C.textFaint }} className="text-sm text-center py-10">
          Enregistre une séance pour voir apparaître tes records ici.
        </div>
      ) : (
        <>
          <select
            className="il-input rounded-xl px-3 py-2 text-sm"
            value={prExercise || ""}
            onChange={(e) => setPrExercise(e.target.value || null)}
          >
            <option value="">Choisir un exercice…</option>
            {loggedExerciseNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {prExercise && bestEver && (
            <>
              <div className="il-card rounded-2xl p-4 flex items-center gap-3" style={{ borderColor: C.rust }}>
                <Trophy size={22} style={{ color: C.rust }} />
                <div>
                  <div style={{ color: C.textDim }} className="text-xs">Record — {prExercise}</div>
                  <div className="il-num text-xl" style={{ fontWeight: 700 }}>
                    {bestEver.weight} kg × {bestEver.reps} <span style={{ color: C.textFaint, fontWeight: 400 }} className="text-sm">(≈{estOneRM(bestEver.weight, bestEver.reps)}kg 1RM)</span>
                  </div>
                </div>
              </div>

              <div className="il-card rounded-2xl p-3">
                <div style={{ color: C.textDim }} className="text-xs mb-3">Progression (meilleure série par séance)</div>
                <div className="flex items-end gap-1.5 h-32">
                  {prHistory.map((r, i) => {
                    const max = Math.max(...prHistory.map((x) => x.weight), 1);
                    const h = Math.max(6, (r.weight / max) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                        <span className="il-num" style={{ fontSize: "9px", color: C.textFaint }}>{r.weight}</span>
                        <div style={{ height: `${h}%`, width: "100%", background: i === prHistory.length - 1 ? C.amber : C.steel, borderRadius: "2px 2px 0 0" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
