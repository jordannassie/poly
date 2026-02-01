"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  RotateCcw, 
  Shield, 
  ChevronLeft, 
  Info,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PlinkoMode = "low" | "medium" | "high";

interface GameSession {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

interface PlayResult {
  slot: number;
  multiplier: number;
  payout: number;
  profit: number;
  betAmount: number;
  mode: PlinkoMode;
}

interface GameHistory {
  result: PlayResult;
  session: GameSession;
  timestamp: Date;
}

// Multiplier tables (must match server config)
const MULTIPLIER_TABLES: Record<PlinkoMode, number[]> = {
  low: [2.0, 1.8, 1.6, 1.4, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0],
  medium: [10.0, 5.0, 3.0, 2.0, 1.5, 1.0, 0.7, 0.5, 0.4, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0],
  high: [25.0, 12.0, 5.0, 3.0, 1.8, 1.0, 0.5, 0.3, 0.2, 0.3, 0.5, 1.0, 1.8, 3.0, 5.0, 12.0, 25.0],
};

interface Peg {
  x: number;
  y: number;
  radius: number;
  glow: number;
}

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
  targetSlot: number;
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

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function PlinkoGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const nextBallId = useRef(0);
  
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(1);
  const [mode, setMode] = useState<PlinkoMode>("medium");
  const [isPlaying, setIsPlaying] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [maxBet, setMaxBet] = useState<number>(10);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);

  const rows = 16;
  const multipliers = MULTIPLIER_TABLES[mode];

  // Track when component is mounted
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch initial balance and session
  useEffect(() => {
    if (!mounted) return;
    
    async function init() {
      try {
        // Fetch balance
        const balRes = await fetch("/api/games/balance", {
          headers: { "x-demo-mode": "true" }
        });
        const balData = await balRes.json();
        if (balData.balance !== undefined) {
          setBalance(balData.balance);
        }
        if (balData.limits?.maxBetsByMode) {
          setMaxBet(balData.limits.maxBetsByMode[mode] || 10);
        }
        
        // Fetch session
        const sesRes = await fetch("/api/games/plinko/session", {
          headers: { "x-demo-mode": "true" }
        });
        const sesData = await sesRes.json();
        if (sesData.session) {
          setSession(sesData.session);
        }
      } catch (err) {
        console.error("Init error:", err);
      }
    }
    
    init();
  }, [mounted, mode]);

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
      if (peg.glow > 0) {
        const glowGradient = ctx.createRadialGradient(peg.x, peg.y, 0, peg.x, peg.y, peg.radius * 4);
        glowGradient.addColorStop(0, `rgba(251, 191, 36, ${peg.glow * 0.8})`);
        glowGradient.addColorStop(0.5, `rgba(251, 191, 36, ${peg.glow * 0.3})`);
        glowGradient.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius * 4, 0, Math.PI * 2);
        ctx.fill();
        peg.glow = Math.max(0, peg.glow - 0.08);
      }
      
      const pegGradient = ctx.createRadialGradient(peg.x - 1, peg.y - 1, 0, peg.x, peg.y, peg.radius);
      pegGradient.addColorStop(0, "#ffffff");
      pegGradient.addColorStop(0.7, "#e0e0e0");
      pegGradient.addColorStop(1, "#a0a0a0");
      
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
      ctx.fillStyle = pegGradient;
      ctx.fill();
    });
    
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
      
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      
      drawRoundRect(ctx, x, slotY, w, slotHeight, cornerRadius);
      
      const slotGradient = ctx.createLinearGradient(x, slotY, x, slotY + slotHeight);
      slotGradient.addColorStop(0, color);
      slotGradient.addColorStop(1, adjustColor(color, -30));
      ctx.fillStyle = slotGradient;
      ctx.fill();
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      drawRoundRect(ctx, x, slotY, w, slotHeight / 3, cornerRadius);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${mult}x`, x + w / 2, slotY + slotHeight / 2 + 2);
    });
    
    // Draw balls
    ballsRef.current.forEach((ball) => {
      if (!ball.active && ball.opacity <= 0) return;
      
      ctx.globalAlpha = ball.opacity;
      
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      
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
      
      ctx.beginPath();
      ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
    });
  }, [multipliers]);

  // Animation loop with physics
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
    
    ballsRef.current = ballsRef.current.map((ball) => {
      if (!ball.active) {
        if (ball.landed) {
          ball.opacity = Math.max(0, ball.opacity - 0.05);
        }
        return ball;
      }
      
      ball.vy += gravity;
      ball.vx *= friction;
      ball.x += ball.vx;
      ball.y += ball.vy;
      
      pegsRef.current.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + peg.radius;
        
        if (dist < minDist) {
          peg.glow = 1;
          
          const nx = dx / dist;
          const ny = dy / dist;
          
          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;
          
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * bounciness;
          ball.vy = (ball.vy - 2 * dot * ny) * bounciness;
          
          ball.vx += (Math.random() - 0.5) * 1.5;
        }
      });
      
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
      
      if (ball.y >= slotY - ball.radius && !ball.landed) {
        ball.landed = true;
        ball.active = false;
        ball.vy = 0;
        ball.vx = 0;
        
        // Guide ball to target slot
        const slotWidth = baseWidth / multipliers.length;
        const slotStartX = (width - baseWidth) / 2;
        ball.x = slotStartX + ball.targetSlot * slotWidth + slotWidth / 2;
      }
      
      return ball;
    });
    
    ballsRef.current = ballsRef.current.filter(
      (ball) => ball.active || ball.opacity > 0
    );
    
    if (ballsRef.current.length === 0 && isPlaying) {
      setIsPlaying(false);
    }
    
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [multipliers, draw, isPlaying]);

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

  // Drop a ball (API call)
  const dropBall = async () => {
    if (amount <= 0 || amount > balance || amount > maxBet || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/games/plinko/play", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-demo-mode": "true"
        },
        body: JSON.stringify({
          mode,
          betAmount: amount,
          clientSeed: session?.clientSeed,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        setError(data.error || "Play failed");
        setLoading(false);
        return;
      }
      
      // Update state
      setBalance(data.balance);
      if (data.maxBet) setMaxBet(data.maxBet);
      if (data.session) setSession(data.session);
      
      // Add to history
      setHistory(prev => [{
        result: data.play,
        session: data.session,
        timestamp: new Date(),
      }, ...prev.slice(0, 19)]);
      
      // Animate ball to target slot
      const canvas = canvasRef.current;
      if (canvas) {
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
          targetSlot: data.play.slot,
        };
        
        ballsRef.current.push(ball);
      }
      
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add demo funds
  const addFunds = async () => {
    setAddingFunds(true);
    try {
      const res = await fetch("/api/games/balance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-demo-mode": "true"
        },
        body: JSON.stringify({ amount: 100 }),
      });
      const data = await res.json();
      if (data.balance !== undefined) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Add funds error:", err);
    } finally {
      setAddingFunds(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rotate seeds
  const rotateSeed = async () => {
    try {
      const res = await fetch("/api/games/plinko/session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-demo-mode": "true"
        },
        body: JSON.stringify({ revealPrevious: true }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("Rotate seed error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/games" className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Plinko
            </h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Provably fair • 96% RTP
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFairnessOpen(true)}
            className="text-[color:var(--text-muted)]"
          >
            <Shield className="h-4 w-4 mr-2" />
            Verify
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
              {/* Mode Toggle */}
              <div className="mb-4">
                <label className="block text-sm text-[color:var(--text-muted)] mb-2">Risk Level</label>
                <div className="flex gap-1 p-1 bg-[color:var(--surface-2)] rounded-lg">
                  {(["low", "medium", "high"] as PlinkoMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition capitalize ${
                        mode === m
                          ? "bg-[color:var(--surface)] text-[color:var(--text-strong)] shadow"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="block text-sm text-[color:var(--text-muted)] mb-2">
                  Amount (Max: ${maxBet.toFixed(2)})
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      min={0.1}
                      max={Math.min(balance, maxBet)}
                      step={0.1}
                      className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-muted)]">
                      USD
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(Math.max(0.1, Math.floor(amount / 2 * 100) / 100))}
                    className="border-[color:var(--border-soft)]"
                  >
                    ½
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(Math.min(amount * 2, balance, maxBet))}
                    className="border-[color:var(--border-soft)]"
                  >
                    2x
                  </Button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Play Button */}
              <Button
                onClick={dropBall}
                disabled={amount <= 0 || amount > balance || amount > maxBet || loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6 text-lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                {loading ? "Playing..." : "Drop Ball"}
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

              {/* Add Funds (Demo) */}
              {balance < 1 && (
                <Button
                  onClick={addFunds}
                  disabled={addingFunds}
                  variant="outline"
                  className="w-full mt-2"
                >
                  {addingFunds ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Demo Credits
                </Button>
              )}
            </div>

            {/* Session Info */}
            {session && (
              <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Session</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rotateSeed}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rotate
                  </Button>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[color:var(--text-muted)]">Server Hash:</span>
                    <div className="font-mono bg-[color:var(--surface-2)] p-2 rounded mt-1 break-all text-[10px]">
                      {session.serverSeedHash.slice(0, 32)}...
                    </div>
                  </div>
                  <div>
                    <span className="text-[color:var(--text-muted)]">Client Seed:</span>
                    <div className="font-mono bg-[color:var(--surface-2)] p-2 rounded mt-1 break-all">
                      {session.clientSeed}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--text-muted)]">Nonce:</span>
                    <span className="font-mono">{session.nonce}</span>
                  </div>
                </div>
              </div>
            )}
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
                <h3 className="font-semibold">History</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistory([])}
                  className="text-[color:var(--text-muted)] h-8"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)] text-center py-8">
                    No plays yet
                  </p>
                ) : (
                  history.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-[color:var(--surface-2)] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2 py-1 rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: getMultiplierColor(item.result.multiplier) }}
                        >
                          {item.result.multiplier}x
                        </span>
                        <span className="text-sm text-[color:var(--text-muted)]">
                          ${item.result.betAmount}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          item.result.profit >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {item.result.profit >= 0 ? "+" : ""}${item.result.profit.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fairness Modal */}
      <Dialog open={fairnessOpen} onOpenChange={setFairnessOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Provably Fair
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-[color:var(--text-muted)]">
              Every outcome is cryptographically verifiable. Before you play, we commit 
              to a server seed by showing you its hash. After playing, you can verify 
              that outcomes match.
            </p>
            
            <div className="bg-[color:var(--surface-2)] rounded-lg p-4 space-y-3">
              <h4 className="font-medium">How to Verify</h4>
              <ol className="list-decimal list-inside space-y-2 text-[color:var(--text-muted)]">
                <li>Copy the Server Seed Hash before playing</li>
                <li>Click "Rotate" to reveal the previous server seed</li>
                <li>Verify: SHA256(serverSeed) = serverSeedHash</li>
                <li>Recompute: HMAC_SHA256(serverSeed, clientSeed:nonce)</li>
              </ol>
            </div>

            {session && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-muted)]">Current Server Hash</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(session.serverSeedHash)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="font-mono text-xs bg-[color:var(--surface-2)] p-2 rounded break-all">
                  {session.serverSeedHash}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link 
                href="/api/games/plinko/rtp" 
                target="_blank"
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                View RTP calculations →
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MainFooter />
    </div>
  );
}
