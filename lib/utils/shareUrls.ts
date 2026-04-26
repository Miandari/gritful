const APP_URL = 'https://www.gritful.app';

export function buildPublicShareUrl(challengeId: string, baseUrl?: string): string {
  return `${baseUrl || APP_URL}/challenges/${challengeId}/join?ref=share`;
}

export function buildInviteShareUrl(token: string, baseUrl?: string): string {
  return `${baseUrl || APP_URL}/invite/${token}?ref=share`;
}

export function buildShareText(challengeName: string, durationDays: number | null): string {
  if (durationDays) {
    return `Join me in "${challengeName}" -- a ${durationDays}-day challenge on Gritful`;
  }
  return `Join me in "${challengeName}" on Gritful`;
}

/**
 * Validate redirect is a safe relative path.
 * Prevents open redirect via protocol-relative URLs (//evil.com)
 * and backslash normalization bypass (/\evil.com).
 */
export function getSafeRedirect(param: string | null): string {
  if (!param || !param.startsWith('/')) return '/dashboard';
  if (param.charAt(1) === '/' || param.charAt(1) === '\\') return '/dashboard';
  return param;
}
