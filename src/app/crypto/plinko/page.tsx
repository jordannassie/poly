"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { TopNav } from "@/components/TopNav";
import { SportsSidebar } from "@/components/SportsSidebar";
import { MainFooter } from "@/components/MainFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, RefreshCw, Volume2, VolumeX, Lock, AlertTriangle, Info } from "lucide-react";

// Import verified RTP math utilities
import {
  MULTIPLIER_TABLES,
  getMultipliers,
  getMaxMultiplier,
  getAllowedRows,
  getMinRows,
  isValidCombination,
  computeRtp,
  printRtpVerification,
  type RiskLevel,
} from "@/lib/plinko-math";

// =============================================================================
// DEMO MODE CONFIGURATION - SAME RULES AS REAL MODE
// =============================================================================
const DEMO_START_BALANCE = 5000;
const DEMO_POOL_START = 5000; // Demo pool starts with same amount
const MIN_BET = 0.10;

// Row options (only valid rows shown based on risk)
const ALL_ROW_OPTIONS = [12, 14, 16];

// =============================================================================
// DROP SAFETY CONFIGURATION
// =============================================================================
const DROP_TIMEOUT_MS = 8000;  // Force-resolve after 8 seconds
const STUCK_THRESHOLD_MS = 800; // Consider stuck if no movement for 800ms
const STUCK_EPSILON = 0.5;      // Minimum movement to not be considered stuck

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
  bounceCount: number;
  slotBouncing: boolean;
  resultRecorded: boolean;
  betAmount: number;
  // Pre-computed outcome (used for force-resolve)
  precomputedSlotIndex: number;
  precomputedMultiplier: number;
  // Stuck detection
  spawnTime: number;
  lastY: number;
  lastMoveTime: number;
  forceResolved: boolean;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
  glow: number;
}

interface GameResult {
  multiplier: number;
  amount: number;
  profit: number;
  time: Date;
}

