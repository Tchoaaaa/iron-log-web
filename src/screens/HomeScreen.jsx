import { ArrowUpRight, Play, UserRound } from "lucide-react";
import { fmtDate, fmtDur } from "../lib/format";
export default function HomeScreen({
  workouts,
  templates,
  profile,
  avatarUrl,
  active,
  onStartWorkout,
  onGoToTemplates,
  onGoToProfile,
  onGoToHistory,
  onResume,
  onStartFromTemplate,
  onJumpToWorkoutInHistory,
}) {
  const month = new Date();
  const monthWorkouts = workouts.filter((w) => {
    const d = new Date(w.date);
    return (
      d.getMonth() === month.getMonth() &&
      d.getFullYear() === month.getFullYear()
    );
  });
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="page-title mt-2">Bonjour, {profile}.</h1>
        </div>
        <button
          className="avatar small shrink-0"
          aria-label="Ouvrir mon profil"
          onClick={onGoToProfile}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} />}
        </button>
      </div>
      <div className="training-hero">
        <span className="eyebrow">
          {active ? "À TOI DE REPRENDRE" : "UNE SÉANCE APRÈS L’AUTRE"}
        </span>
        <h2>
          {active
            ? active.fromTemplate || "Ta séance t’attend."
            : "Place à\nl’entraînement."}
        </h2>
        <p>
          {active
            ? "Tes exercices et tes résultats sont conservés."
            : "Prépare ta séance. Note chaque série. Observe tes progrès."}
        </p>
        <button
          className="primary mt-6 w-full"
          onClick={active ? onResume : onStartWorkout}
        >
          <Play size={18} />
          {active ? "Reprendre ma séance" : "Démarrer une séance"}
        </button>
        <button className="text-button w-full mt-2" onClick={onGoToTemplates}>
          Choisir une séance enregistrée <ArrowUpRight size={16} />
        </button>
      </div>
      <div>
        <div className="section-heading">
          <h2>Ce mois-ci</h2>
          <button className="text-button" onClick={onGoToHistory}>
            Voir le suivi <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-5 mt-3">
          <div>
            <p className="il-num text-4xl">
              {String(monthWorkouts.length).padStart(2, "0")}
            </p>
            <p className="muted text-xs mt-2">séances enregistrées</p>
          </div>
          <div>
            <p className="il-num text-3xl mt-1">
              {fmtDur(monthWorkouts.reduce((s, w) => s + w.durationMin, 0))}
            </p>
            <p className="muted text-xs mt-2">d’entraînement</p>
          </div>
        </div>
      </div>
      {templates.length > 0 && (
        <div>
          <div className="section-heading">
            <h2>Tes séances</h2>
            <button className="text-button" onClick={onGoToTemplates}>
              Tout voir
            </button>
          </div>
          {templates.slice(0, 3).map((t) => (
            <button
              key={t.id}
              className="list-row"
              onClick={() => onStartFromTemplate(t)}
            >
              <span>
                <strong>{t.name}</strong>
                <small>{t.exercises.length} exercices</small>
              </span>
              <Play size={18} />
            </button>
          ))}
        </div>
      )}
      <div>
        <div className="section-heading">
          <h2>Dernière séance</h2>
        </div>
        {workouts[0] ? (
          <button
            className="list-row"
            onClick={() => onJumpToWorkoutInHistory(workouts[0].id)}
          >
            <span>
              <strong>{workouts[0].name || "Séance libre"}</strong>
              <small>
                {fmtDate(workouts[0].date)} · {fmtDur(workouts[0].durationMin)}
              </small>
            </span>
            <ArrowUpRight size={18} />
          </button>
        ) : (
          <p className="muted text-sm mt-3">
            Ton historique commence avec ta première séance. Tout sera réuni
            dans Suivi.
          </p>
        )}
      </div>
    </section>
  );
}
