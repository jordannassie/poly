/**
 * Provably Fair RNG System for Plinko
 * 
 * This system allows users to verify that game outcomes are fair and not manipulated.
 * 
 * How it works:
 * 1. Server generates a secret seed and shows its SHA-256 hash to the user BEFORE play
 * 2. User provides (or system generates) a client seed
 * 3. Each play increments a nonce
 * 4. Outcome is computed as: HMAC-SHA256(serverSeed, clientSeed:nonce)
 * 5. After play (or after session ends), server reveals the serverSeed
 * 6. User can verify: hash(revealedServerSeed) === previouslyShownHash
 * 7. User can recompute outcome using the revealed seed
 */

import crypto from "crypto";

/**
 * Generate a cryptographically secure random seed
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a client seed (used when user doesn't provide one)
 */
export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Hash a seed using SHA-256
 */
export function hashSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

/**
 * Compute the game outcome using HMAC-SHA256
 * 
 * @param serverSeed - The secret server seed
 * @param clientSeed - The user's client seed
 * @param nonce - The play number for this session
 * @returns A hex string representing the outcome
 */
export function computeOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  const message = `${clientSeed}:${nonce}`;
  return crypto.createHmac("sha256", serverSeed).update(message).digest("hex");
}

/**
 * Convert a hex outcome to a uniform float in [0, 1)
 * Uses the first 8 hex characters (32 bits)
 */
export function outcomeToFloat(outcomeHex: string): number {
  // Take first 8 hex chars = 32 bits
  const hexSlice = outcomeHex.slice(0, 8);
  const intValue = parseInt(hexSlice, 16);
  // Divide by max 32-bit unsigned int to get [0, 1)
  return intValue / 0x100000000;
}

/**
 * Compute a deterministic slot from seeds and nonce
 */
export function computeSlot(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  getSlotFromRandom: (random: number) => number
): { slot: number; outcomeHex: string; randomFloat: number } {
  const outcomeHex = computeOutcome(serverSeed, clientSeed, nonce);
  const randomFloat = outcomeToFloat(outcomeHex);
  const slot = getSlotFromRandom(randomFloat);
  
  return { slot, outcomeHex, randomFloat };
}

/**
 * Verify an outcome matches the expected values
 * Used by clients to verify fairness after seed reveal
 */
export function verifyOutcome(
  revealedServerSeed: string,
  expectedHash: string,
  clientSeed: string,
  nonce: number,
  expectedSlot: number,
  getSlotFromRandom: (random: number) => number
): { valid: boolean; hashMatches: boolean; slotMatches: boolean; computedSlot: number } {
  // Verify hash matches
  const computedHash = hashSeed(revealedServerSeed);
  const hashMatches = computedHash === expectedHash;
  
  // Recompute outcome
  const { slot: computedSlot } = computeSlot(
    revealedServerSeed,
    clientSeed,
    nonce,
    getSlotFromRandom
  );
  const slotMatches = computedSlot === expectedSlot;
  
  return {
    valid: hashMatches && slotMatches,
    hashMatches,
    slotMatches,
    computedSlot,
  };
}

/**
 * Session management types
 */
export interface GameSession {
  id: string;
  userId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealed: boolean;
  createdAt: Date;
  revealedAt?: Date;
}

/**
 * Create a new game session
 */
export function createSession(userId: string, clientSeed?: string): Omit<GameSession, "id" | "createdAt"> {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashSeed(serverSeed);
  const finalClientSeed = clientSeed || generateClientSeed();
  
  return {
    userId,
    serverSeed,
    serverSeedHash,
    clientSeed: finalClientSeed,
    nonce: 0,
    revealed: false,
  };
}
