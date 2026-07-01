/**
 * Invite-link helpers shared by server (actions, API route) and client
 * (register form, invite panel). Kept dependency-free so it can be imported
 * from both environments.
 *
 * The employee-facing invite URL is a LIFF deep link that opens the register
 * page inside LINE with the token in the query string:
 *   https://liff.line.me/<LIFF_ID_REGISTER>?invite=<token>
 *
 * The QR image is served by GET /api/invite-qr?token=<token>, which encodes
 * exactly this URL. Scanning it (LINE QR reader or phone camera) opens the
 * LIFF app; tapping the link in a LINE chat does the same.
 */

/** Query-string key the register form reads the token from. */
export const INVITE_PARAM = "invite";

/**
 * Build the shareable employee invite URL for a token. Prefers the LIFF deep
 * link (so it opens inside LINE); falls back to a plain web URL when the
 * register LIFF id is not configured (e.g. local demo without LIFF ids).
 */
export function buildInviteUrl(token: string): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_REGISTER;
  const enc = encodeURIComponent(token);
  if (liffId) return `https://liff.line.me/${liffId}?${INVITE_PARAM}=${enc}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${appUrl}/liff/register?${INVITE_PARAM}=${enc}`;
}

/** Relative path to the QR PNG for a token (usable directly as an <img src>). */
export function buildInviteQrPath(token: string): string {
  return `/api/invite-qr?token=${encodeURIComponent(token)}`;
}
