import type { FlexMessage } from "./client";
import type {
  ContactRequest,
  Employee,
  LeaveRequest,
  OvertimeRequest,
} from "../types";

const COLOR_NAVY = "#0F172A";
const COLOR_NAVY_500 = "#64748B";
const COLOR_ORANGE = "#FB923C";
const COLOR_RED = "#DC2626";
const COLOR_EMERALD = "#059669";

function postback(label: string, data: string, color?: string) {
  return {
    type: "button",
    style: "primary",
    height: "sm",
    color: color ?? COLOR_ORANGE,
    action: { type: "postback", label, data, displayText: label },
  };
}

function row(label: string, value: string) {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, color: COLOR_NAVY_500, size: "sm", flex: 3 },
      { type: "text", text: value, wrap: true, color: COLOR_NAVY, size: "sm", flex: 5 },
    ],
  };
}

function header(title: string, subtitle: string) {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: COLOR_NAVY,
    paddingAll: "16px",
    contents: [
      { type: "text", text: title, color: "#ffffff", weight: "bold", size: "md" },
      { type: "text", text: subtitle, color: "#94A3B8", size: "xs", margin: "xs" },
    ],
  };
}

function fmtDate(iso: string): string {
  // 2026-05-13 → 13 May 2026
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
}

// =========================================================================
// Approval cards (sent TO supervisor with Approve/Reject buttons)
// =========================================================================

export function buildLeaveApprovalCard(input: {
  request: LeaveRequest;
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, approveToken, rejectToken } = input;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "Unknown";

  return {
    type: "flex",
    altText: `Leave request from ${empName} pending your approval`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: header("Leave Request", "รออนุมัติการลา"),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          row("พนักงาน", `${empName}${employee.employee_code ? ` (${employee.employee_code})` : ""}`),
          row("ประเภท", request.leave_type),
          row("ช่วงวันที่", fmtRange(request.start_date, request.end_date)),
          row("จำนวนวัน", `${request.days} วัน`),
          row("เหตุผล", request.reason ?? "—"),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          postback("อนุมัติ", `action=approve&kind=leave&token=${approveToken}`, COLOR_EMERALD),
          postback("ไม่อนุมัติ", `action=reject&kind=leave&token=${rejectToken}`, COLOR_RED),
        ],
      },
    },
  };
}

export function buildOvertimeApprovalCard(input: {
  request: OvertimeRequest;
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, approveToken, rejectToken } = input;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "Unknown";

  return {
    type: "flex",
    altText: `OT request from ${empName} pending your approval`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: header("Overtime Request", "รออนุมัติทำโอที"),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          row("พนักงาน", `${empName}${employee.employee_code ? ` (${employee.employee_code})` : ""}`),
          row("วันที่", fmtDate(request.date)),
          row("ชั่วโมง", `${request.hours} ชม.`),
          row("เหตุผล", request.reason ?? "—"),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          postback("อนุมัติ", `action=approve&kind=overtime&token=${approveToken}`, COLOR_EMERALD),
          postback("ไม่อนุมัติ", `action=reject&kind=overtime&token=${rejectToken}`, COLOR_RED),
        ],
      },
    },
  };
}

export function buildContactApprovalCard(input: {
  request: ContactRequest;
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { request, employee, approveToken, rejectToken } = input;
  const empName = employee.name_th ?? employee.name_en ?? employee.employee_code ?? "Unknown";

  return {
    type: "flex",
    altText: `Contact request from ${empName}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: header("Contact Request", "ขอเข้าพบ / ขอความช่วยเหลือ"),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          row("พนักงาน", `${empName}${employee.employee_code ? ` (${employee.employee_code})` : ""}`),
          row("วันที่", fmtDate(request.requested_date)),
          row("เวลา", `${request.time_start.slice(0, 5)} – ${request.time_end.slice(0, 5)}`),
          row("เหตุผล", request.reason),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          postback("ยินยอม", `action=approve&kind=contact&token=${approveToken}`, COLOR_EMERALD),
          postback("ไม่สะดวก", `action=reject&kind=contact&token=${rejectToken}`, COLOR_RED),
        ],
      },
    },
  };
}

export function buildRegistrationReviewCard(input: {
  employee: Employee;
  approveToken: string;
  rejectToken: string;
}): FlexMessage {
  const { employee, approveToken, rejectToken } = input;
  const name = employee.name_th ?? employee.name_en ?? "New employee";

  return {
    type: "flex",
    altText: `New employee application: ${name}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: header("New Employee", "ใบสมัครพนักงานใหม่"),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          row("ชื่อ", name),
          row("แผนก", `${employee.department ?? "-"}`),
          row("ตำแหน่ง", `${employee.position ?? "-"}`),
          row("เบอร์", `${employee.phone ?? "-"}`),
          row("เลขบัตร", `${employee.national_id ?? "-"}`),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          postback("อนุมัติ", `action=approve&kind=registration&token=${approveToken}`, COLOR_EMERALD),
          postback("ปฏิเสธ", `action=reject&kind=registration&token=${rejectToken}`, COLOR_RED),
        ],
      },
    },
  };
}

