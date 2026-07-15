import type { WorkforceAssistantContext } from "./context";
import type { WorkforceAssistantOutput } from "./schema";

export type WorkforceAssistantGuardrailReason =
  | "judgmental_language"
  | "number_outside_context"
  | "employee_outside_context"
  | "metric_value_mismatch"
  | "employee_metric_mismatch";

export interface WorkforceAssistantGuardrailResult {
  safe: boolean;
  reasons: WorkforceAssistantGuardrailReason[];
}

const JUDGMENT_PATTERNS = [
  /\b(?:good|bad|diligent|lazy|hard[- ]?working|suspicious|unreliable|irresponsible)\s+(?:employee|worker|person|staff member)\b/i,
  /\b(?:best|worst|model|problem|star)\s+(?:employee|worker|performer|staff member)\b/i,
  /\b(?:poor|low|high)[- ]?(?:performer|performing|performance|risk)\b/i,
  /\bunderperform(?:er|ing|s)?\b/i,
  /\b(?:punish(?:ment|ed|ing)?|disciplin(?:e|ary|ed|ing)|reward(?:ed|ing)?|promot(?:e|ed|ion|ing)|terminat(?:e|ed|ion|ing)|fire[ds]?|firing)\b/i,
  /\b(?:deduct|reduce|withhold)\s+(?:pay|salary|wages?|bonus)\b/i,
  /พนักงาน(?:ที่)?(?:ดี|ไม่ดี|แย่)/,
  /(?:ขยัน|ขี้เกียจ|น่าสงสัย|ไม่น่าไว้วางใจ|ไม่มีความรับผิดชอบ|เสี่ยงสูง|ผลงาน(?:ดี|แย่|ต่ำ))/,
  /(?:ลงโทษ|ตักเตือน|ไล่ออก|เลิกจ้าง|หัก(?:เงิน|ค่าจ้าง|เงินเดือน)|ให้รางวัล|ขึ้นเงินเดือน|เลื่อนตำแหน่ง)/,
  /(?:懒惰|勤奋|好员工|坏员工|惩罚|解雇|奖励|晋升)/,
] as const;

const NUMBER_PATTERN = /[-+]?\d[\d,]*(?:\.\d+)?/g;
const EMPLOYEE_CODE_PATTERN = /\bEMP(?:\d{3,}|[-_][A-Z0-9_-]+)\b/gi;

function walk(
  value: unknown,
  handlers: {
    text?: (value: string) => void;
    number?: (value: number) => void;
    arrayLength?: (value: number) => void;
  },
): void {
  if (typeof value === "string") {
    handlers.text?.(value);
    return;
  }
  if (typeof value === "number") {
    handlers.number?.(value);
    return;
  }
  if (Array.isArray(value)) {
    handlers.arrayLength?.(value.length);
    for (const item of value) walk(item, handlers);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walk(item, handlers);
  }
}

function canonicalNumber(value: string | number): string | null {
  const parsed = typeof value === "number" ? value : Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? String(Object.is(parsed, -0) ? 0 : parsed) : null;
}

function numericTokens(value: string): string[] {
  return Array.from(value.matchAll(NUMBER_PATTERN), (match) => match[0]);
}

