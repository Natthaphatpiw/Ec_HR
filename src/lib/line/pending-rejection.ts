import type { ActionTokenKind } from "../types";

interface PendingRejection {
  userId: string;
  kind: ActionTokenKind;
  requestId: string;
  expiresAt: number;
}

// In-memory FSM keyed by LINE userId. Demo only; in production use a TTL store
// like Redis (or a `pending_rejections` table) so it survives restarts.
const STORE = new Map<string, PendingRejection>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes to type the reason

export function setPendingRejection(userId: string, kind: ActionTokenKind, requestId: string) {
  STORE.set(userId, {
    userId,
    kind,
    requestId,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function takePendingRejection(userId: string): { kind: ActionTokenKind; requestId: string } | null {
  const p = STORE.get(userId);
  if (!p) return null;
  STORE.delete(userId);
  if (p.expiresAt < Date.now()) return null;
  return { kind: p.kind, requestId: p.requestId };
}

export function hasPendingRejection(userId: string): boolean {
  const p = STORE.get(userId);
  if (!p) return false;
  if (p.expiresAt < Date.now()) {
    STORE.delete(userId);
    return false;
  }
  return true;
}
