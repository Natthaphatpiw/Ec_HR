const encoder = new TextEncoder();

export type SessionPurpose = "dashboard" | "liff";
export type SessionRole = "owner" | "liff";

export interface SignedSessionPayload {
  sub: string;
  purpose: SessionPurpose;
  role: SessionRole;
  iat: number;
  exp: number;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function createSignedSession(
  input: Omit<SignedSessionPayload, "iat" | "exp"> & { expiresInSeconds: number },
  secret: string,
): Promise<string> {
  if (!secret) throw new Error("A session signing secret is required");

  const now = Math.floor(Date.now() / 1000);
  const payload: SignedSessionPayload = {
    sub: input.sub,
    purpose: input.purpose,
    role: input.role,
    iat: now,
    exp: now + input.expiresInSeconds,
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySignedSession(
  token: string | undefined,
  secret: string,
  expectedPurpose: SessionPurpose,
): Promise<SignedSessionPayload | null> {
  if (!token || !secret || token.length > 4096) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;
  const signature = decodeBase64Url(encodedSignature);
  const payloadBytes = decodeBase64Url(encodedPayload);
  if (!signature || !payloadBytes) return null;

  try {
    const key = await importHmacKey(secret, ["verify"]);
    const signatureBuffer = Uint8Array.from(signature).buffer;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SignedSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      payload.sub.length > 255 ||
      payload.purpose !== expectedPurpose ||
      (payload.role !== "owner" && payload.role !== "liff") ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      (payload.iat as number) > now + 60 ||
      (payload.exp as number) <= now
    ) {
      return null;
    }

    return payload as SignedSessionPayload;
  } catch {
    return null;
  }
}
