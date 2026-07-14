import { strToU8, zipSync } from "fflate";
import type { WorkforceAnalytics } from "@/lib/analytics";

export type AnalyticsExportDataset =
  | "all"
  | "summary"
  | "employees"
  | "attendance"
  | "leave"
  | "overtime"
  | "payroll"
  | "performance";

type CellValue = string | number | boolean | null | undefined;

interface Column {
  header: string;
  width?: number;
  kind?: "text" | "integer" | "decimal" | "currency" | "percent";
}

interface Sheet {
  name: string;
  title: string;
  subtitle: string;
  columns: Column[];
  rows: CellValue[][];
}

const textEncoder = new TextEncoder();

function xml(value: CellValue): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Protect spreadsheet consumers from formula injection in user-controlled text. */
function spreadsheetSafeText(value: CellValue): string {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function columnReference(index: number): string {
  let number = index + 1;
  let result = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function styleFor(column: Column): number {
  switch (column.kind) {
    case "integer":
      return 4;
    case "decimal":
      return 5;
    case "currency":
      return 6;
    case "percent":
      return 7;
    default:
      return 3;
  }
}

function cellXml(value: CellValue, reference: string, column: Column): string {
  if (value === null || value === undefined || value === "") {
    return `<c r="${reference}" s="${styleFor(column)}"/>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}" s="${styleFor(column)}" t="n"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${reference}" s="${styleFor(column)}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" s="${styleFor(column)}" t="inlineStr"><is><t xml:space="preserve">${xml(spreadsheetSafeText(value))}</t></is></c>`;
}

function worksheetXml(sheet: Sheet): string {
  const lastColumn = columnReference(Math.max(0, sheet.columns.length - 1));
  const rows: string[] = [];
  rows.push(
    `<row r="1" ht="28" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>${xml(sheet.title)}</t></is></c></row>`,
  );
  rows.push(
    `<row r="2" ht="24" customHeight="1"><c r="A2" s="2" t="inlineStr"><is><t>${xml(sheet.subtitle)}</t></is></c></row>`,
  );
  rows.push(
    `<row r="3" ht="24" customHeight="1">${sheet.columns
      .map(
        (column, index) =>
          `<c r="${columnReference(index)}3" s="8" t="inlineStr"><is><t>${xml(column.header)}</t></is></c>`,
      )
      .join("")}</row>`,
  );
  sheet.rows.forEach((values, rowIndex) => {
    const excelRow = rowIndex + 4;
    rows.push(
      `<row r="${excelRow}">${sheet.columns
        .map((column, columnIndex) =>
          cellXml(values[columnIndex], `${columnReference(columnIndex)}${excelRow}`, column),
        )
        .join("")}</row>`,
    );
  });

  const lastRow = Math.max(3, sheet.rows.length + 3);
  const columns = sheet.columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width ?? 16}" customWidth="1"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>${rows.join("")}</sheetData>
  <autoFilter ref="A3:${lastColumn}${lastRow}"/>
  <mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function employeeName(
  employee: WorkforceAnalytics["raw"]["employees"][number] | undefined,
): string {
  if (!employee) return "Unknown";
  return employee.name_th ?? employee.name_en ?? employee.employee_code ?? employee.id.slice(0, 8);
}

function buildSheets(analytics: WorkforceAnalytics, dataset: AnalyticsExportDataset): Sheet[] {
  const { raw } = analytics;
  const employeeById = new Map(raw.employees.map((employee) => [employee.id, employee]));
  const attendanceInRange = raw.attendance.filter((row) => {
    const date = row.timestamp.slice(0, 10);
    return date >= analytics.rangeStart && date <= analytics.rangeEnd;
  });
  const leaveInRange = raw.leaveRequests.filter(
    (row) => row.start_date <= analytics.rangeEnd && row.end_date >= analytics.rangeStart,
  );
  const overtimeInRange = raw.overtimeRequests.filter(
    (row) => row.date >= analytics.rangeStart && row.date <= analytics.rangeEnd,
  );
  const include = (name: AnalyticsExportDataset) => dataset === "all" || dataset === name;
  const context = `${analytics.organization.business_name} | ${analytics.rangeStart} ถึง ${analytics.rangeEnd} | ขอบเขต ${analytics.scope}`;
  const sheets: Sheet[] = [];

  if (include("summary")) {
    sheets.push({
      name: "Summary",
      title: "Workforce Analytics Summary",
      subtitle: context,
      columns: [
        { header: "Metric", width: 31 },
        { header: "Value", width: 18, kind: "decimal" },
        { header: "Definition", width: 58 },
      ],
      rows: [
        ["Active headcount", analytics.summary.activeHeadcount, "พนักงานสถานะ active ในขอบเขตที่ผู้ใช้มีสิทธิ์"],
        ["Scheduled employee-days", analytics.summary.scheduledEmployeeDays, "จำนวนพนักงาน-วันที่คาดว่าต้องทำงานในช่วงรายงาน"],
        ["Present employee-days", analytics.summary.presentEmployeeDays, "พนักงาน-วันที่พบรายการเข้างาน"],
        ["Attendance rate (%)", analytics.summary.attendanceRate, "Present ÷ Scheduled × 100"],
        ["Punctuality rate (%)", analytics.summary.punctualityRate, "เข้างานตรงเวลา ÷ รายการเข้างาน × 100"],
        ["Approved OT hours", analytics.summary.approvedOtHours, "ชั่วโมง OT ที่อนุมัติและวันที่อยู่ในช่วงรายงาน"],
        ["Approved leave days", analytics.summary.approvedLeaveDays, "วันลาที่อนุมัติและทับซ้อนช่วงรายงาน"],
        ["Pending approvals", analytics.summary.pendingApprovals, "คำขอลา OT และติดต่อหัวหน้าที่ยัง pending"],
        ["Average approval hours", analytics.summary.averageApprovalHours, "เวลาเฉลี่ยตั้งแต่สร้างถึงตัดสินใจของรายการที่มี decided_at"],
        ["Latest gross payroll", analytics.summary.latestGrossPayroll, `ยอดรวม gross งวด ${analytics.summary.latestPayrollMonth ?? "ไม่พบข้อมูล"}`],
        ["Latest net payroll", analytics.summary.latestNetPayroll, `ยอดรวม net งวด ${analytics.summary.latestPayrollMonth ?? "ไม่พบข้อมูล"}`],
        ["Employer SSO cost", analytics.summary.employerSsoCost, "เงินสมทบนายจ้างจาก payroll snapshot งวดล่าสุด"],
        ["Recorded geofence pass rate (%)", analytics.summary.recordedGeofencePassRate, "inside ÷ (inside + outside); ไม่นับ disabled/missing"],
        ["LINE binding rate (%)", analytics.summary.lineBindingRate, "พนักงาน active ที่ผูก LINE ÷ active ทั้งหมด × 100"],
        ["Salary coverage rate (%)", analytics.summary.salaryCoverageRate, "พนักงาน active ที่มีฐานเงินเดือนมากกว่า 0 ÷ active ทั้งหมด × 100"],
      ],
    });
  }

  if (include("employees")) {
    sheets.push({
      name: "Employees",
      title: "Employee Master (Privacy-filtered)",
      subtitle: `${context} | ไม่ส่งออกเลขบัตรประชาชน บัญชีธนาคาร ที่อยู่ เบอร์โทร หรือเลขประกันสังคม`,
      columns: [
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "Position", width: 24 },
        { header: "Role", width: 14 },
        { header: "Employment type", width: 18 },
        { header: "Account status", width: 18 },
        { header: "Hire date", width: 14 },
        { header: "LINE bound", width: 13 },
        { header: "Supervisor", width: 13 },
        { header: "Base salary", width: 16, kind: "currency" },
      ],
      rows: raw.employees.map((employee) => [
        employee.employee_code,
        employeeName(employee),
        employee.department,
        employee.job_title ?? employee.position,
        employee.role,
        employee.employment_type,
        employee.account_status,
        employee.hire_date,
        Boolean(employee.line_user_id),
        employee.is_supervisor,
        employee.base_salary,
      ]),
    });
  }

  if (include("attendance")) {
    sheets.push({
      name: "Attendance",
      title: "Attendance Events",
      subtitle: `${context} | ส่งออกผล geofence และระยะ แต่ไม่ส่งออกพิกัดดิบ`,
      columns: [
        { header: "Timestamp", width: 24 },
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "Type", width: 10 },
        { header: "Status", width: 13 },
        { header: "Source", width: 18 },
        { header: "Geofence result", width: 19 },
        { header: "Distance (m)", width: 15, kind: "decimal" },
        { header: "Reason", width: 36 },
      ],
      rows: attendanceInRange.map((row) => {
        const employee = employeeById.get(row.employee_id);
        return [
          row.timestamp,
          employee?.employee_code,
          employeeName(employee),
          employee?.department,
          row.type,
          row.status,
          row.source,
          row.geofence_result,
          row.geofence_distance_m,
          row.reason,
        ];
      }),
    });
  }

  if (include("leave")) {
    sheets.push({
      name: "Leave",
      title: "Leave Requests",
      subtitle: context,
      columns: [
        { header: "Created at", width: 24 },
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "Leave type", width: 15 },
        { header: "Start date", width: 14 },
        { header: "End date", width: 14 },
        { header: "Days", width: 10, kind: "decimal" },
        { header: "Status", width: 13 },
        { header: "Decided at", width: 24 },
        { header: "Reason", width: 40 },
        { header: "Decision reason", width: 40 },
      ],
      rows: leaveInRange.map((row) => {
        const employee = employeeById.get(row.employee_id);
        return [row.created_at, employee?.employee_code, employeeName(employee), employee?.department, row.leave_type, row.start_date, row.end_date, row.days, row.status, row.decided_at, row.reason, row.decision_reason];
      }),
    });
  }

  if (include("overtime")) {
    sheets.push({
      name: "Overtime",
      title: "Overtime Requests",
      subtitle: context,
      columns: [
        { header: "Created at", width: 24 },
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "Date", width: 14 },
        { header: "Hours", width: 10, kind: "decimal" },
        { header: "Status", width: 13 },
        { header: "Decided at", width: 24 },
        { header: "Reason", width: 40 },
        { header: "Decision reason", width: 40 },
      ],
      rows: overtimeInRange.map((row) => {
        const employee = employeeById.get(row.employee_id);
        return [row.created_at, employee?.employee_code, employeeName(employee), employee?.department, row.date, row.hours, row.status, row.decided_at, row.reason, row.decision_reason];
      }),
    });
  }

  if (include("payroll")) {
    sheets.push({
      name: "Payroll",
      title: "Payroll Snapshots",
      subtitle: `${context} | ข้อมูลอ่อนไหว: จำกัดสิทธิ์ผู้จัดการ/HR/ผู้บริหาร`,
      columns: [
        { header: "Month", width: 12 },
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "Base pay", width: 14, kind: "currency" },
        { header: "OT pay", width: 14, kind: "currency" },
        { header: "Allowance", width: 14, kind: "currency" },
        { header: "Bonus", width: 14, kind: "currency" },
        { header: "Other income", width: 14, kind: "currency" },
        { header: "Gross pay", width: 14, kind: "currency" },
        { header: "Employee SSO", width: 15, kind: "currency" },
        { header: "Employer SSO", width: 15, kind: "currency" },
        { header: "PIT withholding", width: 16, kind: "currency" },
        { header: "Other deductions", width: 17, kind: "currency" },
        { header: "Net pay", width: 14, kind: "currency" },
        { header: "Taxable income", width: 16, kind: "currency" },
        { header: "Annualized taxable", width: 19, kind: "currency" },
        { header: "Annual tax", width: 14, kind: "currency" },
        { header: "Status", width: 14 },
        { header: "Rule version", width: 16 },
        { header: "Calculated at", width: 24 },
      ],
      rows: raw.payrolls.map((row) => {
        const employee = employeeById.get(row.employee_id);
        return [row.month_year, employee?.employee_code, employeeName(employee), employee?.department, row.base_pay, row.ot_pay, row.allowance_pay, row.bonus_pay, row.other_income, row.gross_pay, row.ssf_deduction, row.employer_sso_contribution, row.tax_deduction, row.other_deductions, row.net_pay, row.taxable_income, row.annualized_taxable_income, row.annual_tax, row.calculation_status, row.calculation_version, row.calculated_at];
      }),
    });
  }

  if (include("performance")) {
    sheets.push({
      name: "Performance",
      title: "Performance Reviews",
      subtitle: context,
      columns: [
        { header: "Review date", width: 14 },
        { header: "Employee code", width: 16 },
        { header: "Name", width: 28 },
        { header: "Department", width: 22 },
        { header: "KPI score", width: 12, kind: "decimal" },
        { header: "Notes", width: 46 },
      ],
      rows: raw.performanceReviews.map((row) => {
        const employee = employeeById.get(row.employee_id);
        return [row.review_date, employee?.employee_code, employeeName(employee), employee?.department, row.kpi_score, row.notes];
      }),
    });
  }

  if (dataset === "all") {
    sheets.push({
      name: "Data_Quality",
      title: "Data Quality Checks",
      subtitle: context,
      columns: [
        { header: "Check", width: 32 },
        { header: "Count", width: 12, kind: "integer" },
        { header: "Description", width: 58 },
      ],
      rows: analytics.dataQuality.map((issue) => [issue.key, issue.count, issue.label]),
    });
  }

  sheets.push({
    name: "Sources",
    title: "Source, Scope and Methodology",
    subtitle: `${context} | Generated ${new Date().toISOString()}`,
    columns: [
      { header: "Item", width: 28 },
      { header: "Value", width: 76 },
    ],
    rows: [
      ["Organization ID", analytics.organization.id],
      ["As-of date", analytics.asOfDate],
      ["Range", `${analytics.rangeStart} to ${analytics.rangeEnd}`],
      ["Scope", analytics.scope],
      ["Attendance source", "attendance_logs joined to employees in the authorized organization/team"],
      ["Schedule source", "employee_shifts; weekdays are used only when no explicit schedule exists for that date"],
      ["Approvals", "leave_requests, overtime_requests and contact_requests"],
      ["Payroll", "immutable payroll snapshots; calculation_status indicates estimate/review state"],
      ["Risk score", "Diagnostic heuristic: absence ×18 + late ×7 + OT above 12 hours ×2, capped at 100. Not a predictive or disciplinary decision."],
      ["Privacy", "Employee export excludes national ID, phone, address, bank account, SSO number and raw GPS coordinates. LINE coverage excludes rows marked metadata.demo_seed=true because synthetic identities are intentionally not created."],
      ["Tax caveat", "Payroll calculation is decision support, not filing. Reviewed/file-ready requires HR/accounting verification and current legal rules."],
    ],
  });

  return sheets;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="฿#,##0.00"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
  </fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFB923C"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildAnalyticsWorkbook(
  analytics: WorkforceAnalytics,
  dataset: AnalyticsExportDataset,
): Uint8Array {
  const sheets = buildSheets(analytics, dataset);
  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  const relationships = sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const worksheetOverrides = sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${worksheetOverrides}</Types>`),
    "_rels/.rels": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    "docProps/core.xml": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>EC AIHR Workforce Analytics</dc:title><dc:creator>EC AIHR</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`),
    "docProps/app.xml": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>EC AIHR</Application><TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map((sheet) => `<vt:lpstr>${xml(sheet.name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts></Properties>`),
    "xl/workbook.xml": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheetEntries}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
    "xl/_rels/workbook.xml.rels": textEncoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(stylesXml),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet));
  });
  return zipSync(files, { level: 6 });
}
