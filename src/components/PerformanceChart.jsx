import { useId } from "react";
import { fmtDate, fmtNum } from "../lib/format";
export default function PerformanceChart({
  points,
  kind = "line",
  label,
  unit = "kg",
  compact = false,
}) {
  const id = useId();
  if (!points.length)
    return compact ? null : (
      <p className="muted text-sm py-6">Aucune donnée sur cette période.</p>
    );
  const width = compact ? 80 : 320,
    height = compact ? 42 : 140,
    pad = compact ? 5 : 12;
  const left = compact ? pad : 48;
  const plotWidth = width - left - pad;
  const max = Math.max(...points.map((p) => p.value), 1);
  const firstDate = points[0].date,
    duration = points.at(-1).date - firstDate;
  const x = (i) =>
    left +
    plotWidth * (duration > 0 ? (points[i].date - firstDate) / duration : 0.5);
  const min =
    kind === "bar"
      ? 0
      : Math.floor(
          Math.min(...points.map((p) => p.value)) * (compact ? 0.97 : 0.8),
        );
  const y = (value) =>
    height - pad - ((height - pad * 2) * (value - min)) / (max - min || 1);
  const formatted = points
    .map((p) => `${fmtDate(p.date)} : ${fmtNum(p.value)} ${unit}`)
    .join(" ; ");
  return (
    <figure className={compact ? "performance-spark" : "performance-chart"}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role={compact ? "presentation" : "img"}
        aria-hidden={compact || undefined}
        aria-labelledby={compact ? undefined : id}
        preserveAspectRatio="none"
      >
        <title id={id}>
          {label}. {formatted}
        </title>
        {!compact &&
          [0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={width - pad}
                y1={y(min + (max - min) * t)}
                y2={y(min + (max - min) * t)}
                className="chart-guide"
              />
              <text
                x={left - 9}
                y={y(min + (max - min) * t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="chart-axis-label"
              >
                {fmtNum(Math.round((min + (max - min) * t) * 100) / 100)}
              </text>
            </g>
          ))}
        {kind === "bar" ? (
          points.map((p, i) => {
            const step = plotWidth / points.length;
            return (
              <rect
                key={`${p.date}-${i}`}
                x={left + i * step + step * 0.15}
                y={y(p.value)}
                width={step * 0.7}
                height={height - pad - y(p.value)}
                className="chart-bar"
              >
                <title>
                  {fmtDate(p.date)} : {fmtNum(p.value)} {unit}
                </title>
              </rect>
            );
          })
        ) : (
          <>
            <polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
              fill="none"
              className="chart-line"
            />

          </>
        )}
      </svg>
      {!compact && (
        <figcaption className="chart-caption">
          <span>{fmtDate(points[0].date)}</span>
          <span>{unit}</span>
          <span>{points.length > 1 ? fmtDate(points.at(-1).date) : ""}</span>
        </figcaption>
      )}
    </figure>
  );
}
