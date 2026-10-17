interface Point {
  label: string;
  /** Share of checks that failed, 0 to 1. */
  value: number;
}

const W = 520;
const H = 170;
const PAD = { top: 14, right: 16, bottom: 28, left: 40 };

/** Edit rate per ticket, in the order the agent handled them. */
export default function Chart({ points }: { points: Point[] }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Edit rate per ticket" className="chart">
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} className="grid" />
          <text x={PAD.left - 8} y={y(g) + 4} textAnchor="end" className="axis">
            {Math.round(g * 100)}%
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={path} className="line" fill="none" />}
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={x(i)} cy={y(p.value)} r={4} className="dot" />
          <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">
            {p.label}
          </text>
        </g>
      ))}
      {points.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" className="axis">
          Handle a ticket to start the chart
        </text>
      )}
    </svg>
  );
}
