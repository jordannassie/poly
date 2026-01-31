"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

// Plinko configuration
const RISK_MULTIPLIERS: Record<string, number[]> = {
  low: [1.5, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.5],
  medium: [5.6, 2.1, 1.1, 1, 0.5, 0.3, 0.5, 1, 1.1, 2.1, 5.6],
  high: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
};

const ROW_OPTIONS = [8, 10, 12, 14, 16];

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  path: number[];
  active: boolean;
  result?: number;
}

interface GameResult {
  multiplier: number;
  amount: number;
  profit: number;
  time: Date;
}

export default function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const nextBallId = useRef(0);
  
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [rows, setRows] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [results, setResults] = useState<GameResult[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Track when component is mounted
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Calculate multipliers based on rows
  const getMultipliers = useCallback(() => {
    const baseMultipliers = RISK_MULTIPLIERS[risk];
    const numSlots = rows + 1;
    
    // Generate multipliers symmetrically based on row count
    if (numSlots === baseMultipliers.length) {
      return baseMultipliers;
    }
    
    // Interpolate for different row counts
    const multipliers: number[] = [];
    const center = numSlots / 2;
    
    for (let i = 0; i < numSlots; i++) {
      const distFromCenter = Math.abs(i - center + 0.5);
      const normalizedDist = distFromCenter / center;
      
      if (risk === "low") {
        multipliers.push(Math.max(0.2, 1.5 - normalizedDist * 1.3));
      } else if (risk === "medium") {
        multipliers.push(Math.max(0.3, Math.pow(normalizedDist * 3 + 0.5, 2)));
      } else {
        multipliers.push(Math.max(0.2, Math.pow(normalizedDist * 5 + 0.3, 3)));
      }
    }
    
    return multipliers.map(m => Math.round(m * 10) / 10);
  }, [risk, rows]);

  const multipliers = getMultipliers();

  // Get color for multiplier
  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 10) return "#ef4444"; // red
    if (multiplier >= 5) return "#f97316"; // orange
    if (multiplier >= 2) return "#eab308"; // yellow
    if (multiplier >= 1) return "#22c55e"; // green
    return "#6b7280"; // gray
  };

  // Draw the game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = "#1a1d23";
    ctx.fillRect(0, 0, width, height);
    
    // Calculate peg positions
    const pegRadius = 4;
    const startY = 40;
    const endY = height - 80;
    const rowHeight = (endY - startY) / rows;
    const baseWidth = width * 0.8;
    
    // Draw pegs
    for (let row = 0; row <= rows; row++) {
      const numPegs = row + 3;
      const rowWidth = (baseWidth * (row + 3)) / (rows + 3);
      const startX = (width - rowWidth) / 2;
      const pegSpacing = rowWidth / (numPegs - 1);
      
      for (let col = 0; col < numPegs; col++) {
        const x = startX + col * pegSpacing;
        const y = startY + row * rowHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    }
    
    // Draw slots at bottom
    const slotWidth = baseWidth / multipliers.length;
    const slotStartX = (width - baseWidth) / 2;
    const slotY = height - 50;
    
    multipliers.forEach((mult, i) => {
      const x = slotStartX + i * slotWidth;
      const color = getMultiplierColor(mult);
      
      // Slot background
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, slotY, slotWidth - 4, 35);
      
      // Multiplier text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${mult}x`, x + slotWidth / 2, slotY + 22);
    });
    
    // Draw balls
    ballsRef.current.forEach((ball) => {
      if (ball.active || ball.y < height) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, 8);
        gradient.addColorStop(0, "#fbbf24");
        gradient.addColorStop(1, "#f97316");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [rows, multipliers]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const startY = 40;
    const endY = height - 80;
    const rowHeight = (endY - startY) / rows;
    const baseWidth = width * 0.8;
    
    // Update balls
    ballsRef.current = ballsRef.current.map((ball) => {
      if (!ball.active) return ball;
      
      // Apply gravity
      ball.vy += 0.3;
      ball.y += ball.vy;
      ball.x += ball.vx;
      
      // Check for peg collisions
      const currentRow = Math.floor((ball.y - startY) / rowHeight);
      
      if (currentRow > ball.row && currentRow <= rows) {
        // Ball has reached a new row
        ball.row = currentRow;
        
        // Random bounce left or right
        const bounce = Math.random() > 0.5 ? 1 : -1;
        ball.path.push(bounce);
        ball.vx = bounce * (2 + Math.random());
        ball.vy = Math.abs(ball.vy) * 0.5;
      }
      
      // Dampen horizontal velocity
      ball.vx *= 0.98;
      
      // Check if ball has reached bottom
      if (ball.y >= endY + 30) {
        ball.active = false;
        
        // Calculate which slot
        const slotWidth = baseWidth / multipliers.length;
        const slotStartX = (width - baseWidth) / 2;
        const slotIndex = Math.floor((ball.x - slotStartX) / slotWidth);
        const clampedIndex = Math.max(0, Math.min(multipliers.length - 1, slotIndex));
        ball.result = clampedIndex;
        
        // Calculate winnings
        const multiplier = multipliers[clampedIndex];
        const profit = amount * multiplier - amount;
        
        setBalance((prev) => prev + amount * multiplier);
        setResults((prev) => [
          { multiplier, amount, profit, time: new Date() },
          ...prev.slice(0, 9),
        ]);
      }
      
      return ball;
    });
    
    // Remove inactive balls after animation
    ballsRef.current = ballsRef.current.filter(
      (ball) => ball.active || ball.y < height + 50
    );
    
    if (ballsRef.current.length === 0) {
      setIsPlaying(false);
    }
    
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [rows, multipliers, amount, draw]);

  // Start animation loop
  useEffect(() => {
    if (!mounted) return;
    
    // Initial draw
    const timer = setTimeout(() => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mounted, animate, draw]);

  // Drop a ball
  const dropBall = useCallback(() => {
    if (amount <= 0 || amount > balance) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setBalance((prev) => prev - amount);
    setIsPlaying(true);
    
    const ball: Ball = {
      id: nextBallId.current++,
      x: canvas.width / 2 + (Math.random() - 0.5) * 20,
      y: 20,
      vx: 0,
      vy: 2,
      row: -1,
      path: [],
      active: true,
    };
    
    ballsRef.current.push(ball);
  }, [amount, balance]);

  // Handle canvas resize
  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = Math.min(600, container.clientWidth);
        canvas.height = 500;
        draw();
      }
    };
    
    // Delay initial resize to ensure DOM is ready
    const timer = setTimeout(resizeCanvas, 50);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [mounted, draw]);

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <div className="flex">
        <SportsSidebar activeGame="plinko" />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Plinko
                </h1>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">
                  Drop the ball and win up to 110x
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-[color:var(--text-muted)]"
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-4">
                {/* Mode Toggle */}
                <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                  <div className="flex gap-2 p-1 bg-[color:var(--surface-2)] rounded-lg mb-4">
                    <button
                      onClick={() => setIsAutoMode(false)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                        !isAutoMode
                          ? "bg-[color:var(--surface)] text-[color:var(--text-strong)] shadow"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      onClick={() => setIsAutoMode(true)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                        isAutoMode
                          ? "bg-[color:var(--surface)] text-[color:var(--text-strong)] shadow"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      Auto
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <label className="block text-sm text-[color:var(--text-muted)] mb-2">
                      Amount
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={amount || ""}
                          onChange={(e) => setAmount(Number(e.target.value) || 0)}
                          placeholder="0.00"
                          className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-muted)]">
                          USD
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(Math.floor(amount / 2))}
                        className="border-[color:var(--border-soft)]"
                      >
                        ½
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(Math.min(amount * 2, balance))}
                        className="border-[color:var(--border-soft)]"
                      >
                        2x
                      </Button>
                    </div>
                  </div>

                  {/* Risk */}
                  <div className="mb-4">
                    <label className="block text-sm text-[color:var(--text-muted)] mb-2">
                      Risk
                    </label>
                    <select
                      value={risk}
                      onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")}
                      className="w-full px-3 py-2 bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] rounded-lg text-[color:var(--text-strong)]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Rows */}
                  <div className="mb-4">
                    <label className="block text-sm text-[color:var(--text-muted)] mb-2">
                      Rows
                    </label>
                    <select
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] rounded-lg text-[color:var(--text-strong)]"
                    >
                      {ROW_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Play Button */}
                  <Button
                    onClick={dropBall}
                    disabled={amount <= 0 || amount > balance}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6 text-lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Play
                  </Button>

                  {/* Balance */}
                  <div className="mt-4 p-3 bg-[color:var(--surface-2)] rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--text-muted)]">Balance</span>
                      <span className="font-bold text-[color:var(--text-strong)]">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Canvas */}
              <div className="lg:col-span-2">
                <div className="bg-[#1a1d23] border border-[color:var(--border-soft)] rounded-xl overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full"
                    style={{ aspectRatio: "6/5" }}
                  />
                </div>
              </div>

              {/* Results Panel */}
              <div className="lg:col-span-1">
                <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[color:var(--text-strong)]">Recent</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResults([])}
                      className="text-[color:var(--text-muted)] h-8"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {results.length === 0 ? (
                      <p className="text-sm text-[color:var(--text-muted)] text-center py-8">
                        No plays yet
                      </p>
                    ) : (
                      results.map((result, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-[color:var(--surface-2)] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="px-2 py-1 rounded text-xs font-bold text-white"
                              style={{ backgroundColor: getMultiplierColor(result.multiplier) }}
                            >
                              {result.multiplier}x
                            </span>
                            <span className="text-sm text-[color:var(--text-muted)]">
                              ${result.amount}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              result.profit >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {result.profit >= 0 ? "+" : ""}${result.profit.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MainFooter />
    </div>
  );
}
