"use client";

type PriceChartProps = {
  data?: number[];
  height?: number;
  colors?: string[];
};

export function PriceChart({
  data = [20, 25, 30, 28, 35, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 95, 97, 98, 99],
  height = 200,
  colors = ["#3b82f6", "#f97316", "#ef4444"],
}: PriceChartProps) {
  const width = 100;
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full rounded-xl bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1="0"
              y1={height - (pct / 100) * (height - 20) - 10}
              x2={width}
              y2={height - (pct / 100) * (height - 20) - 10}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
            <text
              x={width + 2}
              y={height - (pct / 100) * (height - 20) - 10 + 1}
              fill="currentColor"
              fillOpacity="0.4"
              fontSize="3"
            >
              {pct}%
            </text>
          </g>
        ))}
        {/* Fill area */}
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#chartGradient)"
        />
        {/* Main line */}
        <polyline
          points={points}
          fill="none"
          stroke={colors[0]}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current point */}
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - minVal) / range) * (height - 20) - 10}
          r="2"
          fill={colors[0]}
        />
      </svg>
      <div className="flex items-center justify-between mt-3 text-xs text-[color:var(--text-subtle)]">
        <span>Oct</span>
        <span>Nov</span>
        <span>Dec</span>
        <span>Jan</span>
      </div>
      <div className="flex items-center justify-end gap-4 mt-2 text-xs">
        <span className="px-2 py-1 rounded bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">1H</span>
        <span className="px-2 py-1 rounded bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">6H</span>
        <span className="px-2 py-1 rounded bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">1D</span>
        <span className="px-2 py-1 rounded bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">1W</span>
        <span className="px-2 py-1 rounded bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">1M</span>
        <span className="px-2 py-1 rounded bg-blue-600 text-white">ALL</span>
      </div>
    </div>
  );
}
