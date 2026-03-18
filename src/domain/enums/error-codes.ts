/**
 * Business Error Codes Convention: {DOMAIN}{HTTP_STATUS}{UNIQUE_SEQ}
 *
 * Domains:
 *   AUTH   - Authentication & Authorization
 *   TEAM   - Team Management
 *   SOCIAL - Social Accounts
 *   POST   - Post Management
 *   MEDIA  - Media Assets
 *   INBOX  - Engagement & Inbox
 *   LOG    - Activity Logs
 *   SYS    - System / Generic
 */

// ─── Auth Module ────────────────────────────────────────────
export const AUTH400001 = 'AUTH400001'; // Validation error (invalid input)
export const AUTH400002 = 'AUTH400002'; // Signup failed
export const AUTH400003 = 'AUTH400003'; // Logout failed
export const AUTH401001 = 'AUTH401001'; // Invalid credentials (login)
export const AUTH401002 = 'AUTH401002'; // Missing or invalid authorization header
export const AUTH401003 = 'AUTH401003'; // Invalid or expired token
export const AUTH401004 = 'AUTH401004'; // Refresh token failed
export const AUTH400004 = 'AUTH400004'; // Update profile failed
export const AUTH400005 = 'AUTH400005'; // Invalid password signature
export const AUTH403001 = 'AUTH403001'; // Forbidden (insufficient role)

// ─── Social Accounts Module ─────────────────────────────────
export const SOCIAL400001 = 'SOCIAL400001'; // Validation error (invalid input)
export const SOCIAL400002 = 'SOCIAL400002'; // OAuth connect failed
export const SOCIAL400003 = 'SOCIAL400003'; // OAuth callback failed (token exchange)
export const SOCIAL400004 = 'SOCIAL400004'; // Token refresh failed
export const SOCIAL400005 = 'SOCIAL400005'; // Unsupported platform
export const SOCIAL400006 = 'SOCIAL400006'; // Token decryption failed
export const SOCIAL404001 = 'SOCIAL404001'; // Social account not found

// ─── Draft Posts Module ─────────────────────────────────────
export const POST400001 = 'POST400001'; // Validation error (invalid input)
export const POST400002 = 'POST400002'; // Publish failed
export const POST400003 = 'POST400003'; // No media to publish
export const POST400004 = 'POST400004'; // Account not connected or expired
export const POST404001 = 'POST404001'; // Draft not found

// ─── System / Generic ───────────────────────────────────────
export const SYS400001 = 'SYS400001'; // Generic validation error
export const SYS404001 = 'SYS404001'; // Resource not found
export const SYS500001 = 'SYS500001'; // Internal server error
