import { ArrowUpRight, Check, Play, UserRound } from "lucide-react";
import WeeklyOverview from "../components/WeeklyOverview";
import { fmtDate, fmtDur } from "../lib/format";
export default function HomeScreen({
  weekly,
  onEditWeek,
  onSelectWeekDay,
  onStartPlanned,
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
  const todayRow = weekly.rows.find(row => row.date === weekly.today);
  const todayActive = todayRow?.status !== "moved" ? todayRow : null;
  const todayTemplate = todayActive?.template || null;
  const todayDone = todayActive?.status === "done";
  const exerciseCount = todayTemplate?.exercises.reduce((total, exercise) => total + (exercise.pair ? 2 : 1), 0);
  const heading = active
    ? active.fromTemplate || "Ta séance t’attend."
    : todayActive?.slot
      ? todayActive.name
      : "Aucune séance prévue.";
  const showCta = active || !todayDone;
  const ctaLabel = active ? "Reprendre" : todayTemplate ? "START" : "Choisir une séance";
  const ctaAction = active ? onResume : todayTemplate ? () => onStartPlanned(todayRow) : onGoToTemplates;
  const month = new Date(`${weekly.today}T12:00:00`);
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
            {month.toLocaleDateString("fr-FR", {
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
      <section className="today-section" aria-label="Séance du jour">
        <p className="eyebrow">AUJOURD’HUI</p>
        <h2>{heading}</h2>
        {active && <p className="muted text-sm">Séance en cours</p>}
        {!active && todayTemplate && !todayDone && (
          <p className="muted text-sm">{exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}</p>
        )}
        {!active && todayDone && (
          <p className="today-done mt-3">
            <Check size={16} aria-hidden="true" /> Terminée
          </p>
        )}
        {showCta && (
          <button className="home-cta mt-5" onClick={ctaAction}>
            <Play size={18} /> {ctaLabel}
          </button>
        )}
        {!active && !todayDone && <button className="text-button muted w-full mt-2" onClick={onStartWorkout}>Démarrer une séance libre</button>}
        {(active || (todayTemplate && !todayDone)) && <button className="text-button muted w-full mt-1" onClick={onGoToTemplates}>Choisir une autre séance <ArrowUpRight size={16} /></button>}
      </section>
      <WeeklyOverview weekly={weekly} onEdit={onEditWeek} onSelect={onSelectWeekDay} />
      <div>
        <div className="section-heading">
          <h2>Ce mois-ci</h2>
          <button className="text-button" onClick={onGoToHistory}>
            Voir Performance <ArrowUpRight size={15} />
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
            dans Performance.
          </p>
        )}
      </div>
    </section>
  );
}
