"use server";

import { EMPLOYEES } from "@/lib/demo-data";

export interface BindResult {
  ok: boolean;
  message: string;
  employeeName?: string;
  department?: string;
  position?: string;
}

export async function bindLineAccount(formData: FormData): Promise<BindResult> {
  const lineUserId = String(formData.get("lineUserId") ?? "").trim();
  const employeeCode = String(formData.get("employeeCode") ?? "").toUpperCase().trim();

  if (!employeeCode) {
    return { ok: false, message: "Employee code is required." };
  }
  if (!lineUserId) {
    return { ok: false, message: "LINE user ID missing. Please open this page inside LINE." };
  }

  const employee = EMPLOYEES.find((e) => e.employee_code === employeeCode);
  if (!employee) {
    return { ok: false, message: "Employee code not found. Please contact HR." };
  }
  const alreadyBound = EMPLOYEES.find(
    (e) => e.line_user_id === lineUserId && e.employee_code !== employeeCode,
  );
  if (alreadyBound) {
    return {
      ok: false,
      message: `This LINE account is already linked to ${alreadyBound.employee_code}.`,
    };
  }

  // In production: UPDATE employees SET line_user_id = $1 WHERE employee_code = $2
  // For demo: mutate in-memory
  employee.line_user_id = lineUserId;

  return {
    ok: true,
    message: "Account bound successfully. Welcome to EC AIHR.",
    employeeName: employee.name_en ?? employee.employee_code ?? "",
    department: employee.department ?? "",
    position: employee.position ?? "",
  };
}
