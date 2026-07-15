import "server-only";

import type { AnalyticsAccess } from "@/lib/analytics-access";
import { getWorkforceAnalytics, type WorkforceAnalytics } from "@/lib/analytics";
import {
  DEMO_WORKFORCE_SOURCE_ID,
  buildDemoWorkforceAnalytics,
  getDemoWorkforceDailyRoster,
  getDemoWorkforceDates,
  getDemoWorkforceEmployeeStats,
  loadDemoWorkforceDataset,
  shouldUseDemoWorkforceSource,
} from "@/lib/demo-workforce";
import {
  enumerateDates,
  getWorkforceAssistantClock,
  resolveRequestedDateWindow,
  type WorkforceAssistantClock,
} from "./dates";

export interface WorkforceAssistantContext {
  sourceId: string;
  clock: WorkforceAssistantClock;
  access: {
    scope: AnalyticsAccess["scope"];
    organizationId: string;
    requestingEmployeeCode: string | null;
  };
  resolvedPeriod: ReturnType<typeof resolveRequestedDateWindow>;
  organization: {
    id: string;
    name: string;
    timezone: string;
  };
  overview: WorkforceAnalytics["summary"];
  requestedAttendanceSummary: {
    scheduled: number;
    present: number;
    onTime: number;
    late: number;
    absent: number;
    onLeave: number;
    attendanceRate: number;
    punctualityRate: number;
  };
  availableDataPeriod: {
    startDate: string;
    endDate: string;
    asOfDate: string;
  };
  dailyAttendance: WorkforceAnalytics["dailyAttendance"];
  departments: WorkforceAnalytics["departments"];
  payrollTrend: WorkforceAnalytics["payrollTrend"];
  leaveByType: WorkforceAnalytics["leaveByType"];
  observedEmployeeAttendance: Array<{
    employeeCode: string;
    name: string;
    department: string;
    scheduledDays: number;
    recordedWorkdays: number;
    leaveDays: number;
    absentDays: number;
    lateArrivals: number;
    earlyDepartures: number;
    averageCheckIn: string | null;
    averageCheckOut: string | null;
    attendanceRate: number;
    punctualityRate: number;
  }>;
  requestedDailyRoster: Array<Record<string, string | number | null>>;
  dataQuality: WorkforceAnalytics["dataQuality"];
  interpretationRules: string[];
}

function liveObservedAttendance(analytics: WorkforceAnalytics) {
  return analytics.employeeAttendance.map((row) => ({
    employeeCode: row.employeeCode,
    name: row.name,
    department: row.department,
    scheduledDays: row.scheduledDays,
    recordedWorkdays: Math.max(0, row.scheduledDays - row.absentDays),
    leaveDays: row.approvedLeaveDays,
    absentDays: row.absentDays,
    lateArrivals: row.lateDays,
    earlyDepartures: 0,
    averageCheckIn: null,
    averageCheckOut: null,
    attendanceRate:
      row.scheduledDays > 0
        ? Math.round(((row.scheduledDays - row.absentDays) / row.scheduledDays) * 1000) / 10
        : 0,
    punctualityRate:
      row.scheduledDays - row.absentDays > 0
        ? Math.round(
            ((row.scheduledDays - row.absentDays - row.lateDays) /
              (row.scheduledDays - row.absentDays)) *
              1000,
          ) / 10
        : 0,
  }));
}

function liveRequestedRoster(
  analytics: WorkforceAnalytics,
  startDate: string,
  endDate: string,
): Array<Record<string, string | number | null>> {
  const employeeById = new Map(
    analytics.raw.employees.map((employee) => [
      employee.id,
      {
        employeeCode: employee.employee_code ?? employee.id.slice(0, 8),
        name: employee.name_th ?? employee.name_en ?? employee.employee_code ?? "ไม่ระบุชื่อ",
        department: employee.department ?? "ไม่ระบุแผนก",
      },
    ]),
  );

  return analytics.raw.attendance
    .filter((row) => {
      const date = row.timestamp.slice(0, 10);
      return date >= startDate && date <= endDate;
    })
    .slice(0, 500)
    .map((row) => ({
      date: row.timestamp.slice(0, 10),
      time: row.timestamp.slice(11, 16),
      type: row.type,
      status: row.status,
      employeeCode: employeeById.get(row.employee_id)?.employeeCode ?? row.employee_id.slice(0, 8),
      name: employeeById.get(row.employee_id)?.name ?? "ไม่ระบุชื่อ",
      department: employeeById.get(row.employee_id)?.department ?? "ไม่ระบุแผนก",
      geofenceResult: row.geofence_result,
    }));
}

