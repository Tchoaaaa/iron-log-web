import { C } from "../lib/theme";
import { fmtTimer, fmtNum } from "../lib/format";

export default function SessionSummaryModal({ summary, onDone }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg, color: C.text }}>
      <div
        className="flex-1 flex flex-col justify-center px-7 w-full"
        style={{
          maxWidth: 430,
          marginLeft: "auto",
          marginRight: "auto",
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        }}
      >
        <div style={{ color: C.textFaint, letterSpacing: "0.2em" }} className="text-xs mb-1.5">
          SÉANCE TERMINÉE
        </div>
        <div style={{ fontWeight: 700 }} className="text-2xl mb-7">
          {summary.name || "Séance"}
        </div>

        <div
          className="grid grid-cols-3 gap-3 pb-6 mb-6"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          {[
            { v: fmtTimer(summary.elapsedMs), l: "Durée" },
            { v: fmtNum(summary.setCount), l: "Séries" },
            { v: `${fmtNum(Math.round(summary.volume))} kg`, l: "Volume" },
          ].map((s) => (
            <div key={s.l}>
              <div className="il-num text-xl" style={{ fontWeight: 700 }}>{s.v}</div>
              <div
                style={{ color: C.textFaint }}
                className="text-[10px] uppercase tracking-wide mt-1"
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div style={{ color: C.textFaint, letterSpacing: "0.2em" }} className="text-xs mb-3">
          PROGRESSION
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { l: "Charge", p: summary.loadPct },
            { l: "Volume", p: summary.volumePct },
          ].map((s) => (
            <div key={s.l} style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 10 }}>
              <div style={{ color: C.textFaint }} className="text-[10px] uppercase tracking-wide">
                {s.l}
              </div>
              <div
                className="il-num text-lg"
                style={{ fontWeight: 700, color: s.p >= 0 ? C.amber : C.rust }}
              >
                {`${s.p >= 0 ? "+" : ""}${s.p.toFixed(1)} %`}
              </div>
            </div>
          ))}
        </div>

        {summary.firstTime && (
          <div style={{ color: C.textFaint }} className="text-xs mt-3">
            Première fois pour cette séance — référence établie.
          </div>
        )}

        {summary.trend.length >= 2 &&
          (() => {
            const pts = summary.trend;
            const max = Math.max(...pts);
            const min = Math.min(...pts);
            const range = max - min || 1;
            const W = 300;
            const H = 54;
            const d = pts
              .map((v, i) => {
                const x = (i / (pts.length - 1)) * W;
                const y = H - ((v - min) / range) * (H - 4) - 2;
                return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="w-full mt-6"
                style={{ height: 54 }}
              >
                <path
                  d={d}
                  fill="none"
                  stroke={C.amber}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            );
          })()}
      </div>

      <div
        className="px-7 w-full"
        style={{
          maxWidth: 430,
          marginLeft: "auto",
          marginRight: "auto",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={onDone}
          style={{ border: `1px solid ${C.line}`, color: C.text }}
          className="w-full py-3 rounded-full font-semibold"
        >
          Terminé
        </button>
      </div>
    </div>
  );
}
