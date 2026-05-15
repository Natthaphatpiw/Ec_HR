import type { FlexMessage } from "./client";
import type {
  ContactRequest,
  Employee,
  LeaveRequest,
  OvertimeRequest,
} from "../types";

// =========================================================================
// Design tokens — match the EC AIHR palette. No emojis anywhere.
// =========================================================================

const COLOR_NAVY        = "#0F172A";
const COLOR_NAVY_700    = "#334155";
const COLOR_NAVY_500    = "#64748B";
const COLOR_NAVY_300    = "#94A3B8";
const COLOR_NAVY_100    = "#E2E8F0";
const COLOR_NAVY_50     = "#F8FAFC";
const COLOR_ORANGE      = "#FB923C";
const COLOR_RED         = "#DC2626";
const COLOR_RED_50      = "#FEF2F2";
const COLOR_EMERALD     = "#059669";
const COLOR_EMERALD_50  = "#ECFDF5";

// =========================================================================
// Layout primitives (no emoji, formal spacing, consistent typography)
// =========================================================================

function cardHeader(title: string, reference: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    backgroundColor: COLOR_NAVY,
    paddingAll: "20px",
    contents: [
      { type: "text", text: title, color: "#FFFFFF", weight: "bold", size: "md" },
      { type: "text", text: `Reference: ${reference}`, color: COLOR_NAVY_300, size: "xxs", margin: "sm" },
    ],
  };
}

function sectionTitle(text: string) {
  return {
    type: "text" as const,
    text,
    size: "xxs",
    color: COLOR_NAVY_500,
    weight: "bold" as const,
  };
}

function detailRow(label: string, value: string) {
  return {
    type: "box" as const,
    layout: "baseline" as const,
    spacing: "md" as const,
    contents: [
      { type: "text", text: label, color: COLOR_NAVY_500, size: "sm", flex: 3 },
      { type: "text", text: value, wrap: true, color: COLOR_NAVY, size: "sm", flex: 5 },
    ],
  };
}

function statRow(label: string, used: number, total: number, unit: string) {
  return {
    type: "box" as const,
    layout: "baseline" as const,
    spacing: "md" as const,
    contents: [
      { type: "text", text: label, color: COLOR_NAVY_700, size: "sm", flex: 4 },
      {
        type: "text",
        text: `${used} / ${total} ${unit}`,
        color: COLOR_NAVY,
        size: "sm",
        flex: 4,
        align: "end",
        weight: "bold",
      },
    ],
  };
}

function separator() {
  return { type: "separator" as const, margin: "lg" as const, color: COLOR_NAVY_100 };
}

function senderSection(employee: Employee) {
  const empName =
    employee.name_th ?? employee.name_en ?? employee.employee_code ?? "ผู้ยื่นคำขอ";
  const meta = [employee.employee_code, employee.department, employee.position]
    .filter(Boolean)
    .join(" · ");
  return {
    type: "box" as const,
    layout: "vertical" as const,
    spacing: "xs" as const,
    contents: [
      sectionTitle("ผู้ยื่นคำขอ"),
      { type: "text", text: empName, color: COLOR_NAVY, size: "md", weight: "bold", margin: "xs" },
      { type: "text", text: meta || "—", color: COLOR_NAVY_500, size: "xs" },
    ],
  };
}

function detailsSection(title: string, rows: Array<{ label: string; value: string }>) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    spacing: "sm" as const,
    contents: [
      sectionTitle(title),
      {
        type: "box" as const,
        layout: "vertical" as const,
        spacing: "sm" as const,
        margin: "sm",
        contents: rows.map((r) => detailRow(r.label, r.value)),
      },
    ],
  };
}

function statsSection(title: string, rows: Array<{ label: string; used: number; total: number; unit: string }>) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    spacing: "sm" as const,
    backgroundColor: COLOR_NAVY_50,
    cornerRadius: "md",
    paddingAll: "12px",
    contents: [
      sectionTitle(title),
      {
        type: "box" as const,
        layout: "vertical" as const,
        spacing: "xs" as const,
        margin: "sm",
        contents: rows.map((r) => statRow(r.label, r.used, r.total, r.unit)),
      },
    ],
  };
}

function commentSection(title: string, body: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    spacing: "xs" as const,
    contents: [
      sectionTitle(title),
      { type: "text", text: body, wrap: true, color: COLOR_NAVY, size: "sm", margin: "sm" },
    ],
  };
}

function primaryButton(label: string, postbackData: string, color: string) {
  return {
    type: "button" as const,
    style: "primary" as const,
    color,
    height: "sm" as const,
    action: { type: "postback" as const, label, data: postbackData, displayText: label },
  };
}