export async function buildWorkforceAssistantContext(
  access: AnalyticsAccess,
  message: string,
): Promise<WorkforceAssistantContext> {
  const useJsonSource = shouldUseDemoWorkforceSource(access.orgId);
  const demoDataset = useJsonSource ? loadDemoWorkforceDataset() : null;
  const clock = getWorkforceAssistantClock(demoDataset?.period.endDate);
  const resolvedPeriod = resolveRequestedDateWindow(
    message,
    clock.currentDate,
  );
  const requestedDays = Math.min(
    180,
    Math.max(7, enumerateDates(resolvedPeriod.startDate, resolvedPeriod.endDate, 181).length),
  );
  const analytics = useJsonSource
    ? buildDemoWorkforceAnalytics(requestedDays, {
        orgId: access.orgId,
        scope: access.scope,
        startDate: resolvedPeriod.startDate,
        endDate: resolvedPeriod.endDate,
      })
    : await getWorkforceAnalytics({
        orgId: access.orgId,
        startDate: resolvedPeriod.startDate,
        endDate: resolvedPeriod.endDate,
        employeeIds: access.employeeIds,
        scope: access.scope,
      });

  if (useJsonSource) {
    const dataset = demoDataset ?? loadDemoWorkforceDataset();
    const availableDates = new Set(getDemoWorkforceDates());
    const requestedDailyRoster = enumerateDates(
      resolvedPeriod.startDate,
      resolvedPeriod.endDate,
      181,
    )
      .filter((date) => availableDates.has(date))
      .flatMap((date) =>
        getDemoWorkforceDailyRoster(date).map((row) => ({
          date: row.date,
          employeeCode: row.employeeCode,
          name: row.nameTh,
          department: row.department,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          dayStatus: row.dayStatus,
          arrivalStatus: row.arrivalStatus,
          departureStatus: row.departureStatus,
          geofenceResult: row.geofenceResult,
        })),
      );
    const observedEmployeeAttendance = getDemoWorkforceEmployeeStats({
      startDate: resolvedPeriod.startDate,
      endDate: resolvedPeriod.endDate,
    }).map((row) => ({
      employeeCode: row.employeeCode,
      name: row.nameTh,
      department: row.department,
      scheduledDays: row.scheduledDays,
      recordedWorkdays: row.recordedWorkdays,
      leaveDays: row.leaveDays,
      absentDays: row.absentDays,
      lateArrivals: row.lateArrivals,
      earlyDepartures: row.earlyDepartures,
      averageCheckIn: row.averageCheckIn,
      averageCheckOut: row.averageCheckOut,
      attendanceRate: row.attendanceRate,
      punctualityRate: row.punctualityRate,
    }));
    const periodRows = requestedDailyRoster;
    const scheduled = periodRows.filter((row) => row.dayStatus !== "leave").length;
    const present = periodRows.filter((row) => row.dayStatus === "workday").length;
    const late = periodRows.filter(
      (row) => row.dayStatus === "workday" && row.arrivalStatus === "late",
    ).length;
    const onLeave = periodRows.filter((row) => row.dayStatus === "leave").length;
    const absent = periodRows.filter((row) => row.dayStatus === "absent").length;

    return {
      sourceId: DEMO_WORKFORCE_SOURCE_ID,
      clock,
      access: {
        scope: access.scope,
        organizationId: access.orgId,
        requestingEmployeeCode: access.employee?.employee_code ?? null,
      },
      resolvedPeriod,
      organization: {
        id: access.orgId,
        name: dataset.organization.businessName,
        timezone: dataset.organization.timezone,
      },
      overview: analytics.summary,
      requestedAttendanceSummary: {
        scheduled,
        present,
        onTime: Math.max(0, present - late),
        late,
        absent,
        onLeave,
        attendanceRate: scheduled > 0 ? Math.round((present / scheduled) * 1000) / 10 : 0,
        punctualityRate: present > 0 ? Math.round(((present - late) / present) * 1000) / 10 : 0,
      },
      availableDataPeriod: {
        startDate: dataset.period.startDate,
        endDate: dataset.period.endDate,
        asOfDate: analytics.asOfDate,
      },
      dailyAttendance: analytics.dailyAttendance,
      departments: analytics.departments,
      payrollTrend: analytics.payrollTrend,
      leaveByType: analytics.leaveByType,
      observedEmployeeAttendance,
      requestedDailyRoster,
      dataQuality: analytics.dataQuality,
      interpretationRules: [
        "Statuses describe recorded events only and are not employee character judgments.",
        "Approved leave is not counted as absence in attendance-rate denominators.",
        "Do not infer diligence, intent, performance, or misconduct from timing records.",
      ],
    };
  }

  const requestedDaily = analytics.dailyAttendance.filter(
    (row) => row.date >= resolvedPeriod.startDate && row.date <= resolvedPeriod.endDate,
  );
  const scheduled = requestedDaily.reduce((total, row) => total + row.scheduled, 0);
  const present = requestedDaily.reduce((total, row) => total + row.present, 0);
  const onTime = requestedDaily.reduce((total, row) => total + row.onTime, 0);

  return {
    sourceId: "tenant-database-analytics",
    clock,
    access: {
      scope: access.scope,
      organizationId: access.orgId,
      requestingEmployeeCode: access.employee?.employee_code ?? null,
    },
    resolvedPeriod,
    organization: {
      id: analytics.organization.id,
      name: analytics.organization.business_name,
      timezone: analytics.organization.timezone,
    },
    overview: analytics.summary,
    requestedAttendanceSummary: {
      scheduled,
      present,
      onTime,
      late: requestedDaily.reduce((total, row) => total + row.late, 0),
      absent: requestedDaily.reduce((total, row) => total + row.absent, 0),
      onLeave: requestedDaily.reduce((total, row) => total + row.onLeave, 0),
      attendanceRate: scheduled > 0 ? Math.round((present / scheduled) * 1000) / 10 : 0,
      punctualityRate: present > 0 ? Math.round((onTime / present) * 1000) / 10 : 0,
    },
    availableDataPeriod: {
      startDate: analytics.rangeStart,
      endDate: analytics.rangeEnd,
      asOfDate: analytics.asOfDate,
    },
    dailyAttendance: analytics.dailyAttendance,
    departments: analytics.departments,
    payrollTrend: analytics.payrollTrend,
    leaveByType: analytics.leaveByType,
    observedEmployeeAttendance: liveObservedAttendance(analytics),
    requestedDailyRoster: liveRequestedRoster(
      analytics,
      resolvedPeriod.startDate,
      resolvedPeriod.endDate,
    ),
    dataQuality: analytics.dataQuality,
    interpretationRules: [
      "Statuses describe recorded events only and are not employee character judgments.",
      "Approved leave is not counted as absence in attendance-rate denominators.",
      "Do not infer diligence, intent, performance, or misconduct from timing records.",
    ],
  };
}
