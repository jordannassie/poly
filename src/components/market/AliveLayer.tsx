"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import useMarketTick from "@/hooks/useMarketTick";

type AliveLayerProps = {
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  rightPct: number;
  leftPriceCents: number;
  rightPriceCents: number;
  onTickRefresh: () => Promise<void>;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const HISTORY_LEN = 30;
const CHART_W = 600;
const CHART_H = 200;
const PAD_TOP = 30;
const PAD_BOT = 30;
const PAD_RIGHT = 90;

function pctToY(pct: number): number {
  // Map 0-100% to bottom-top within padded area
  const usable = CHART_H - PAD_TOP - PAD_BOT;
  return CHART_H - PAD_BOT - (clamp(pct, 0, 100) / 100) * usable;
}

function buildPath(history: number[]): string {
  if (history.length < 2) return "";
  const step = (CHART_W - PAD_RIGHT) / (HISTORY_LEN - 1);
  const pts = history.map((pct, i) => ({ x: i * step, y: pctToY(pct) }));

  // Smooth catmull-rom-ish cubic bezier
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function AliveLayer({
  leftLabel,
  rightLabel,
  leftPct,
  rightPct,
  leftPriceCents,
  rightPriceCents,
  onTickRefresh,
}: AliveLayerProps) {
  const [leftHistory, setLeftHistory] = useState<number[]>(() => Array(HISTORY_LEN).fill(leftPct));
  const [rightHistory, setRightHistory] = useState<number[]>(() => Array(HISTORY_LEN).fill(rightPct));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leftPulse, setLeftPulse] = useState(false);
  const [rightPulse, setRightPulse] = useState(false);
  const prevLeft = useRef(leftPct);
  const prevRight = useRef(rightPct);

  // Push new values into history
  useEffect(() => {
    setLeftHistory((h) => [...h.slice(-(HISTORY_LEN - 1)), leftPct]);
    setRightHistory((h) => [...h.slice(-(HISTORY_LEN - 1)), rightPct]);

    // Pulse on change
    if (leftPct !== prevLeft.current) {
      setLeftPulse(true);
      const t = setTimeout(() => setLeftPulse(false), 800);
      prevLeft.current = leftPct;
      return () => clearTimeout(t);
    }
    if (rightPct !== prevRight.current) {
      setRightPulse(true);
      const t = setTimeout(() => setRightPulse(false), 800);
      prevRight.current = rightPct;
      return () => clearTimeout(t);
    }
  }, [leftPct, rightPct]);

  useMarketTick({
    intervalMs: 7000,
    onTick: async () => {
      setIsRefreshing(true);
      try {
        await onTickRefresh();
      } finally {
        setIsRefreshing(false);
      }
    },
  });

  const leftPath = buildPath(leftHistory);
  const rightPath = buildPath(rightHistory);

  const step = (CHART_W - PAD_RIGHT) / (HISTORY_LEN - 1);
  const lastX = (leftHistory.length - 1) * step;
  const leftEndY = pctToY(leftHistory[leftHistory.length - 1]);
  const rightEndY = pctToY(rightHistory[rightHistory.length - 1]);

  // Grid lines
  const gridLines = [20, 40, 60, 80];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111318] p-4 md:p-5 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-[0.3em]">
        <span className="flex items-center gap-2 text-white/50">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="text-[10px] text-white/40">
          {isRefreshing ? "Refreshing..." : "Updating every few seconds"}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full" style={{ aspectRatio: `${CHART_W}/${CHART_H}` }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Left team gradient */}
            <linearGradient id="leftGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            {/* Right team gradient */}
            <linearGradient id="rightGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
            </linearGradient>
            {/* Glow filters */}
            <filter id="lineGlowLeft">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="lineGlowRight">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="circleShadow">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#34d399" floodOpacity="0.6" />
            </filter>
            <filter id="circleShadowRight">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f87171" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Grid */}
          {gridLines.map((pct) => (
            <line
              key={pct}
              x1={0}
              y1={pctToY(pct)}
              x2={CHART_W}
              y2={pctToY(pct)}
              stroke="white"
              strokeOpacity={0.06}
              strokeDasharray="4,6"
            />
          ))}
          {/* Vertical grid */}
          {Array.from({ length: 7 }).map((_, i) => {
            const x = (i * (CHART_W - PAD_RIGHT)) / 6;
            return (
              <line
                key={`v${i}`}
                x1={x}
                y1={PAD_TOP}
                x2={x}
                y2={CHART_H - PAD_BOT}
                stroke="white"
                strokeOpacity={0.04}
              />
            );
          })}

          {/* Left team area fill */}
          {leftPath && (
            <path
              d={`${leftPath} L${lastX},${CHART_H - PAD_BOT} L0,${CHART_H - PAD_BOT} Z`}
              fill="url(#leftGlow)"
            />
          )}

          {/* Right team area fill */}
          {rightPath && (
            <path
              d={`${rightPath} L${lastX},${CHART_H - PAD_BOT} L0,${CHART_H - PAD_BOT} Z`}
              fill="url(#rightGlow)"
            />
          )}

          {/* Left line */}
          {leftPath && (
            <path
              d={leftPath}
              fill="none"
              stroke="#34d399"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlowLeft)"
              className="transition-all duration-700"
            />
          )}

          {/* Right line */}
          {rightPath && (
            <path
              d={rightPath}
              fill="none"
              stroke="#f87171"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlowRight)"
              className="transition-all duration-700"
            />
          )}

          {/* Left endpoint pulse ring */}
          <circle
            cx={lastX}
            cy={leftEndY}
            r={leftPulse ? 18 : 14}
            fill="none"
            stroke="#34d399"
            strokeWidth={1.5}
            opacity={leftPulse ? 0.6 : 0.2}
            className="transition-all duration-500"
          />
          {leftPulse && (
            <circle
              cx={lastX}
              cy={leftEndY}
              r={22}
              fill="none"
              stroke="#34d399"
              strokeWidth={1}
              opacity={0.3}
              className="animate-ping"
            />
          )}

          {/* Right endpoint pulse ring */}
          <circle
            cx={lastX}
            cy={rightEndY}
            r={rightPulse ? 18 : 14}
            fill="none"
            stroke="#f87171"
            strokeWidth={1.5}
            opacity={rightPulse ? 0.6 : 0.2}
            className="transition-all duration-500"
          />
          {rightPulse && (
            <circle
              cx={lastX}
              cy={rightEndY}
              r={22}
              fill="none"
              stroke="#f87171"
              strokeWidth={1}
              opacity={0.3}
              className="animate-ping"
            />
          )}
        </svg>

        {/* Left team badge (positioned absolute over SVG) */}
        <div
          className="absolute flex items-center gap-2 transition-all duration-700 ease-out"
          style={{
            right: 0,
            top: `${(leftEndY / CHART_H) * 100}%`,
            transform: "translateY(-50%)",
          }}
        >
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg transition-all duration-500 ${
              leftPulse
                ? "border-emerald-400/80 bg-emerald-500/30 shadow-emerald-500/40 scale-110"
                : "border-emerald-500/40 bg-emerald-500/20 shadow-emerald-500/20"
            }`}
          >
            <span className="text-emerald-300">{leftLabel}</span>
            <span className="text-white font-black text-sm">
              {Math.round(leftPct)}%
            </span>
          </div>
        </div>

        {/* Right team badge */}
        <div
          className="absolute flex items-center gap-2 transition-all duration-700 ease-out"
          style={{
            right: 0,
            top: `${(rightEndY / CHART_H) * 100}%`,
            transform: "translateY(-50%)",
          }}
        >
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg transition-all duration-500 ${
              rightPulse
                ? "border-red-400/80 bg-red-500/30 shadow-red-500/40 scale-110"
                : "border-red-500/40 bg-red-500/20 shadow-red-500/20"
            }`}
          >
            <span className="text-red-300">{rightLabel}</span>
            <span className="text-white font-black text-sm">
              {Math.round(rightPct)}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/70 font-medium">{leftLabel}</span>
            <span className="text-sm font-black text-emerald-400">
              {leftPriceCents}<span className="text-[10px] text-emerald-400/60">&#162;</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-xs text-white/70 font-medium">{rightLabel}</span>
            <span className="text-sm font-black text-red-400">
              {rightPriceCents}<span className="text-[10px] text-red-400/60">&#162;</span>
            </span>
          </div>
        </div>
        <div className="text-[10px] text-white/30 uppercase tracking-wider">
          Confidence
        </div>
      </div>
    </div>
  );
}
