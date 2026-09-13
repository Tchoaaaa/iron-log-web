import { useMemo } from "react";
import RecordRow from "../components/RecordRow";
import { exerciseRecords, exerciseTimelines } from "../lib/performanceMath";

// Existing records screen, now a direct list within Performance.
export default function PRScreen({ workouts, exercises, muscle, onMuscle, onExercise }) {
  const records = useMemo(
    () => exerciseRecords(exerciseTimelines(workouts)),
    [workouts],
  );
  const { categorized, groups } = useMemo(() => {
    const nameKey = name => name.normalize("NFKC").trim().toLocaleLowerCase("fr");
    const byName = new Map(exercises.map(ex => [nameKey(ex.name), ex.category]));
    const categorized = records.map(record => {
      const category = byName.get(nameKey(record.name));
      return { ...record, muscle: category && category !== "Perso" ? category : "Non classés" };
    });
    const groups = [...new Set(categorized.map(record => record.muscle))].sort((a, b) => a.localeCompare(b, "fr"));
    return { categorized, groups };
  }, [records, exercises]);
  const visible = muscle ? categorized.filter(record => record.muscle === muscle) : categorized;
  return (
    <section>
      <h2 className="eyebrow mb-3">MES RECORDS</h2>
      <p className="muted text-xs mb-5">
        Meilleure charge, puis répétitions à charge égale · toutes périodes.
      </p>
      {records.length > 0 && (
        <div className="records-filter">
          <label className="field">
            Muscle
            <select className="il-input" aria-label="Filtrer les records par muscle" value={muscle} onChange={event => onMuscle(event.target.value)}>
              <option value="">Tous les muscles</option>
              {muscle && !groups.includes(muscle) && <option value={muscle}>{muscle}</option>}
              {groups.map(group => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
          <p className="muted text-xs" role="status">{visible.length} record{visible.length > 1 ? "s" : ""}</p>
        </div>
      )}
      {!records.length ? (
        <div className="empty-state">
          <h2>Chaque progression compte.</h2>
          <p>
            Enregistre une séance pour retrouver tes meilleurs résultats ici.
          </p>
        </div>
      ) : !visible.length ? (
        <div className="empty-state">
          <h2>Aucun record pour ce muscle.</h2>
          <button className="text-button" onClick={() => onMuscle("")}>Voir tous les muscles</button>
        </div>
      ) : (
        visible.map((r) => (
          <RecordRow key={r.name} record={r} onExercise={onExercise} />
        ))
      )}
    </section>
  );
}
