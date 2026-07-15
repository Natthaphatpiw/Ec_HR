import assert from "node:assert/strict";
import { validateWorkforceAssistantOutput } from "../src/lib/workforce-assistant/guardrails.ts";

const context = {
  sourceId: "guardrail-check",
  clock: { currentDate: "2026-07-15", timezone: "Asia/Bangkok" },
  access: { scope: "organization", organizationId: "org-1", requestingEmployeeCode: null },
  resolvedPeriod: {
    startDate: "2026-07-15",
    endDate: "2026-07-15",
    label: "2026-07-15",
  },
  organization: { id: "org-1", name: "Northstar Electronics", timezone: "Asia/Bangkok" },
  overview: {},
  requestedAttendanceSummary: {
    scheduled: 10,
    present: 8,
    onTime: 6,
    late: 2,
    absent: 2,
    onLeave: 0,
    attendanceRate: 80,
    punctualityRate: 75,
  },
  availableDataPeriod: {
    startDate: "2026-07-15",
    endDate: "2026-07-15",
    asOfDate: "2026-07-15",
  },
  dailyAttendance: [
    {
      date: "2026-07-15",
      scheduled: 10,
      present: 8,
      onTime: 6,
      late: 2,
      absent: 2,
      onLeave: 0,
      attendanceRate: 80,
    },
  ],
  departments: [],
  payrollTrend: [],
  leaveByType: [],
  observedEmployeeAttendance: [
    {
      employeeCode: "EMP101",
      name: "Anan Wattanakul",
      department: "Operations",
      scheduledDays: 10,
      recordedWorkdays: 8,
      leaveDays: 0,
      absentDays: 2,
      lateArrivals: 2,
      earlyDepartures: 0,
      averageCheckIn: "08:30",
      averageCheckOut: "17:30",
      attendanceRate: 80,
      punctualityRate: 75,
    },
  ],
  requestedDailyRoster: [
    {
      date: "2026-07-15",
      employeeCode: "EMP101",
      name: "Anan Wattanakul",
      department: "Operations",
      checkIn: "08:30",
      checkOut: "17:30",
      dayStatus: "workday",
    },
  ],
  dataQuality: {},
  interpretationRules: [],
};

const safeOutput = {
  answer: "Anan Wattanakul (EMP101) has 8 recorded workdays on 2026-07-15.",
  report: {
    title: "Attendance report",
    summary: "8 recorded workdays on 2026-07-15.",
    periodLabel: "2026-07-15",
    metrics: [{ label: "Recorded", value: 8, unit: "records", context: "Source records" }],
    insights: [],
    charts: [],
    table: {
      title: "Source records",
      columns: ["Employee", "Code", "Date"],
      rows: [["Anan Wattanakul", "EMP101", "2026-07-15"]],
    },
    sources: [{ label: "guardrail-check", detail: "2026-07-15" }],
  },
};

assert.deepEqual(validateWorkforceAssistantOutput(safeOutput, context), {
  safe: true,
  reasons: [],
});

const unsafeOutput = structuredClone(safeOutput);
unsafeOutput.answer = "John Doe is a lazy employee with 999 incidents.";
unsafeOutput.report.metrics[0].value = 999;
unsafeOutput.report.table.rows[0][0] = "Jane Doe";
const unsafeResult = validateWorkforceAssistantOutput(unsafeOutput, context);
assert.equal(unsafeResult.safe, false);
assert.equal(unsafeResult.reasons.includes("judgmental_language"), true);
assert.equal(unsafeResult.reasons.includes("number_outside_context"), true);
assert.equal(unsafeResult.reasons.includes("employee_outside_context"), true);

// Regression: both 10 and 2 exist in the context, so global number membership
// alone used to accept this scheduled/late metric swap.
const swappedMetricOutput = structuredClone(safeOutput);
swappedMetricOutput.answer = "There were 10 late arrivals.";
swappedMetricOutput.report.metrics = [
  { label: "Late arrivals", value: 10, unit: "records", context: "Selected period" },
];
const swappedMetricResult = validateWorkforceAssistantOutput(swappedMetricOutput, context);
assert.equal(swappedMetricResult.safe, false);
assert.equal(swappedMetricResult.reasons.includes("metric_value_mismatch"), true);
assert.equal(swappedMetricResult.reasons.includes("number_outside_context"), false);

const swappedMetricLabelOutput = structuredClone(safeOutput);
swappedMetricLabelOutput.report.metrics = [
  { label: "10 late arrivals", value: 2, unit: "records", context: "Selected period" },
];
const swappedMetricLabelResult = validateWorkforceAssistantOutput(
  swappedMetricLabelOutput,
  context,
);
assert.equal(swappedMetricLabelResult.safe, false);
assert.equal(swappedMetricLabelResult.reasons.includes("metric_value_mismatch"), true);
assert.equal(swappedMetricLabelResult.reasons.includes("number_outside_context"), false);

// Employee claims must bind to that employee's field, not merely to any number
// that appears elsewhere in the same employee/context object.
const swappedEmployeeOutput = structuredClone(safeOutput);
swappedEmployeeOutput.answer = "Anan Wattanakul (EMP101) had 10 late arrivals.";
swappedEmployeeOutput.report.metrics = [
  { label: "EMP101 late arrivals", value: 10, unit: "records", context: "Anan Wattanakul" },
];
const swappedEmployeeResult = validateWorkforceAssistantOutput(swappedEmployeeOutput, context);
assert.equal(swappedEmployeeResult.safe, false);
assert.equal(swappedEmployeeResult.reasons.includes("employee_metric_mismatch"), true);
assert.equal(swappedEmployeeResult.reasons.includes("number_outside_context"), false);

const swappedChartOutput = structuredClone(safeOutput);
swappedChartOutput.report.charts = [
  {
    type: "bar",
    title: "Late arrivals by date",
    unit: "records",
    labels: ["2026-07-15"],
    series: [{ name: "Late arrivals", values: [10] }],
  },
];
const swappedChartResult = validateWorkforceAssistantOutput(swappedChartOutput, context);
assert.equal(swappedChartResult.safe, false);
assert.equal(swappedChartResult.reasons.includes("metric_value_mismatch"), true);

const swappedEmployeeTableOutput = structuredClone(safeOutput);
swappedEmployeeTableOutput.report.table = {
  title: "Employee timing",
  columns: ["Employee", "Late arrivals"],
  rows: [["Anan Wattanakul", "10"]],
};
const swappedEmployeeTableResult = validateWorkforceAssistantOutput(
  swappedEmployeeTableOutput,
  context,
);
assert.equal(swappedEmployeeTableResult.safe, false);
assert.equal(
  swappedEmployeeTableResult.reasons.includes("employee_metric_mismatch"),
  true,
);

const thaiJudgment = structuredClone(safeOutput);
thaiJudgment.answer = "อนันต์ วัฒนกุลเป็นพนักงานขยัน";
const thaiResult = validateWorkforceAssistantOutput(thaiJudgment, context);
assert.equal(thaiResult.safe, false);
assert.equal(thaiResult.reasons.includes("judgmental_language"), true);

process.stdout.write("Workforce assistant guardrail checks passed.\n");
