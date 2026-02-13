"use client";

import { useEffect, useRef, useState } from "react";
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function useAnimatedNumber(target: number) {
  const [displayValue, setDisplayValue] = useState(target);
  const currentRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = currentRef.current;
    if (startValue === target) {
      currentRef.current = target;
      setDisplayValue(target);
      return undefined;
    }
    const duration = 450;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      const nextValue = Math.round(startValue + (target - startValue) * progress);
      setDisplayValue(nextValue);
      currentRef.current = nextValue;
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        currentRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return displayValue;
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
  const displayLeftPrice = useAnimatedNumber(leftPriceCents);
  const displayRightPrice = useAnimatedNumber(rightPriceCents);
  const [leftPulse, setLeftPulse] = useState(false);
  const [rightPulse, setRightPulse] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevLeftRef = useRef({ pct: leftPct, price: leftPriceCents });
  const prevRightRef = useRef({ pct: rightPct, price: rightPriceCents });

  useEffect(() => {
    const increased = leftPct > prevLeftRef.current.pct || leftPriceCents > prevLeftRef.current.price;
    prevLeftRef.current = { pct: leftPct, price: leftPriceCents };
    if (!increased) return undefined;
    setLeftPulse(true);
    const timer = window.setTimeout(() => setLeftPulse(false), 600);
    return () => clearTimeout(timer);
  }, [leftPct, leftPriceCents]);

  useEffect(() => {
    const increased = rightPct > prevRightRef.current.pct || rightPriceCents > prevRightRef.current.price;
    prevRightRef.current = { pct: rightPct, price: rightPriceCents };
    if (!increased) return undefined;
    setRightPulse(true);
    const timer = window.setTimeout(() => setRightPulse(false), 600);
    return () => clearTimeout(timer);
  }, [rightPct, rightPriceCents]);

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

  const sides = [
    {
      label: leftLabel,
      pct: clamp(leftPct, 0, 100),
      displayPrice: displayLeftPrice,
      pulse: leftPulse,
      colorClass: "bg-lime-400",
    },
    {
      label: rightLabel,
      pct: clamp(rightPct, 0, 100),
      displayPrice: displayRightPrice,
      pulse: rightPulse,
      colorClass: "bg-orange-400",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-4 mb-6 text-white/90 space-y-4 shadow-[0_10px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/60">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
          Live
        </span>
        <span>{isRefreshing ? "Refreshing odds…" : "Updating every few seconds"}</span>
      </div>
      <div className="space-y-3">
        {sides.map((side) => (
          <div
            key={side.label}
            className={`space-y-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-transform duration-300 ${
              side.pulse ? "scale-[1.01] shadow-[0_0_20px_rgba(255,255,255,0.25)]" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{side.label}</span>
              <span className="text-2xl font-black text-white">
                {side.displayPrice}
                <span className="text-sm align-super text-white/60">¢</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Confidence</span>
              <span>{Math.round(side.pct)}%</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${side.colorClass}`}
                style={{ width: `${side.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
