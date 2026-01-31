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
  radius: number;
  active: boolean;
  opacity: number;
  landed: boolean;
  landedTime: number;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
  glow: number; // 0-1 for hit effect
}

interface GameResult {
  multiplier: number;
  amount: number;
  profit: number;
  time: Date;
}

// Helper to draw rounded rectangle
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
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
    
    if (numSlots === baseMultipliers.length) {
      return baseMultipliers;
    }
    
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
    if (multiplier >= 10) return "#ef4444";
    if (multiplier >= 5) return "#f97316";
    if (multiplier >= 2) return "#eab308";
    if (multiplier >= 1) return "#22c55e";
    return "#6b7280";
  };

  // Calculate peg positions
  const calculatePegs = useCallback((width: number, height: number) => {
    const pegs: Peg[] = [];
    const pegRadius = 5;
    const startY = 50;
    const endY = height - 90;
    const rowHeight = (endY - startY) / rows;
    const baseWidth = width * 0.85;
    
    for (let row = 0; row <= rows; row++) {
      const numPegs = row + 3;
      const rowWidth = (baseWidth * (row + 3)) / (rows + 3);
      const startX = (width - rowWidth) / 2;
      const pegSpacing = numPegs > 1 ? rowWidth / (numPegs - 1) : 0;
      
      for (let col = 0; col < numPegs; col++) {
        pegs.push({
          x: startX + col * pegSpacing,
          y: startY + row * rowHeight,
          radius: pegRadius,
          glow: 0,
        });
      }
    }
    
    pegsRef.current = pegs;
    return pegs;
  }, [rows]);

  // Draw the game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#0f1419");
    bgGradient.addColorStop(1, "#1a1d23");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw pegs with glow effect
    pegsRef.current.forEach((peg) => {
      // Glow effect
      if (peg.glow > 0) {
        const glowGradient = ctx.createRadialGradient(peg.x, peg.y, 0, peg.x, peg.y, peg.radius * 4);
        glowGradient.addColorStop(0, `rgba(251, 191, 36, ${peg.glow * 0.8})`);
        glowGradient.addColorStop(0.5, `rgba(251, 191, 36, ${peg.glow * 0.3})`);
        glowGradient.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Decay glow
        peg.glow = Math.max(0, peg.glow - 0.08);
      }
      
      // Draw peg with gradient
      const pegGradient = ctx.createRadialGradient(
        peg.x - 1, peg.y - 1, 0,
        peg.x, peg.y, peg.radius
      );
      pegGradient.addColorStop(0, "#ffffff");
      pegGradient.addColorStop(0.7, "#e0e0e0");
      pegGradient.addColorStop(1, "#a0a0a0");
      
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fillStyle = pegGradient;
      ctx.fill();
      
      // Peg shadow
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    });
    
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw slots at bottom with rounded corners
    const baseWidth = width * 0.85;
    const slotWidth = baseWidth / multipliers.length;
    const slotStartX = (width - baseWidth) / 2;
    const slotY = height - 55;
    const slotHeight = 40;
    const cornerRadius = 6;
    
    multipliers.forEach((mult, i) => {
      const x = slotStartX + i * slotWidth + 2;
      const w = slotWidth - 4;
      const color = getMultiplierColor(mult);
      
      // Slot shadow
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      
      // Draw rounded rectangle
      drawRoundRect(ctx, x, slotY, w, slotHeight, cornerRadius);
      
      // Gradient fill
      const slotGradient = ctx.createLinearGradient(x, slotY, x, slotY + slotHeight);
      slotGradient.addColorStop(0, color);
      slotGradient.addColorStop(1, adjustColor(color, -30));
      ctx.fillStyle = slotGradient;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Highlight at top
      drawRoundRect(ctx, x, slotY, w, slotHeight / 3, cornerRadius);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();
      
      // Multiplier text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${mult}x`, x + w / 2, slotY + slotHeight / 2 + 2);
    });
    
    // Draw balls
    ballsRef.current.forEach((ball) => {
      if (!ball.active && ball.opacity <= 0) return;
      
      ctx.globalAlpha = ball.opacity;
      
      // Ball shadow
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      
      // Ball gradient
      const ballGradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        0,
        ball.x,
        ball.y,
        ball.radius
      );
      ballGradient.addColorStop(0, "#ffe066");
      ballGradient.addColorStop(0.3, "#fbbf24");
      ballGradient.addColorStop(0.7, "#f97316");
      ballGradient.addColorStop(1, "#ea580c");
      
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.fill();
      
      // Ball highlight
      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
    });
  }, [rows, multipliers]);

  // Helper to adjust color brightness
  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // Animation loop with realistic physics
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const baseWidth = width * 0.85;
    const slotY = height - 55;
    
    const gravity = 0.25;
    const friction = 0.99;
    const bounciness = 0.7;
    const ballRadius = 8;
    
    // Update balls
    ballsRef.current = ballsRef.current.map((ball) => {
      if (!ball.active) {
        // Fade out landed balls
        if (ball.landed) {
          ball.opacity = Math.max(0, ball.opacity - 0.05);
        }
        return ball;
      }
      
      // Apply gravity
      ball.vy += gravity;
      
      // Apply friction
      ball.vx *= friction;
      
      // Update position
      ball.x += ball.vx;
      ball.y += ball.vy;
      
      // Check collision with pegs
      pegsRef.current.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + peg.radius;
        
        if (dist < minDist) {
          // Collision detected - activate peg glow
          peg.glow = 1;
          
          // Calculate collision normal
          const nx = dx / dist;
          const ny = dy / dist;
          
          // Separate balls from peg
          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;
          
          // Reflect velocity
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * bounciness;
          ball.vy = (ball.vy - 2 * dot * ny) * bounciness;
          
          // Add some randomness
          ball.vx += (Math.random() - 0.5) * 1.5;
        }
      });
      
      // Wall boundaries
      const minX = (width - baseWidth) / 2 + ball.radius;
      const maxX = (width + baseWidth) / 2 - ball.radius;
      
      if (ball.x < minX) {
        ball.x = minX;
        ball.vx = Math.abs(ball.vx) * bounciness;
      }
      if (ball.x > maxX) {
        ball.x = maxX;
        ball.vx = -Math.abs(ball.vx) * bounciness;
      }
      
      // Check if ball has reached the slots
      if (ball.y >= slotY - ball.radius && !ball.landed) {
        ball.landed = true;
        ball.landedTime = Date.now();
        ball.active = false;
        ball.vy = 0;
        ball.vx = 0;
        
        // Calculate which slot
        const slotWidth = baseWidth / multipliers.length;
        const slotStartX = (width - baseWidth) / 2;
        const slotIndex = Math.floor((ball.x - slotStartX) / slotWidth);
        const clampedIndex = Math.max(0, Math.min(multipliers.length - 1, slotIndex));
        
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
    
    // Remove fully faded balls
    ballsRef.current = ballsRef.current.filter(
      (ball) => ball.active || ball.opacity > 0
    );
    
    if (ballsRef.current.length === 0) {
      setIsPlaying(false);
    }
    
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [multipliers, amount, draw]);

  // Start animation loop
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        calculatePegs(canvas.width, canvas.height);
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mounted, animate, draw, calculatePegs]);

  // Drop a ball
  const dropBall = useCallback(() => {
    if (amount <= 0 || amount > balance) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setBalance((prev) => prev - amount);
    setIsPlaying(true);
    
    const ball: Ball = {
      id: nextBallId.current++,
      x: canvas.width / 2 + (Math.random() - 0.5) * 10,
      y: 20,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      radius: 8,
      active: true,
      opacity: 1,
      landed: false,
      landedTime: 0,
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
        canvas.height = 520;
        calculatePegs(canvas.width, canvas.height);
        draw();
      }
    };
    
    const timer = setTimeout(resizeCanvas, 50);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [mounted, draw, calculatePegs]);

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
                <div className="bg-gradient-to-b from-[#0f1419] to-[#1a1d23] border border-[color:var(--border-soft)] rounded-xl overflow-hidden shadow-2xl">
                  <canvas
                    ref={canvasRef}
                    className="w-full"
                    style={{ aspectRatio: "6/5.2" }}
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
                              className="px-2 py-1 rounded-md text-xs font-bold text-white"
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
