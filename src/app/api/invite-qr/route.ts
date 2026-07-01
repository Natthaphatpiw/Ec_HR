import type { NextRequest } from "next/server";
import QRCode from "qrcode";

import { buildInviteUrl } from "@/lib/invite";

// qrcode needs the Node runtime (Buffer / zlib), not the Edge runtime.
export const runtime = "nodejs";

/**
 * GET /api/invite-qr?token=<token>
 * Renders a PNG QR code that encodes the employee invite deep link for the
 * given org-invite token. Self-hosted — the invite URL is never sent to a
 * third-party QR service.
 *
 * The token only encodes a public deep link; the invite is fully validated
 * server-side at redemption (registerEmployee → getOrgInviteByToken), so this
 * route stays stateless (no DB round-trip per image, and works in demo mode
 * where in-memory invites aren't shared across route module instances).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return new Response("missing token", { status: 400 });

  const png = await QRCode.toBuffer(buildInviteUrl(token), {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0F172AFF", light: "#FFFFFFFF" },
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