interface RiskModeStatus {
  enabled: boolean;
  maxBet: number;
  reason?: string;
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

// =============================================================================
// SOLVENCY CHECK - Same logic as real mode
// =============================================================================
function checkDemoPoolSolvency(
  poolBalance: number,
  reservedLiability: number = 0
): Record<string, RiskModeStatus> {
  const availableToPay = poolBalance - reservedLiability;
  const modes: Record<string, RiskModeStatus> = {};
  const riskLevels: RiskLevel[] = ["low", "medium", "high"];
  
  for (const mode of riskLevels) {
    const maxMult = getMaxMultiplier(mode);
    // Max bet = availableToPay / maxMultiplier
    const maxBet = availableToPay / maxMult;
    
    if (maxBet < MIN_BET) {
      modes[mode] = {
        enabled: false,
        maxBet: 0,
        reason: `Pool too small (need $${(MIN_BET * maxMult).toFixed(2)} for ${mode} risk)`,
      };
    } else {
      modes[mode] = {
        enabled: true,
        maxBet: Math.floor(maxBet * 100) / 100, // Round down to 2 decimals
      };
    }
  }
  
  return modes;
}

// =============================================================================
// VALIDATE BET AGAINST POOL - Same logic as real mode
// =============================================================================
function validateBetAgainstPool(
  betAmount: number,
  mode: RiskLevel,
  poolBalance: number,
  reservedLiability: number = 0
): { valid: boolean; error?: string; maxBet: number; maxPayout: number } {
  const maxMultiplier = getMaxMultiplier(mode);
  const maxPayout = betAmount * maxMultiplier;
  const availableToPay = poolBalance - reservedLiability;
  const maxBet = Math.floor((availableToPay / maxMultiplier) * 100) / 100;
  
  if (betAmount < MIN_BET) {
    return { valid: false, error: `Minimum bet is $${MIN_BET.toFixed(2)}`, maxBet, maxPayout };
  }
  
  if (maxPayout > availableToPay) {
    return {
      valid: false,
      error: `Max payout ($${maxPayout.toFixed(2)}) exceeds pool ($${availableToPay.toFixed(2)}). Max bet: $${maxBet.toFixed(2)}`,
      maxBet,
      maxPayout,
    };
  }
  
  return { valid: true, maxBet, maxPayout };
}

export default function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const nextBallId = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [rows, setRows] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropping, setIsDropping] = useState(false); // Single ball lock
  const [results, setResults] = useState<GameResult[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Demo Mode State - with POOL (same as real mode)
  const [demoBalance, setDemoBalance] = useState(DEMO_START_BALANCE);
  const [demoPoolBalance, setDemoPoolBalance] = useState(DEMO_POOL_START);
  const [reservedLiability, setReservedLiability] = useState(0);
  
  // Calculate risk mode status based on pool solvency
  const riskModes = useMemo(() => {
    return checkDemoPoolSolvency(demoPoolBalance, reservedLiability);
  }, [demoPoolBalance, reservedLiability]);
  
  // Check if current risk mode is valid for current rows
  const isRiskRowValid = useMemo(() => {
    return isValidCombination(risk, rows);
  }, [risk, rows]);
  
  // Get available rows for current risk
  const availableRows = useMemo(() => {
    return getAllowedRows(risk);
  }, [risk]);
  
  // Current mode status
  const currentModeStatus = riskModes[risk] || { enabled: false, maxBet: 0 };
  
  // Validate current bet
  const betValidation = useMemo(() => {
    return validateBetAgainstPool(amount, risk, demoPoolBalance, reservedLiability);
  }, [amount, risk, demoPoolBalance, reservedLiability]);
  
  // Can play check (includes single ball lock)
  const canPlay = useMemo(() => {
    return (
      !isDropping && // Single ball lock
      currentModeStatus.enabled &&
      isRiskRowValid &&
      betValidation.valid &&
      amount > 0 &&
      amount <= demoBalance &&
      amount <= currentModeStatus.maxBet
    );
  }, [isDropping, currentModeStatus, isRiskRowValid, betValidation, amount, demoBalance]);
  
  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log("[DEMO POOL DEBUG]", {
        demoBalance,
        demoPoolBalance,
        reservedLiability,
        availableToPay: demoPoolBalance - reservedLiability,
        riskModes,
        currentRisk: risk,
        currentRows: rows,
        isRiskRowValid,
        betAmount: amount,
        betValidation,
        canPlay,
      });
    }
  }, [mounted, demoBalance, demoPoolBalance, reservedLiability, riskModes, risk, rows, isRiskRowValid, amount, betValidation, canPlay]);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play sound effect
  const playSound = useCallback((type: "peg" | "slot" | "win") => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === "peg") {
      oscillator.frequency.value = 800 + Math.random() * 400;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } else if (type === "slot") {
      oscillator.frequency.value = 300;
      oscillator.type = "triangle";
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } else if (type === "win") {
      oscillator.frequency.value = 523.25;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  }, [soundEnabled]);

  // Track when component is mounted + load from localStorage
  useEffect(() => {
    setMounted(true);
    
    const savedDemoBalance = localStorage.getItem("plinko_demo_balance");
    if (savedDemoBalance) {
      setDemoBalance(parseFloat(savedDemoBalance));
    }
    
    const savedDemoPool = localStorage.getItem("plinko_demo_pool");
    if (savedDemoPool) {
      setDemoPoolBalance(parseFloat(savedDemoPool));
    }
    
    const savedSound = localStorage.getItem("plinko_sound_enabled");
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }
    
    return () => setMounted(false);
  }, []);
  
  // Save demo balance to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("plinko_demo_balance", demoBalance.toString());
    }
  }, [demoBalance, mounted]);
  
  // Save demo pool to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("plinko_demo_pool", demoPoolBalance.toString());
    }
  }, [demoPoolBalance, mounted]);
  
  // Save sound preference
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("plinko_sound_enabled", soundEnabled.toString());
    }
  }, [soundEnabled, mounted]);
  
  // Reset demo (resets both balance AND pool)
  const resetDemo = () => {
    setDemoBalance(DEMO_START_BALANCE);
    setDemoPoolBalance(DEMO_POOL_START);
    setReservedLiability(0);
    setResults([]);
    console.log("[DEMO RESET] Balance and Pool reset to $5000");
  };
  
  // Auto-adjust rows when risk changes
  useEffect(() => {
    const minRows = getMinRows(risk);
    if (rows < minRows) {
      setRows(minRows);
      console.log(`[ROWS AUTO-ADJUST] ${risk} risk requires ${minRows}+ rows. Adjusted.`);
    }
  }, [risk, rows]);
  
  // Get verified multipliers from math library (96% RTP)
  const multipliers = useMemo(() => {
    const verified = getMultipliers(risk, rows);
    if (verified) {
      // Log RTP for this combination
      const rtp = computeRtp(rows, verified);
      console.log(`[RTP] ${risk} risk, ${rows} rows: ${rtp.toFixed(4)} (target: 0.9600)`);
      return verified;
    }
    // Fallback to low risk 12 rows if invalid combination
    console.warn(`[RTP WARNING] Invalid combination: ${risk} risk, ${rows} rows. Using fallback.`);
    return getMultipliers("low", 12) || [1.8, 1.5, 1.3, 1.1, 0.9, 0.7, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8];
  }, [risk, rows]);

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
      ctx.font = "bold 11px system-ui";
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
  }, [rows, multipliers]);

  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  // Force-resolve a ball using pre-computed outcome
  const forceResolveBall = useCallback((ball: Ball, reason: string) => {
    if (ball.resultRecorded || ball.forceResolved) return;
    
    console.log(`[DROP FORCE-RESOLVED] Ball ${ball.id} - ${reason}`);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const baseWidth = width * 0.85;
    const slotY = canvas.height - 55;
    const slotWidth = baseWidth / multipliers.length;
    const slotStartX = (width - baseWidth) / 2;
    
    // Use pre-computed outcome (DO NOT re-roll RNG)
    const slotIndex = ball.precomputedSlotIndex;
    const multiplier = ball.precomputedMultiplier;
    const payout = ball.betAmount * multiplier;
    const profit = payout - ball.betAmount;
    const maxPayout = ball.betAmount * getMaxMultiplier(risk);
    
    // Teleport ball to the slot
    ball.x = slotStartX + slotIndex * slotWidth + slotWidth / 2;
    ball.y = slotY + 10;
    ball.vx = 0;
    ball.vy = 0;
    ball.active = false;
    ball.slotBouncing = false;
    ball.landed = true;
    ball.landedTime = Date.now();
    ball.resultRecorded = true;
    ball.forceResolved = true;
    
    // ATOMIC PAYOUT FLOW
    setDemoPoolBalance((prev) => {
      const newPool = Math.round((prev - payout) * 100) / 100;
      console.log(`[DEMO POOL] Force-resolve payout: $${payout.toFixed(2)}, Pool: $${prev.toFixed(2)} -> $${newPool.toFixed(2)}`);
      return Math.max(0, newPool);
    });
    
    setDemoBalance((prev) => Math.round((prev + payout) * 100) / 100);
    setReservedLiability((prev) => Math.max(0, prev - maxPayout));
    
    if (multiplier >= 2) {
      playSound("win");
    }
    
    setResults((prev) => [
      { multiplier, amount: ball.betAmount, profit, time: new Date() },
      ...prev.slice(0, 9),
    ]);
  }, [multipliers, risk, playSound]);

  // Animation loop with realistic physics + stuck detection
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const baseWidth = width * 0.85;
    const slotY = height - 55;
    const slotBottom = slotY + 40;
    const now = Date.now();
    
    const gravity = 0.25;
    const friction = 0.99;
    const bounciness = 0.7;
    const slotBounciness = 0.5;
    
    ballsRef.current = ballsRef.current.map((ball) => {
      // Ball is done bouncing, fade out
      if (!ball.active && !ball.slotBouncing) {
        if (ball.landed) {
          ball.opacity = Math.max(0, ball.opacity - 0.05);
          // Cleanup complete when fully faded
          if (ball.opacity <= 0) {
            console.log(`[CLEANUP COMPLETE] Ball ${ball.id}`);
            setIsDropping(false);
          }
        }
        return ball;
      }
      
      // =========================================================
      // STUCK DETECTION - Check if ball hasn't moved
      // =========================================================
      if (ball.active && !ball.slotBouncing && !ball.forceResolved) {
        const moved = Math.abs(ball.y - ball.lastY) > STUCK_EPSILON;
        
        if (moved) {
          ball.lastY = ball.y;
          ball.lastMoveTime = now;
        } else {
          // Check if stuck for too long
          const stuckDuration = now - ball.lastMoveTime;
          if (stuckDuration > STUCK_THRESHOLD_MS) {
            console.log(`[STUCK DETECTED] Ball ${ball.id} stuck for ${stuckDuration}ms`);
            forceResolveBall(ball, `stuck for ${stuckDuration}ms`);
            return ball;
          }
        }
        
        // Check timeout
        const dropDuration = now - ball.spawnTime;
        if (dropDuration > DROP_TIMEOUT_MS) {
          console.log(`[TIMEOUT] Ball ${ball.id} exceeded ${DROP_TIMEOUT_MS}ms`);
          forceResolveBall(ball, `timeout after ${dropDuration}ms`);
          return ball;
        }
      }
      
      // Ball is bouncing in slot
      if (ball.slotBouncing) {
        ball.vy += gravity * 0.8;
        ball.vx *= 0.95;
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Bounce off slot bottom
        if (ball.y >= slotBottom - ball.radius) {
          ball.y = slotBottom - ball.radius;
          ball.vy = -Math.abs(ball.vy) * slotBounciness;
          ball.bounceCount++;
          playSound("slot");
          
          // Stop bouncing after 3-4 bounces
          if (ball.bounceCount >= 3 || Math.abs(ball.vy) < 1) {
            ball.slotBouncing = false;
            ball.active = false;
            ball.landed = true;
            ball.landedTime = Date.now();
            console.log(`[DROP RESOLVED] Ball ${ball.id} - normal landing`);
          }
        }
        
        // Keep ball within its slot
        const slotWidth = baseWidth / multipliers.length;
        const slotStartX = (width - baseWidth) / 2;
        const slotIndex = Math.floor((ball.x - slotStartX) / slotWidth);
        const clampedIndex = Math.max(0, Math.min(multipliers.length - 1, slotIndex));
        const slotLeft = slotStartX + clampedIndex * slotWidth + 4;
        const slotRight = slotLeft + slotWidth - 8;
        
        if (ball.x < slotLeft + ball.radius) {
          ball.x = slotLeft + ball.radius;
          ball.vx = Math.abs(ball.vx) * 0.5;
        }
        if (ball.x > slotRight - ball.radius) {
          ball.x = slotRight - ball.radius;
          ball.vx = -Math.abs(ball.vx) * 0.5;
        }
        
        return ball;
      }
      
      // Normal ball physics (falling through pegs)
      ball.vy += gravity;
      ball.vx *= friction;
      ball.x += ball.vx;
      ball.y += ball.vy;
      
      // Collision with pegs
      pegsRef.current.forEach((peg) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + peg.radius;
        
        if (dist < minDist) {
          peg.glow = 1;
          playSound("peg");
          
          const nx = dx / dist;
          const ny = dy / dist;
          
          const overlap = minDist - dist;
          ball.x += nx * overlap;
          ball.y += ny * overlap;
          
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * bounciness;
          ball.vy = (ball.vy - 2 * dot * ny) * bounciness;
          
          // Add randomness but ensure downward momentum
          ball.vx += (Math.random() - 0.5) * 1.5;
          ball.vy = Math.max(ball.vy, 0.5); // Ensure ball keeps falling
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
      
      // Ball enters slot - start bouncing animation
      if (ball.y >= slotY - ball.radius && !ball.slotBouncing && !ball.resultRecorded) {
        ball.slotBouncing = true;
        ball.bounceCount = 0;
        ball.vy = Math.abs(ball.vy) * 0.6;
        
        // Use the actual slot the ball landed in (may differ from pre-computed)
        const slotWidth = baseWidth / multipliers.length;
        const slotStartX = (width - baseWidth) / 2;
        const slotIndex = Math.floor((ball.x - slotStartX) / slotWidth);
        const clampedIndex = Math.max(0, Math.min(multipliers.length - 1, slotIndex));
        
        const multiplier = multipliers[clampedIndex];
        const payout = ball.betAmount * multiplier;
        const profit = payout - ball.betAmount;
        const maxPayout = ball.betAmount * getMaxMultiplier(risk);
        
        ball.resultRecorded = true;
        
        // ATOMIC PAYOUT FLOW
        setDemoPoolBalance((prev) => {
          const newPool = Math.round((prev - payout) * 100) / 100;
          console.log(`[DEMO POOL] Payout: $${payout.toFixed(2)}, Pool: $${prev.toFixed(2)} -> $${newPool.toFixed(2)}`);
          return Math.max(0, newPool);
        });
        
        setDemoBalance((prev) => Math.round((prev + payout) * 100) / 100);
        setReservedLiability((prev) => Math.max(0, prev - maxPayout));
        
        if (multiplier >= 2) {
          playSound("win");
        }
        
        setResults((prev) => [
          { multiplier, amount: ball.betAmount, profit, time: new Date() },
          ...prev.slice(0, 9),
        ]);
      }
      
      return ball;
    });
    
    ballsRef.current = ballsRef.current.filter(
      (ball) => ball.active || ball.slotBouncing || ball.opacity > 0
    );
    
    if (ballsRef.current.length === 0) {
      setIsPlaying(false);
      setIsDropping(false);
    }
    
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [multipliers, risk, draw, playSound, forceResolveBall]);

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

  const dropBall = useCallback(() => {
    if (!canPlay || isDropping) {
      console.log("[DROP BLOCKED] Already dropping or can't play");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set single ball lock IMMEDIATELY
    setIsDropping(true);
    
    const maxPayout = amount * getMaxMultiplier(risk);
    
    // Pre-compute outcome using RNG (used for force-resolve if needed)
    const precomputedSlotIndex = Math.floor(Math.random() * multipliers.length);
    const precomputedMultiplier = multipliers[precomputedSlotIndex];
    
    console.log(`[DROP STARTED] Ball ${nextBallId.current}, Amount: $${amount}, Risk: ${risk}`);
    console.log(`[PRECOMPUTED] Slot: ${precomputedSlotIndex}, Multiplier: ${precomputedMultiplier}x`);
    
    // ATOMIC BET FLOW:
    // 1. Reserve liability (max payout hold)
    // 2. Deduct bet from user balance
    // 3. Add bet to pool
    
    // Reserve liability
    setReservedLiability((prev) => prev + maxPayout);
    
    // Deduct from user balance
    setDemoBalance((prev) => Math.round((prev - amount) * 100) / 100);
    
    // Add to pool (bet goes into pool)
    setDemoPoolBalance((prev) => {
      const newPool = Math.round((prev + amount) * 100) / 100;
      console.log(`[DEMO POOL] Bet added: $${amount}, Pool: $${prev.toFixed(2)} -> $${newPool.toFixed(2)}`);
      return newPool;
    });
    
    setIsPlaying(true);
    
    const now = Date.now();
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
      bounceCount: 0,
      slotBouncing: false,
      resultRecorded: false,
      betAmount: amount,
      // Pre-computed outcome for force-resolve
      precomputedSlotIndex,
      precomputedMultiplier,
      // Stuck detection
      spawnTime: now,
      lastY: 20,
      lastMoveTime: now,
      forceResolved: false,
    };
    
    ballsRef.current.push(ball);
    
    // Clear any existing timeout
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
    }
    
    // Set failsafe timeout
    dropTimeoutRef.current = setTimeout(() => {
      const activeBall = ballsRef.current.find(b => b.active && !b.resultRecorded && !b.forceResolved);
      if (activeBall) {
        console.log(`[TIMEOUT FAILSAFE] Ball ${activeBall.id} force-resolving after ${DROP_TIMEOUT_MS}ms`);
        // The animate loop will handle the force-resolve via stuck detection
      }
    }, DROP_TIMEOUT_MS);
  }, [canPlay, isDropping, amount, risk, multipliers]);

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

  // Get play button text
  const getPlayButtonText = () => {
    if (isDropping) return "Dropping...";
    if (!currentModeStatus.enabled) return "Risk Mode Locked";
    if (!isRiskRowValid) return `Need ${getMinRows(risk)} rows`;
    if (amount <= 0) return "Enter Amount";
    if (amount > demoBalance) return "Insufficient Balance";
    if (!betValidation.valid) return "Bet Too High";
    return "Play";
  };

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
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4">
                  {/* Demo Mode Indicator */}
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-yellow-400">Demo Mode</span>
                      <span className="text-xs text-yellow-500/80">Not real funds</span>
                    </div>
                  </div>
                  
                  {/* Demo Pool Status */}
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-300">Demo Pool</span>
                      <span className="text-sm font-bold text-purple-400">
                        ${demoPoolBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-purple-300/60">
                      Available: ${(demoPoolBalance - reservedLiability).toFixed(2)}
                    </div>
                  </div>

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
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[color:var(--text-muted)]">
                        Amount
                      </label>
                      {currentModeStatus.enabled && (
                        <span className="text-xs text-[color:var(--text-subtle)]">
                          Max: ${currentModeStatus.maxBet.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={amount || ""}
                          onChange={(e) => setAmount(Number(e.target.value) || 0)}
                          placeholder="0.00"
                          min={MIN_BET}
                          max={Math.min(demoBalance, currentModeStatus.maxBet)}
                          className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-muted)]">
                          USD
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(Math.max(MIN_BET, Math.floor(amount / 2 * 100) / 100))}
                        className="border-[color:var(--border-soft)]"
                      >
                        ½
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(Math.min(amount * 2, demoBalance, currentModeStatus.maxBet))}
                        className="border-[color:var(--border-soft)]"
                      >
                        2x
                      </Button>
                    </div>
                    {!betValidation.valid && amount > 0 && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {betValidation.error}
                      </p>
                    )}
                  </div>

                  {/* Risk */}
                  <div className="mb-4">
                    <label className="block text-sm text-[color:var(--text-muted)] mb-2">
                      Risk
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-[color:var(--surface-2)] rounded-lg">
                      {(["low", "medium", "high"] as const).map((r) => {
                        const modeStatus = riskModes[r];
                        const isLocked = !modeStatus?.enabled;
                        const isActive = risk === r;
                        
                        return (
                          <button
                            key={r}
                            onClick={() => !isLocked && setRisk(r)}
                            disabled={isLocked}
                            className={`py-2 rounded-md text-sm font-medium transition relative ${
                              isActive
                                ? "bg-[color:var(--surface)] text-[color:var(--text-strong)] shadow"
                                : isLocked
                                ? "text-[color:var(--text-subtle)] opacity-50 cursor-not-allowed"
                                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                            }`}
                          >
                            {isLocked && <Lock className="h-3 w-3 absolute top-1 right-1" />}
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                    {!riskModes[risk]?.enabled && (
                      <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {riskModes[risk]?.reason || "Mode locked until pool grows"}
                      </p>
                    )}
                  </div>

                  {/* Rows */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[color:var(--text-muted)]">
                        Rows
                      </label>
                      <span className="text-xs text-[color:var(--text-subtle)] flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Min: {getMinRows(risk)} for {risk} risk
                      </span>
                    </div>
                    <select
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] rounded-lg text-[color:var(--text-strong)]"
                    >
                      {ALL_ROW_OPTIONS.map((r) => {
                        const isAllowed = availableRows.includes(r);
                        return (
                          <option key={r} value={r} disabled={!isAllowed}>
                            {r} {!isAllowed ? "(locked)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {!isRiskRowValid && (
                      <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {risk.charAt(0).toUpperCase() + risk.slice(1)} risk requires {getMinRows(risk)}+ rows
                      </p>
                    )}
                  </div>

                  {/* Play Button */}
                  <Button
                    onClick={dropBall}
                    disabled={!canPlay || isDropping}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDropping ? (
                      <RotateCcw className="h-5 w-5 mr-2 animate-spin" />
                    ) : !canPlay ? (
                      <Lock className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {getPlayButtonText()}
                  </Button>

                  {/* Balance */}
                  <div className="mt-4 p-3 bg-[color:var(--surface-2)] rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[color:var(--text-muted)]">Demo Balance</span>
                      <span className="font-bold text-yellow-400">
                        ${demoBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Reset Demo Button */}
                  <Button
                    onClick={resetDemo}
                    variant="outline"
                    className="w-full mt-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Demo ($5,000)
                  </Button>
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
