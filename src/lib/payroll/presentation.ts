import type { Employee, Payroll, SocialSecurityConfig } from "@/lib/types";
import {
  calculateThaiPayroll,
  THAI_PAYROLL_CALCULATION_VERSION,
} from "@/lib/payroll/thai-payroll";

export type PayrollCalculationStatus = Payroll["calculation_status"];

const CALCULATION_STATUSES: PayrollCalculationStatus[] = [
  "estimate",
  "reviewed",
  "file_ready",
  "paid",
  "void",
];

export interface PayrollPresentation {
  id: string;
  employeeId: string;
  monthYear: string;
  basePay: number;
  allowancePay: number;
  overtimePay: number;
  bonusPay: number;
  otherIncome: number;
  grossPay: number;
  employeeSso: number;
  employerSso: number;
  withholdingTax: number;
  otherDeductions: number;
  netPay: number;
  annualizedTaxableIncome: number;
  annualTax: number;
  taxMethod: string;
  calculationVersion: string;
  calculationStatus: PayrollCalculationStatus;
  calculatedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  overrideReason: string | null;
  payslipPdfUrl: string | null;
  ssoConfigId: string | null;
  ssoRatePct: number | null;
  ssoWageBase: number | null;
  ssoWageFloor: number | null;
  ssoWageCeiling: number | null;
  ssoEffectiveFrom: string | null;
  ssoEffectiveTo: string | null;
  fallbackFields: string[];
  isLegacyEstimate: boolean;
}

function hasFiniteNumber(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function numberOr(value: unknown, fallback: number): number {
  return hasFiniteNumber(value) ? Number(value) : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function detailsOf(payroll: Payroll): Record<string, unknown> {
  const details = (payroll as Payroll & { calculation_details?: unknown }).calculation_details;
  return details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {};
}

function detailNumber(details: Record<string, unknown>, key: string): number | null {
  return hasFiniteNumber(details[key]) ? Number(details[key]) : null;
}

function normalizeStatus(value: unknown): PayrollCalculationStatus {
  return CALCULATION_STATUSES.includes(value as PayrollCalculationStatus)
    ? (value as PayrollCalculationStatus)
    : "estimate";
}

export function payrollPeriodDate(monthYear: string): Date {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthYear);
  if (!match) return new Date(Date.UTC(2026, 0, 15));
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15));
}