// =========================================================================
// Result cards (sent BACK to employee after supervisor decision)
// =========================================================================

export function buildDecisionResultCard(input: {
  kind: "leave" | "overtime" | "contact" | "registration";
  status: "approved" | "rejected";
  title: string;
  detail: string;
  reason?: string | null;
}): FlexMessage {
  const { kind, status, title, detail, reason } = input;
  const tone = status === "approved" ? COLOR_EMERALD : COLOR_RED;
  const headline = status === "approved" ? "อนุมัติแล้ว" : "ไม่ได้รับอนุมัติ";

  return {
    type: "flex",
    altText: `${title}: ${headline}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: tone,
        paddingAll: "16px",
        contents: [
          { type: "text", text: headline, color: "#ffffff", weight: "bold", size: "lg" },
          { type: "text", text: title, color: "#ffffff", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          { type: "text", text: detail, wrap: true, color: COLOR_NAVY, size: "sm" },
          ...(status === "rejected" && reason
            ? [
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  paddingAll: "12px",
                  backgroundColor: "#FEF2F2",
                  cornerRadius: "md",
                  contents: [
                    { type: "text", text: "เหตุผล", color: COLOR_RED, weight: "bold", size: "xs" },
                    { type: "text", text: reason, wrap: true, color: COLOR_NAVY, size: "sm", margin: "xs" },
                  ],
                },
              ]
            : []),
          { type: "text", text: `Reference: ${kind}`, color: "#CBD5E1", size: "xxs", margin: "md" },
        ],
      },
    },
  };
}

// =========================================================================
// Schedule-change notification (when supervisor edits employee's schedule)
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
    input.entryType === "work" ? "ทำงานปกติ" :
    input.entryType === "overtime" ? "โอที" : "ลา";

  const change = input.previousHours == null
    ? `ใหม่ ${input.newHours} ชม.`
    : `${input.previousHours} ชม. → ${input.newHours} ชม.`;

  return {
    type: "flex",
    altText: `ตารางวันที่ ${fmtDate(input.date)} ถูกเปลี่ยนโดย ${input.changedByName} — แตะเพื่อดูรายละเอียด`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: header("ตารางงานถูกแก้ไข", `Updated by ${input.changedByName}`),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          row("วันที่", fmtDate(input.date)),
          row("ประเภท", typeLabel),
          row("เปลี่ยน", change),
          {
            type: "text",
            text: "หากมีข้อสงสัยกรุณาติดต่อหัวหน้าโดยตรง",
            wrap: true,
            color: COLOR_NAVY_500,
            size: "xs",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: COLOR_ORANGE,
            height: "sm",
            action: {
              type: "uri",
              label: "เปิดดูตารางของฉัน",
              uri: input.actionUrl,
            },
          },
        ],
      },
    },
  };
}

// =========================================================================
// Quick reply for "please type your rejection reason"
// =========================================================================

export function rejectionReasonQuickReply() {
  return {
    items: [
      {
        type: "action",
        action: { type: "message", label: "ไม่พอกำลังคน", text: "ไม่พอกำลังคน" },
      },
      {
        type: "action",
        action: { type: "message", label: "ใกล้ส่งงาน", text: "ใกล้ส่งงาน" },
      },
      {
        type: "action",
        action: { type: "message", label: "ใช้สิทธิ์ไม่พอ", text: "ใช้สิทธิ์ไม่พอ" },
      },
    ],
  };
}
