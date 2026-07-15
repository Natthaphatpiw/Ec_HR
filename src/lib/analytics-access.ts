import "server-only";

import {
  getDefaultOrganizationId,
  getEmployeeByLineId,
  getOrganizationById,
  isDemoMode,
  listTeamForSupervisor,
} from "@/lib/data";
import { getDashboardOrganizationId } from "@/lib/dashboard-auth-config";
import { getDashboardOwnerSession } from "@/lib/dashboard-session";
import { shouldUseDemoWorkforceSource } from "@/lib/demo-workforce";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import type { Employee } from "@/lib/types";

export interface AnalyticsAccess {
  ok: true;
  orgId: string;
  employee: Employee | null;
  employeeIds?: string[];
  scope: "organization" | "team";
  readOnlyDemo: boolean;
}

export interface AnalyticsAccessDenied {
  ok: false;
  reason: "not_authenticated" | "inactive" | "forbidden" | "organization_not_found";
}

export async function resolveAnalyticsAccess(): Promise<AnalyticsAccess | AnalyticsAccessDenied> {
  const dashboardSession = await getDashboardOwnerSession();
  if (dashboardSession) {
    const orgId = getDashboardOrganizationId() ?? getDefaultOrganizationId();
    if (shouldUseDemoWorkforceSource(orgId)) {
      return {
        ok: true,
        orgId,
        employee: null,
        scope: "organization",
        readOnlyDemo: true,
      };
    }
    const organization = await getOrganizationById(orgId);
    if (!organization) return { ok: false, reason: "organization_not_found" };
    return {
      ok: true,
      orgId: organization.id,
      employee: null,
      scope: "organization",
      readOnlyDemo: false,
    };
  }

  const lineUserId = await getLiffUserIdFromCookie();
  if (lineUserId) {
    const employee = await getEmployeeByLineId(lineUserId);
    if (!employee) return { ok: false, reason: "not_authenticated" };
    if (employee.account_status !== "active") return { ok: false, reason: "inactive" };
    const organization = await getOrganizationById(employee.org_id);
    if (!organization) return { ok: false, reason: "organization_not_found" };
    if (
      organization.owner_employee_id !== employee.id &&
      !employee.is_supervisor &&
      employee.role !== "supervisor" &&
      employee.role !== "hr" &&
      employee.role !== "executive"
    ) {
      return { ok: false, reason: "forbidden" };
    }

    if (
      employee.role === "hr" ||
      employee.role === "executive" ||
      organization.owner_employee_id === employee.id
    ) {
      return {
        ok: true,
        orgId: employee.org_id,
        employee,
        scope: "organization",
        readOnlyDemo: false,
      };
    }

    const team = await listTeamForSupervisor(employee.id);
    return {
      ok: true,
      orgId: employee.org_id,
      employee,
      employeeIds: team.map((member) => member.id),
      scope: "team",
      readOnlyDemo: false,
    };
  }

  if (isDemoMode()) {
    return {
      ok: true,
      orgId: getDefaultOrganizationId(),
      employee: null,
      scope: "organization",
      readOnlyDemo: false,
    };
  }

  // Explicit sales-demo escape hatch for the existing unauthenticated web
  // dashboard. It is opt-in and read-only; production tenants should use a
  // verified admin identity before enabling exports or mutations.
  if (process.env.DASHBOARD_ANALYTICS_DEMO === "true" && process.env.DASHBOARD_ORG_ID) {
    const organization = await getOrganizationById(process.env.DASHBOARD_ORG_ID);
    if (!organization) return { ok: false, reason: "organization_not_found" };
    return {
      ok: true,
      orgId: organization.id,
      employee: null,
      scope: "organization",
      readOnlyDemo: true,
    };
  }

  return { ok: false, reason: "not_authenticated" };
}
