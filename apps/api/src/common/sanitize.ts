/**
 * Input sanitization utilities.
 * Defense-in-depth: even though TypeORM uses parameterized queries,
 * we still sanitize to prevent stored XSS and LIKE injection.
 */

/**
 * Strip HTML tags to prevent stored XSS.
 * Replaces < and > with their HTML entities.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape SQL LIKE wildcard characters (% and _).
 * Use this before passing user input into ILIKE/LIKE queries.
 */
export function escapeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Full sanitization: strip HTML + trim whitespace.
 * Apply to all user-provided text fields before persisting.
 */
export function sanitizeText(input: string): string {
  return stripHtml(input).trim();
}
