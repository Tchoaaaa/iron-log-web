import { Sparkles, Play, ClipboardList, Footprints, Droplet, ChevronRight } from "lucide-react";
import { C } from "../lib/theme";
import { fmtDate, fmtDur } from "../lib/format";

export default function HomeScreen({
  dataError,
  quoteOfTheDay,
  workouts,
  templates,
  onStartWorkout,
  onGoToTemplates,
  onStartFromTemplate,
  onJumpToWorkoutInHistory,
}) {
  return (
    <div className="flex flex-col gap-4">
      {dataError && (
        <div
          style={{ background: C.surface, border: `1px solid ${C.rust}`, color: C.rust }}
          className="rounded-2xl p-3 text-xs"
        >
          {dataError}
        </div>
      )}
      <div
        style={{ background: C.surfaceRaised, border: `1px solid ${C.line}` }}
        className="rounded-2xl p-4 flex items-start gap-3"
      >
        <Sparkles size={16} style={{ color: C.steel, marginTop: 3, flexShrink: 0 }} />
        <p className="il-logo text-base leading-snug" style={{ color: C.text, fontWeight: 500 }}>
          {quoteOfTheDay}
        </p>
      </div>

      <div className="il-card rounded-2xl p-5 flex flex-col items-start gap-3">
        <div>
          <div style={{ fontWeight: 700 }} className="text-lg">Prêt à t'entraîner ?</div>
          <div style={{ color: C.textDim }} className="text-sm mt-0.5">
            {workouts.length > 0
              ? `Dernière séance : ${fmtDate(workouts[0].date)}`
              : "Aucune séance enregistrée pour l'instant"}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onStartWorkout}
            style={{ background: C.amber, color: C.signalInk }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold"
          >
            <Play size={16} fill={C.text} /> Séance vide
          </button>
          <button
            onClick={onGoToTemplates}
            style={{ border: `1px solid ${C.line}`, color: C.text }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold"
          >
            <ClipboardList size={16} /> Mes séances
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <div style={{ color: C.textDim }} className="text-sm mb-2">Démarrage rapide</div>
          <div className="flex flex-col gap-2">
            {templates.slice(0, 3).map((t) => (
              <button
                key={t.id}
                onClick={() => onStartFromTemplate(t)}
                className="il-card rounded-2xl p-3 flex items-center justify-between text-left"
              >
                <div>
                  <div style={{ fontWeight: 600 }} className="text-sm">{t.name}</div>
                  <div style={{ color: C.textFaint }} className="text-xs mt-0.5">
                    {t.exercises.length} exercice{t.exercises.length > 1 ? "s" : ""}
                  </div>
                </div>
                <Play size={16} style={{ color: C.amber }} fill={C.amber} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="il-card rounded-2xl p-4">
          <div style={{ color: C.textDim }} className="text-xs mb-1">Séances</div>
          <div className="il-num text-2xl" style={{ fontWeight: 700 }}>{workouts.length}</div>
        </div>
        <div className="il-card rounded-2xl p-4">
          <div style={{ color: C.textDim }} className="text-xs mb-1">Ce mois-ci</div>
          <div className="il-num text-2xl" style={{ fontWeight: 700 }}>
            {workouts.filter((w) => new Date(w.date).getMonth() === new Date().getMonth() && new Date(w.date).getFullYear() === new Date().getFullYear()).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: C.surface, border: `1.5px solid ${C.steel}` }} className="rounded-3xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Footprints size={16} style={{ color: C.steel }} />
            <span style={{ color: C.textDim, letterSpacing: "0.05em", fontWeight: 700 }} className="text-xs">
              OBJECTIF DE PAS
            </span>
          </div>
          <div className="il-num text-3xl" style={{ fontWeight: 800, color: C.steel }}>10 000</div>
          <div style={{ color: C.textFaint }} className="text-xs mt-1">Ça use, ça use !</div>
        </div>
        <div style={{ background: C.surface, border: `1.5px solid ${C.water}` }} className="rounded-3xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Droplet size={16} style={{ color: C.water }} />
            <span style={{ color: C.textDim, letterSpacing: "0.05em", fontWeight: 700 }} className="text-xs">
              HYDRATATION
            </span>
          </div>
          <div className="il-num text-3xl" style={{ fontWeight: 800, color: C.water }}>2-3 L</div>
          <div style={{ color: C.textFaint }} className="text-xs mt-1">GlouGlouGlou</div>
        </div>
      </div>

      {workouts.length > 0 && (
        <div>
          <div style={{ color: C.textDim }} className="text-sm mb-2">Séances récentes</div>
          <div className="flex flex-col gap-2">
            {workouts.slice(0, 3).map((w) => (
              <div key={w.id} className="il-card rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div style={{ fontWeight: 600 }} className="text-sm">{fmtDate(w.date)}</div>
                  <div style={{ color: C.textFaint }} className="text-xs mt-0.5">
                    {w.exercises.length} exercice{w.exercises.length > 1 ? "s" : ""} · {fmtDur(w.durationMin)}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: C.textFaint }} onClick={() => onJumpToWorkoutInHistory(w.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
