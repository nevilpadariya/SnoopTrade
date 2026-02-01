/**
 * Returns Logo.dev URL for a ticker when REACT_APP_LOGO_DEV_TOKEN is set.
 * Otherwise returns null (caller should show fallback, e.g. ticker initial).
 */
export function getCompanyLogoUrl(ticker: string): string | null {
  const token = process.env.REACT_APP_LOGO_DEV_TOKEN;
  if (!token || !ticker) return null;
  return `https://img.logo.dev/ticker/${encodeURIComponent(ticker.toUpperCase())}?token=${encodeURIComponent(token)}`;
}