function secondaryButton(label: string, postbackData: string, color: string) {
  return {
    type: "button" as const,
    style: "secondary" as const,
    color,
    height: "sm" as const,
    action: { type: "postback" as const, label, data: postbackData, displayText: label },
  };
}

function uriButton(label: string, uri: string, color = COLOR_ORANGE) {
  return {
    type: "button" as const,
    style: "primary" as const,
    color,
    height: "sm" as const,
    action: { type: "uri" as const, label, uri },
  };
}

function bubble(title: string, reference: string, bodyContents: unknown[], footerButtons: unknown[]) {
  return {
    type: "bubble" as const,
    size: "kilo" as const,
    header: cardHeader(title, reference),
    body: {
      type: "box" as const,
      layout: "vertical" as const,
      spacing: "lg" as const,
      paddingAll: "20px",
      contents: bodyContents as never,
    },
    footer: {
      type: "box" as const,
      layout: "vertical" as const,
      spacing: "sm" as const,
      paddingAll: "16px",
      paddingTop: "0px",
      contents: footerButtons as never,
    },
  };
}

// =========================================================================
// Formatting helpers
// =========================================================================

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtRange(start: string, end: string): string {
  return start === end ? fmtDate(start) : `${fmtDate(start)} ถึง ${fmtDate(end)}`;
}

