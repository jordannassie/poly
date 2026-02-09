"use client";

import { useState } from "react";

type ChartLine = {
  name: string;
  color: string;
  data: number[];
  currentValue: number;
};

type MultiLineChartProps = {
  lines: ChartLine[];
  height?: number;
};

const timeRanges = ["1H", "6H", "1D", "1W", "1M", "ALL"];

export function MultiLineChart({ lines, height = 280 }: MultiLineChartProps) {
  const [activeRange, setActiveRange] = useState("ALL");
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    values: { name: string; value: number; color: string }[];
    date: string;
  } | null>(null);

  const width = 100;
  const allValues = lines.flatMap((l) => l.data);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const range = maxVal - minVal || 1;

  const getPoints = (data: number[]) =>
    data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - 40 - ((val - minVal) / range) * (height - 60);
        return { x, y, val };
      });

  const months = ["Oct", "Nov", "Dec", "Jan"];

  return (
    <div className="w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] p-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        {lines.map((line) => (
          <div key={line.name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-[color:var(--text-muted)]">{line.name}</span>
            <span className="font-semibold">{line.currentValue}%</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        className="relative"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1="0"
                y1={height - 40 - (pct / 100) * (height - 60)}
                x2={width}
                y2={height - 40 - (pct / 100) * (height - 60)}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeWidth="0.3"
              />
              <text
                x={width + 1}
                y={height - 40 - (pct / 100) * (height - 60) + 1}
                fill="currentColor"
                fillOpacity="0.4"
                fontSize="2.5"
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* Lines */}
          {lines.map((line) => {
            const points = getPoints(line.data);
            const pathData = points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
              .join(" ");

            return (
              <g key={line.name}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeWidth: 2 }}
                />
                {/* End dot */}
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="1.2"
                  fill={line.color}
                  stroke="white"
                  strokeWidth="0.3"
                />
              </g>
            );
          })}

          {/* Invisible hover areas */}
          {getPoints(lines[0].data).map((point, i) => (
            <rect
              key={i}
              x={point.x - width / lines[0].data.length / 2}
              y="0"
              width={width / lines[0].data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => {
                const values = lines.map((line) => ({
                  name: line.name,
                  value: line.data[i],
                  color: line.color,
                }));
                setHoveredPoint({
                  x: point.x,
                  y: point.y,
                  values,
                  date: `Jan ${i + 1}, 2026`,
                });
              }}
            />
          ))}

          {/* Hover line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1="0"
              x2={hoveredPoint.x}
              y2={height - 30}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] rounded-lg p-3 shadow-lg pointer-events-none"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: "20%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-xs text-[color:var(--text-muted)] mb-2">
              {hoveredPoint.date}
            </div>
            {hoveredPoint.values.map((v) => (
              <div
                key={v.name}
                className="flex items-center gap-2 text-sm"
                style={{ color: v.color }}
              >
                <span>{v.name}</span>
                <span className="font-semibold">{v.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex items-center justify-between mt-2 text-xs text-[color:var(--text-subtle)]">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>

      {/* Time range buttons */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-[color:var(--text-muted)]">
          Volume displayed
        </div>
        <div className="flex items-center gap-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2 py-1 rounded text-xs transition ${
                activeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