export function resolvePayrollPresentation({
  payroll,
  employee,
  ssoConfig,
}: {
  payroll: Payroll;
  employee: Employee;
  ssoConfig?: SocialSecurityConfig;
}): PayrollPresentation {
  const row = payroll as Payroll & Record<string, unknown>;
  const details = detailsOf(payroll);
  const fallbackFields: string[] = [];
  const basePay = numberOr(row.base_pay, employee.base_salary ?? 0);
  const allowancePay = numberOr(row.allowance_pay, 0);
  const overtimePay = numberOr(row.ot_pay, 0);
  const bonusPay = numberOr(row.bonus_pay, 0);
  const otherIncome = numberOr(row.other_income, 0);
  const otherDeductionsInput = numberOr(row.other_deductions, 0);
  const payrollMonth = Number(payroll.month_year.slice(-2));

  const fallback = ssoConfig
    ? calculateThaiPayroll({
        basePay,
        allowancePay,
        overtimePay,
        bonusPay,
        otherIncome,
        otherDeductions: otherDeductionsInput,
        ssoConfig,
        taxProfile: employee.tax_profile,
        payrollMonth: Number.isFinite(payrollMonth) ? payrollMonth : undefined,
      })
    : null;

  function resolvedNumber(field: string, value: unknown, fallbackValue: number): number {
    if (hasFiniteNumber(value)) return Number(value);
    fallbackFields.push(field);
    return fallbackValue;
  }

  const grossPay = resolvedNumber(
    "gross_pay",
    row.gross_pay,
    fallback?.grossPay ?? basePay + allowancePay + overtimePay + bonusPay + otherIncome,
  );
  const employeeSso = resolvedNumber(
    "ssf_deduction",
    row.ssf_deduction,
    fallback?.employeeSso ?? 0,
  );
  const employerSso = resolvedNumber(
    "employer_sso_contribution",
    row.employer_sso_contribution,
    fallback?.employerSso ?? employeeSso,
  );
  const withholdingTax = resolvedNumber(
    "tax_deduction",
    row.tax_deduction,
    fallback?.monthlyWithholdingTax ?? 0,
  );
  const otherDeductions = resolvedNumber(
    "other_deductions",
    row.other_deductions,
    fallback?.otherDeductions ?? 0,
  );
  const netPay = resolvedNumber(
    "net_pay",
    row.net_pay,
    fallback?.netPay ?? grossPay - employeeSso - withholdingTax - otherDeductions,
  );

  // Rows created before the audit fields were introduced can carry database
  // defaults such as zero without having been recalculated. Only trust annual
  // tax outputs when calculation metadata exists; otherwise calculate a
  // read-only estimate for display and label it as a legacy fallback.
  const hasCalculationMetadata = Boolean(
    nonEmptyString(row.calculated_at) || Object.keys(details).length > 0,
  );
  const annualizedTaxableIncome = hasCalculationMetadata
    ? resolvedNumber(
        "annualized_taxable_income",
        row.annualized_taxable_income,
        fallback?.annualizedTaxableIncome ?? 0,
      )
    : (() => {
        fallbackFields.push("annualized_taxable_income");
        return fallback?.annualizedTaxableIncome ?? numberOr(row.annualized_taxable_income, 0);
      })();
  const annualTax = hasCalculationMetadata
    ? resolvedNumber("annual_tax", row.annual_tax, fallback?.annualTax ?? 0)
    : (() => {
        fallbackFields.push("annual_tax");
        return fallback?.annualTax ?? numberOr(row.annual_tax, 0);
      })();

  const storedTaxMethod = hasCalculationMetadata ? nonEmptyString(row.tax_method) : null;
  const taxMethod =
    storedTaxMethod ??
    nonEmptyString(details.method) ??
    "thai_pit_annualized_por_96_2543";
  if (!storedTaxMethod) fallbackFields.push("tax_method");

  const storedVersion = hasCalculationMetadata ? nonEmptyString(row.calculation_version) : null;
  const calculationVersion =
    storedVersion ?? fallback?.calculationVersion ?? THAI_PAYROLL_CALCULATION_VERSION;
  if (!storedVersion) fallbackFields.push("calculation_version");

  const detailsSsoBase =
    detailNumber(details, "ssoWageBase") ?? detailNumber(details, "sso_wage_base");
  const ssoWageBase =
    detailsSsoBase ??
    fallback?.ssoWageBase ??
    (ssoConfig
      ? Math.min(Math.max(basePay + allowancePay, ssoConfig.wage_floor), ssoConfig.wage_ceiling)
      : null);

  return {
    id: payroll.id,
    employeeId: payroll.employee_id,
    monthYear: payroll.month_year,
    basePay,
    allowancePay,
    overtimePay,
    bonusPay,
    otherIncome,
    grossPay,
    employeeSso,
    employerSso,
    withholdingTax,
    otherDeductions,
    netPay,
    annualizedTaxableIncome,
    annualTax,
    taxMethod,
    calculationVersion,
    calculationStatus: normalizeStatus(row.calculation_status),
    calculatedAt: nonEmptyString(row.calculated_at),
    reviewedAt: nonEmptyString(row.reviewed_at),
    reviewedById: nonEmptyString(row.reviewed_by_id),
    overrideReason: nonEmptyString(row.override_reason),
    payslipPdfUrl: nonEmptyString(row.payslip_pdf_url),
    ssoConfigId: ssoConfig?.id ?? nonEmptyString(details.ssoConfigId),
    ssoRatePct: ssoConfig?.rate_pct ?? detailNumber(details, "ssoRatePct"),
    ssoWageBase,
    ssoWageFloor: ssoConfig?.wage_floor ?? detailNumber(details, "ssoWageFloor"),
    ssoWageCeiling: ssoConfig?.wage_ceiling ?? detailNumber(details, "ssoWageCeiling"),
    ssoEffectiveFrom: ssoConfig?.effective_from ?? null,
    ssoEffectiveTo: ssoConfig?.effective_to ?? null,
    fallbackFields: Array.from(new Set(fallbackFields)),
    isLegacyEstimate: fallbackFields.length > 0,
  };
}
