"use client";

import { useEffect, useRef } from "react";

type UseMarketTickOptions = {
  intervalMs: number;
  onTick: () => void | Promise<void>;
};

export default function useMarketTick({ intervalMs, onTick }: UseMarketTickOptions) {
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (intervalMs <= 0) return undefined;
    const handleTick = () => {
      void onTickRef.current();
    };
    const id = setInterval(handleTick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
