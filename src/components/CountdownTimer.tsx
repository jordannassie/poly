"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

type CountdownTimerProps = {
  endDate: string;
  variant?: "compact" | "full" | "badge";
};

// Parse demo date strings and create a future date for demo purposes
function parseEndDate(endDate: string): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Handle formats like "Feb 8, 3:30 PM" or "Jan 31"
  const hasTime = endDate.includes(":");
  
  // Extract month and day
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  
  const parts = endDate.split(/[\s,]+/);
  const month = monthMap[parts[0]] ?? 0;
  const day = parseInt(parts[1]) || 1;
  
  let hours = 23;
  let minutes = 59;
  
  if (hasTime && parts.length >= 3) {
    const timePart = parts[2];
    const isPM = endDate.toLowerCase().includes("pm");
    const [h, m] = timePart.split(":").map(Number);
    hours = isPM && h !== 12 ? h + 12 : h;
    minutes = m || 0;
  }
  
  // Create the target date
  let targetDate = new Date(currentYear, month, day, hours, minutes, 0);
  
  // If the date is in the past, move it to next year or add days for demo
  if (targetDate < now) {
    // For demo purposes, add random days to make it future
    const daysToAdd = Math.floor(Math.random() * 14) + 1;
    targetDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }
  
  return targetDate;
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
};

function calculateTimeLeft(endDate: Date): TimeLeft {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

export function CountdownTimer({ endDate, variant = "compact" }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [targetDate] = useState(() => parseEndDate(endDate));
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 text-xs text-[color:var(--text-subtle)]">
        <Clock className="h-3 w-3" />
        <span>{endDate}</span>
      </div>
    );
  }

  const isUrgent = timeLeft.total > 0 && timeLeft.days === 0 && timeLeft.hours < 6;
  const isExpired = timeLeft.total <= 0;

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isExpired
            ? "bg-gray-500/20 text-gray-400"
            : isUrgent
            ? "bg-red-500/20 text-red-400 animate-pulse"
            : "bg-blue-500/20 text-blue-400"
        }`}
      >
        {isExpired ? (
          <>
            <Clock className="h-3 w-3" />
            Expired
          </>
        ) : isUrgent ? (
          <>
            <AlertTriangle className="h-3 w-3" />
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" />
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
          </>
        )}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        className={`p-4 rounded-xl border ${
          isExpired
            ? "bg-gray-500/10 border-gray-500/30"
            : isUrgent
            ? "bg-red-500/10 border-red-500/30"
            : "bg-[color:var(--surface-2)] border-[color:var(--border-soft)]"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {isUrgent ? (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          ) : (
            <Clock className="h-4 w-4 text-[color:var(--text-muted)]" />
          )}
          <span className="text-sm font-medium text-[color:var(--text-muted)]">
            {isExpired ? "Market Closed" : "Time Remaining"}
          </span>
        </div>
        {isExpired ? (
          <div className="text-2xl font-bold text-gray-400">Expired</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className={`text-2xl font-bold ${isUrgent ? "text-red-400" : "text-[color:var(--text-strong)]"}`}>
                {timeLeft.days}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">Days</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isUrgent ? "text-red-400" : "text-[color:var(--text-strong)]"}`}>
                {timeLeft.hours.toString().padStart(2, "0")}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">Hours</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isUrgent ? "text-red-400" : "text-[color:var(--text-strong)]"}`}>
                {timeLeft.minutes.toString().padStart(2, "0")}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">Mins</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isUrgent ? "text-red-400 animate-pulse" : "text-[color:var(--text-strong)]"}`}>
                {timeLeft.seconds.toString().padStart(2, "0")}
              </div>
              <div className="text-xs text-[color:var(--text-subtle)]">Secs</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        isExpired
          ? "text-gray-400"
          : isUrgent
          ? "text-red-400"
          : "text-[color:var(--text-subtle)]"
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-3 w-3 animate-pulse" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {isExpired ? (
        <span>Expired</span>
      ) : timeLeft.days > 0 ? (
        <span>
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      ) : (
        <span className={isUrgent ? "animate-pulse font-medium" : ""}>
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      )}
    </div>
  );
}
