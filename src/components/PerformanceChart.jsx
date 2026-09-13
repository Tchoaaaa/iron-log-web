import { useId } from "react";
import { fmtDate, fmtNum } from "../lib/format";
// Rough advance width per character for the 9px axis-tick font, and the
// minimum blank gap two adjacent tick labels must keep between them — both
// in the chart's own SVG user units (see viewBox below), so they scale with
// it regardless of screen size. Ticks are picked to guarantee this gap no
// matter how many points or how long each label's text is.
const TICK_CHAR_WIDTH = 5.6;
const TICK_MIN_GAP = 6;
function pickTicks(points, tickX, formatTick) {
  const last = points.length - 1;
  const anchorOf = (i) => (i === 0 ? "start" : i === last ? "end" : "middle");
  const extentOf = (i, textLength) => {
    const cx = tickX(i);
    if (anchorOf(i) === "start") return [cx, cx + textLength];
    if (anchorOf(i) === "end") return [cx - textLength, cx];
    return [cx - textLength / 2, cx + textLength / 2];
  };
  const widthOf = (i) => formatTick(points[i].date, i).length * TICK_CHAR_WIDTH;
  const chosen = [0];
  let [, lastEnd] = extentOf(0, widthOf(0));
  for (let i = 1; i < last; i++) {
    const [start, end] = extentOf(i, widthOf(i));
    if (start >= lastEnd + TICK_MIN_GAP) {
      chosen.push(i);
      lastEnd = end;
    }
  }
  if (last > 0) {
    const [start] = extentOf(last, widthOf(last));
    if (start >= lastEnd + TICK_MIN_GAP) chosen.push(last);
  }
  return chosen;
}
export default function PerformanceChart({
  points,
  kind = "line",
  label,
  unit = "kg",
  compact = false,
  tickFormat,
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
  const barStep = plotWidth / points.length;
  const tickX = kind === "bar" ? (i) => left + barStep * (i + 0.5) : x;
  const formatTick =
    tickFormat ||
    ((ts) =>
      new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
  const tickIndexes = compact ? [] : pickTicks(points, tickX, formatTick);
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
          points.map((p, i) => (
            <rect
              key={`${p.date}-${i}`}
              x={left + i * barStep + barStep * 0.15}
              y={y(p.value)}
              width={barStep * 0.7}
              height={height - pad - y(p.value)}
              className="chart-bar"
            >
              <title>
                {fmtDate(p.date)} : {fmtNum(p.value)} {unit}
              </title>
            </rect>
          ))
        ) : (
          <polyline
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
            fill="none"
            className="chart-line"
          />
        )}
        {!compact &&
          tickIndexes.map((i) => (
            <text
              key={i}
              x={tickX(i)}
              y={height - 2}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="chart-axis-x-label"
            >
              {formatTick(points[i].date, i)}
            </text>
          ))}
      </svg>
    </figure>
  );
}
