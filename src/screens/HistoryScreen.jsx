import { useMemo, useState } from "react";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { C } from "../lib/theme";
import { fmtDayDate, fmtTimer, fmtVolume, fmtNum } from "../lib/format";
import { computePrCountByWorkoutId, computeHistoryMonths } from "../lib/workoutMath";

export default function HistoryScreen({
  workouts,
  expandedHistory,
  setExpandedHistory,
  onEditWorkout,
  onDeleteWorkout,
}) {
  const [historyMenuId, setHistoryMenuId] = useState(null);

  const prCountByWorkoutId = useMemo(() => computePrCountByWorkoutId(workouts), [workouts]);
  // séances groupées par mois (workouts est déjà trié du + récent au + ancien)
  const historyMonths = useMemo(() => computeHistoryMonths(workouts), [workouts]);

  return (
    <div className="flex flex-col">
      <div style={{ fontWeight: 700, letterSpacing: "0.01em" }} className="text-xl mb-6">
        Historique
      </div>

      {workouts.length === 0 && (
        <div style={{ color: C.textFaint }} className="text-sm text-center py-16">
          Pas encore de séance enregistrée.
        </div>
      )}

      {historyMonths.map((month) => (
        <div key={month.key} className="mb-7">
          <div
            style={{ color: C.textFaint, letterSpacing: "0.18em" }}
            className="text-[10px] font-semibold uppercase mb-1"
          >
            {month.label}
          </div>

          <div style={{ borderTop: `1px solid ${C.line}` }}>
            {month.items.map((w) => {
              const totalVolume = w.exercises.reduce(
                (sum, e) => sum + e.sets.reduce((s, set) => s + set.weight * set.reps, 0),
                0
              );
              const open = expandedHistory === w.id;
              const prCount = prCountByWorkoutId[w.id] || 0;
              const menuOpen = historyMenuId === w.id;
              return (
                <div key={w.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  {/* résumé — tap pour ouvrir le détail */}
                  <div
                    onClick={() => {
                      setHistoryMenuId(null);
                      setExpandedHistory(open ? null : w.id);
                    }}
                    className="py-3 cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          style={{ fontWeight: 700, color: C.text, letterSpacing: "0.06em" }}
                          className="text-sm uppercase leading-tight truncate"
                        >
                          {w.name || "Séance"}
                        </div>
                        <div
                          style={{ color: C.textDim, letterSpacing: "0.05em" }}
                          className="text-[11px] uppercase mt-1"
                        >
                          {fmtDayDate(w.date)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryMenuId(menuOpen ? null : w.id);
                        }}
                        style={{ color: C.textFaint }}
                        className="p-1 -mt-1 -mr-1 flex-shrink-0"
                        aria-label="Options de la séance"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    <div
                      className="il-num flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-2.5 text-[13px] uppercase"
                      style={{ color: C.text, fontWeight: 600 }}
                    >
                      <span>{fmtTimer(w.durationMin * 60000)}</span>
                      <span>{fmtVolume(totalVolume).toUpperCase()}</span>
                      {prCount > 0 && (
                        <span style={{ color: C.amber, fontWeight: 700 }}>{prCount} PR</span>
                      )}
                    </div>

                    {menuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: C.surface,
                          border: `1px solid ${C.line}`,
                          boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
                        }}
                        className="absolute right-0 top-8 rounded-lg py-1 z-20"
                      >
                        <button
                          onClick={() => onEditWorkout(w)}
                          style={{ color: C.text }}
                          className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap w-full"
                        >
                          <Pencil size={14} /> Modifier la séance
                        </button>
                        <button
                          onClick={() => {
                            setHistoryMenuId(null);
                            onDeleteWorkout(w.id);
                          }}
                          style={{ color: C.rust }}
                          className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap w-full"
                        >
                          <Trash2 size={14} /> Supprimer la séance
                        </button>
                      </div>
                    )}
                  </div>

                  {/* détail — toutes les séries de la séance */}
                  {open && (
                    <div
                      className="my-2 px-3.5 py-3.5"
                      style={{ background: C.surface, borderRadius: 8 }}
                    >
                      <div className="flex flex-col">
                        {w.exercises.map((e, i) => {
                          const vol = e.sets.reduce(
                            (s, set) => s + Number(set.weight) * Number(set.reps),
                            0
                          );
                          const prevEx = w.exercises[i - 1];
                          const sameSuperAsPrev =
                            !!e.superset && !!prevEx && prevEx.superset === e.superset;
                          return (
                            <div
                              key={i}
                              className={
                                i === 0 ? undefined : sameSuperAsPrev ? "pt-3.5" : "pt-3.5 mt-3.5"
                              }
                              style={{
                                ...(i > 0 && !sameSuperAsPrev
                                  ? { borderTop: `1px solid ${C.line}` }
                                  : {}),
                                ...(e.superset
                                  ? { borderLeft: `2px solid ${C.amber}`, paddingLeft: 12 }
                                  : {}),
                              }}
                            >
                              <div
                                style={{ color: C.text, fontWeight: 700, letterSpacing: "0.05em" }}
                                className="text-[12px] uppercase"
                              >
                                {e.name}
                              </div>
                              <div
                                style={{ color: C.textFaint }}
                                className="il-num text-[11px] mt-0.5"
                              >
                                {e.sets.length} série{e.sets.length > 1 ? "s" : ""} ·{" "}
                                {fmtVolume(vol)}
                              </div>
                              <div
                                className="il-num text-[13px] mt-2 flex flex-col gap-1"
                                style={{ color: C.textDim }}
                              >
                                {e.sets.map((set, si) => (
                                  <div key={si} className="flex gap-3.5">
                                    <span style={{ color: C.textFaint }}>
                                      {String(si + 1).padStart(2, "0")}
                                    </span>
                                    <span style={{ color: C.text }}>
                                      {fmtNum(Number(set.weight))} kg × {set.reps}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