function leaveTypeLabel(t: string): string {
  switch (t) {
    case "annual":    return "ลาพักร้อน";
    case "sick":      return "ลาเนื่องจากเจ็บป่วย";
    case "maternity": return "ลาคลอด";
    case "personal":  return "ลากิจ";
    default:          return t;
  }
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function currentYear(): number {
  return new Date().getFullYear();
}

// =========================================================================
// Approval cards (sent TO supervisor with Approve / Reject buttons)
// =========================================================================

interface LeaveBalance {
  annual:   { used: number; total: number };
  sick:     { used: number; total: number };
  personal: { used: number; total: number };
}

export function buildLeaveApprovalCard(input: {
  request: LeaveRequest;
  employee: Employee;
  balance: LeaveBalance;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, balance, approveToken, rejectToken } = input;
  const reference = `LEAVE-${currentYear()}-${shortId(request.id)}`;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "ผู้ยื่นคำขอ";

  return {
    type: "flex",
    altText: `แบบขออนุมัติการลาจาก ${empName} — ${reference}`,
    contents: bubble(
      "แบบขออนุมัติการลา",
      reference,
      [
        senderSection(employee),
        separator(),
        detailsSection("รายละเอียดคำขอ", [
          { label: "ประเภท",   value: leaveTypeLabel(request.leave_type) },
          { label: "ช่วงวันที่", value: fmtRange(request.start_date, request.end_date) },
          { label: "จำนวนวัน",   value: `${request.days} วัน` },
          { label: "เหตุผล",    value: request.reason ?? "—" },
        ]),
        separator(),
        statsSection(`สถิติการลาประจำปี ${currentYear()}`, [
          { label: "ลาพักร้อน", used: balance.annual.used,   total: balance.annual.total,   unit: "วัน" },
          { label: "ลาป่วย",    used: balance.sick.used,     total: balance.sick.total,     unit: "วัน" },
          { label: "ลากิจ",     used: balance.personal.used, total: balance.personal.total, unit: "วัน" },
        ]),
      ],
      [
        primaryButton("อนุมัติคำขอ", `action=approve&kind=leave&token=${approveToken}`, COLOR_EMERALD),
        primaryButton("ไม่อนุมัติคำขอ", `action=reject&kind=leave&token=${rejectToken}`, COLOR_RED),
      ],
    ),
  };
}

export function buildOvertimeApprovalCard(input: {
  request: OvertimeRequest;
  employee: Employee;
  monthlyOvertimeHours: number;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, monthlyOvertimeHours, approveToken, rejectToken } = input;
  const reference = `OT-${currentYear()}-${shortId(request.id)}`;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "ผู้ยื่นคำขอ";
  const monthLimit = 36 * 4; // labor-law indicative cap, 36 hrs/week * 4 weeks

  return {
    type: "flex",
    altText: `แบบขออนุมัติทำงานล่วงเวลาจาก ${empName} — ${reference}`,
    contents: bubble(
      "แบบขออนุมัติทำงานล่วงเวลา",
      reference,
      [
        senderSection(employee),
        separator(),
        detailsSection("รายละเอียดคำขอ", [
          { label: "วันที่",    value: fmtDate(request.date) },
          { label: "จำนวนชั่วโมง", value: `${request.hours} ชั่วโมง` },
          { label: "เหตุผล",    value: request.reason ?? "—" },
        ]),
        separator(),
        statsSection(`สถิติชั่วโมงทำงานล่วงเวลาประจำเดือน`, [
          { label: "ชั่วโมงที่ใช้ไป", used: Math.round(monthlyOvertimeHours), total: monthLimit, unit: "ชม." },
        ]),
      ],
      [
        primaryButton("อนุมัติคำขอ",    `action=approve&kind=overtime&token=${approveToken}`, COLOR_EMERALD),
        primaryButton("ไม่อนุมัติคำขอ", `action=reject&kind=overtime&token=${rejectToken}`, COLOR_RED),
      ],
    ),
  };
}

export function buildContactApprovalCard(input: {
  request: ContactRequest;
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, approveToken, rejectToken } = input;
  const reference = `CONTACT-${currentYear()}-${shortId(request.id)}`;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "ผู้ยื่นคำขอ";

  return {
    type: "flex",
    altText: `แบบขอเข้าพบหัวหน้างานจาก ${empName} — ${reference}`,
    contents: bubble(
      "แบบขอเข้าพบหัวหน้างาน",
      reference,
      [
        senderSection(employee),
        separator(),
        detailsSection("รายละเอียดคำขอ", [
          { label: "วันที่",  value: fmtDate(request.requested_date) },
          { label: "เวลา",    value: `${request.time_start.slice(0, 5)} – ${request.time_end.slice(0, 5)}` },
        ]),
        separator(),
        commentSection("หัวข้อที่ต้องการปรึกษา", request.reason),
      ],
      [
        primaryButton("ตอบรับนัดหมาย",   `action=approve&kind=contact&token=${approveToken}`, COLOR_EMERALD),
        primaryButton("ไม่สามารถนัดได้", `action=reject&kind=contact&token=${rejectToken}`, COLOR_RED),
      ],
    ),
  };
}

export function buildRegistrationReviewCard(input: {
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { employee, approveToken, rejectToken } = input;
  const reference = `REGISTER-${currentYear()}-${shortId(employee.id)}`;
  const name = employee.name_th ?? employee.name_en ?? "ผู้สมัครใหม่";

  return {
    type: "flex",
    altText: `แบบยื่นใบสมัครพนักงานใหม่: ${name} — ${reference}`,
    contents: bubble(
      "แบบยื่นใบสมัครพนักงานใหม่",
      reference,
      [
        {
          type: "box" as const,
          layout: "vertical" as const,
          spacing: "xs" as const,
          contents: [
            sectionTitle("ผู้ยื่นใบสมัคร"),
            { type: "text", text: name, color: COLOR_NAVY, size: "md", weight: "bold", margin: "xs" },
          ],
        },
        separator(),
        detailsSection("ข้อมูลตำแหน่งที่สมัคร", [
          { label: "แผนก",     value: employee.department ?? "—" },
          { label: "ตำแหน่ง",  value: employee.position ?? "—" },
        ]),
        separator(),
        detailsSection("ข้อมูลติดต่อ", [
          { label: "โทรศัพท์",       value: employee.phone ?? "—" },
          { label: "เลขบัตรประชาชน",  value: employee.national_id ?? "—" },
        ]),
      ],
      [
        primaryButton("อนุมัติใบสมัคร", `action=approve&kind=registration&token=${approveToken}`, COLOR_EMERALD),
        primaryButton("ปฏิเสธใบสมัคร", `action=reject&kind=registration&token=${rejectToken}`, COLOR_RED),
      ],
    ),
  };
}

// =========================================================================
// Result cards (sent back to employee AFTER supervisor decision)
// =========================================================================

export function buildDecisionResultCard(input: {
  kind: "leave" | "overtime" | "contact" | "registration";
  status: "approved" | "rejected";
  title: string;
  detail: string;
  reason?: string | null;
  referenceId?: string;
  actionUrl?: string;
}): FlexMessage {
  const { kind, status, title, detail, reason, referenceId, actionUrl } = input;
  const tone = status === "approved" ? COLOR_EMERALD : COLOR_RED;
  const toneBg = status === "approved" ? COLOR_EMERALD_50 : COLOR_RED_50;
  const headline =
    status === "approved" ? "คำขอได้รับการอนุมัติ" : "คำขอไม่ได้รับการอนุมัติ";
  const reference = referenceId
    ? `${kind.toUpperCase()}-${currentYear()}-${shortId(referenceId)}`
    : `${kind.toUpperCase()}-${currentYear()}`;

  const bodyContents: unknown[] = [
    {
      type: "box" as const,
      layout: "vertical" as const,
      backgroundColor: toneBg,
      cornerRadius: "md",
      paddingAll: "14px",
      contents: [
        sectionTitle("สถานะคำขอ"),
        { type: "text", text: headline, color: tone, size: "md", weight: "bold", margin: "xs" },
      ],
    },
    separator(),
    detailsSection("รายละเอียดคำขอ", [
      { label: "ประเภท",      value: title },
      { label: "รายละเอียด",  value: detail },
    ]),
  ];

  if (status === "rejected" && reason) {
    bodyContents.push(separator());
    bodyContents.push({
      type: "box" as const,
      layout: "vertical" as const,
      backgroundColor: COLOR_RED_50,
      cornerRadius: "md",
      paddingAll: "12px",
      contents: [
        sectionTitle("เหตุผลที่ไม่อนุมัติ"),
        { type: "text", text: reason, wrap: true, color: COLOR_NAVY, size: "sm", margin: "sm" },
      ],
    });
  }

  const footerButtons: unknown[] = [];
  if (actionUrl) {
    footerButtons.push(uriButton("ดูรายละเอียดในแอป", actionUrl));
  }

  return {
    type: "flex",
    altText: `${headline}: ${title}`,
    contents: bubble(
      kindResultTitle(kind),
      reference,
      bodyContents,
      footerButtons.length > 0 ? footerButtons : [
        // Empty footer rendered as a thin separator so the bubble doesn't look cut off
        { type: "filler" as const },
      ],
    ),
  };
}

function kindResultTitle(kind: "leave" | "overtime" | "contact" | "registration"): string {
  switch (kind) {
    case "leave":        return "ผลการพิจารณาการลา";
    case "overtime":     return "ผลการพิจารณาทำงานล่วงเวลา";
    case "contact":      return "ผลการพิจารณานัดหมายเข้าพบ";
    case "registration": return "ผลการพิจารณาใบสมัคร";
  }
}

// =========================================================================
// Schedule-change notification (sent to employee when supervisor edits cell)
// =========================================================================

export function buildScheduleChangeCard(input: {
  date: string;
  entryType: "work" | "overtime" | "leave";
  previousHours: number | null;
  newHours: number;
  changedByName: string;
  actionUrl: string;
}): FlexMessage {
  const typeLabel =
    input.entryType === "work"     ? "เวลาทำงานปกติ" :
    input.entryType === "overtime" ? "ทำงานล่วงเวลา" :
                                     "ลางาน";

  const change = input.previousHours == null
    ? `จัดใหม่ ${input.newHours} ชั่วโมง`
    : `จาก ${input.previousHours} ชั่วโมง เป็น ${input.newHours} ชั่วโมง`;

  const reference = `SCHEDULE-${input.date.replace(/-/g, "")}`;

  return {
    type: "flex",
    altText: `แจ้งเปลี่ยนแปลงตารางการปฏิบัติงาน ${fmtDate(input.date)} โดย ${input.changedByName}`,
    contents: bubble(
      "แจ้งเปลี่ยนแปลงตารางการปฏิบัติงาน",
      reference,
      [
        {
          type: "box" as const,
          layout: "vertical" as const,
          spacing: "xs" as const,
          contents: [
            sectionTitle("ผู้ดำเนินการ"),
            { type: "text", text: input.changedByName, color: COLOR_NAVY, size: "md", weight: "bold", margin: "xs" },
            { type: "text", text: "หัวหน้างาน", color: COLOR_NAVY_500, size: "xs" },
          ],
        },
        separator(),
        detailsSection("รายละเอียดการเปลี่ยนแปลง", [
          { label: "วันที่",    value: fmtDate(input.date) },
          { label: "ประเภท",   value: typeLabel },
          { label: "ปรับเป็น", value: change },
        ]),
        separator(),
        commentSection(
          "หมายเหตุ",
          "การเปลี่ยนแปลงนี้ได้รับการบันทึกในระบบเรียบร้อย หากมีข้อสงสัยกรุณาติดต่อหัวหน้างานโดยตรง",
        ),
      ],
      [uriButton("เปิดดูตารางของฉัน", input.actionUrl)],
    ),
  };
}

// =========================================================================
// Quick reply for "please type your rejection reason"
// =========================================================================

export function rejectionReasonQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "กำลังคนไม่เพียงพอ",   text: "กำลังคนไม่เพียงพอ" } },
      { type: "action", action: { type: "message", label: "ใกล้กำหนดส่งงาน",     text: "ใกล้กำหนดส่งงาน" } },
      { type: "action", action: { type: "message", label: "สิทธิ์การลาไม่เพียงพอ", text: "สิทธิ์การลาไม่เพียงพอ" } },
    ],
  };
}
