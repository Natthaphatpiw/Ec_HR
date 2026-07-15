export const DASHBOARD_SESSION_COOKIE = "ec_aihr_dashboard_session";
export const DASHBOARD_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type DashboardAuthState =
  | { status: "disabled" }
  | { status: "misconfigured" }
  | {
      status: "enabled";
      username: string;
      password: string;
      secret: string;
    };

export function getDashboardAuthState(): DashboardAuthState {
  const username = process.env.DASHBOARD_AUTH_USERNAME?.trim() ?? "";
  const password = process.env.DASHBOARD_AUTH_PASSWORD ?? "";
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const hasAnyAuthSetting = Boolean(username || password || secret);

  // Local development can opt out for backwards compatibility. Production
  // fails closed so a missing Vercel variable never publishes the HR console.
  if (!hasAnyAuthSetting) {
    return process.env.NODE_ENV === "production"
      ? { status: "misconfigured" }
      : { status: "disabled" };
  }
  if (!username || !password || secret.length < 32) return { status: "misconfigured" };

  return { status: "enabled", username, password, secret };
}

export function getDashboardOrganizationId(): string | undefined {
  return process.env.DASHBOARD_ORG_ID?.trim() || undefined;
}
