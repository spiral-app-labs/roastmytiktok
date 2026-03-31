/**
 * Admin user detection for debug mode.
 * Server-side only — never import this in client components.
 */

const ADMIN_EMAILS = [
  'ethan@ethantalreja.com',
  'ethan@spiralapplabs.com',
]

/**
 * Check if a given email belongs to an admin user.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

/**
 * Check if the authenticated Supabase user is an admin.
 * Pass the user object from supabase.auth.getUser().
 */
export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email)
}