function allowedNumbers(context: WorkforceAssistantContext): Set<string> {
  const allowed = new Set<string>();
  walk(context, {
    arrayLength(value) {
      const canonical = canonicalNumber(value);
      if (canonical) allowed.add(canonical);
    },
    number(value) {
      const canonical = canonicalNumber(value);
      if (canonical) allowed.add(canonical);
    },
    text(value) {
      for (const token of numericTokens(value)) {
        const canonical = canonicalNumber(token);
        if (canonical) allowed.add(canonical);
      }
    },
  });
  return allowed;
}

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[()[\]{},:;|/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function employeeIdentities(context: WorkforceAssistantContext): {
  codes: Set<string>;
  names: Set<string>;
  contextualEntities: Set<string>;
} {
  const codes = new Set<string>();
  const names = new Set<string>();
  const contextualEntities = new Set<string>();

  const addCode = (value: unknown) => {
    if (typeof value === "string" && value.trim()) codes.add(value.trim().toUpperCase());
  };
  const addName = (value: unknown) => {
    if (typeof value === "string" && value.trim()) names.add(normalizeIdentity(value));
  };
  const addEntity = (value: unknown) => {
    if (typeof value === "string" && value.trim()) contextualEntities.add(normalizeIdentity(value));
  };

  for (const employee of context.observedEmployeeAttendance) {
    addCode(employee.employeeCode);
    addName(employee.name);
    addEntity(employee.department);
  }
  for (const row of context.requestedDailyRoster) {
    addCode(row.employeeCode);
    addName(row.name);
    addEntity(row.department);
  }
  addEntity(context.organization.name);
  addEntity(context.organization.timezone);

  return { codes, names, contextualEntities };
}

function containsOnlyKnownIdentity(
  value: string,
  names: Set<string>,
  codes: Set<string>,
): boolean {
  let remaining = normalizeIdentity(value);
  const known = [...names, ...Array.from(codes, (code) => normalizeIdentity(code))].sort(
    (left, right) => right.length - left.length,
  );
  for (const identity of known) remaining = remaining.replaceAll(identity, " ");
  return remaining.replace(/[\s._-]+/g, "").length === 0;
}

function hasUnknownEmployeeReference(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): boolean {
  const { codes, names, contextualEntities } = employeeIdentities(context);
  let unknown = false;

  walk(output, {
    text(value) {
      for (const match of value.matchAll(EMPLOYEE_CODE_PATTERN)) {
        if (!codes.has(match[0].toUpperCase())) unknown = true;
      }
    },
  });
  if (unknown) return true;

  const columns = output.report.table.columns;
  const identityColumnIndexes = columns.flatMap((column, index) =>
    /^(?:employee|employee name|name|person|staff|ชื่อ|ชื่อพนักงาน|พนักงาน|姓名|员工)$/i.test(
      column.trim(),
    )
      ? [index]
      : [],
  );
  for (const row of output.report.table.rows) {
    for (const index of identityColumnIndexes) {
      const cell = row[index]?.trim();
      if (cell && !containsOnlyKnownIdentity(cell, names, codes)) return true;
    }
  }

  let narrativeWithoutKnownEntities = [
    output.answer,
    output.report.summary,
    ...output.report.metrics.map((metric) => metric.context),
    ...output.report.insights.flatMap((insight) => [insight.title, insight.detail]),
    ...output.report.table.rows.flat(),
    ...output.report.sources.map((source) => source.detail),
  ].join("\n");
  const removableEntities = [...names, ...contextualEntities].sort(
    (left, right) => right.length - left.length,
  );
  for (const entity of removableEntities) {
    if (!entity) continue;
    narrativeWithoutKnownEntities = narrativeWithoutKnownEntities.replace(
      new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"),
      " ",
    );
  }

  // Explicit honorifics are strong person-name signals in both supported UI languages.
  if (
    /\b(?:mr|mrs|ms|miss|dr|khun)\.?\s+[\p{L}'-]+(?:\s+[\p{L}'-]+){0,3}/iu.test(
      narrativeWithoutKnownEntities,
    ) ||
    /(?:นาย|นางสาว|นาง|คุณ)\s*[\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+){0,2}/u.test(
      narrativeWithoutKnownEntities,
    ) ||
    /(?:employee|worker|staff member)\s+(?:named|called)\s+[\p{L}'-]+/iu.test(
      narrativeWithoutKnownEntities,
    )
  ) {
    return true;
  }

  // Catch the common unprefixed Latin-name form (for example, a hallucinated
  // "John Doe") while allowing ordinary report headings and contextual entities.
  const genericTitleWords = new Set([
    "approved",
    "attendance",
    "bangkok",
    "calendar",
    "current",
    "data",
    "date",
    "employee",
    "leave",
    "matching",
    "no",
    "present",
    "punctuality",
    "recorded",
    "records",
    "report",
    "scheduled",
    "source",
    "thailand",
    "timing",
    "workforce",
  ]);
  const titleCaseSequence = /\b([A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?(?:\s+[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?){1,3})\b/g;
  for (const match of narrativeWithoutKnownEntities.matchAll(titleCaseSequence)) {
    const words = match[1].toLocaleLowerCase("en-US").split(/\s+/);
    if (words.some((word) => !genericTitleWords.has(word))) return true;
  }

  return false;
}

type AttendanceMetricKey =
  | "scheduled"
  | "present"
  | "onTime"
  | "late"
  | "absent"
  | "onLeave"
  | "earlyDeparture"
  | "attendanceRate"
  | "punctualityRate";

type ObservedEmployee = WorkforceAssistantContext["observedEmployeeAttendance"][number];

const METRIC_PATTERNS: Array<{
  key: AttendanceMetricKey;
  patterns: RegExp[];
}> = [
  {
    key: "attendanceRate",
    patterns: [
      /attendance\s+rate/iu,
      /อัตรา(?:การ)?(?:มา|เข้า)ทำงาน/u,
      /อัตราการเข้างาน/u,
      /出勤率/u,
    ],
  },
  {
    key: "punctualityRate",
    patterns: [/punctuality\s+rate/iu, /อัตราการตรงเวลา/u, /准时率/u],
  },
  {
    key: "scheduled",
    patterns: [
      /scheduled(?:\s+employee[- ]days?)?/iu,
      /expected\s+employee[- ]days?/iu,
      /วันที่คาดว่าต้องมาทำงาน/u,
      /วันทำงานที่กำหนด/u,
      /应出勤/u,
    ],
  },
  {
    key: "present",
    patterns: [
      /recorded\s+present/iu,
      /present(?:\s+employee[- ]days?)?/iu,
      /recorded\s+workdays?/iu,
      /รายการมาทำงาน/u,
      /มาปฏิบัติงาน/u,
      /到岗/u,
    ],
  },
  {
    key: "onTime",
    patterns: [/on[- ]time(?:\s+arrivals?)?/iu, /ตรงเวลา/u, /准时/u],
  },
  {
    key: "late",
    patterns: [/late(?:\s+arrivals?)?/iu, /มาสาย/u, /迟到/u],
  },
  {
    key: "absent",
    patterns: [/absen(?:t|ce|ces)/iu, /ขาดงาน/u, /缺勤/u],
  },
  {
    key: "onLeave",
    patterns: [/approved\s+leave/iu, /on\s+leave/iu, /ลา(?:ที่)?อนุมัติ/u, /请假/u],
  },
  {
    key: "earlyDeparture",
    patterns: [/early\s+departures?/iu, /ออกก่อนเวลา/u, /早退/u],
  },
];

function metricKeyFromText(value: string): AttendanceMetricKey | null {
  for (const definition of METRIC_PATTERNS) {
    if (definition.patterns.some((pattern) => pattern.test(value))) return definition.key;
  }
  return null;
}

function summaryMetricValue(
  key: AttendanceMetricKey,
  context: WorkforceAssistantContext,
): number {
  const summary = context.requestedAttendanceSummary;
  switch (key) {
    case "scheduled":
      return summary.scheduled;
    case "present":
      return summary.present;
    case "onTime":
      return summary.onTime;
    case "late":
      return summary.late;
    case "absent":
      return summary.absent;
    case "onLeave":
      return summary.onLeave;
    case "earlyDeparture":
      return context.observedEmployeeAttendance.reduce(
        (total, employee) => total + employee.earlyDepartures,
        0,
      );
    case "attendanceRate":
      return summary.attendanceRate;
    case "punctualityRate":
      return summary.punctualityRate;
  }
}

function employeeMetricValue(key: AttendanceMetricKey, employee: ObservedEmployee): number {
  switch (key) {
    case "scheduled":
      return employee.scheduledDays;
    case "present":
      return employee.recordedWorkdays;
    case "onTime":
      return Math.max(0, employee.recordedWorkdays - employee.lateArrivals);
    case "late":
      return employee.lateArrivals;
    case "absent":
      return employee.absentDays;
    case "onLeave":
      return employee.leaveDays;
    case "earlyDeparture":
      return employee.earlyDepartures;
    case "attendanceRate":
      return employee.attendanceRate;
    case "punctualityRate":
      return employee.punctualityRate;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function employeeReferenceOccurrences(
  value: string,
  context: WorkforceAssistantContext,
): Array<{ employee: ObservedEmployee; start: number; end: number }> {
  const occurrences: Array<{ employee: ObservedEmployee; start: number; end: number }> = [];
  for (const employee of context.observedEmployeeAttendance) {
    for (const identity of [employee.employeeCode, employee.name]) {
      if (!identity.trim()) continue;
      const pattern = new RegExp(escapeRegExp(identity), "giu");
      for (const match of value.matchAll(pattern)) {
        occurrences.push({
          employee,
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }
  }
  return occurrences;
}

function intervalDistance(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): number {
  if (leftEnd < rightStart) return rightStart - leftEnd;
  if (rightEnd < leftStart) return leftStart - rightEnd;
  return 0;
}

function nearestEmployee(
  position: { start: number; end: number },
  occurrences: Array<{ employee: ObservedEmployee; start: number; end: number }>,
): ObservedEmployee | null {
  let nearest: { employee: ObservedEmployee; distance: number } | null = null;
  for (const occurrence of occurrences) {
    const distance = intervalDistance(
      position.start,
      position.end,
      occurrence.start,
      occurrence.end,
    );
    if (!nearest || distance < nearest.distance) nearest = { employee: occurrence.employee, distance };
  }
  return nearest?.employee ?? null;
}

function metricOccurrences(
  value: string,
): Array<{ key: AttendanceMetricKey; start: number; end: number }> {
  const selected: Array<{ key: AttendanceMetricKey; start: number; end: number }> = [];
  // Definitions are ordered from specific rate phrases to their shorter components.
  for (const definition of METRIC_PATTERNS) {
    for (const basePattern of definition.patterns) {
      const flags = `${basePattern.flags.replaceAll("g", "")}g`;
      const pattern = new RegExp(basePattern.source, flags);
      for (const match of value.matchAll(pattern)) {
        const candidate = {
          key: definition.key,
          start: match.index,
          end: match.index + match[0].length,
        };
        const overlapsExisting = selected.some(
          (existing) =>
            candidate.start < existing.end && candidate.end > existing.start,
        );
        if (!overlapsExisting) selected.push(candidate);
      }
    }
  }
  return selected.sort((left, right) => left.start - right.start);
}

function excludedNumericRanges(value: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const pattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|EMP\d{3,})\b/gi;
  for (const match of value.matchAll(pattern)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function approximatelyEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 0.000_001;
}

function semanticNarrativeMismatch(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): { metric: boolean; employee: boolean } {
  const statements = [
    output.answer,
    output.report.title,
    output.report.summary,
    ...output.report.metrics.flatMap((metric) => [metric.label, metric.context]),
    ...output.report.insights.flatMap((insight) => [insight.title, insight.detail]),
    ...output.report.charts.flatMap((chart) => [
      chart.title,
      ...chart.series.map((series) => series.name),
    ]),
    output.report.table.title,
    ...output.report.table.columns,
  ]
    .join("\n")
    .split(/\n+|(?<=[.!?。！？;])\s+/u)
    .filter(Boolean);
  let metricMismatch = false;
  let employeeMismatch = false;

  for (const statement of statements) {
    const metrics = metricOccurrences(statement);
    if (metrics.length === 0) continue;
    const employees = employeeReferenceOccurrences(statement, context);
    const excluded = excludedNumericRanges(statement);
    for (const match of statement.matchAll(NUMBER_PATTERN)) {
      const numberRange = { start: match.index, end: match.index + match[0].length };
      if (
        excluded.some(
          (range) => numberRange.start >= range.start && numberRange.end <= range.end,
        )
      ) {
        continue;
      }
      const actual = Number(match[0].replaceAll(",", ""));
      if (!Number.isFinite(actual)) continue;
      const nearestMetric = metrics
        .map((metric) => ({
          metric,
          distance: intervalDistance(
            numberRange.start,
            numberRange.end,
            metric.start,
            metric.end,
          ),
        }))
        .sort((left, right) => left.distance - right.distance)[0];
      // A short distance binds forms such as "late: 2", "2 late arrivals",
      // and their Thai/Chinese equivalents without crossing unrelated clauses.
      if (!nearestMetric || nearestMetric.distance > 36) continue;
      const employee = nearestEmployee(numberRange, employees);
      const expected = employee
        ? employeeMetricValue(nearestMetric.metric.key, employee)
        : summaryMetricValue(nearestMetric.metric.key, context);
      if (!approximatelyEqual(actual, expected)) {
        if (employee) employeeMismatch = true;
        else metricMismatch = true;
      }
    }
  }

  return { metric: metricMismatch, employee: employeeMismatch };
}

function structuredMetricMismatch(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): { metric: boolean; employee: boolean } {
  let metricMismatch = false;
  let employeeMismatch = false;

  for (const metric of output.report.metrics) {
    const key = metricKeyFromText(metric.label);
    if (!key) continue;
    const employeeReferences = employeeReferenceOccurrences(
      `${metric.label}\n${metric.context}`,
      context,
    );
    const employee = employeeReferences[0]?.employee ?? null;
    const expected = employee
      ? employeeMetricValue(key, employee)
      : summaryMetricValue(key, context);
    if (!approximatelyEqual(metric.value, expected)) {
      if (employee) employeeMismatch = true;
      else metricMismatch = true;
    }
  }

  return { metric: metricMismatch, employee: employeeMismatch };
}

function dailyMetricValue(
  date: string,
  key: AttendanceMetricKey,
  context: WorkforceAssistantContext,
): number | null {
  const daily = context.dailyAttendance.find((row) => row.date === date);
  if (!daily) return null;
  switch (key) {
    case "scheduled":
      return daily.scheduled;
    case "present":
      return daily.present;
    case "onTime":
      return daily.onTime;
    case "late":
      return daily.late;
    case "absent":
      return daily.absent;
    case "onLeave":
      return daily.onLeave;
    case "attendanceRate":
      return daily.attendanceRate;
    case "punctualityRate":
      return daily.present > 0 ? Math.round((daily.onTime / daily.present) * 1000) / 10 : 0;
    case "earlyDeparture": {
      const rows = context.requestedDailyRoster.filter((row) => row.date === date);
      return rows.filter(
        (row) => row.departureStatus === "early_departure" || row.status === "early",
      ).length;
    }
  }
}

function employeeForLabel(
  value: string,
  context: WorkforceAssistantContext,
): ObservedEmployee | null {
  const normalized = normalizeIdentity(value);
  return (
    context.observedEmployeeAttendance.find(
      (employee) =>
        normalizeIdentity(employee.employeeCode) === normalized ||
        normalizeIdentity(employee.name) === normalized ||
        normalizeIdentity(`${employee.name} ${employee.employeeCode}`) === normalized,
    ) ?? null
  );
}

function chartMetricMismatch(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): { metric: boolean; employee: boolean } {
  let metricMismatch = false;
  let employeeMismatch = false;
  for (const chart of output.report.charts) {
    for (const series of chart.series) {
      const key = metricKeyFromText(series.name);
      if (!key) continue;
      const dateValues = chart.labels.map((label) => dailyMetricValue(label, key, context));
      if (dateValues.every((value) => value !== null)) {
        if (
          series.values.some(
            (value, index) => !approximatelyEqual(value, dateValues[index] as number),
          )
        ) {
          metricMismatch = true;
        }
        continue;
      }
      const employees = chart.labels.map((label) => employeeForLabel(label, context));
      if (employees.every((employee) => employee !== null)) {
        if (
          series.values.some(
            (value, index) =>
              !approximatelyEqual(
                value,
                employeeMetricValue(key, employees[index] as ObservedEmployee),
              ),
          )
        ) {
          employeeMismatch = true;
        }
      } else if (series.values.length === 1) {
        if (!approximatelyEqual(series.values[0], summaryMetricValue(key, context))) {
          metricMismatch = true;
        }
      }
    }
  }
  return { metric: metricMismatch, employee: employeeMismatch };
}

function tableMetricMismatch(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): { metric: boolean; employee: boolean } {
  const columns = output.report.table.columns;
  const metricColumns = columns.flatMap((column, index) => {
    const key = metricKeyFromText(column);
    return key ? [{ index, key }] : [];
  });
  let metricMismatch = false;
  let employeeMismatch = false;

  for (const row of output.report.table.rows) {
    const rowText = row.join(" ");
    const employee = employeeReferenceOccurrences(rowText, context)[0]?.employee ?? null;
    for (const column of metricColumns) {
      const token = numericTokens(row[column.index] ?? "")[0];
      if (!token) continue;
      const actual = Number(token.replaceAll(",", ""));
      const expected = employee
        ? employeeMetricValue(column.key, employee)
        : summaryMetricValue(column.key, context);
      if (!approximatelyEqual(actual, expected)) {
        if (employee) employeeMismatch = true;
        else metricMismatch = true;
      }
    }
  }
  return { metric: metricMismatch, employee: employeeMismatch };
}

function semanticMetricMismatches(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): { metric: boolean; employee: boolean } {
  const results = [
    semanticNarrativeMismatch(output, context),
    structuredMetricMismatch(output, context),
    chartMetricMismatch(output, context),
    tableMetricMismatch(output, context),
  ];
  return {
    metric: results.some((result) => result.metric),
    employee: results.some((result) => result.employee),
  };
}

/**
 * Post-generation validation is deliberately strict: a rejected model payload
 * is never shown or persisted. The caller replaces it with the deterministic
 * report built from the exact same context.
 */
export function validateWorkforceAssistantOutput(
  output: WorkforceAssistantOutput,
  context: WorkforceAssistantContext,
): WorkforceAssistantGuardrailResult {
  const reasons = new Set<WorkforceAssistantGuardrailReason>();
  const textValues: string[] = [];
  walk(output, { text: (value) => textValues.push(value) });
  const combinedText = textValues.join("\n");

  if (JUDGMENT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    reasons.add("judgmental_language");
  }

  const allowed = allowedNumbers(context);
  let invalidNumber = false;
  walk(output, {
    number(value) {
      const canonical = canonicalNumber(value);
      if (!canonical || !allowed.has(canonical)) invalidNumber = true;
    },
    text(value) {
      for (const token of numericTokens(value)) {
        const canonical = canonicalNumber(token);
        if (!canonical || !allowed.has(canonical)) invalidNumber = true;
      }
    },
  });
  if (invalidNumber) reasons.add("number_outside_context");

  if (hasUnknownEmployeeReference(output, context)) {
    reasons.add("employee_outside_context");
  }

  const semanticMismatches = semanticMetricMismatches(output, context);
  if (semanticMismatches.metric) reasons.add("metric_value_mismatch");
  if (semanticMismatches.employee) reasons.add("employee_metric_mismatch");

  return { safe: reasons.size === 0, reasons: [...reasons] };
}
