/** Next's internal URL can differ from the public Host behind a proxy. */
export function publicRequestOrigin(request: Request): string {
  const internal = new URL(request.url);
  const host = request.headers.get("host");
  if (host) {
    try {
      const protocol = process.env.NODE_ENV === "production" ? "https:" : internal.protocol;
      const external = new URL(`${protocol}//${host}`);
      if (!external.username && !external.password && external.host.toLowerCase() === host.toLowerCase()) return external.origin;
    } catch { /* Fall through to the normalized request URL. */ }
  }
  return internal.origin;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === publicRequestOrigin(request);
}
