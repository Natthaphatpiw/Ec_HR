import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { TrialBlockedView } from "@/components/liff/trial-gate";
import { getOrgTrialStatus, getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import type { Employee } from "@/lib/types";

interface GuardOk {
  ok: true;
  lineUserId: string;
  employee: Employee;
}
interface GuardBlocked {
  ok: false;
  view: React.ReactNode;
}

/**
 * Centralized server-side gate for every LIFF page. Returns either the
 * authenticated employee (when allowed) or a JSX view to render in place of
 * the page body (when blocked).
 *
 * Order of checks: LINE login → registration active → tenant trial valid.
 */
export async function guardLiffPage(opts: {
  title?: string;
  liffId?: string;
}): Promise<GuardOk | GuardBlocked> {
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return {
      ok: false,
      view: (
        <>
          <LiffHeader title={opts.title} />
          <main className="px-4 pb-6 pt-3">
            <LiffInit liffId={opts.liffId} />
          </main>
        </>
      ),
    };
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return {
      ok: false,
      view: (
        <>
          <LiffHeader title={opts.title} />
          <main className="px-4 pb-6 pt-3">
            <NeedsRegistration status={registration.state} />
          </main>
        </>
      ),
    };
  }
  const trial = await getOrgTrialStatus(registration.employee.org_id);
  if (!trial.ok) {
    return {
      ok: false,
      view: (
        <>
          <LiffHeader title={opts.title} />
          <main className="px-4 pb-6 pt-3">
            <TrialBlockedView trial={trial} />
          </main>
        </>
      ),
    };
  }
  return { ok: true, lineUserId, employee: registration.employee };
}
