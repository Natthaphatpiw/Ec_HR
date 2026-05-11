import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "liff_user_id";

export async function getLiffUserIdFromCookie(): Promise<string | undefined> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
