import type { WorkforceAssistantContext } from "./context";
import type { WorkforceAssistantOutput } from "./schema";

type Language = "th" | "en" | "zh";

function languageOf(message: string): Language {
  if (/[ก-๙]/.test(message)) return "th";
  if (/[\u3400-\u9fff]/.test(message)) return "zh";
  return "en";
}

function groupDailyRoster(context: WorkforceAssistantContext) {
  const grouped = new Map<
    string,
    { scheduled: number; present: number; late: number; absent: number; onLeave: number }
  >();
  for (const row of context.requestedDailyRoster) {
    const date = String(row.date ?? "");
    if (!date) continue;
    const current = grouped.get(date) ?? {
      scheduled: 0,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
    };
    if (row.dayStatus !== "leave") current.scheduled += 1;
    if (row.dayStatus === "workday") current.present += 1;
    if (row.arrivalStatus === "late") current.late += 1;
    if (row.dayStatus === "absent") current.absent += 1;
    if (row.dayStatus === "leave") current.onLeave += 1;
    grouped.set(date, current);
  }
  if (grouped.size > 0) return Array.from(grouped, ([date, value]) => ({ date, ...value }));
  return context.dailyAttendance.filter(
    (row) =>
      row.date >= context.resolvedPeriod.startDate && row.date <= context.resolvedPeriod.endDate,
  );
}

function selectedRows(message: string, context: WorkforceAssistantContext) {
  const normalized = message.toLowerCase();
  const code = message.match(/EMP\d{3}/i)?.[0]?.toUpperCase();
  let rows = context.requestedDailyRoster;
  if (code) rows = rows.filter((row) => row.employeeCode === code);
  if (/late|มาสาย|สาย|迟到/.test(normalized)) {
    rows = rows.filter((row) => row.arrivalStatus === "late" || row.status === "late");
  } else if (/absent|ขาดงาน|缺勤/.test(normalized)) {
    rows = rows.filter((row) => row.dayStatus === "absent");
  } else if (/leave|ลา|请假/.test(normalized)) {
    rows = rows.filter((row) => row.dayStatus === "leave");
  } else if (/early|ออกก่อน|早退/.test(normalized)) {
    rows = rows.filter((row) => row.departureStatus === "early_departure" || row.status === "early");
  }
  return rows.slice(0, 25);
}

function describeRows(rows: Array<Record<string, string | number | null>>, language: Language): string {
  if (rows.length === 0) {
    if (language === "th") return "ไม่พบรายการที่ตรงกับเงื่อนไขในช่วงข้อมูลที่ระบุ";
    if (language === "zh") return "在指定数据期间内未找到符合条件的记录。";
    return "No matching records were found in the selected data period.";
  }
  const lines = rows.slice(0, 8).map((row) => {
    const name = String(row.name ?? row.employeeCode ?? "ไม่ระบุชื่อ");
    const code = String(row.employeeCode ?? "");
    const time = row.checkIn ?? row.time ?? "ไม่บันทึกเวลา";
    return `- ${name}${code ? ` (${code})` : ""}: ${row.date ?? ""} ${time}`.trim();
  });
  if (language === "th") return `พบ ${rows.length} รายการ:\n${lines.join("\n")}`;
  if (language === "zh") return `找到 ${rows.length} 条记录：\n${lines.join("\n")}`;
  return `Found ${rows.length} records:\n${lines.join("\n")}`;
}

function overviewAnswer(context: WorkforceAssistantContext, language: Language): string {
  const summary = context.requestedAttendanceSummary;
  if (language === "th") {
    return `ช่วง ${context.resolvedPeriod.label} มีรายการมาทำงาน ${summary.present} จากวันที่คาดว่าต้องมาทำงาน ${summary.scheduled} รายการ อัตราการมาทำงาน ${summary.attendanceRate}% และตรงเวลา ${summary.punctualityRate}% ข้อมูลนี้อธิบายเฉพาะเวลาที่บันทึก ไม่ใช้ตัดสินคุณลักษณะหรือผลงานของบุคคล`;
  }
  if (language === "zh") {
    return `${context.resolvedPeriod.label} 期间记录到岗 ${summary.present}/${summary.scheduled} 人次，出勤率 ${summary.attendanceRate}%，准时率 ${summary.punctualityRate}%。这些数字仅描述已记录的时间，不用于评价个人品格或绩效。`;
  }
  return `For ${context.resolvedPeriod.label}, ${summary.present} of ${summary.scheduled} expected employee-days were recorded present. Attendance was ${summary.attendanceRate}% and punctuality was ${summary.punctualityRate}%. These figures describe recorded timing only and do not judge character or performance.`;
}

