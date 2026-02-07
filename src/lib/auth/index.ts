/**
 * ProvePicks Authentication System
 * =================================
 * 
 * This module provides a unified authentication interface for ProvePicks.
 * 
 * SUPPORTED AUTH PROVIDERS:
 * -------------------------
 * 
 * 1. PHANTOM WALLET (Solana)
 *    - Native Solana wallet authentication
 *    - Flow: Connect → Sign nonce message → Server verifies signature → Session created
 *    - Uses: tweetnacl for ed25519 signature verification
 *    - Files: /api/auth/phantom/nonce, /api/auth/phantom/verify
 * 
 * 2. METAMASK (EVM - Ethereum)
 *    - Popular EVM wallet authentication
 *    - Flow: Connect → Sign SIWE message → Server verifies signature → Session created
 *    - Uses: ethers.js for secp256k1 signature recovery
 *    - Files: /api/auth/evm/nonce, /api/auth/evm/verify
 * 
 * 3. COINBASE WALLET (EVM - Ethereum)
 *    - Coinbase's EVM wallet
 *    - Same flow as MetaMask (EVM standard)
 *    - Files: /api/auth/evm/nonce, /api/auth/evm/verify
 * 
 * 4. GOOGLE OAUTH
 *    - Standard OAuth 2.0 flow via Supabase Auth
 *    - Flow: Redirect to Google → User authorizes → Callback → Session created
 *    - Uses: Supabase built-in Google provider
 *    - Setup: Configure in Supabase Dashboard > Auth > Providers > Google
 *    - Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *    - Files: /api/auth/google/callback (handled by Supabase)
 * 
 * 5. TIKTOK OAUTH
 *    - Custom OAuth 2.0 implementation (Supabase doesn't support natively)
 *    - Flow: Redirect to TikTok → User authorizes → Callback → Session created
 *    - Uses: TikTok Login Kit API
 *    - Setup: Create app at https://developers.tiktok.com
 *    - Scopes: user.info.basic
 *    - Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI
 *    - Files: /api/auth/tiktok/authorize, /api/auth/tiktok/callback
 * 
 * SESSION MANAGEMENT:
 * -------------------
 * - Wallet auth: Custom session cookie (pp_wallet_session)
 * - OAuth (Google/TikTok): Supabase Auth session
 * - Session duration: 7 days
 * 
 * SECURITY NOTES:
 * ---------------
 * - Nonces are single-use and expire after 5 minutes
 * - Wallet signatures are verified server-side
 * - OAuth state parameters prevent CSRF attacks
 * - All sessions use HTTP-only cookies in production
 */

export type AuthProvider = "phantom" | "metamask" | "coinbase" | "google" | "tiktok";

export interface AuthSession {
  userId: string;
  provider: AuthProvider;
  walletAddress?: string;
  email?: string;
  username?: string;
  displayName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Get the authentication provider display name
 */
export function getProviderDisplayName(provider: AuthProvider): string {
  switch (provider) {
    case "phantom":
      return "Phantom";
    case "metamask":
      return "MetaMask";
    case "coinbase":
      return "Coinbase Wallet";
    case "google":
      return "Google";
    case "tiktok":
      return "TikTok";
  }
}

/**
 * Check if provider is a wallet-based auth
 */
export function isWalletProvider(provider: AuthProvider): boolean {
  return ["phantom", "metamask", "coinbase"].includes(provider);
}

/**
 * Check if provider is an OAuth-based auth
 */
export function isOAuthProvider(provider: AuthProvider): boolean {
  return ["google", "tiktok"].includes(provider);
}

/**
 * Get the chain type for wallet providers
 */
export function getWalletChain(provider: AuthProvider): "solana" | "evm" | null {
  switch (provider) {
    case "phantom":
      return "solana";
    case "metamask":
    case "coinbase":
      return "evm";
    default:
      return null;
  }
}
