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

// ─── System / Generic ───────────────────────────────────────
export const SYS400001 = 'SYS400001'; // Generic validation error
export const SYS404001 = 'SYS404001'; // Resource not found
export const SYS500001 = 'SYS500001'; // Internal server error