export function runDeterministicWorkforceAssistant(
  message: string,
  context: WorkforceAssistantContext,
): WorkforceAssistantOutput {
  const language = languageOf(message);
  const normalized = message.toLowerCase();
  const filteredRows = selectedRows(message, context);
  const asksForSpecificRows = /late|มาสาย|สาย|迟到|absent|ขาดงาน|缺勤|leave|ลา|请假|early|ออกก่อน|早退|EMP\d{3}/i.test(
    normalized,
  );
  const answer = asksForSpecificRows
    ? `${describeRows(filteredRows, language)}\n\n${overviewAnswer(context, language)}`
    : overviewAnswer(context, language);
  const daily = groupDailyRoster(context).slice(-31);
  const summary = context.requestedAttendanceSummary;
  const tableRows = (asksForSpecificRows ? filteredRows : context.requestedDailyRoster.slice(0, 25)).map(
    (row) => [
      String(row.date ?? ""),
      String(row.employeeCode ?? ""),
      String(row.name ?? ""),
      String(row.department ?? ""),
      String(row.checkIn ?? row.time ?? ""),
      String(row.checkOut ?? ""),
      String(row.dayStatus ?? row.status ?? ""),
    ],
  );

  return {
    answer,
    report: {
      title:
        language === "th"
          ? "รายงานข้อมูลเวลาทำงาน"
          : language === "zh"
            ? "考勤记录报告"
            : "Workforce timing report",
      summary: overviewAnswer(context, language),
      periodLabel: `${context.resolvedPeriod.label} | ${context.organization.timezone}`,
      metrics: [
        { label: "Scheduled employee-days", value: summary.scheduled, unit: "records", context: "Approved leave excluded" },
        { label: "Recorded present", value: summary.present, unit: "records", context: "Recorded workday rows" },
        { label: "Attendance rate", value: summary.attendanceRate, unit: "%", context: "Present divided by scheduled" },
        { label: "Punctuality rate", value: summary.punctualityRate, unit: "%", context: "Non-late arrivals divided by present" },
        { label: "Late arrivals", value: summary.late, unit: "records", context: "Arrival later than shift start" },
        { label: "Approved leave", value: summary.onLeave, unit: "records", context: "Not counted as absence" },
      ],
      insights: [
        {
          title: "Observed timing only",
          detail:
            "Arrival, departure, leave, and absence labels describe source records only. They do not establish intent, character, misconduct, or job performance.",
          tone: "neutral",
        },
        {
          title: "Data coverage",
          detail: `Source ${context.sourceId} covers ${context.availableDataPeriod.startDate} through ${context.availableDataPeriod.endDate} in ${context.organization.timezone}.`,
          tone: "neutral",
        },
      ],
      charts:
        daily.length > 0
          ? [
              {
                type: daily.length === 1 ? "bar" : "line",
                title: "Recorded attendance by date",
                unit: "employee-days",
                labels: daily.map((row) => row.date),
                series: [
                  { name: "Present", values: daily.map((row) => row.present) },
                  { name: "Late arrival", values: daily.map((row) => row.late) },
                  { name: "Absent", values: daily.map((row) => row.absent) },
                  { name: "Approved leave", values: daily.map((row) => row.onLeave) },
                ],
              },
            ]
          : [],
      table: {
        title: "Source records",
        columns: ["Date", "Code", "Name", "Department", "Check-in", "Check-out", "Status"],
        rows: tableRows,
      },
      sources: [
        {
          label: context.sourceId,
          detail: `${context.availableDataPeriod.startDate} to ${context.availableDataPeriod.endDate}; as of ${context.availableDataPeriod.asOfDate}`,
        },
        {
          label: "Calendar interpretation",
          detail: `Current date ${context.clock.currentDate}; timezone ${context.clock.timezone}`,
        },
      ],
    },
  };
}
